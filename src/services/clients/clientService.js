import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  createEntityRecord,
  deleteEntityRecord,
  patchEntityRecord,
} from "../firestore/repository";
import { firestoreCollections } from "../firestore/collections";

const clientsCollection = firestoreCollections.clients;

function normalizeOptional(value) {
  return value?.trim() || "";
}

export async function listClients() {
  const collectionRef = collection(firestore, clientsCollection.name);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("sequentialId", "desc")),
  );

  return snapshot.docs.map((item) => ({
    refId: item.id,
    ...item.data(),
  }));
}

export async function createClient({
  fullName,
  address,
  phone,
  email,
  notes,
  createdByUid,
}) {
  return createEntityRecord("clients", {
    fullName: fullName.trim(),
    address: normalizeOptional(address),
    phone: normalizeOptional(phone),
    email: normalizeOptional(email).toLowerCase(),
    notes: normalizeOptional(notes),
    createdByUid,
  });
}

export async function updateClient(clientId, payload) {
  await patchEntityRecord("clients", clientId, {
    ...payload,
    fullName: payload.fullName.trim(),
    address: normalizeOptional(payload.address),
    phone: normalizeOptional(payload.phone),
    email: normalizeOptional(payload.email).toLowerCase(),
    notes: normalizeOptional(payload.notes),
  });
}

export async function deleteClient(clientId) {
  await deleteEntityRecord("clients", clientId);
}

export function createEmptyClientForm() {
  return {
    fullName: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  };
}
