import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH, tapFeedback } from "../../utils/touch";

// Tarjeta operativa común para listas de órdenes, diagnósticos y agenda.
// Borde izquierdo con el color del estado, placa grande y datos mínimos.
//   plain: encabezado de texto normal (nombres) en vez de placa en mayúsculas
//   plate, title, code, statusLabel, tone (color), progress (0-100 | null)
//   lines: [{ label, value }]    datos secundarios (máx. 2-3)
//   actions: [{ key, icon, color, onPress, label }]  botones de 48 dp
//   children: bloque extra (avisos, botón principal)
export default function OperationCard({
  plate,
  plain = false,
  title,
  code,
  statusLabel,
  tone,
  progress = null,
  lines = [],
  actions = [],
  selected = false,
  onPress,
  children,
}) {
  const { colors } = useTheme();
  const accent = tone || colors.primary;
  const percent =
    progress === null || progress === undefined
      ? null
      : Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: selected ? colors.primary : colors.border,
          borderLeftColor: accent,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        disabled={!onPress}
        onPress={() => {
          tapFeedback("light");
          onPress?.();
        }}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={styles.copy}>
          <Text
            numberOfLines={plain ? 2 : 1}
            style={[
              styles.plate,
              plain && styles.plain,
              { color: colors.text },
            ]}
          >
            {plate || "Sin placa"}
          </Text>
          {title ? (
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.textSecondary }]}
            >
              {title}
            </Text>
          ) : null}
          <Text style={[styles.code, { color: accent }]}>
            {[code, statusLabel].filter(Boolean).join(" · ")}
          </Text>

          {percent !== null ? (
            <View style={styles.progressRow}>
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: accent, width: `${percent}%` },
                  ]}
                />
              </View>
              <Text style={[styles.percent, { color: accent }]}>
                {percent}%
              </Text>
            </View>
          ) : null}

          {lines.map((line) => (
            <Text
              key={line.label}
              numberOfLines={2}
              style={[styles.line, { color: colors.textSecondary }]}
            >
              <Text style={[styles.lineLabel, { color: colors.text }]}>
                {line.label}:{" "}
              </Text>
              {line.value}
            </Text>
          ))}
        </View>

        {onPress ? (
          <Ionicons
            color={colors.textTertiary}
            name="chevron-forward"
            size={28}
          />
        ) : null}
      </Pressable>

      {children}

      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              accessibilityLabel={action.label}
              accessibilityRole="button"
              disabled={action.disabled}
              hitSlop={TOUCH.hitSlop}
              key={action.key}
              onPress={() => {
                tapFeedback("light");
                action.onPress?.();
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: action.borderColor || colors.borderStrong,
                  opacity: action.disabled ? 0.45 : 1,
                },
              ]}
            >
              <Ionicons
                color={action.color || colors.textSecondary}
                name={action.icon}
                size={24}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 8,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  main: { flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1, gap: 4 },
  plate: { fontSize: 26, fontWeight: "900", letterSpacing: 1 },
  plain: { fontSize: 22, letterSpacing: 0 },
  title: { fontSize: 16, fontWeight: "600" },
  code: { fontSize: 15, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  percent: { fontSize: 16, fontWeight: "900", minWidth: 48 },
  line: { fontSize: 14, lineHeight: 20 },
  lineLabel: { fontWeight: "800" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  actionButton: {
    width: TOUCH.min,
    height: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    alignItems: "center",
    justifyContent: "center",
  },
});
