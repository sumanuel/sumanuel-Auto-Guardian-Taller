import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  INVITATION_STATUSES,
  USER_ROLES,
  USER_STATUSES,
} from "../../constants/accessControl";
import { firestore } from "../firebase/config";
import { firestoreCollections } from "../firestore/collections";
import { reserveSequentialId } from "../firestore/sequentialIds";

const invitationCollection = firestoreCollections.staffInvitations;
const userProfileCollection = firestoreCollections.userProfiles;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function timestampToMillis(value) {
  if (value?.toMillis) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

function sortByCreatedAtDesc(items) {
  return [...items].sort(
    (left, right) =>
      timestampToMillis(right.createdAt) - timestampToMillis(left.createdAt),
  );
}

function sortProfiles(items) {
  return [...items].sort((left, right) => {
    const leftName = `${left.fullName || ""} ${left.userCode || ""}`.trim();
    const rightName = `${right.fullName || ""} ${right.userCode || ""}`.trim();
    return leftName.localeCompare(rightName, "es");
  });
}

export async function createStaffInvitation({
  email,
  role,
  invitedByUid,
  expiresInDays = 7,
}) {
  const normalizedEmail = normalizeEmail(email);
  const invitationRef = doc(
    firestore,
    invitationCollection.name,
    normalizedEmail,
  );
  const existingInvitation = await getDoc(invitationRef);

  if (
    existingInvitation.exists() &&
    existingInvitation.data()?.status === INVITATION_STATUSES.PENDING
  ) {
    throw new Error("Ya existe una invitacion pendiente para ese correo.");
  }

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expiresInDays);
  const invitationReservation = await reserveSequentialId(
    invitationCollection.counterKey,
    {
      prefix: invitationCollection.prefix,
      padding: invitationCollection.padding,
    },
  );
  const invitationCode = invitationReservation.id;

  await setDoc(
    invitationRef,
    {
      id: invitationCode,
      invitationCode,
      sequentialId: invitationReservation.sequence,
      email: normalizedEmail,
      emailNormalized: normalizedEmail,
      role,
      status: INVITATION_STATUSES.PENDING,
      invitedByUid,
      acceptedByUid: null,
      expiresAt: Timestamp.fromDate(expirationDate),
      deliveryStatus: "in_app",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    refId: normalizedEmail,
    id: invitationCode,
    invitationCode,
    sequentialId: invitationReservation.sequence,
    email: normalizedEmail,
    emailNormalized: normalizedEmail,
    role,
    status: INVITATION_STATUSES.PENDING,
    invitedByUid,
    acceptedByUid: null,
    expiresAt: Timestamp.fromDate(expirationDate),
    deliveryStatus: "in_app",
  };
}

export async function listPendingInvitations(pageSize = 10) {
  const collectionRef = collection(firestore, invitationCollection.name);
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("status", "==", INVITATION_STATUSES.PENDING),
      limit(pageSize),
    ),
  );

  return sortByCreatedAtDesc(
    snapshot.docs.map((item) => ({
      refId: item.id,
      ...item.data(),
    })),
  );
}

export async function cancelStaffInvitation(invitationId) {
  await patchEntityRecord("staffInvitations", invitationId, {
    status: INVITATION_STATUSES.CANCELLED,
  });
}

export async function listPendingApprovals(pageSize = 10) {
  const collectionRef = collection(firestore, userProfileCollection.name);
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("status", "==", USER_STATUSES.PENDING_APPROVAL),
      limit(pageSize),
    ),
  );

  return sortByCreatedAtDesc(
    snapshot.docs.map((item) => ({
      refId: item.id,
      ...item.data(),
    })),
  );
}

export async function approveUserProfile(uid) {
  const documentRef = doc(firestore, userProfileCollection.name, uid);
  await updateDoc(documentRef, {
    status: USER_STATUSES.ACTIVE,
    updatedAt: serverTimestamp(),
  });
}

export async function listStaffProfiles() {
  const collectionRef = collection(firestore, userProfileCollection.name);
  const snapshot = await getDocs(query(collectionRef, limit(100)));

  return sortProfiles(
    snapshot.docs
      .map((item) => ({
        refId: item.id,
        ...item.data(),
      }))
      .filter((profile) =>
        [
          USER_ROLES.ADMINISTRATOR,
          USER_ROLES.RECEPTION,
          USER_ROLES.MECHANIC,
        ].includes(profile.role),
      ),
  );
}

export async function updateStaffProfile(uid, payload) {
  const documentRef = doc(firestore, userProfileCollection.name, uid);
  await updateDoc(documentRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}
