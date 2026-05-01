import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../firebase/config";

const COUNTERS_COLLECTION = "_counters";

const formatSequentialId = (value, { prefix = "", padding = 0 } = {}) => {
  const rawValue = String(value);
  const paddedValue = padding > 0 ? rawValue.padStart(padding, "0") : rawValue;
  return `${prefix}${paddedValue}`;
};

export async function reserveSequentialId(counterKey, options = {}) {
  const { startAt = 1, prefix = "", padding = 0 } = options;
  const counterRef = doc(firestore, COUNTERS_COLLECTION, counterKey);

  return runTransaction(firestore, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);
    const currentValue = counterSnapshot.exists()
      ? Number(counterSnapshot.data().value || startAt - 1)
      : startAt - 1;
    const nextValue = currentValue + 1;

    transaction.set(
      counterRef,
      {
        key: counterKey,
        value: nextValue,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      sequence: nextValue,
      id: formatSequentialId(nextValue, { prefix, padding }),
    };
  });
}

export async function createSequentialDocument(
  collectionName,
  data,
  options = {},
) {
  const {
    counterKey = collectionName,
    prefix = "",
    padding = 0,
    startAt = 1,
  } = options;

  return runTransaction(firestore, async (transaction) => {
    const counterRef = doc(firestore, COUNTERS_COLLECTION, counterKey);
    const counterSnapshot = await transaction.get(counterRef);
    const currentValue = counterSnapshot.exists()
      ? Number(counterSnapshot.data().value || startAt - 1)
      : startAt - 1;
    const nextValue = currentValue + 1;
    const documentId = formatSequentialId(nextValue, { prefix, padding });
    const documentRef = doc(firestore, collectionName, documentId);
    const existingDocument = await transaction.get(documentRef);

    if (existingDocument.exists()) {
      throw new Error(
        `El documento ${documentId} ya existe en ${collectionName}.`,
      );
    }

    transaction.set(counterRef, {
      key: counterKey,
      value: nextValue,
      updatedAt: serverTimestamp(),
    });

    transaction.set(documentRef, {
      ...data,
      id: documentId,
      sequentialId: nextValue,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: documentId,
      sequentialId: nextValue,
      ...data,
    };
  });
}

export async function getLastSequentialDocuments(
  collectionName,
  pageSize = 20,
) {
  const collectionRef = collection(firestore, collectionName);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("sequentialId", "desc"), limit(pageSize)),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}
