import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, rf, spacing } from "../../utils/responsive";
import {
  createCurrentMonthRange,
  createCurrentWeekRange,
  createLastDaysRange,
  createTodayRange,
  formatDateRangeLabel,
  normalizeDateRange,
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
  const [draftRange, setDraftRange] = useState(createLastDaysRange(30));
  const [activeField, setActiveField] = useState("start");
  const [displayMonth, setDisplayMonth] = useState(() => new Date());

  useEffect(() => {
    if (!visible) {
      return;
    }

    const normalizedRange = normalizeDateRange(initialRange);
    setDraftRange(normalizedRange);
    setActiveField("start");
    setDisplayMonth(normalizedRange.start || new Date());
  }, [initialRange?.end, initialRange?.start, visible]);

  const selectedPresetKey = useMemo(() => {
    const normalizedDraft = normalizeDateRange(draftRange);

    return (
      quickRanges.find((preset) => {
        const presetRange = normalizeDateRange(preset.buildRange());

        return (
          presetRange.start?.getTime() === normalizedDraft.start?.getTime() &&
          presetRange.end?.getTime() === normalizedDraft.end?.getTime()
        );
      })?.key || null
    );
  }, [draftRange]);

  const monthLabel = useMemo(
    () =>
      displayMonth.toLocaleDateString("es-VE", {
        month: "long",
        year: "numeric",
      }),
    [displayMonth],
  );

  const calendarDays = useMemo(() => {
    const monthStart = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + 1,
      0,
    );
    const firstWeekday = (monthStart.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      cells.push(
        new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day),
      );
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [displayMonth]);

  const sameDay = (left, right) => {
    if (!(left instanceof Date) || !(right instanceof Date)) {
      return false;
    }

    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  };

  const isBetweenRange = (candidate) => {
    const normalizedRange = normalizeDateRange(draftRange);

    if (
      !normalizedRange.start ||
      !normalizedRange.end ||
      !(candidate instanceof Date)
    ) {
      return false;
    }

    return (
      candidate.getTime() >= normalizedRange.start.getTime() &&
      candidate.getTime() <= normalizedRange.end.getTime()
    );
  };

  const applyPreset = (buildRange) => {
    const range = normalizeDateRange(buildRange());
    setDraftRange(range);
    setDisplayMonth(range.start || new Date());
  };

  const handleSelectDate = (selectedDate) => {
    setDraftRange((current) => {
      const nextRange =
        activeField === "start"
          ? { ...current, start: selectedDate }
          : { ...current, end: selectedDate };

      return normalizeDateRange(nextRange);
    });
  };

  const handleApply = () => {
    const normalizedRange = normalizeDateRange(draftRange);
    const start = normalizedRange.start;
    const end = normalizedRange.end;

    if (!start || !end) {
      Alert.alert(
        "Filtro por fecha",
        "Selecciona una fecha desde y una fecha hasta antes de aplicar.",
      );
      return;
    }

    if (end.getTime() < start.getTime()) {
      Alert.alert(
        "Filtro por fecha",
        "La fecha hasta no puede ser menor que la fecha desde.",
      );
      return;
    }

    onApply?.(normalizedRange);
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
                    backgroundColor:
                      selectedPresetKey === preset.key
                        ? colors.primary
                        : colors.cardMuted,
                    borderColor:
                      selectedPresetKey === preset.key
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    {
                      color:
                        selectedPresetKey === preset.key
                          ? colors.white
                          : colors.text,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dateFieldRow}>
            <Pressable
              onPress={() => setActiveField("start")}
              style={[
                styles.dateField,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor:
                    activeField === "start" ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Fecha desde
              </Text>
              <View style={styles.dateFieldValueRow}>
                <Ionicons
                  color={colors.primary}
                  name="calendar-outline"
                  size={rf(15)}
                />
                <Text style={[styles.dateFieldValue, { color: colors.text }]}>
                  {normalizeDateRange(draftRange).start
                    ? formatDateRangeLabel({
                        start: normalizeDateRange(draftRange).start,
                        end: normalizeDateRange(draftRange).start,
                      }).split(" - ")[0]
                    : "Selecciona fecha"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActiveField("end")}
              style={[
                styles.dateField,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor:
                    activeField === "end" ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Fecha hasta
              </Text>
              <View style={styles.dateFieldValueRow}>
                <Ionicons
                  color={colors.success}
                  name="calendar-outline"
                  size={rf(15)}
                />
                <Text style={[styles.dateFieldValue, { color: colors.text }]}>
                  {normalizeDateRange(draftRange).end
                    ? formatDateRangeLabel({
                        start: normalizeDateRange(draftRange).end,
                        end: normalizeDateRange(draftRange).end,
                      }).split(" - ")[0]
                    : "Selecciona fecha"}
                </Text>
              </View>
            </Pressable>
          </View>

          <View
            style={[
              styles.calendarCard,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.calendarHeader}>
              <Pressable
                onPress={() =>
                  setDisplayMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() - 1,
                        1,
                      ),
                  )
                }
                style={styles.calendarNav}
              >
                <Ionicons
                  color={colors.textSecondary}
                  name="chevron-back-outline"
                  size={rf(18)}
                />
              </Pressable>
              <Text style={[styles.calendarTitle, { color: colors.text }]}>
                {monthLabel}
              </Text>
              <Pressable
                onPress={() =>
                  setDisplayMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() + 1,
                        1,
                      ),
                  )
                }
                style={styles.calendarNav}
              >
                <Ionicons
                  color={colors.textSecondary}
                  name="chevron-forward-outline"
                  size={rf(18)}
                />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  style={[styles.weekdayLabel, { color: colors.textTertiary }]}
                >
                  {label}
                </Text>
              ))}
            </View>

            <ScrollView style={styles.calendarScroll} nestedScrollEnabled>
              <View style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return (
                      <View key={`empty-${index}`} style={styles.dayCell} />
                    );
                  }

                  const normalizedRange = normalizeDateRange(draftRange);
                  const isStart = sameDay(day, normalizedRange.start);
                  const isEnd = sameDay(day, normalizedRange.end);
                  const isActive = isStart || isEnd;
                  const isInRange = isBetweenRange(day);

                  return (
                    <Pressable
                      key={day.toISOString()}
                      onPress={() => handleSelectDate(day)}
                      style={[
                        styles.dayCell,
                        styles.dayButton,
                        {
                          backgroundColor: isActive
                            ? activeField === "start"
                              ? colors.primary
                              : colors.success
                            : isInRange
                              ? colors.cardMuted
                              : "transparent",
                          borderColor: isActive
                            ? activeField === "start"
                              ? colors.primary
                              : colors.success
                            : isInRange
                              ? colors.border
                              : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isActive ? colors.white : colors.text,
                          },
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
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
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
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
  dateFieldRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  dateFieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dateFieldValue: {
    fontSize: rf(13),
    fontWeight: "800",
    lineHeight: rf(18),
  },
  calendarCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: rf(340),
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  calendarNav: {
    width: rf(34),
    height: rf(34),
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: rf(15),
    fontWeight: "900",
    textTransform: "capitalize",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: rf(11),
    fontWeight: "800",
  },
  calendarScroll: {
    flexGrow: 0,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  dayCell: {
    width: "13.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButton: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
  },
  dayText: {
    fontSize: rf(12),
    fontWeight: "800",
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
