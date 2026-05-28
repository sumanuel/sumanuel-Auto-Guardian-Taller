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

const clientsCollection = firestoreCollections.clients;

function normalizeOptional(value) {
  return value?.trim() || "";
}

export async function listClients() {
  const activeWorkshopId = requireActiveWorkshopId();
  const collectionRef = collection(firestore, clientsCollection.name);
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

export async function createClient({
  identification,
  fullName,
  address,
  phone,
  email,
  notes,
  createdByUid,
}) {
  const workshopId = requireActiveWorkshopId();

  return createEntityRecord("clients", {
    workshopId,
    identification: normalizeOptional(identification),
    fullName: fullName.trim(),
    address: normalizeOptional(address),
    phone: normalizeOptional(phone),
    email: normalizeOptional(email).toLowerCase(),
    notes: normalizeOptional(notes),
    createdByUid,
  });
}

export async function updateClient(clientId, payload) {
  const workshopId = requireActiveWorkshopId();
  const currentClient = await getEntityRecord("clients", clientId);

  if (!currentClient || currentClient.workshopId !== workshopId) {
    throw new Error("El cliente no pertenece al taller activo.");
  }

  await patchEntityRecord("clients", clientId, {
    ...payload,
    workshopId,
    identification: normalizeOptional(payload.identification),
    fullName: payload.fullName.trim(),
    address: normalizeOptional(payload.address),
    phone: normalizeOptional(payload.phone),
    email: normalizeOptional(payload.email).toLowerCase(),
    notes: normalizeOptional(payload.notes),
  });
}

export async function deleteClient(clientId) {
  const workshopId = requireActiveWorkshopId();
  const currentClient = await getEntityRecord("clients", clientId);

  if (!currentClient || currentClient.workshopId !== workshopId) {
    throw new Error("El cliente no pertenece al taller activo.");
  }

  await deleteEntityRecord("clients", clientId);
}

export function createEmptyClientForm() {
  return {
    identification: "",
    fullName: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  };
}
