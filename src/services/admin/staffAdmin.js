import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  INVITATION_STATUSES,
  USER_ROLES,
  USER_STATUSES,
} from "../../constants/accessControl";
import { firestore } from "../firebase/config";
import { createEntityRecord, patchEntityRecord } from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import { queueMailMessage } from "../firestore/mailQueue";

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
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expiresInDays);

  const normalizedEmail = normalizeEmail(email);

  const createdInvitation = await createEntityRecord("staffInvitations", {
    email: normalizedEmail,
    role,
    status: INVITATION_STATUSES.PENDING,
    invitedByUid,
    acceptedByUid: null,
    expiresAt: Timestamp.fromDate(expirationDate),
    deliveryStatus: "queued",
  });

  const invitationCode = createdInvitation.id || createdInvitation.refId;
  const expirationLabel = expirationDate.toLocaleDateString("es-VE");

  try {
    await queueMailMessage({
      to: [normalizedEmail],
      subject: `Invitacion a Auto-Guardian Taller · ${invitationCode}`,
      text:
        `Hola.\n\n` +
        `Tu codigo de invitacion para Auto-Guardian Taller es ${invitationCode}.\n` +
        `Rol asignado: ${role}.\n` +
        `Vencimiento: ${expirationLabel}.\n\n` +
        `Abre la app, entra en Activar invitacion e ingresa ese codigo con este mismo correo.`,
      html:
        `<p>Hola.</p>` +
        `<p>Tu codigo de invitacion para <strong>Auto-Guardian Taller</strong> es <strong>${invitationCode}</strong>.</p>` +
        `<p>Rol asignado: <strong>${role}</strong><br/>Vencimiento: <strong>${expirationLabel}</strong></p>` +
        `<p>Abre la app, entra en <strong>Activar invitacion</strong> e ingresa ese codigo con este mismo correo.</p>`,
    });
  } catch (error) {
    await patchEntityRecord("staffInvitations", invitationCode, {
      deliveryStatus: "failed",
    });

    throw new Error(
      "La invitacion se creo, pero no se pudo encolar el correo. Verifica la extension Trigger Email de Firebase.",
    );
  }

  return createdInvitation;
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
        [USER_ROLES.ADMINISTRATOR, USER_ROLES.RECEPTION, USER_ROLES.MECHANIC].includes(
          profile.role,
        ),
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
