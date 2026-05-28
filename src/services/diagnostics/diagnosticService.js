import {
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  getEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import { requireActiveWorkshopId } from "../workshops/workshopSession";

const diagnosticsCollection = firestoreCollections.diagnostics;

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
  { key: "closed", label: "Cerrado" },
];

export function isDiagnosticClosed(status) {
  return normalizeOptional(status) === "closed";
}

export async function listDiagnostics() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, diagnosticsCollection.name);
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("workshopId", "==", activeWorkshopId),
      orderBy("sequentialId", "desc"),
    ),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

export async function findActiveDiagnosticByVehicleId(
  vehicleId,
  excludeDiagnosticId = "",
) {
  const activeWorkshopId = requireActiveWorkshopId();
  const normalizedVehicleId = normalizeOptional(vehicleId);

  if (!normalizedVehicleId) {
    return null;
  }

  const diagnostics = await listDiagnostics();

  return (
    diagnostics.find((diagnostic) => {
      const currentId = diagnostic.refId || diagnostic.id || "";

      return (
        normalizeOptional(diagnostic.vehicleId) === normalizedVehicleId &&
        normalizeOptional(diagnostic.workshopId) === activeWorkshopId &&
        !isDiagnosticClosed(diagnostic.status) &&
        currentId !== normalizeOptional(excludeDiagnosticId)
      );
    }) || null
  );
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
  quoteCost,
  notes,
}) {
  const workshopId = requireActiveWorkshopId();
  const existingActiveDiagnostic =
    await findActiveDiagnosticByVehicleId(vehicleId);

  if (existingActiveDiagnostic) {
    throw new Error(
      "Esta unidad ya tiene un diagnostico abierto. Debes editar ese mismo registro antes de crear otro.",
    );
  }

  return createEntityRecord("diagnostics", {
    workshopId,
    clientId: normalizeOptional(clientId),
    vehicleId: normalizeOptional(vehicleId),
    openedByUid: normalizeOptional(openedByUid),
    assignedMechanicUid: normalizeOptional(assignedMechanicUid),
    status: normalizeOptional(status) || "received",
    concerns: normalizeOptional(concerns),
    serviceItems: normalizeListInput(serviceItemsText),
    spareParts: normalizeListInput(sparePartsText),
    quoteCost: normalizeNumber(quoteCost),
    notes: normalizeOptional(notes),
    photos: [],
  });
}

export async function updateDiagnostic(diagnosticId, payload) {
  const workshopId = requireActiveWorkshopId();
  const currentDiagnostic = await getEntityRecord("diagnostics", diagnosticId);

  if (!currentDiagnostic || currentDiagnostic.workshopId !== workshopId) {
    throw new Error("No se encontro el diagnostico a actualizar.");
  }

  if (isDiagnosticClosed(currentDiagnostic.status)) {
    throw new Error("Este diagnostico ya esta cerrado y no se puede editar.");
  }

  const existingActiveDiagnostic = await findActiveDiagnosticByVehicleId(
    payload.vehicleId,
    diagnosticId,
  );

  if (existingActiveDiagnostic) {
    throw new Error(
      "Esta unidad ya tiene otro diagnostico abierto. Debes continuar con ese registro.",
    );
  }

  await patchEntityRecord("diagnostics", diagnosticId, {
    workshopId,
    clientId: normalizeOptional(payload.clientId),
    vehicleId: normalizeOptional(payload.vehicleId),
    assignedMechanicUid: normalizeOptional(payload.assignedMechanicUid),
    status: normalizeOptional(payload.status) || "received",
    concerns: normalizeOptional(payload.concerns),
    serviceItems: normalizeListInput(payload.serviceItemsText),
    spareParts: normalizeListInput(payload.sparePartsText),
    quoteCost: normalizeNumber(payload.quoteCost),
    notes: normalizeOptional(payload.notes),
  });
}

export async function closeDiagnostic(diagnosticId) {
  const workshopId = requireActiveWorkshopId();
  const currentDiagnostic = await getEntityRecord("diagnostics", diagnosticId);

  if (
    !currentDiagnostic ||
    currentDiagnostic.workshopId !== workshopId ||
    isDiagnosticClosed(currentDiagnostic.status)
  ) {
    return;
  }

  await patchEntityRecord("diagnostics", diagnosticId, {
    status: "closed",
    closedAt: serverTimestamp(),
  });
}

export async function deleteDiagnostic(diagnosticId) {
  const workshopId = requireActiveWorkshopId();
  const currentDiagnostic = await getEntityRecord("diagnostics", diagnosticId);

  if (!currentDiagnostic || currentDiagnostic.workshopId !== workshopId) {
    throw new Error("El diagnostico no pertenece al taller activo.");
  }

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
    quoteCost:
      initialValues.quoteCost === null || initialValues.quoteCost === undefined
        ? ""
        : String(initialValues.quoteCost),
    notes: initialValues.notes || "",
  };
}
