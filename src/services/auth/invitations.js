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
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    refId: snapshot.id,
    ...snapshot.data(),
  };
}

export function assertInvitationCanBeUsed(invitation, email, invitationCode) {
  if (!invitation) {
    throw new Error("La invitacion no existe o ya no esta disponible.");
  }

  if (invitation.status !== INVITATION_STATUSES.PENDING) {
    throw new Error("La invitacion ya no esta disponible para activacion.");
  }

  if (
    invitation.expiresAt?.toDate &&
    invitation.expiresAt.toDate() < new Date()
  ) {
    throw new Error("La invitacion ya vencio.");
  }

  if (
    invitation.emailNormalized?.trim().toLowerCase() !==
    email.trim().toLowerCase()
  ) {
    throw new Error("El correo no coincide con la invitacion registrada.");
  }

  if (
    invitationCode?.trim() &&
    invitation.id !== normalizeInvitationCode(invitationCode) &&
    invitation.invitationCode !== normalizeInvitationCode(invitationCode)
  ) {
    throw new Error(
      "El codigo de invitacion no coincide con el correo registrado.",
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
