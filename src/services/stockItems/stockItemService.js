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

const stockItemsCollection = firestoreCollections.stockItems;

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

export const stockItemTypeOptions = [
  { key: "part", label: "Repuesto" },
  { key: "tool", label: "Herramienta" },
];

export async function listStockItems() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, stockItemsCollection.name);
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
