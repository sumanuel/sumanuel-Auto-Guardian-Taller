import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH, tapFeedback } from "../../utils/touch";

// Fila de menú/lista de 72 dp: icono, título, ayuda y una etiqueta de estado.
// tone: clave de color del tema para el icono y la etiqueta.
export default function MenuRow({
  icon,
  title,
  subtitle,
  badge,
  tone = "primary",
  selected = false,
  disabled = false,
  showChevron = true,
  trailing,
  onPress,
}) {
  const { colors } = useTheme();
  const accent = colors[tone] || colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={TOUCH.hitSlop}
      onPress={() => {
        tapFeedback("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.cardBackground,
          borderColor: selected ? accent : colors.border,
          borderLeftColor: accent,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.cardMuted }]}>
        <Ionicons color={accent} name={icon} size={26} />
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
        {badge ? (
          <Text style={[styles.badge, { color: accent }]}>{badge}</Text>
        ) : null}
      </View>

      {trailing}
      {showChevron && !trailing ? (
        <Ionicons
          color={colors.textTertiary}
          name="chevron-forward"
          size={22}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderLeftWidth: 6,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 19 },
  badge: { fontSize: 13, fontWeight: "800", marginTop: 2 },
});
