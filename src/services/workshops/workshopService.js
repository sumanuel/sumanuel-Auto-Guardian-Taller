import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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
    String(left.workshopName || left.name || left.workshopId || "").localeCompare(
      String(right.workshopName || right.name || right.workshopId || ""),
      "es",
    ),
  );
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

  const documentRef = doc(firestore, workshopCollection.name, normalizedWorkshopId);
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
  const normalizedUserUid = normalizeOptional(userUid);

  if (!normalizedUserUid) {
    return [];
  }

  const collectionRef = collection(firestore, membershipCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("userUid", "==", normalizedUserUid)),
  );

  return sortByWorkshopName(
    snapshot.docs.map((item) => ({
      refId: item.id,
      ...item.data(),
    })),
  );
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
  const existingMemberships = await listUserWorkshopMemberships(uid);

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