import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";

// Cabecera de detalle: estado, placa grande, vehículo, avance y datos clave.
// Los bloques de contacto, responsables y acciones van como children.
//   facts: [{ label, value }]
export default function DetailHero({
  plate,
  title,
  code,
  statusLabel,
  tone,
  progress = null,
  facts = [],
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
          borderColor: colors.border,
          borderLeftColor: accent,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.statusPill, { backgroundColor: accent }]}>
          <Text style={styles.statusText}>{statusLabel || "Sin estado"}</Text>
        </View>
        <Text style={[styles.code, { color: colors.textSecondary }]}>
          {code}
        </Text>
      </View>

      <Text style={[styles.plate, { color: colors.text }]}>
        {plate || "Sin placa"}
      </Text>
      {title ? (
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
      ) : null}

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
          <Text style={[styles.percent, { color: accent }]}>{percent}%</Text>
        </View>
      ) : null}

      {facts.length ? (
        <View style={styles.facts}>
          {facts.map((fact) => (
            <View key={fact.label} style={styles.fact}>
              <Text style={[styles.factLabel, { color: colors.textTertiary }]}>
                {fact.label}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.factValue, { color: colors.text }]}
              >
                {fact.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 8,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: TOUCH.gap,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  code: { fontSize: 15, fontWeight: "800" },
  plate: { fontSize: 36, fontWeight: "900", letterSpacing: 1.5 },
  title: { fontSize: 18, fontWeight: "600" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 14, borderRadius: 7, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 7 },
  percent: { fontSize: 18, fontWeight: "900", minWidth: 52 },
  facts: { gap: 10 },
  fact: { gap: 2 },
  factLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  factValue: { fontSize: 16, fontWeight: "700" },
});
