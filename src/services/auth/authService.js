import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { REGISTRATION_POLICY } from "../../constants/accessControl";
import { auth } from "../firebase/config";
import {
  assertInvitationCanBeUsed,
  getInvitationByEmail,
  markInvitationAccepted,
} from "./invitations";
import {
  createManualUserProfile,
  createUserProfileFromInvitation,
  getUserProfileByUid,
  updateUserProfileBasicInfo,
  updateUserProfileWorkshopContext,
} from "./userProfiles";
import { upsertWorkshopMembership } from "../workshops/workshopService";

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
    const pendingInvitation = await getInvitationByEmail(normalizedEmail);

    if (pendingInvitation?.status === "pending") {
      await updateProfile(credential.user, {
        displayName: fullName.trim(),
      });

      return {
        user: credential.user,
        profile: null,
        pendingInvitation,
      };
    }

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

export async function acceptPendingInvitationForCurrentUser({
  fullName,
  phone,
  invitationCode,
}) {
  const currentUser = auth.currentUser;

  if (!currentUser?.uid || !currentUser?.email) {
    throw new Error("Debes iniciar sesion para aceptar la invitacion.");
  }

  const normalizedEmail = normalizeEmail(currentUser.email);
  const invitation = await getInvitationByEmail(normalizedEmail);

  assertInvitationCanBeUsed(invitation, normalizedEmail, invitationCode || "");

  const resolvedName = fullName?.trim() || currentUser.displayName?.trim();

  if (!resolvedName) {
    throw new Error("Ingresa el nombre completo del colaborador.");
  }

  const existingProfile = await getUserProfileByUid(currentUser.uid);
  const resolvedPhone = phone?.trim() || existingProfile?.phone || "";
  let profile = existingProfile;

  if (existingProfile) {
    await updateUserProfileBasicInfo(currentUser.uid, {
      fullName: resolvedName,
      phone: resolvedPhone,
    });
    await updateUserProfileWorkshopContext(currentUser.uid, {
      defaultWorkshopId:
        invitation.workshopId || existingProfile.defaultWorkshopId || null,
      role: invitation.role,
    });
    profile = await getUserProfileByUid(currentUser.uid);
  } else {
    profile = await createUserProfileFromInvitation({
      uid: currentUser.uid,
      email: normalizedEmail,
      fullName: resolvedName,
      phone: resolvedPhone,
      role: invitation.role,
      invitationId: invitation.refId,
      defaultWorkshopId: invitation.workshopId || null,
      requiresInternalApproval: REGISTRATION_POLICY.requiresInternalApproval,
    });
  }

  const membership = invitation.workshopId
    ? await upsertWorkshopMembership({
        workshopId: invitation.workshopId,
        userUid: currentUser.uid,
        role: invitation.role,
        status: profile.status,
        invitationId: invitation.refId,
        invitedByUid: invitation.invitedByUid,
      })
    : null;

  await updateProfile(currentUser, {
    displayName: resolvedName,
  });
  await markInvitationAccepted(invitation.refId, currentUser.uid);

  return {
    user: currentUser,
    profile,
    invitation,
    membership,
  };
}

export async function registerUserFromInvitation({
  invitationCode,
  fullName,
  phone,
  email,
  password,
}) {
  const normalizedEmail = normalizeEmail(email);
  const invitation = await getInvitationByEmail(normalizedEmail);

  assertInvitationCanBeUsed(invitation, normalizedEmail, invitationCode);

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
      phone: phone?.trim() || "",
      role: invitation.role,
      invitationId: invitation.refId,
      defaultWorkshopId: invitation.workshopId || null,
      requiresInternalApproval: REGISTRATION_POLICY.requiresInternalApproval,
    });
    const membership = invitation.workshopId
      ? await upsertWorkshopMembership({
          workshopId: invitation.workshopId,
          userUid: credential.user.uid,
          role: invitation.role,
          status: profile.status,
          invitationId: invitation.refId,
          invitedByUid: invitation.invitedByUid,
        })
      : null;

    await markInvitationAccepted(invitation.refId, credential.user.uid);

    return {
      user: credential.user,
      profile,
      invitation,
      membership,
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
