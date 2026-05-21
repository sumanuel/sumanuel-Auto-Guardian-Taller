import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";

const diagnosticsCollection = firestoreCollections.diagnostics;

function normalizeOptional(value) {
  return value?.trim() || "";
}

function normalizeListInput(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const diagnosticStatusOptions = [
  { key: "received", label: "Recibido" },
  { key: "in-review", label: "En revision" },
  { key: "quoted", label: "Cotizado" },
  { key: "approved", label: "Aprobado" },
];

export async function listDiagnostics() {
  const collectionRef = collection(firestore, diagnosticsCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("sequentialId", "desc")),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

export async function createDiagnostic({
  clientId,
  vehicleId,
  openedByUid,
  assignedMechanicUid,
  status,
  concerns,
  serviceItemsText,
  sparePartsText,
  notes,
}) {
  return createEntityRecord("diagnostics", {
    clientId: normalizeOptional(clientId),
    vehicleId: normalizeOptional(vehicleId),
    openedByUid: normalizeOptional(openedByUid),
    assignedMechanicUid: normalizeOptional(assignedMechanicUid),
    status: normalizeOptional(status) || "received",
    concerns: normalizeOptional(concerns),
    serviceItems: normalizeListInput(serviceItemsText),
    spareParts: normalizeListInput(sparePartsText),
    notes: normalizeOptional(notes),
    photos: [],
  });
}

export async function updateDiagnostic(diagnosticId, payload) {
  await patchEntityRecord("diagnostics", diagnosticId, {
    clientId: normalizeOptional(payload.clientId),
    vehicleId: normalizeOptional(payload.vehicleId),
    assignedMechanicUid: normalizeOptional(payload.assignedMechanicUid),
    status: normalizeOptional(payload.status) || "received",
    concerns: normalizeOptional(payload.concerns),
    serviceItems: normalizeListInput(payload.serviceItemsText),
    spareParts: normalizeListInput(payload.sparePartsText),
    notes: normalizeOptional(payload.notes),
  });
}

export async function deleteDiagnostic(diagnosticId) {
  await deleteEntityRecord("diagnostics", diagnosticId);
}

export function createEmptyDiagnosticForm(initialValues = {}) {
  return {
    clientId: initialValues.clientId || "",
    vehicleId: initialValues.vehicleId || "",
    assignedMechanicUid: initialValues.assignedMechanicUid || "",
    status: initialValues.status || "received",
    concerns: initialValues.concerns || "",
    serviceItemsText: Array.isArray(initialValues.serviceItems)
      ? initialValues.serviceItems.join("\n")
      : initialValues.serviceItemsText || "",
    sparePartsText: Array.isArray(initialValues.spareParts)
      ? initialValues.spareParts.join("\n")
      : initialValues.sparePartsText || "",
    notes: initialValues.notes || "",
  };
}
