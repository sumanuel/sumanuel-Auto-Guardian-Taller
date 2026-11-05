import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH, tapFeedback } from "../../utils/touch";

// Botón grande para el modo taller. Variantes semánticas: el color indica el
// tipo de acción (confirmar, advertir, destruir), nunca decoración.
export default function BigButton({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  loading = false,
  haptic = "light",
  style,
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    success: { bg: colors.success, fg: colors.white, border: colors.success },
    warning: { bg: colors.warning, fg: "#1a1200", border: colors.warning },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    secondary: {
      bg: colors.cardMuted,
      fg: colors.text,
      border: colors.borderStrong,
    },
  }[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={TOUCH.hitSlop}
      onPress={() => {
        tapFeedback(haptic);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? (
            <Ionicons color={palette.fg} name={icon} size={TOUCH.fontTitle} />
          ) : null}
          <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH.min,
    borderRadius: TOUCH.radius,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontSize: TOUCH.fontBase,
    fontWeight: "800",
    textAlign: "center",
  },
});
