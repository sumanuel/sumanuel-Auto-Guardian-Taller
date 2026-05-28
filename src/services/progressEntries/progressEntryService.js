import { collection, getDocs, query, where } from "firebase/firestore";
import { firestore } from "../firebase/config";
import { createEntityRecord } from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import { getEntityRecord } from "../firestore/repository";
import { requireActiveWorkshopId } from "../workshops/workshopSession";

const progressEntriesCollection = firestoreCollections.progressEntries;

function normalizeOptional(value) {
  return value?.trim() || "";
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeSparePartUpdates(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      sparePartId: normalizeOptional(item?.sparePartId),
      sparePartName: normalizeOptional(item?.sparePartName),
      status: normalizeOptional(item?.status),
    }))
    .filter((item) => item.sparePartId && item.status);
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

  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, progressEntriesCollection.name);
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("workshopId", "==", activeWorkshopId),
      where("workOrderId", "==", workOrderId),
    ),
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
  progressPercent,
  sparePartUpdates,
  deliveryClosedOrder,
}) {
  const workshopId = requireActiveWorkshopId();
  const normalizedWorkOrderId = normalizeOptional(workOrderId);

  if (!normalizedWorkOrderId) {
    throw new Error("El avance debe estar asociado a una orden valida.");
  }

  const workOrder = await getEntityRecord("workOrders", normalizedWorkOrderId);

  if (!workOrder || workOrder.workshopId !== workshopId) {
    throw new Error("La orden del avance no pertenece al taller activo.");
  }

  return createEntityRecord("progressEntries", {
    workshopId,
    workOrderId: normalizedWorkOrderId,
    diagnosticId:
      normalizeOptional(diagnosticId) ||
      normalizeOptional(workOrder.diagnosticId),
    vehicleId:
      normalizeOptional(vehicleId) || normalizeOptional(workOrder.vehicleId),
    authorUid: normalizeOptional(authorUid),
    type: normalizeOptional(type) || "note",
    message: normalizeOptional(message),
    photos: [],
    statusSnapshot: normalizeOptional(statusSnapshot),
    progressPercent: normalizeNumber(progressPercent),
    sparePartUpdates: normalizeSparePartUpdates(sparePartUpdates),
    deliveryClosedOrder: Boolean(deliveryClosedOrder),
  });
}
