import { collection, getDocs, query, where } from "firebase/firestore";
import { firestore } from "../firebase/config";
import { createEntityRecord } from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";

const progressEntriesCollection = firestoreCollections.progressEntries;

function normalizeOptional(value) {
  return value?.trim() || "";
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

export const progressEntryTypeOptions = [
  { key: "note", label: "Nota" },
  { key: "status", label: "Estado" },
  { key: "parts", label: "Repuestos" },
  { key: "delivery", label: "Entrega" },
];

export async function listProgressEntriesByWorkOrderId(workOrderId) {
  if (!workOrderId) {
    return [];
  }

  const collectionRef = collection(firestore, progressEntriesCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("workOrderId", "==", workOrderId)),
  );

  return snapshot.docs
    .map((item) => ({
      refId: item.id,
      ...item.data(),
    }))
    .sort(
      (left, right) =>
        timestampToMillis(left.createdAt) - timestampToMillis(right.createdAt),
    );
}

export async function createProgressEntry({
  workOrderId,
  diagnosticId,
  vehicleId,
  authorUid,
  type,
  message,
  statusSnapshot,
}) {
  return createEntityRecord("progressEntries", {
    workOrderId: normalizeOptional(workOrderId),
    diagnosticId: normalizeOptional(diagnosticId),
    vehicleId: normalizeOptional(vehicleId),
    authorUid: normalizeOptional(authorUid),
    type: normalizeOptional(type) || "note",
    message: normalizeOptional(message),
    photos: [],
    statusSnapshot: normalizeOptional(statusSnapshot),
  });
}
