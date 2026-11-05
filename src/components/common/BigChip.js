import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH, tapFeedback } from "../../utils/touch";

// Chip de selección con objetivo táctil de 56 dp.
export default function BigChip({
  label,
  selected = false,
  onPress,
  color,
  disabled = false,
  style,
}) {
  const { colors } = useTheme();
  const accent = color || colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={TOUCH.hitSlop}
      onPress={() => {
        tapFeedback("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? accent : colors.cardMuted,
          borderColor: selected ? accent : colors.borderStrong,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[styles.label, { color: selected ? colors.white : colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TOUCH.min,
    minWidth: TOUCH.min,
    borderRadius: TOUCH.radius,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: TOUCH.fontLabel,
    fontWeight: "800",
    textAlign: "center",
  },
});
