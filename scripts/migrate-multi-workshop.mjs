import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "";
const projectId = process.env.FIREBASE_PROJECT_ID || "auto-guardian-t";
const dryRun = process.argv.includes("--dry-run");

if (!serviceAccountPath) {
  console.error(
    "Define FIREBASE_SERVICE_ACCOUNT_PATH antes de ejecutar la migracion.",
  );
  process.exit(1);
}

const absoluteServiceAccountPath = path.resolve(serviceAccountPath);

if (!fs.existsSync(absoluteServiceAccountPath)) {
  console.error("No existe el archivo de service account indicado.");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(absoluteServiceAccountPath, "utf8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const firestore = admin.firestore();

function normalizeOptional(value) {
  return String(value || "").trim();
}

function buildMembershipId(workshopId, userUid) {
  return `${normalizeOptional(workshopId)}__${normalizeOptional(userUid)}`;
}

function buildDefaultWorkshopName(profileDoc) {
  const profile = profileDoc.data();
  return `Taller de ${profile.fullName || profile.email || profileDoc.id}`;
}

async function ensureWorkshopForProfile(profileDoc) {
  const profile = profileDoc.data();
  const defaultWorkshopId = normalizeOptional(profile.defaultWorkshopId);

  if (defaultWorkshopId) {
    const existingWorkshop = await firestore
      .collection("workshops")
      .doc(defaultWorkshopId)
      .get();

    if (existingWorkshop.exists) {
      return existingWorkshop.id;
    }
  }

  const workshopRef = firestore.collection("workshops").doc();
  const workshopPayload = {
    id: workshopRef.id,
    sequentialId: null,
    name: buildDefaultWorkshopName(profileDoc),
    ownerUserUid: profile.uid,
    status: "active",
    phone: profile.phone || "",
    email: profile.email || "",
    address: "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!dryRun) {
    await workshopRef.set(workshopPayload, { merge: true });
  }

  return workshopRef.id;
}

async function ensureMembership(profileDoc, workshopId) {
  const profile = profileDoc.data();
  const membershipId = buildMembershipId(workshopId, profile.uid);
  const membershipRef = firestore
    .collection("workshopMemberships")
    .doc(membershipId);
  const membershipPayload = {
    id: membershipId,
    workshopId,
    workshopName: buildDefaultWorkshopName(profileDoc),
    userUid: profile.uid,
    role: profile.role || "administrator",
    status: profile.status || "active",
    invitationId: profile.invitationId || null,
    invitedByUid: null,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!dryRun) {
    await membershipRef.set(membershipPayload, { merge: true });
    await profileDoc.ref.set(
      {
        defaultWorkshopId: workshopId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return membershipId;
}

async function backfillOperationalCollection(
  collectionName,
  workshopIdByUserUid,
) {
  const snapshot = await firestore.collection(collectionName).get();
  let updated = 0;

  const getDocument = (() => {
    const cache = new Map();

    return async (targetCollection, documentId) => {
      const normalizedCollection = normalizeOptional(targetCollection);
      const normalizedDocumentId = normalizeOptional(documentId);
      const cacheKey = `${normalizedCollection}/${normalizedDocumentId}`;

      if (!normalizedCollection || !normalizedDocumentId) {
        return null;
      }

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const nextSnapshot = await firestore
        .collection(normalizedCollection)
        .doc(normalizedDocumentId)
        .get();
      const nextData = nextSnapshot.exists ? nextSnapshot.data() : null;
      cache.set(cacheKey, nextData);
      return nextData;
    };
  })();

  const resolveWorkshopId = async (data) => {
    const directOwnerUid =
      data.createdByUid ||
      data.openedByUid ||
      data.authorUid ||
      data.invitedByUid;

    if (directOwnerUid && workshopIdByUserUid.has(directOwnerUid)) {
      return workshopIdByUserUid.get(directOwnerUid);
    }

    if (data.clientId) {
      const client = await getDocument("clients", data.clientId);
      if (client?.workshopId) {
        return client.workshopId;
      }
    }

    if (data.vehicleId) {
      const vehicle = await getDocument("vehicles", data.vehicleId);
      if (vehicle?.workshopId) {
        return vehicle.workshopId;
      }
    }

    if (data.diagnosticId) {
      const diagnostic = await getDocument("diagnostics", data.diagnosticId);
      if (diagnostic?.workshopId) {
        return diagnostic.workshopId;
      }
    }

    if (data.workOrderId) {
      const workOrder = await getDocument("workOrders", data.workOrderId);
      if (workOrder?.workshopId) {
        return workOrder.workshopId;
      }
    }

    return null;
  };

  for (const document of snapshot.docs) {
    const data = document.data();

    if (normalizeOptional(data.workshopId)) {
      continue;
    }

    const workshopId = await resolveWorkshopId(data);

    if (!workshopId) {
      console.warn(
        `No se pudo inferir workshopId para ${collectionName}/${document.id}`,
      );
      continue;
    }

    updated += 1;

    if (!dryRun) {
      await document.ref.set(
        {
          workshopId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  return updated;
}

async function main() {
  const profilesSnapshot = await firestore.collection("userProfiles").get();
  const workshopIdByUserUid = new Map();

  for (const profileDoc of profilesSnapshot.docs) {
    const workshopId = await ensureWorkshopForProfile(profileDoc);
    await ensureMembership(profileDoc, workshopId);
    workshopIdByUserUid.set(profileDoc.id, workshopId);
  }

  const collections = [
    "clients",
    "vehicles",
    "diagnostics",
    "workOrders",
    "progressEntries",
    "spareParts",
  ];

  for (const collectionName of collections) {
    const updated = await backfillOperationalCollection(
      collectionName,
      workshopIdByUserUid,
    );
    console.log(`${collectionName}: ${updated} documentos preparados.`);
  }

  console.log(
    dryRun ? "Migracion en modo dry-run finalizada." : "Migracion finalizada.",
  );
}

main().catch((error) => {
  console.error("Error ejecutando la migracion multi-taller:", error);
  process.exit(1);
});
