import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH, tapFeedback } from "../../utils/touch";

// Barra fija inferior con 2-4 acciones de un toque (Iniciar / Pausar / Listo /
// Nota). Se renderiza fuera del ScrollView para quedar siempre al alcance.
// actions: [{ key, label, icon, tone, onPress, disabled, active }]
// tone: "primary" | "success" | "warning" | "danger" | "neutral"
export default function StatusActionBar({ actions = [] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!actions.length) {
    return null;
  }

  const toneColor = (tone) =>
    ({
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
      neutral: colors.textSecondary,
    })[tone] || colors.primary;

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {actions.map((action) => {
        const accent = toneColor(action.tone);

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            key={action.key}
            onPress={() => {
              tapFeedback("medium");
              action.onPress?.();
            }}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: action.active ? accent : colors.cardMuted,
                borderColor: accent,
                opacity: action.disabled ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {action.icon ? (
              <Ionicons
                color={action.active ? colors.white : accent}
                name={action.icon}
                size={26}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: action.active ? colors.white : colors.text },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  action: {
    flex: 1,
    minHeight: TOUCH.large,
    borderRadius: TOUCH.radius,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  label: { fontSize: 14, fontWeight: "800" },
});
