import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";
import BigButton from "./BigButton";
import BigChip from "./BigChip";

const PRESETS = [0, 25, 50, 75, 100];

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

// Reemplazo del slider para el modo taller: presets grandes + ajuste de ±10.
export default function StepperPercent({
  value,
  onChange,
  color,
  disabled = false,
}) {
  const { colors } = useTheme();
  const current = clampPercent(value);
  const accent = color || colors.primary;
  const update = (next) => onChange?.(clampPercent(next));

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <BigButton
          disabled={disabled || current <= 0}
          icon="remove"
          label="10"
          onPress={() => update(current - 10)}
          style={styles.stepButton}
          variant="secondary"
        />
        <Text style={[styles.value, { color: accent }]}>{current}%</Text>
        <BigButton
          disabled={disabled || current >= 100}
          icon="add"
          label="10"
          onPress={() => update(current + 10)}
          style={styles.stepButton}
          variant="secondary"
        />
      </View>

      <View style={[styles.track, { backgroundColor: colors.borderStrong }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: accent, width: `${current}%` },
          ]}
        />
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((preset) => (
          <BigChip
            color={accent}
            disabled={disabled}
            key={preset}
            label={`${preset}%`}
            onPress={() => update(preset)}
            selected={current === preset}
            style={styles.preset}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: TOUCH.gap },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: TOUCH.gap,
  },
  stepButton: { flex: 1 },
  value: {
    flex: 1.2,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  track: { height: 12, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  presetRow: { flexDirection: "row", gap: 8 },
  preset: { flex: 1, paddingHorizontal: 0 },
});
