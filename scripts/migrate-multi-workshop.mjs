import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "";
const projectId = process.env.FIREBASE_PROJECT_ID || "auto-guardian-t";
const dryRun = process.argv.includes("--dry-run");
const singleWorkshopMode = process.argv.includes("--single-workshop");
const MIGRATION_VERSION = "multi-workshop-v1";
const BATCH_SIZE = 200;
const primaryWorkshopName = normalizeOptional(
  process.env.PRIMARY_WORKSHOP_NAME,
);
const primaryWorkshopOwnerUid = normalizeOptional(
  process.env.PRIMARY_WORKSHOP_OWNER_UID,
);

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

function buildMigrationMeta(source, extra = {}) {
  return {
    migrationMeta: {
      multiWorkshop: {
        version: MIGRATION_VERSION,
        source,
        projectId,
        ...extra,
      },
    },
  };
}

function createBatchWriter() {
  let batch = firestore.batch();
  let pendingWrites = 0;
  let committedBatches = 0;
  let preparedWrites = 0;

  const flush = async () => {
    if (!pendingWrites) {
      return;
    }

    if (!dryRun) {
      await batch.commit();
      committedBatches += 1;
    }

    batch = firestore.batch();
    pendingWrites = 0;
  };

  const set = async (documentRef, payload, options = { merge: true }) => {
    batch.set(documentRef, payload, options);
    pendingWrites += 1;
    preparedWrites += 1;

    if (pendingWrites >= BATCH_SIZE) {
      await flush();
    }
  };

  return {
    flush,
    getStats() {
      return {
        committedBatches,
        preparedWrites,
      };
    },
    set,
  };
}

function buildDefaultWorkshopName(profileDoc) {
  const profile = profileDoc.data();
  return `Taller de ${profile.fullName || profile.email || profileDoc.id}`;
}

