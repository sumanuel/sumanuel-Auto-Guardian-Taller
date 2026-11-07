import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  getEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";
import { requireActiveWorkshopId } from "../workshops/workshopSession";

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
  { key: "received", label: "Recibido" },
  { key: "installed", label: "Instalado" },
  { key: "returned", label: "Devuelto" },
];

// Ruta única de un repuesto: Solicitado -> Recibido -> Instalado -> Devuelto.
// Un repuesto recibido que no se usó también puede devolverse; devolver
// siempre exige motivo.
export const sparePartTransitions = {
  requested: ["received"],
  received: ["installed", "returned"],
  installed: ["returned"],
  returned: [],
};

export function canTransitionSparePart(from, to) {
  return (sparePartTransitions[from] || []).includes(to);
}

// Acciones que se ofrecen en cada tarjeta según el estado actual.
//   managerOnly: no la ve recepción (instalar y devolver son del taller)
export function getSparePartActions(status) {
  if (status === "requested") {
    return [
      {
        key: "received",
        label: "Marcar recibido",
        icon: "checkmark-circle-outline",
        tone: "primary",
        managerOnly: false,
        confirm: "Confirma que la pieza ya llegó al taller.",
      },
    ];
  }

  if (status === "received") {
    return [
      {
        key: "installed",
        label: "Instalar",
        icon: "construct-outline",
        tone: "success",
        managerOnly: true,
        confirm: "La pieza queda instalada en el vehículo.",
      },
      {
        key: "returned",
        label: "Devolver sin instalar",
        icon: "return-up-back-outline",
        tone: "secondary",
        managerOnly: true,
        needsReason: true,
        reasons: ["Pieza equivocada", "Llegó dañada", "Ya no se necesita"],
      },
    ];
  }

  if (status === "installed") {
    return [
      {
        key: "returned",
        label: "Desinstalar y devolver",
        icon: "return-down-back-outline",
        tone: "warning",
        managerOnly: true,
        needsReason: true,
        reasons: [
          "Presenta falla",
          "No era la pieza correcta",
          "No ajusta o no es compatible",
        ],
      },
    ];
  }

  return [];
}

// Cambia solo el estado (y el motivo) respetando la ruta permitida.
export async function advanceSparePart(
  sparePartId,
  nextStatus,
  { reason = "", authorUid = "" } = {},
) {
  const workshopId = requireActiveWorkshopId();
  const currentSparePart = await getEntityRecord("spareParts", sparePartId);

  if (!currentSparePart || currentSparePart.workshopId !== workshopId) {
    throw new Error("El repuesto no pertenece al taller activo.");
  }

  if (!canTransitionSparePart(currentSparePart.status, nextStatus)) {
    throw new Error(
      "Ese cambio de estado no está permitido para este repuesto.",
    );
  }

  if (nextStatus === "returned" && !normalizeOptional(reason)) {
    throw new Error("Indica el motivo de la devolución.");
  }

  await patchEntityRecord("spareParts", sparePartId, {
    status: nextStatus,
    statusReason: normalizeOptional(reason),
    statusUpdatedByUid: authorUid || "",
  });
}

export const deletableSparePartStatuses = ["requested", "received", "returned"];

export function canDeleteSparePartStatus(status) {
  return deletableSparePartStatuses.includes(normalizeOptional(status));
}

async function resolveSparePartContext(
  { diagnosticId, workOrderId },
  workshopId,
) {
  const normalizedDiagnosticId = normalizeOptional(diagnosticId);
  const normalizedWorkOrderId = normalizeOptional(workOrderId);
  let relatedDiagnostic = null;
  let relatedWorkOrder = null;

  if (normalizedDiagnosticId) {
    relatedDiagnostic = await getEntityRecord(
      "diagnostics",
      normalizedDiagnosticId,
    );

    if (!relatedDiagnostic || relatedDiagnostic.workshopId !== workshopId) {
      throw new Error(
        "El diagnóstico del repuesto no pertenece al taller activo.",
      );
    }
  }

  if (normalizedWorkOrderId) {
    relatedWorkOrder = await getEntityRecord(
      "workOrders",
      normalizedWorkOrderId,
    );

    if (!relatedWorkOrder || relatedWorkOrder.workshopId !== workshopId) {
      throw new Error("La orden del repuesto no pertenece al taller activo.");
    }
  }

  if (
    relatedDiagnostic?.id &&
    relatedWorkOrder?.diagnosticId &&
    relatedDiagnostic.id !== relatedWorkOrder.diagnosticId
  ) {
    throw new Error("La orden y el diagnóstico del repuesto no coinciden.");
  }

  return {
    diagnosticId:
      normalizedDiagnosticId ||
      normalizeOptional(relatedWorkOrder?.diagnosticId),
    workOrderId: normalizedWorkOrderId,
  };
}

export async function listSpareParts() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, sparePartsCollection.name);
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

export async function createSparePart({
  diagnosticId,
  workOrderId,
  name,
  quantity,
  unitCost,
  supplier,
  status,
}) {
  const workshopId = requireActiveWorkshopId();
  const relatedContext = await resolveSparePartContext(
    { diagnosticId, workOrderId },
    workshopId,
  );

  return createEntityRecord("spareParts", {
    workshopId,
    diagnosticId: relatedContext.diagnosticId,
    workOrderId: relatedContext.workOrderId,
    name: normalizeOptional(name),
    quantity: normalizeNumber(quantity),
    unitCost: normalizeNumber(unitCost),
    supplier: normalizeOptional(supplier),
    status: normalizeOptional(status) || "requested",
  });
}

export async function updateSparePart(sparePartId, payload) {
  const workshopId = requireActiveWorkshopId();
  const currentSparePart = await getEntityRecord("spareParts", sparePartId);

  if (!currentSparePart || currentSparePart.workshopId !== workshopId) {
    throw new Error("El repuesto no pertenece al taller activo.");
  }

  const relatedContext = await resolveSparePartContext(payload, workshopId);

  await patchEntityRecord("spareParts", sparePartId, {
    workshopId,
    diagnosticId: relatedContext.diagnosticId,
    workOrderId: relatedContext.workOrderId,
    name: normalizeOptional(payload.name),
    quantity: normalizeNumber(payload.quantity),
    unitCost: normalizeNumber(payload.unitCost),
    supplier: normalizeOptional(payload.supplier),
    status: normalizeOptional(payload.status) || "requested",
  });
}

export async function deleteSparePart(sparePartId) {
  const workshopId = requireActiveWorkshopId();
  const currentSparePart = await getEntityRecord("spareParts", sparePartId);

  if (!currentSparePart || currentSparePart.workshopId !== workshopId) {
    throw new Error("No se encontró el repuesto a eliminar.");
  }

  if (!canDeleteSparePartStatus(currentSparePart.status)) {
    throw new Error(
      "Solo se pueden eliminar repuestos en estado Solicitado, Recibido o Devuelto.",
    );
  }

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
