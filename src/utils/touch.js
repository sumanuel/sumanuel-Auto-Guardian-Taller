import * as Haptics from "expo-haptics";

// Tokens del "modo taller": controles pensados para usarse con guantes o
// manos con grasa. Son valores fijos en dp (no pasan por rf()/s()) para que
// el tamaño táctil no se encoja en pantallas pequeñas.
export const TOUCH = {
  min: 56,
  large: 64,
  gap: 12,
  radius: 14,
  fontBase: 17,
  fontLabel: 16,
  fontTitle: 22,
  fontPlate: 26,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

// Vibración corta al pulsar. Nunca debe romper la acción si el dispositivo no
// soporta háptica (web, algunos Android).
export function tapFeedback(kind = "light") {
  try {
    if (kind === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (kind === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(
      kind === "medium"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch (error) {
    // Sin háptica disponible: se ignora.
  }
}
