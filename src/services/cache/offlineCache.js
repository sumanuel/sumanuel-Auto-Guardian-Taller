import AsyncStorage from "@react-native-async-storage/async-storage";

// Caché de LECTURA para consultar el trabajo asignado sin señal. El SDK web de
// Firebase no tiene persistencia en React Native, así que se guarda aquí la
// última respuesta correcta. No permite escribir sin conexión.
const PREFIX = "@offline_cache:";

// Los Timestamp de Firestore no sobreviven a JSON: se guardan como millis y
// se restauran como Date (las pantallas ya aceptan Date).
function replacer(_key, value) {
  if (value && typeof value.toMillis === "function") {
    return { __ts: value.toMillis() };
  }

  return value;
}

function reviver(_key, value) {
  if (value && typeof value === "object" && typeof value.__ts === "number") {
    return new Date(value.__ts);
  }

  return value;
}

export async function saveOfflineCache(key, data) {
  try {
    await AsyncStorage.setItem(
      PREFIX + key,
      JSON.stringify({ savedAt: Date.now(), data }, replacer),
    );
  } catch (error) {
    // Sin espacio o error de almacenamiento: la app sigue funcionando.
  }
}

export async function loadOfflineCache(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);

    return raw ? JSON.parse(raw, reviver) : null;
  } catch (error) {
    return null;
  }
}
