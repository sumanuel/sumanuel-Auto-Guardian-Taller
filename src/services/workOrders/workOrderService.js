import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  getEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import {
  closeDiagnostic,
  isDiagnosticClosed,
} from "../diagnostics/diagnosticService";

const workOrdersCollection = firestoreCollections.workOrders;

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
    progressPercent: 0,
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
    progressPercent: normalizeNumber(payload.progressPercent),
  });
}

export async function updateWorkOrderOperationalState(
  workOrderId,
  { status, progressPercent },
) {
  const currentWorkOrder = await getEntityRecord("workOrders", workOrderId);

  if (!currentWorkOrder) {
    throw new Error("No se encontro la orden a actualizar.");
  }

  const nextStatus = normalizeOptional(status);
  const nextProgressPercent = normalizeNumber(progressPercent);
  const payload = {};

  if (nextStatus) {
    payload.status = nextStatus;

    if (nextStatus === "approved" && !currentWorkOrder.approvedAt) {
      payload.approvedAt = serverTimestamp();
    }

    if (nextStatus === "in-progress" && !currentWorkOrder.startedAt) {
      payload.startedAt = serverTimestamp();
    }

    if (nextStatus === "ready" && !currentWorkOrder.finishedAt) {
      payload.finishedAt = serverTimestamp();
    }

    if (nextStatus === "delivered") {
      if (!currentWorkOrder.finishedAt) {
        payload.finishedAt = serverTimestamp();
      }

      if (!currentWorkOrder.deliveredAt) {
        payload.deliveredAt = serverTimestamp();
      }
    }
  }

  if (nextProgressPercent !== null) {
    payload.progressPercent = nextProgressPercent;
  }

  if (!Object.keys(payload).length) {
    return;
  }

  await patchEntityRecord("workOrders", workOrderId, payload);
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