async function ensureWorkshopForProfile(profileDoc, options = {}) {
  const profile = profileDoc.data();
  const profileUid = normalizeOptional(profile.uid || profileDoc.id);
  const defaultWorkshopId = normalizeOptional(profile.defaultWorkshopId);
  const preferredWorkshopName =
    normalizeOptional(options.name) || buildDefaultWorkshopName(profileDoc);
  const preferredOwnerUid = normalizeOptional(options.ownerUserUid || profileUid);

  if (defaultWorkshopId) {
    const existingWorkshop = await firestore
      .collection("workshops")
      .doc(defaultWorkshopId)
      .get();

    if (existingWorkshop.exists) {
      if (!dryRun) {
        await existingWorkshop.ref.set(
          {
            name: preferredWorkshopName,
            ownerUserUid: preferredOwnerUid,
            status: "active",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...buildMigrationMeta("profile-default-workshop", {
              profileUid,
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
          },
          { merge: true },
        );
      }

      return existingWorkshop.id;
    }
  }

  const workshopRef = firestore.collection("workshops").doc();
  const workshopPayload = {
    id: workshopRef.id,
    sequentialId: null,
    name: preferredWorkshopName,
    ownerUserUid: preferredOwnerUid,
    status: "active",
    phone: profile.phone || "",
    email: profile.email || "",
    address: "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...buildMigrationMeta("owner-workshop-bootstrap", {
      profileUid,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  };

  if (!dryRun) {
    await workshopRef.set(workshopPayload, { merge: true });
  }

  return workshopRef.id;
}

async function ensureMembership(profileDoc, workshopId, options = {}) {
  const profile = profileDoc.data();
  const profileUid = normalizeOptional(profile.uid || profileDoc.id);
  const membershipId = buildMembershipId(workshopId, profileUid);
  const nextRole = normalizeOptional(options.role || profile.role) || "administrator";
  const nextStatus = normalizeOptional(options.status || profile.status) || "active";
  const nextWorkshopName =
    normalizeOptional(options.workshopName) || buildDefaultWorkshopName(profileDoc);
  const membershipRef = firestore
    .collection("workshopMemberships")
    .doc(membershipId);
  const membershipPayload = {
    id: membershipId,
    workshopId,
    workshopName: nextWorkshopName,
    userUid: profileUid,
    role: nextRole,
    status: nextStatus,
    invitationId: profile.invitationId || null,
    invitedByUid: null,
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...buildMigrationMeta("owner-membership-bootstrap", {
      profileUid,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  };

  if (!dryRun) {
    await membershipRef.set(membershipPayload, { merge: true });
    await profileDoc.ref.set(
      {
        defaultWorkshopId: workshopId,
        role: nextRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...buildMigrationMeta("profile-workshop-context", {
          workshopId,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
      },
      { merge: true },
    );
  }

  return membershipId;
}

function choosePrimaryWorkshopOwner(profileDocs) {
  if (!profileDocs.length) {
    return null;
  }

  if (primaryWorkshopOwnerUid) {
    const explicitOwner = profileDocs.find(
      (profileDoc) => profileDoc.id === primaryWorkshopOwnerUid,
    );

    if (explicitOwner) {
      return explicitOwner;
    }
  }

  return (
    profileDocs.find((profileDoc) => {
      const profile = profileDoc.data();
      return profile.status === "active" && profile.role === "administrator";
    }) ||
    profileDocs.find((profileDoc) => profileDoc.data().status === "active") ||
    profileDocs[0]
  );
}

async function backfillOperationalCollection(
  collectionName,
  workshopIdByUserUid,
  fallbackWorkshopId = "",
) {
  const snapshot = await firestore.collection(collectionName).get();
  const summary = {
    collectionName,
    scanned: snapshot.size,
    alreadyScoped: 0,
    prepared: 0,
    unresolved: 0,
  };
  const batchWriter = createBatchWriter();

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

    return normalizeOptional(fallbackWorkshopId) || null;
  };

  for (const document of snapshot.docs) {
    const data = document.data();

    if (normalizeOptional(data.workshopId)) {
      summary.alreadyScoped += 1;
      continue;
    }

    const workshopId = await resolveWorkshopId(data);

    if (!workshopId) {
      summary.unresolved += 1;
      console.warn(
        `No se pudo inferir workshopId para ${collectionName}/${document.id}`,
      );
      continue;
    }

    summary.prepared += 1;

    await batchWriter.set(
      document.ref,
      {
        workshopId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...buildMigrationMeta(`backfill-${collectionName}`, {
          workshopId,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
      },
      { merge: true },
    );
  }

  await batchWriter.flush();

  return {
    ...summary,
    ...batchWriter.getStats(),
  };
}

async function main() {
  const profilesSnapshot = await firestore.collection("userProfiles").get();
  const profileDocs = profilesSnapshot.docs;
  const workshopIdByUserUid = new Map();
  const profileSummary = {
    scanned: profilesSnapshot.size,
    prepared: 0,
  };

  let fallbackWorkshopId = "";

  if (singleWorkshopMode) {
    const ownerProfileDoc = choosePrimaryWorkshopOwner(profileDocs);

    if (!ownerProfileDoc) {
      throw new Error("No hay perfiles disponibles para crear el taller inicial.");
    }

    const ownerProfile = ownerProfileDoc.data();
    const resolvedWorkshopName =
      primaryWorkshopName || ownerProfile.workshopName || "Taller principal";

    fallbackWorkshopId = await ensureWorkshopForProfile(ownerProfileDoc, {
      name: resolvedWorkshopName,
      ownerUserUid: ownerProfileDoc.id,
    });

    console.log(
      `Modo single-workshop: ${resolvedWorkshopName} (${fallbackWorkshopId}) con owner ${ownerProfile.email || ownerProfile.fullName || ownerProfileDoc.id}.`,
    );

    for (const profileDoc of profileDocs) {
      const nextRole = profileDoc.id === ownerProfileDoc.id ? "owner" : profileDoc.data().role;
      await ensureMembership(profileDoc, fallbackWorkshopId, {
        role: nextRole,
        workshopName: resolvedWorkshopName,
      });
      workshopIdByUserUid.set(profileDoc.id, fallbackWorkshopId);
      profileSummary.prepared += 1;
    }
  } else {
    for (const profileDoc of profileDocs) {
      const workshopId = await ensureWorkshopForProfile(profileDoc);
      await ensureMembership(profileDoc, workshopId);
      workshopIdByUserUid.set(profileDoc.id, workshopId);
      profileSummary.prepared += 1;
    }
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
    const summary = await backfillOperationalCollection(
      collectionName,
      workshopIdByUserUid,
      fallbackWorkshopId,
    );
    console.log(
      `${collectionName}: ${summary.prepared} preparados, ${summary.alreadyScoped} ya segmentados, ${summary.unresolved} sin resolver, ${summary.preparedWrites} escrituras en ${summary.committedBatches} lotes.`,
    );
  }

  console.log(
    `userProfiles: ${profileSummary.prepared} perfiles reconciliados de ${profileSummary.scanned}.`,
  );

  console.log(
    dryRun ? "Migracion en modo dry-run finalizada." : "Migracion finalizada.",
  );
}

main().catch((error) => {
  console.error("Error ejecutando la migracion multi-taller:", error);
  process.exit(1);
});
