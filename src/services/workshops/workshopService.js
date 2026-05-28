import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { USER_ROLES, USER_STATUSES } from "../../constants/accessControl";
import { firestore } from "../firebase/config";
import { firestoreCollections } from "../firestore/collections";
import { createEntityRecord } from "../firestore/repository";

const workshopCollection = firestoreCollections.workshops;
const membershipCollection = firestoreCollections.workshopMemberships;

function normalizeOptional(value) {
  return String(value || "").trim();
}

function sortByWorkshopName(items) {
  return [...items].sort((left, right) =>
    String(
      left.workshopName || left.name || left.workshopId || "",
    ).localeCompare(
      String(right.workshopName || right.name || right.workshopId || ""),
      "es",
    ),
  );
}

function sortMemberships(items) {
  return [...items].sort((left, right) => {
    if (left.role === USER_ROLES.OWNER && right.role !== USER_ROLES.OWNER) {
      return -1;
    }

    if (left.role !== USER_ROLES.OWNER && right.role === USER_ROLES.OWNER) {
      return 1;
    }

    return String(
      left.workshopName || left.name || left.workshopId || "",
    ).localeCompare(
      String(right.workshopName || right.name || right.workshopId || ""),
      "es",
    );
  });
}

function isAccessibleMembership(membership) {
  return (
    membership?.status === USER_STATUSES.ACTIVE && !membership?.workshopMissing
  );
}

function membershipPriority(membership) {
  let score = 0;

  if (membership?.status === USER_STATUSES.ACTIVE) {
    score += 100;
  }

  if (membership?.role === USER_ROLES.OWNER) {
    score += 10;
  }

  if (!membership?.workshopMissing) {
    score += 5;
  }

  return score;
}

function dedupeMemberships(items = []) {
  const grouped = new Map();

  items.forEach((membership) => {
    const key = normalizeOptional(membership?.workshopId);

    if (!key) {
      return;
    }

    const current = grouped.get(key);

    if (
      !current ||
      membershipPriority(membership) > membershipPriority(current)
    ) {
      grouped.set(key, membership);
    }
  });

  return Array.from(grouped.values());
}

