import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { INVITATION_STATUSES } from "../../constants/accessControl";
import { firestore } from "../firebase/config";
import { firestoreCollections } from "../firestore/collections";

const invitationCollection = firestoreCollections.staffInvitations;

export function normalizeInvitationCode(invitationCode) {
  return invitationCode.trim().toUpperCase();
}

export function normalizeInvitationEmail(email) {
  return email.trim().toLowerCase();
}

export async function getInvitationByEmail(email) {
  const normalizedEmail = normalizeInvitationEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const documentRef = doc(
    firestore,
    invitationCollection.name,
    normalizedEmail,
  );
  let snapshot;

  try {
    snapshot = await getDoc(documentRef);
  } catch (error) {
    // During auth bootstrap, missing permission on invitations should not block profile loading.
    if (error?.code === "permission-denied") {
      return null;
    }

    throw error;
  }

  if (!snapshot.exists()) {
    return null;
  }

  return {
    refId: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getPendingInvitationByEmail(email) {
  const invitation = await getInvitationByEmail(email);

  if (!invitation) {
    return null;
  }

  if (invitation.status !== INVITATION_STATUSES.PENDING) {
    return null;
  }

  if (
    invitation.expiresAt?.toDate &&
    invitation.expiresAt.toDate() < new Date()
  ) {
    return null;
  }

  return invitation;
}

export function assertInvitationCanBeUsed(invitation, email, invitationCode) {
  if (!invitation) {
    throw new Error("La invitación no existe o ya no está disponible.");
  }

  if (invitation.status !== INVITATION_STATUSES.PENDING) {
    throw new Error("La invitación ya no está disponible para activación.");
  }

  if (
    invitation.expiresAt?.toDate &&
    invitation.expiresAt.toDate() < new Date()
  ) {
    throw new Error("La invitación ya venció.");
  }

  if (
    invitation.emailNormalized?.trim().toLowerCase() !==
    email.trim().toLowerCase()
  ) {
    throw new Error("El correo no coincide con la invitación registrada.");
  }

  if (
    invitationCode?.trim() &&
    invitation.id !== normalizeInvitationCode(invitationCode) &&
    invitation.invitationCode !== normalizeInvitationCode(invitationCode)
  ) {
    throw new Error(
      "El código de invitación no coincide con el correo registrado.",
    );
  }
}

export async function markInvitationAccepted(invitationId, acceptedByUid) {
  const documentRef = doc(firestore, invitationCollection.name, invitationId);
  await updateDoc(documentRef, {
    status: INVITATION_STATUSES.ACCEPTED,
    acceptedByUid,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
