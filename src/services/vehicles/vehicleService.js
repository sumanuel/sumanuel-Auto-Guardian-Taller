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

const vehiclesCollection = firestoreCollections.vehicles;

function normalizeOptional(value) {
  return value?.trim() || "";
}

function normalizeNumeric(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export async function listVehiclesByClientId(clientId) {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, vehiclesCollection.name);
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("workshopId", "==", activeWorkshopId),
      where("clientId", "==", clientId),
    ),
  );

  return snapshot.docs
    .map((item) => ({
      refId: item.id,
      ...item.data(),
    }))
    .sort(
      (left, right) => (right.sequentialId || 0) - (left.sequentialId || 0),
    );
}

export async function listVehicles() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, vehiclesCollection.name);
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

export async function createVehicle({
  clientId,
  plate,
  brand,
  model,
  year,
  color,
  vin,
  mileage,
  notes,
}) {
  const workshopId = requireActiveWorkshopId();

  return createEntityRecord("vehicles", {
    workshopId,
    clientId,
    plate: plate.trim().toUpperCase(),
    brand: normalizeOptional(brand),
    model: normalizeOptional(model),
    year: normalizeOptional(year),
    color: normalizeOptional(color),
    vin: normalizeOptional(vin).toUpperCase(),
    mileage: normalizeNumeric(mileage),
    notes: normalizeOptional(notes),
  });
}

export async function updateVehicle(vehicleId, payload) {
  const workshopId = requireActiveWorkshopId();
  const currentVehicle = await getEntityRecord("vehicles", vehicleId);

  if (!currentVehicle || currentVehicle.workshopId !== workshopId) {
    throw new Error("El vehiculo no pertenece al taller activo.");
  }

  await patchEntityRecord("vehicles", vehicleId, {
    ...payload,
    workshopId,
    plate: payload.plate.trim().toUpperCase(),
    brand: normalizeOptional(payload.brand),
    model: normalizeOptional(payload.model),
    year: normalizeOptional(payload.year),
    color: normalizeOptional(payload.color),
    vin: normalizeOptional(payload.vin).toUpperCase(),
    mileage: normalizeNumeric(payload.mileage),
    notes: normalizeOptional(payload.notes),
  });
}

export async function deleteVehicle(vehicleId) {
  const workshopId = requireActiveWorkshopId();
  const currentVehicle = await getEntityRecord("vehicles", vehicleId);

  if (!currentVehicle || currentVehicle.workshopId !== workshopId) {
    throw new Error("El vehiculo no pertenece al taller activo.");
  }

  await deleteEntityRecord("vehicles", vehicleId);
}

export function createEmptyVehicleForm(clientId = "") {
  return {
    clientId,
    plate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    vin: "",
    mileage: "",
    notes: "",
  };
}
