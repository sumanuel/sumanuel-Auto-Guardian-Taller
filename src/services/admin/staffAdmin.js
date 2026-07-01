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
import { auth, firestore } from "../firebase/config";
import { patchEntityRecord } from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import { reserveSequentialId } from "../firestore/sequentialIds";
import { getActiveWorkshopId } from "../workshops/workshopSession";
import {
  getWorkshopMembership,
  listWorkshopMemberships,
  upsertWorkshopMembership,
} from "../workshops/workshopService";
import { getUserProfileByUid } from "../auth/userProfiles";

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

function isPermissionDeniedError(error) {
  return error?.code === "permission-denied";
}

async function getCurrentUserProfileForActiveWorkshop(activeWorkshopId) {
  const currentUserUid = auth.currentUser?.uid || "";

  if (!activeWorkshopId || !currentUserUid) {
    return [];
  }

  const [membership, profile] = await Promise.all([
    getWorkshopMembership(activeWorkshopId, currentUserUid),
    getUserProfileByUid(currentUserUid),
  ]);

  if (!membership || !profile) {
    return [];
  }

  return [
    {
      ...profile,
      role: membership.role || profile.role,
      membershipStatus: membership.status,
      workshopId: membership.workshopId,
    },
  ];
}

async function listProfilesForActiveWorkshop() {
  const activeWorkshopId = getActiveWorkshopId();

  if (!activeWorkshopId) {
    return [];
  }

  let profiles;

  try {
    const memberships = await listWorkshopMemberships(activeWorkshopId);
    profiles = await Promise.all(
      memberships.map(async (membership) => {
        const profile = await getUserProfileByUid(membership.userUid);

        if (!profile) {
          return null;
        }

        return {
          ...profile,
          role: membership.role || profile.role,
          membershipStatus: membership.status,
          workshopId: membership.workshopId,
        };
      }),
    );
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      throw error;
    }

    profiles = await getCurrentUserProfileForActiveWorkshop(activeWorkshopId);
  }

  return sortProfiles(
    profiles
      .filter(Boolean)
      .filter((profile) =>
        [
          USER_ROLES.OWNER,
          USER_ROLES.ADMINISTRATOR,
          USER_ROLES.RECEPTION,
          USER_ROLES.MECHANIC,
        ].includes(profile.role),
      ),
  );
}

export async function createStaffInvitation({
  email,
  role,
  invitedByUid,
  workshopId,
  workshopName,
  expiresInDays = 7,
}) {
  const normalizedEmail = normalizeEmail(email);

  if (!workshopId) {
    throw new Error(
      "Selecciona un taller activo antes de invitar colaboradores.",
    );
  }

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
      workshopId,
      workshopName: workshopName || "Taller",
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
    workshopId,
    workshopName: workshopName || "Taller",
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
  const activeWorkshopId = getActiveWorkshopId();

  if (!activeWorkshopId) {
    return [];
  }

  const collectionRef = collection(firestore, invitationCollection.name);
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("workshopId", "==", activeWorkshopId),
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
  const profiles = await listProfilesForActiveWorkshop();

  return profiles
    .filter((profile) => profile.status === USER_STATUSES.PENDING_APPROVAL)
    .slice(0, pageSize);
}

export async function approveUserProfile(uid) {
  const documentRef = doc(firestore, userProfileCollection.name, uid);
  await updateDoc(documentRef, {
    status: USER_STATUSES.ACTIVE,
    updatedAt: serverTimestamp(),
  });
}

export async function listStaffProfiles() {
  return listProfilesForActiveWorkshop();
}

export async function listMechanicProfiles() {
  const profiles = await listStaffProfiles();

  return profiles.filter(
    (profile) =>
      profile.role === USER_ROLES.MECHANIC &&
      [USER_STATUSES.ACTIVE, USER_STATUSES.PENDING_APPROVAL].includes(
        profile.status,
      ),
  );
}

export async function updateStaffProfile(uid, payload) {
  const activeWorkshopId = getActiveWorkshopId();

  if (!activeWorkshopId) {
    throw new Error("No hay un taller activo para actualizar el colaborador.");
  }

  const currentMembership = await getWorkshopMembership(activeWorkshopId, uid);

  if (!currentMembership) {
    throw new Error("La membresia del colaborador no existe en este taller.");
  }

  const currentActorUid = auth.currentUser?.uid || "";
  const currentActorMembership = currentActorUid
    ? await getWorkshopMembership(activeWorkshopId, currentActorUid)
    : null;

  if (
    currentActorMembership?.role === USER_ROLES.ADMINISTRATOR &&
    currentMembership.role === USER_ROLES.OWNER
  ) {
    throw new Error(
      "Un administrador no puede editar ni suspender la ficha del dueno del taller.",
    );
  }

  const documentRef = doc(firestore, userProfileCollection.name, uid);
  const profilePayload = {
    updatedAt: serverTimestamp(),
  };

  if (payload.fullName !== undefined) {
    profilePayload.fullName = payload.fullName;
  }

  if (payload.phone !== undefined) {
    profilePayload.phone = payload.phone;
  }

  if (payload.status !== undefined) {
    profilePayload.status = payload.status;
  }

  await updateDoc(documentRef, profilePayload);

  if (payload.status !== undefined) {
    await upsertWorkshopMembership({
      workshopId: activeWorkshopId,
      userUid: uid,
      role: currentMembership.role,
      status: payload.status,
      invitationId: currentMembership.invitationId,
      invitedByUid: currentMembership.invitedByUid,
      acceptedAt: currentMembership.acceptedAt,
    });
  }

  if (payload.role !== undefined) {
    await upsertWorkshopMembership({
      workshopId: activeWorkshopId,
      userUid: uid,
      role: payload.role,
      status: currentMembership.status,
      invitationId: currentMembership.invitationId,
      invitedByUid: currentMembership.invitedByUid,
      acceptedAt: currentMembership.acceptedAt,
    });
  }
}
