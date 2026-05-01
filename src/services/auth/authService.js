import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { REGISTRATION_POLICY } from "../../constants/accessControl";
import { auth } from "../firebase/config";
import {
  assertInvitationCanBeUsed,
  getInvitationByCode,
  markInvitationAccepted,
} from "./invitations";
import {
  createManualUserProfile,
  createUserProfileFromInvitation,
} from "./userProfiles";

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function signInWithCredentials({ email, password }) {
  return signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}

export async function sendPasswordRecovery(email) {
  return sendPasswordResetEmail(auth, normalizeEmail(email));
}

export async function signOutUserSession() {
  return signOut(auth);
}

export async function signUpWithProfile({ fullName, email, password, phone }) {
  if (!REGISTRATION_POLICY.allowPublicSignUp) {
    throw new Error("El registro publico no esta habilitado.");
  }

  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );

  try {
    const profile = await createManualUserProfile({
      uid: credential.user.uid,
      email: normalizedEmail,
      fullName: fullName.trim(),
      phone: phone?.trim() || "",
    });

    return {
      user: credential.user,
      profile,
    };
  } catch (error) {
    try {
      await deleteUser(credential.user);
    } catch (deleteError) {
      console.error("No se pudo revertir el usuario de Auth:", deleteError);
    }

    throw error;
  }
}

export async function registerUserFromInvitation({
  invitationCode,
  fullName,
  phone,
  email,
  password,
}) {
  const normalizedEmail = normalizeEmail(email);
  const invitation = await getInvitationByCode(invitationCode);

  assertInvitationCanBeUsed(invitation, normalizedEmail);

  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );

  try {
    const profile = await createUserProfileFromInvitation({
      uid: credential.user.uid,
      email: normalizedEmail,
      fullName: fullName.trim(),
      phone: phone.trim(),
      role: invitation.role,
      invitationId: invitation.refId,
      requiresInternalApproval: REGISTRATION_POLICY.requiresInternalApproval,
    });

    await markInvitationAccepted(invitation.refId, credential.user.uid);

    return {
      user: credential.user,
      profile,
      invitation,
    };
  } catch (error) {
    try {
      await deleteUser(credential.user);
    } catch (deleteError) {
      console.error("No se pudo revertir el usuario de Auth:", deleteError);
    }

    throw error;
  }
}
