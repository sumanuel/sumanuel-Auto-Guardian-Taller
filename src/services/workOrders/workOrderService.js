import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import {
  closeDiagnostic,
  isDiagnosticClosed,
} from "../diagnostics/diagnosticService";
import { getEntityRecord } from "../firestore/repository";

const workOrdersCollection = firestoreCollections.workOrders;

function normalizeOptional(value) {
  return value?.trim() || "";
}

function normalizeUidList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const workOrderStatusOptions = [
  { key: "open", label: "Abierta" },
  { key: "approved", label: "Aprobada" },
  { key: "in-progress", label: "En proceso" },
  { key: "paused", label: "En pausa" },
  { key: "ready", label: "Lista" },
  { key: "delivered", label: "Entregada" },
];

export async function listWorkOrders() {
  const collectionRef = collection(firestore, workOrdersCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("sequentialId", "desc")),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

export async function createWorkOrder({
  diagnosticId,
  vehicleId,
  clientId,
  assignedMechanicUids,
  assignedMechanicIdsText,
  status,
}) {
  const normalizedDiagnosticId = normalizeOptional(diagnosticId);

  if (normalizedDiagnosticId) {
    const diagnostic = await getEntityRecord(
      "diagnostics",
      normalizedDiagnosticId,
    );

    if (!diagnostic) {
      throw new Error("No se encontro el diagnostico base de la orden.");
    }

    if (isDiagnosticClosed(diagnostic.status)) {
      throw new Error(
        "Este diagnostico ya esta cerrado y no admite una nueva orden.",
      );
    }
  }

  const createdWorkOrder = await createEntityRecord("workOrders", {
    diagnosticId: normalizeOptional(diagnosticId),
    vehicleId: normalizeOptional(vehicleId),
    clientId: normalizeOptional(clientId),
    assignedMechanicUids: normalizeUidList(
      assignedMechanicUids || assignedMechanicIdsText,
    ),
    status: normalizeOptional(status) || "open",
    approvedAt: null,
    startedAt: null,
    finishedAt: null,
    deliveredAt: null,
  });

  if (normalizedDiagnosticId) {
    await closeDiagnostic(normalizedDiagnosticId);
  }

  return createdWorkOrder;
}

export async function updateWorkOrder(workOrderId, payload) {
  await patchEntityRecord("workOrders", workOrderId, {
    diagnosticId: normalizeOptional(payload.diagnosticId),
    vehicleId: normalizeOptional(payload.vehicleId),
    clientId: normalizeOptional(payload.clientId),
    assignedMechanicUids: normalizeUidList(
      payload.assignedMechanicUids || payload.assignedMechanicIdsText,
    ),
    status: normalizeOptional(payload.status) || "open",
  });
}

export async function deleteWorkOrder(workOrderId) {
  await deleteEntityRecord("workOrders", workOrderId);
}

export function createEmptyWorkOrderForm(initialValues = {}) {
  return {
    diagnosticId: initialValues.diagnosticId || "",
    vehicleId: initialValues.vehicleId || "",
    clientId: initialValues.clientId || "",
    assignedMechanicUids: Array.isArray(initialValues.assignedMechanicUids)
      ? initialValues.assignedMechanicUids.filter(Boolean)
      : normalizeUidList(initialValues.assignedMechanicIdsText),
    assignedMechanicIdsText: Array.isArray(initialValues.assignedMechanicUids)
      ? initialValues.assignedMechanicUids.join(", ")
      : initialValues.assignedMechanicIdsText || "",
    status: initialValues.status || "open",
  };
}
