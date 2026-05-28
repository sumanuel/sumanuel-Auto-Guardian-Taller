import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
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

const stockItemsCollection = firestoreCollections.stockItems;
const stockMovementsCollection = firestoreCollections.stockMovements;

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

function normalizeItemType(value) {
  return value === "tool" ? "tool" : "part";
}

function normalizeMovementType(value) {
  return value === "out" ? "out" : "in";
}

function formatSequentialId(value, { prefix = "", padding = 0 } = {}) {
  const rawValue = String(value);
  const paddedValue = padding > 0 ? rawValue.padStart(padding, "0") : rawValue;
  return `${prefix}${paddedValue}`;
}

export const stockItemTypeOptions = [
  { key: "part", label: "Repuesto" },
  { key: "tool", label: "Herramienta" },
];

export const stockMovementTypeOptions = [
  { key: "in", label: "Entrada" },
  { key: "out", label: "Salida" },
];

export async function listStockItems() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, stockItemsCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("workshopId", "==", activeWorkshopId)),
  );

  return snapshot.docs
    .map((item) => ({
      refId: item.id,
      ...item.data(),
    }))
    .sort((leftItem, rightItem) => {
      const leftValue = Number(leftItem.sequentialId || 0);
      const rightValue = Number(rightItem.sequentialId || 0);
      return rightValue - leftValue;
    });
}

export async function createStockItem({
  itemType,
  name,
  quantity,
  minimumQuantity,
  unitCost,
  supplier,
  location,
  notes,
  createdByUid,
}) {
  const workshopId = requireActiveWorkshopId();

  return createEntityRecord("stockItems", {
    workshopId,
    itemType: normalizeItemType(itemType),
    name: normalizeOptional(name),
    quantity: normalizeNumber(quantity) ?? 0,
    minimumQuantity: normalizeNumber(minimumQuantity),
    unitCost: normalizeNumber(unitCost),
    supplier: normalizeOptional(supplier),
    location: normalizeOptional(location),
    notes: normalizeOptional(notes),
    lastMovementType: "",
    lastMovementQuantity: null,
    lastMovementAt: null,
    lastMovementNotes: "",
    lastMovementByUid: "",
    createdByUid: normalizeOptional(createdByUid),
  });
}

export async function updateStockItem(stockItemId, payload) {
  const workshopId = requireActiveWorkshopId();
  const currentStockItem = await getEntityRecord("stockItems", stockItemId);

  if (!currentStockItem || currentStockItem.workshopId !== workshopId) {
    throw new Error("El item no pertenece al taller activo.");
  }

  await patchEntityRecord("stockItems", stockItemId, {
    workshopId,
    itemType: normalizeItemType(payload.itemType),
    name: normalizeOptional(payload.name),
    quantity: normalizeNumber(payload.quantity) ?? 0,
    minimumQuantity: normalizeNumber(payload.minimumQuantity),
    unitCost: normalizeNumber(payload.unitCost),
    supplier: normalizeOptional(payload.supplier),
    location: normalizeOptional(payload.location),
    notes: normalizeOptional(payload.notes),
  });
}

export async function deleteStockItem(stockItemId) {
  const workshopId = requireActiveWorkshopId();
  const currentStockItem = await getEntityRecord("stockItems", stockItemId);

  if (!currentStockItem || currentStockItem.workshopId !== workshopId) {
    throw new Error("No se encontro el item a eliminar.");
  }

  await deleteEntityRecord("stockItems", stockItemId);
}

