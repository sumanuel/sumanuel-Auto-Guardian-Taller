import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../firebase/config";
import { firestoreCollections } from "./collections";
import { createSequentialDocument } from "./sequentialIds";

const resolveCollection = (entityKey) => {
  const collectionConfig = firestoreCollections[entityKey];

  if (!collectionConfig) {
    throw new Error(`No existe configuracion de coleccion para ${entityKey}.`);
  }

  return collectionConfig;
};

export async function createEntityRecord(entityKey, payload) {
  const collectionConfig = resolveCollection(entityKey);

  if (collectionConfig.idStrategy === "auth-uid") {
    throw new Error(
      `La coleccion ${collectionConfig.name} requiere un documentId controlado por Firebase Auth.`,
    );
  }

  return createSequentialDocument(
    collectionConfig.name,
    payload,
    collectionConfig,
  );
}

export async function getEntityRecord(entityKey, documentId) {
  const collectionConfig = resolveCollection(entityKey);
  const documentRef = doc(firestore, collectionConfig.name, documentId);
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    refId: snapshot.id,
    ...snapshot.data(),
  };
}

export async function replaceEntityRecord(entityKey, documentId, payload) {
  const collectionConfig = resolveCollection(entityKey);
  const documentRef = doc(firestore, collectionConfig.name, documentId);

  await setDoc(
    documentRef,
    {
      ...payload,
      id: documentId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function patchEntityRecord(entityKey, documentId, payload) {
  const collectionConfig = resolveCollection(entityKey);
  const documentRef = doc(firestore, collectionConfig.name, documentId);

  await updateDoc(documentRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export function getEntityCollectionConfig(entityKey) {
  return resolveCollection(entityKey);
}
