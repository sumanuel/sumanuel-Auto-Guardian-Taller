import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";

const sparePartsCollection = firestoreCollections.spareParts;

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

export const sparePartStatusOptions = [
  { key: "requested", label: "Solicitado" },
  { key: "approved", label: "Aprobado" },
  { key: "ordered", label: "Pedido" },
  { key: "received", label: "Recibido" },
  { key: "installed", label: "Instalado" },
];

export async function listSpareParts() {
  const collectionRef = collection(firestore, sparePartsCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("sequentialId", "desc")),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

export async function createSparePart({
  diagnosticId,
  workOrderId,
  name,
  quantity,
  unitCost,
  supplier,
  status,
}) {
  return createEntityRecord("spareParts", {
    diagnosticId: normalizeOptional(diagnosticId),
    workOrderId: normalizeOptional(workOrderId),
    name: normalizeOptional(name),
    quantity: normalizeNumber(quantity),
    unitCost: normalizeNumber(unitCost),
    supplier: normalizeOptional(supplier),
    status: normalizeOptional(status) || "requested",
  });
}

export async function updateSparePart(sparePartId, payload) {
  await patchEntityRecord("spareParts", sparePartId, {
    diagnosticId: normalizeOptional(payload.diagnosticId),
    workOrderId: normalizeOptional(payload.workOrderId),
    name: normalizeOptional(payload.name),
    quantity: normalizeNumber(payload.quantity),
    unitCost: normalizeNumber(payload.unitCost),
    supplier: normalizeOptional(payload.supplier),
    status: normalizeOptional(payload.status) || "requested",
  });
}

export async function deleteSparePart(sparePartId) {
  await deleteEntityRecord("spareParts", sparePartId);
}

export function createEmptySparePartForm(initialValues = {}) {
  return {
    diagnosticId: initialValues.diagnosticId || "",
    workOrderId: initialValues.workOrderId || "",
    name: initialValues.name || "",
    quantity:
      initialValues.quantity === null || initialValues.quantity === undefined
        ? ""
        : String(initialValues.quantity),
    unitCost:
      initialValues.unitCost === null || initialValues.unitCost === undefined
        ? ""
        : String(initialValues.unitCost),
    supplier: initialValues.supplier || "",
    status: initialValues.status || "requested",
  };
}
