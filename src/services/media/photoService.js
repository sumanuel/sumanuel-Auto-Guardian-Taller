import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

export const MAX_ENTRY_PHOTOS = 4;

// Calidad reducida: las fotos de taller se toman con el teléfono y no
// necesitan resolución completa. Evita subidas lentas con mala señal.
const PICKER_OPTIONS = {
  mediaTypes: ["images"],
  quality: 0.5,
  allowsEditing: false,
  exif: false,
};

// Devuelve la URI local de la foto o null si el usuario cancela o niega el
// permiso. Lanza Error con un mensaje claro si no hay permiso.
export async function captureWorkPhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      "Necesitas permitir el acceso a la cámara para adjuntar fotos.",
    );
  }

  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickWorkPhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      "Necesitas permitir el acceso a la galería para adjuntar fotos.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0].uri;
}

// Sube las fotos a Storage bajo progressEntries/{workOrderId}/..., una ruta
// ya cubierta por storage.rules (mecánico y operación pueden escribir).
// Devuelve [{ url, path }] listo para guardar en progressEntries.photos.
export async function uploadWorkOrderPhotos(workOrderId, uris = []) {
  const safeOrderId = String(workOrderId || "").trim();

  if (!safeOrderId) {
    throw new Error("La foto debe asociarse a una orden válida.");
  }

  const stamp = Date.now();

  return Promise.all(
    uris.map(async (uri, index) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `progressEntries/${safeOrderId}/${stamp}-${index}.jpg`;
      const fileRef = ref(storage, path);

      await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });

      return { url: await getDownloadURL(fileRef), path };
    }),
  );
}
