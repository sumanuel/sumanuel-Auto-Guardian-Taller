import { collection, getDocs, query, where } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";

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
  const collectionRef = collection(firestore, vehiclesCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, where("clientId", "==", clientId)),
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
  return createEntityRecord("vehicles", {
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
  await patchEntityRecord("vehicles", vehicleId, {
    ...payload,
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