export async function createStockMovement({
  stockItemId,
  movementType,
  quantity,
  unitCost,
  notes,
  performedByUid,
}) {
  const workshopId = requireActiveWorkshopId();
  const normalizedMovementType = normalizeMovementType(movementType);
  const normalizedQuantity = normalizeNumber(quantity);

  if (!stockItemId) {
    throw new Error("Selecciona el item al que deseas aplicar el movimiento.");
  }

  if (!normalizedQuantity || normalizedQuantity <= 0) {
    throw new Error("Ingresa una cantidad valida para el movimiento.");
  }

  const stockItemRef = doc(firestore, stockItemsCollection.name, stockItemId);
  const movementCounterRef = doc(
    firestore,
    "_counters",
    stockMovementsCollection.counterKey,
  );

  return runTransaction(firestore, async (transaction) => {
    const stockItemSnapshot = await transaction.get(stockItemRef);

    if (!stockItemSnapshot.exists()) {
      throw new Error("No se encontro el item seleccionado.");
    }

    const stockItemData = stockItemSnapshot.data();

    if (stockItemData.workshopId !== workshopId) {
      throw new Error("El item no pertenece al taller activo.");
    }

    const previousQuantity = Number(stockItemData.quantity || 0);
    const resultingQuantity =
      normalizedMovementType === "in"
        ? previousQuantity + normalizedQuantity
        : previousQuantity - normalizedQuantity;

    if (resultingQuantity < 0) {
      throw new Error("La salida supera la cantidad disponible en inventario.");
    }

    const counterSnapshot = await transaction.get(movementCounterRef);
    const currentSequence = counterSnapshot.exists()
      ? Number(counterSnapshot.data().value || 0)
      : 0;
    const nextSequence = currentSequence + 1;
    const movementId = formatSequentialId(nextSequence, {
      prefix: stockMovementsCollection.prefix,
      padding: stockMovementsCollection.padding,
    });
    const movementRef = doc(
      firestore,
      stockMovementsCollection.name,
      movementId,
    );

    transaction.set(movementCounterRef, {
      key: stockMovementsCollection.counterKey,
      value: nextSequence,
      updatedAt: serverTimestamp(),
    });

    transaction.set(movementRef, {
      id: movementId,
      sequentialId: nextSequence,
      workshopId,
      stockItemId,
      stockItemName: stockItemData.name || "",
      movementType: normalizedMovementType,
      quantity: normalizedQuantity,
      unitCost: normalizeNumber(unitCost),
      notes: normalizeOptional(notes),
      previousQuantity,
      resultingQuantity,
      performedByUid: normalizeOptional(performedByUid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(stockItemRef, {
      quantity: resultingQuantity,
      lastMovementType: normalizedMovementType,
      lastMovementQuantity: normalizedQuantity,
      lastMovementAt: serverTimestamp(),
      lastMovementNotes: normalizeOptional(notes),
      lastMovementByUid: normalizeOptional(performedByUid),
      updatedAt: serverTimestamp(),
    });

    return {
      id: movementId,
      stockItemId,
      movementType: normalizedMovementType,
      quantity: normalizedQuantity,
      previousQuantity,
      resultingQuantity,
    };
  });
}

export async function listStockMovements(stockItemId) {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, stockMovementsCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("stockItemId", "==", stockItemId)),
  );

  return snapshot.docs
    .map((item) => ({
      refId: item.id,
      ...item.data(),
    }))
    .filter((item) => item.workshopId === activeWorkshopId)
    .sort((leftItem, rightItem) => {
      const leftValue = Number(leftItem.sequentialId || 0);
      const rightValue = Number(rightItem.sequentialId || 0);
      return rightValue - leftValue;
    });
}

export function createEmptyStockItemForm(initialValues = {}) {
  return {
    itemType: initialValues.itemType || "part",
    name: initialValues.name || "",
    quantity:
      initialValues.quantity === null || initialValues.quantity === undefined
        ? ""
        : String(initialValues.quantity),
    minimumQuantity:
      initialValues.minimumQuantity === null ||
      initialValues.minimumQuantity === undefined
        ? ""
        : String(initialValues.minimumQuantity),
    unitCost:
      initialValues.unitCost === null || initialValues.unitCost === undefined
        ? ""
        : String(initialValues.unitCost),
    supplier: initialValues.supplier || "",
    location: initialValues.location || "",
    notes: initialValues.notes || "",
  };
}

export function createEmptyStockMovementForm(initialValues = {}) {
  return {
    movementType: normalizeMovementType(initialValues.movementType),
    quantity:
      initialValues.quantity === null || initialValues.quantity === undefined
        ? ""
        : String(initialValues.quantity),
    unitCost:
      initialValues.unitCost === null || initialValues.unitCost === undefined
        ? ""
        : String(initialValues.unitCost),
    notes: initialValues.notes || "",
  };
}
