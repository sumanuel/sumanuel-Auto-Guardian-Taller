import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  REGISTRATION_POLICY,
  USER_ROLES,
  USER_STATUSES,
} from "../../constants/accessControl";
import { userProfileModel } from "../../constants/domainModels";
import { firestore } from "../firebase/config";
import { firestoreCollections } from "../firestore/collections";
import { reserveSequentialId } from "../firestore/sequentialIds";

const userProfileCollection = firestoreCollections.userProfiles;

export async function getUserProfileByUid(uid) {
  const documentRef = doc(firestore, userProfileCollection.name, uid);
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    refId: snapshot.id,
    ...snapshot.data(),
  };
}

export async function createUserProfileFromInvitation({
  uid,
  email,
  fullName,
  phone,
  role,
  invitationId,
}) {
  const userCodeReservation = await reserveSequentialId(
    userProfileCollection.counterKey,
    {
      prefix: userProfileCollection.prefix,
      padding: userProfileCollection.padding,
    },
  );

  const documentRef = doc(firestore, userProfileCollection.name, uid);
  const nextStatus = REGISTRATION_POLICY.requiresInternalApproval
    ? USER_STATUSES.PENDING_APPROVAL
    : USER_STATUSES.ACTIVE;

  const profilePayload = {
    uid,
    userCode: userCodeReservation.id,
    fullName,
    email,
    phone,
    role,
    status: nextStatus,
    invitationId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(documentRef, profilePayload, { merge: true });

  return {
    uid,
    ...profilePayload,
  };
}

export async function touchUserProfileLogin(uid) {
  const documentRef = doc(firestore, userProfileCollection.name, uid);
  await updateDoc(documentRef, {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function promoteSelfProfileToAdministrator(uid) {
  const documentRef = doc(firestore, userProfileCollection.name, uid);
  await updateDoc(documentRef, {
    role: USER_ROLES.ADMINISTRATOR,
    updatedAt: serverTimestamp(),
  });
}

export async function createManualUserProfile({
  uid,
  email,
  fullName,
  phone,
  role,
  status,
}) {
  const resolvedStatus =
    status ||
    (REGISTRATION_POLICY.requiresInternalApproval
      ? USER_STATUSES.PENDING_APPROVAL
      : USER_STATUSES.ACTIVE);

  const profilePayload = {
    uid,
    email,
    fullName,
    phone: phone || "",
    role: role || REGISTRATION_POLICY.defaultPublicRole || USER_ROLES.RECEPTION,
    status: resolvedStatus,
  };

  return createUserProfileFromInvitation({
    ...profilePayload,
    invitationId: null,
  });
}
