import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, rf, spacing } from "../../utils/responsive";
import {
  createCurrentMonthRange,
  createCurrentWeekRange,
  createLastDaysRange,
  createTodayRange,
  formatDateInput,
  parseDateInput,
} from "../../utils/dateRange";

const quickRanges = [
  {
    key: "today",
    label: "Hoy",
    buildRange: () => createTodayRange(),
  },
  {
    key: "week",
    label: "Esta semana",
    buildRange: () => createCurrentWeekRange(),
  },
  {
    key: "month",
    label: "Este mes",
    buildRange: () => createCurrentMonthRange(),
  },
  {
    key: "30days",
    label: "Ultimos 30 dias",
    buildRange: () => createLastDaysRange(30),
  },
];

export default function DateRangeFilterModal({
  visible,
  initialRange,
  onApply,
  onClose,
  title = "Filtrar por fecha",
}) {
  const { colors } = useTheme();
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStartInput(formatDateInput(initialRange?.start));
    setEndInput(formatDateInput(initialRange?.end));
  }, [initialRange?.end, initialRange?.start, visible]);

  const applyPreset = (buildRange) => {
    const range = buildRange();
    setStartInput(formatDateInput(range.start));
    setEndInput(formatDateInput(range.end));
  };

  const handleApply = () => {
    const start = parseDateInput(startInput);
    const end = parseDateInput(endInput);

    if (!start || !end) {
      Alert.alert(
        "Filtro por fecha",
        "Usa el formato AAAA-MM-DD en fecha desde y hasta.",
      );
      return;
    }

    onApply?.({ start, end });
    onClose?.();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Define desde y hasta que fecha quieres revisar la operacion.
          </Text>

          <View style={styles.quickRow}>
            {quickRanges.map((preset) => (
              <Pressable
                key={preset.key}
                onPress={() => applyPreset(preset.buildRange)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.quickChipText, { color: colors.text }]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Fecha desde</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              onChangeText={setStartInput}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={startInput}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Fecha hasta</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              onChangeText={setEndInput}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={endInput}
            />
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => applyPreset(() => createLastDaysRange(30))}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                Ultimos 30 dias
              </Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                Aplicar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    padding: spacing.lg,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: rf(18),
    fontWeight: "900",
  },
  subtitle: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quickChipText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: rf(44),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: rf(13),
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    minHeight: rf(44),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    fontSize: rf(13),
    fontWeight: "800",
  },
});