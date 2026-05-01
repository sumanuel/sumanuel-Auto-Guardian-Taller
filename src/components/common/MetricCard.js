import { StyleSheet, Text, View } from "react-native";
import { borderRadius, rf, spacing } from "../../utils/responsive";
import { useTheme } from "../../context/ThemeContext";

export default function MetricCard({ value, label, tone = "primary" }) {
  const { colors } = useTheme();

  const toneMap = {
    primary: { background: colors.cardBackground, value: colors.text },
    accent: { background: colors.cardMuted, value: colors.accent },
    warning: { background: colors.cardMuted, value: colors.warning },
    danger: { background: colors.cardMuted, value: colors.danger },
  };

  const currentTone = toneMap[tone] || toneMap.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: currentTone.background, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.value, { color: currentTone.value }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  value: {
    fontSize: rf(24),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: rf(12),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
