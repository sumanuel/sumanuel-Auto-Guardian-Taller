import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/config";
import { firestoreCollections } from "../firestore/collections";
import { getActiveWorkshopId } from "./workshopSession";
import { getWorkshopById, getWorkshopMembership } from "./workshopService";

const RESETTABLE_COLLECTION_KEYS = [
  "stockMovements",
  "spareParts",
  "progressEntries",
  "workOrders",
  "diagnostics",
  "vehicles",
  "clients",
  "stockItems",
];

function chunkItems(items, chunkSize = 400) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function ensureOwnerAccess(uid, workshopId) {
  const [membership, workshop] = await Promise.all([
    getWorkshopMembership(workshopId, uid),
    getWorkshopById(workshopId),
  ]);

  const isOwner =
    membership?.role === "owner" || workshop?.ownerUserUid === uid;

  if (!isOwner) {
    throw new Error(
      "Solo el propietario puede reiniciar los datos de este taller.",
    );
  }
}

async function deleteDocsForCollection(collectionName, workshopId) {
  const collectionRef = collection(firestore, collectionName);
  const snapshot = await getDocs(
    query(collectionRef, where("workshopId", "==", workshopId)),
  );

  const docRefs = snapshot.docs.map((item) => item.ref);

  for (const docChunk of chunkItems(docRefs)) {
    const batch = writeBatch(firestore);
    docChunk.forEach((docRef) => batch.delete(docRef));
    await batch.commit();
  }

  return snapshot.docs.length;
}

export async function resetActiveWorkshopDataForCurrentUser() {
  const uid = auth.currentUser?.uid || "";
  const workshopId = getActiveWorkshopId();

  if (!uid) {
    throw new Error("Debes iniciar sesion para reiniciar el taller.");
  }

  if (!workshopId) {
    throw new Error("No hay un taller activo para reiniciar.");
  }

  await ensureOwnerAccess(uid, workshopId);

  const deletedByCollection = {};
  let deletedDocuments = 0;

  for (const entityKey of RESETTABLE_COLLECTION_KEYS) {
    const collectionName = firestoreCollections[entityKey]?.name;

    if (!collectionName) {
      continue;
    }

    const deletedCount = await deleteDocsForCollection(collectionName, workshopId);
    deletedByCollection[entityKey] = deletedCount;
    deletedDocuments += deletedCount;
  }

  return {
    workshopId,
    deletedDocuments,
    deletedByCollection,
  };
}
