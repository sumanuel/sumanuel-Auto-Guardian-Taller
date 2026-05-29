import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
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
import { requireActiveWorkshopId } from "../workshops/workshopSession";

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

function normalizeWorkOrderStatus(value) {
  const normalizedStatus = normalizeOptional(value);

  if (!normalizedStatus || normalizedStatus === "approved") {
    return "open";
  }

  return normalizedStatus;
}

export const workOrderStatusOptions = [
  { key: "open", label: "Abierta" },
  { key: "in-progress", label: "En proceso" },
  { key: "paused", label: "En pausa" },
  { key: "ready", label: "Lista" },
  { key: "delivered", label: "Entregada" },
];

export async function listWorkOrders() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, workOrdersCollection.name);
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
    status: normalizeWorkOrderStatus(item.data().status),
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
  const workshopId = requireActiveWorkshopId();
  const normalizedDiagnosticId = normalizeOptional(diagnosticId);

  if (normalizedDiagnosticId) {
    const diagnostic = await getEntityRecord(
      "diagnostics",
      normalizedDiagnosticId,
    );

    if (!diagnostic || diagnostic.workshopId !== workshopId) {
      throw new Error("No se encontro el diagnostico base de la orden.");
    }

    if (isDiagnosticClosed(diagnostic.status)) {
      throw new Error(
        "Este diagnostico ya esta cerrado y no admite una nueva orden.",
      );
    }
  }

  const createdWorkOrder = await createEntityRecord("workOrders", {
    workshopId,
    diagnosticId: normalizeOptional(diagnosticId),
    vehicleId: normalizeOptional(vehicleId),
    clientId: normalizeOptional(clientId),
    assignedMechanicUids: normalizeUidList(
      assignedMechanicUids || assignedMechanicIdsText,
    ),
    status: normalizeWorkOrderStatus(status),
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
  const workshopId = requireActiveWorkshopId();
  const currentWorkOrder = await getEntityRecord("workOrders", workOrderId);

  if (!currentWorkOrder || currentWorkOrder.workshopId !== workshopId) {
    throw new Error("La orden no pertenece al taller activo.");
  }

  await patchEntityRecord("workOrders", workOrderId, {
    workshopId,
    diagnosticId: normalizeOptional(payload.diagnosticId),
    vehicleId: normalizeOptional(payload.vehicleId),
    clientId: normalizeOptional(payload.clientId),
    assignedMechanicUids: normalizeUidList(
      payload.assignedMechanicUids || payload.assignedMechanicIdsText,
    ),
    status: normalizeWorkOrderStatus(payload.status),
    progressPercent: normalizeNumber(payload.progressPercent),
  });
}

export async function updateWorkOrderOperationalState(
  workOrderId,
  { status, progressPercent },
) {
  const workshopId = requireActiveWorkshopId();
  const currentWorkOrder = await getEntityRecord("workOrders", workOrderId);

  if (!currentWorkOrder || currentWorkOrder.workshopId !== workshopId) {
    throw new Error("No se encontro la orden a actualizar.");
  }

  const nextStatus = normalizeWorkOrderStatus(status);
  const nextProgressPercent = normalizeNumber(progressPercent);
  const payload = {};

  if (nextStatus) {
    payload.status = nextStatus;

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
  const workshopId = requireActiveWorkshopId();
  const currentWorkOrder = await getEntityRecord("workOrders", workOrderId);

  if (!currentWorkOrder || currentWorkOrder.workshopId !== workshopId) {
    throw new Error("La orden no pertenece al taller activo.");
  }

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
    status: normalizeWorkOrderStatus(initialValues.status),
  };
}
