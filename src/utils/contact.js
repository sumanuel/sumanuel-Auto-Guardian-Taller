import { Alert, Linking } from "react-native";

// Deja solo dígitos. Un número local de 11 dígitos que empieza en 0 se
// convierte al formato internacional de Venezuela (58), igual que el envío
// de cotizaciones.
export function normalizeWhatsappPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `58${digits.slice(1)}`;
  }

  return digits;
}

export async function callPhone(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");

  if (!digits) {
    Alert.alert("Contacto", "El cliente no tiene un teléfono registrado.");
    return;
  }

  try {
    await Linking.openURL(`tel:${digits}`);
  } catch (error) {
    Alert.alert("Contacto", "No se pudo abrir el marcador del teléfono.");
  }
}

export async function openWhatsappChat(phone, message = "") {
  const normalized = normalizeWhatsappPhone(phone);

  if (!normalized) {
    Alert.alert("Contacto", "El cliente no tiene un teléfono válido.");
    return;
  }

  const text = message ? `?text=${encodeURIComponent(message)}` : "";

  try {
    await Linking.openURL(`https://wa.me/${normalized}${text}`);
  } catch (error) {
    Alert.alert("Contacto", "No se pudo abrir WhatsApp.");
  }
}