async function listRawUserWorkshopMemberships(userUid) {
  const normalizedUserUid = normalizeOptional(userUid);

  if (!normalizedUserUid) {
    return [];
  }

  const collectionRef = collection(firestore, membershipCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("userUid", "==", normalizedUserUid)),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

async function listOwnedWorkshopsByUser(userUid) {
  const normalizedUserUid = normalizeOptional(userUid);

  if (!normalizedUserUid) {
    return [];
  }

  const collectionRef = collection(firestore, workshopCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("ownerUserUid", "==", normalizedUserUid)),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

async function ensureOwnerWorkshopFromMembership(membership, userContext = {}) {
  const workshopId = normalizeOptional(membership?.workshopId);
  const userUid = normalizeOptional(membership?.userUid || userContext.uid);

  if (!workshopId || membership?.role !== USER_ROLES.OWNER || !userUid) {
    return null;
  }

  const workshopRef = doc(firestore, workshopCollection.name, workshopId);
  const nextWorkshopName =
    normalizeOptional(membership?.workshopName) ||
    buildDefaultWorkshopName(userContext.fullName);

  await setDoc(
    workshopRef,
    {
      id: workshopId,
      sequentialId: null,
      name: nextWorkshopName,
      ownerUserUid: userUid,
      status: "active",
      phone: normalizeOptional(userContext.phone),
      email: normalizeOptional(userContext.email).toLowerCase(),
      address: "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return getWorkshopById(workshopId);
}

async function hydrateMembership(membership, userContext = {}) {
  let workshop = await getWorkshopById(membership.workshopId);

  if (!workshop && membership.role === USER_ROLES.OWNER) {
    workshop = await ensureOwnerWorkshopFromMembership(membership, userContext);
  }

  if (!workshop) {
    return {
      ...membership,
      workshopMissing: true,
    };
  }

  const resolvedWorkshopName =
    normalizeOptional(workshop.name) ||
    normalizeOptional(membership.workshopName);

  if (
    resolvedWorkshopName &&
    membership.workshopName !== resolvedWorkshopName
  ) {
    await updateDoc(
      doc(firestore, membershipCollection.name, membership.refId),
      {
        workshopName: resolvedWorkshopName,
        updatedAt: serverTimestamp(),
      },
    );
  }

  return {
    ...membership,
    workshopName: resolvedWorkshopName,
    workshop,
    workshopMissing: false,
  };
}

export async function ensureOwnerWorkshopMembershipLinks({ uid, status } = {}) {
  const normalizedUserUid = normalizeOptional(uid);

  if (!normalizedUserUid) {
    return 0;
  }

  const ownedWorkshops = await listOwnedWorkshopsByUser(normalizedUserUid);

  if (!ownedWorkshops.length) {
    return 0;
  }

  await Promise.all(
    ownedWorkshops.map((workshop) =>
      upsertWorkshopMembership({
        workshopId: workshop.id,
        userUid: normalizedUserUid,
        role: USER_ROLES.OWNER,
        status: normalizeOptional(status) || USER_STATUSES.ACTIVE,
        invitedByUid: normalizedUserUid,
      }),
    ),
  );

  return ownedWorkshops.length;
}

export function getWorkshopMembershipId(workshopId, userUid) {
  return `${normalizeOptional(workshopId)}__${normalizeOptional(userUid)}`;
}

export function buildDefaultWorkshopName(fullName) {
  const normalizedName = normalizeOptional(fullName);

  if (!normalizedName) {
    return "Mi taller";
  }

  return `Taller de ${normalizedName}`;
}

export async function getWorkshopById(workshopId) {
  const normalizedWorkshopId = normalizeOptional(workshopId);

  if (!normalizedWorkshopId) {
    return null;
  }

  const documentRef = doc(
    firestore,
    workshopCollection.name,
    normalizedWorkshopId,
  );
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    refId: snapshot.id,
    ...snapshot.data(),
  };
}

export async function createWorkshop({
  name,
  ownerUserUid,
  phone,
  email,
  address,
}) {
  return createEntityRecord("workshops", {
    name: normalizeOptional(name) || "Mi taller",
    ownerUserUid: normalizeOptional(ownerUserUid),
    status: "active",
    phone: normalizeOptional(phone),
    email: normalizeOptional(email).toLowerCase(),
    address: normalizeOptional(address),
  });
}

export async function updateWorkshop(workshopId, changes = {}) {
  const normalizedWorkshopId = normalizeOptional(workshopId);
  const normalizedName = normalizeOptional(changes.name);

  if (!normalizedWorkshopId) {
    throw new Error("No se encontro el taller a actualizar.");
  }

  if (!normalizedName) {
    throw new Error("Ingresa el nombre del taller.");
  }

  const currentWorkshop = await getWorkshopById(normalizedWorkshopId);

  const workshopRef = doc(
    firestore,
    workshopCollection.name,
    normalizedWorkshopId,
  );
  await updateDoc(workshopRef, {
    name: normalizedName,
    phone: normalizeOptional(changes.phone),
    email: normalizeOptional(changes.email).toLowerCase(),
    address: normalizeOptional(changes.address),
    updatedAt: serverTimestamp(),
  });

  if (currentWorkshop?.name !== normalizedName) {
    const memberships = await listWorkshopMemberships(normalizedWorkshopId);
    await Promise.all(
      memberships.map((membership) =>
        updateDoc(doc(firestore, membershipCollection.name, membership.refId), {
          workshopName: normalizedName,
          updatedAt: serverTimestamp(),
        }),
      ),
    );
  }

  return getWorkshopById(normalizedWorkshopId);
}

export async function renameWorkshop(workshopId, nextName) {
  return updateWorkshop(workshopId, { name: nextName });
}

export async function upsertWorkshopMembership({
  workshopId,
  userUid,
  role,
  status,
  invitationId,
  invitedByUid,
  acceptedAt,
}) {
  const normalizedWorkshopId = normalizeOptional(workshopId);
  const normalizedUserUid = normalizeOptional(userUid);

  if (!normalizedWorkshopId || !normalizedUserUid) {
    throw new Error("No se pudo resolver la membresia del taller.");
  }

  const documentId = getWorkshopMembershipId(
    normalizedWorkshopId,
    normalizedUserUid,
  );
  const documentRef = doc(firestore, membershipCollection.name, documentId);
  const existingSnapshot = await getDoc(documentRef);
  const workshop = await getWorkshopById(normalizedWorkshopId);
  const nextRole = normalizeOptional(role) || USER_ROLES.MECHANIC;
  const nextStatus = normalizeOptional(status) || USER_STATUSES.ACTIVE;

  await setDoc(
    documentRef,
    {
      id: documentId,
      workshopId: normalizedWorkshopId,
      workshopName: workshop?.name || "Taller",
      userUid: normalizedUserUid,
      role: nextRole,
      status: nextStatus,
      invitationId: normalizeOptional(invitationId) || null,
      invitedByUid: normalizeOptional(invitedByUid) || null,
      acceptedAt: acceptedAt || serverTimestamp(),
      createdAt: existingSnapshot.exists()
        ? existingSnapshot.data()?.createdAt || serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const nextSnapshot = await getDoc(documentRef);

  return {
    refId: nextSnapshot.id,
    ...nextSnapshot.data(),
  };
}

export async function getWorkshopMembership(workshopId, userUid) {
  const documentId = getWorkshopMembershipId(workshopId, userUid);
  const documentRef = doc(firestore, membershipCollection.name, documentId);
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    refId: snapshot.id,
    ...snapshot.data(),
  };
}

export async function listUserWorkshopMemberships(userUid) {
  const memberships = await listRawUserWorkshopMemberships(userUid);
  return sortMemberships(dedupeMemberships(memberships));
}

export async function listWorkshopMemberships(workshopId) {
  const normalizedWorkshopId = normalizeOptional(workshopId);

  if (!normalizedWorkshopId) {
    return [];
  }

  const collectionRef = collection(firestore, membershipCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("workshopId", "==", normalizedWorkshopId)),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

export async function ensurePersonalWorkshopForUser({ uid, fullName, email }) {
  const existingMemberships = await listRawUserWorkshopMemberships(uid);

  if (existingMemberships.length) {
    const firstMembership = existingMemberships[0];
    const workshop = await getWorkshopById(firstMembership.workshopId);

    return {
      workshop,
      membership: firstMembership,
    };
  }

  const workshop = await createWorkshop({
    name: buildDefaultWorkshopName(fullName),
    ownerUserUid: uid,
    email,
  });
  const membership = await upsertWorkshopMembership({
    workshopId: workshop.id,
    userUid: uid,
    role: USER_ROLES.OWNER,
    status: USER_STATUSES.ACTIVE,
    invitedByUid: uid,
  });

  return {
    workshop,
    membership,
  };
}

export async function resolveUserWorkshopContext({
  uid,
  fullName,
  email,
  phone,
  preferredWorkshopId,
  defaultWorkshopId,
  membershipStatus,
} = {}) {
  const normalizedUserUid = normalizeOptional(uid);

  if (!normalizedUserUid) {
    return {
      memberships: [],
      activeMembership: null,
      activeWorkshop: null,
    };
  }

  await ensureOwnerWorkshopMembershipLinks({
    uid: normalizedUserUid,
    status: membershipStatus,
  });

  let memberships = await listRawUserWorkshopMemberships(normalizedUserUid);

  if (!memberships.length) {
    await ensurePersonalWorkshopForUser({
      uid: normalizedUserUid,
      fullName,
      email,
    });
    memberships = await listRawUserWorkshopMemberships(normalizedUserUid);
  }

  const hydratedMemberships = await Promise.all(
    memberships.map((membership) =>
      hydrateMembership(membership, {
        uid: normalizedUserUid,
        fullName,
        email,
        phone,
      }),
    ),
  );

  const orderedMemberships = sortMemberships(
    dedupeMemberships(hydratedMemberships),
  );
  const accessibleMemberships = orderedMemberships.filter(
    isAccessibleMembership,
  );
  const selectionPool = accessibleMemberships.length
    ? accessibleMemberships
    : orderedMemberships.filter((membership) => !membership.workshopMissing);

  const normalizedPreferredWorkshopId = normalizeOptional(preferredWorkshopId);
  const normalizedDefaultWorkshopId = normalizeOptional(defaultWorkshopId);
  const activeMembership =
    selectionPool.find(
      (membership) => membership.workshopId === normalizedPreferredWorkshopId,
    ) ||
    selectionPool.find(
      (membership) => membership.workshopId === normalizedDefaultWorkshopId,
    ) ||
    selectionPool.find((membership) => membership.role === USER_ROLES.OWNER) ||
    selectionPool[0] ||
    null;

  return {
    memberships: orderedMemberships,
    activeMembership,
    activeWorkshop: activeMembership?.workshop || null,
  };
}
