import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const queue = [
  {
    key: "1",
    title: "Ford Fiesta 2014",
    detail: "Revision de frenos delanteros",
    status: "Prioridad alta",
  },
  {
    key: "2",
    title: "Toyota Hilux 2019",
    detail: "Cambio de aceite y filtro",
    status: "Recepcion 09:00 AM",
  },
  {
    key: "3",
    title: "Chevrolet Cruze 2017",
    detail: "Diagnostico electrico",
    status: "En espera de validacion",
  },
];

const roleLabels = {
  administrator: "Administrador",
  reception: "Recepcion",
  mechanic: "Mecanico",
};

export default function WorkshopHomeScreen({ userProfile }) {
  const { colors, isDarkMode } = useTheme();

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          section="Centro de control"
          subtitle="Supervisa recepcion, diagnosticos, ordenes y alertas desde una sola vista operativa."
          title="Auto-Guardian"
        />

        <LinearGradient
          colors={
            isDarkMode
              ? ["#1350a7", "#0d3570", "#09111a"]
              : ["#1e7af1", "#0f5fd2", "#0d3f8a"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Estado operativo</Text>
              <Text style={styles.heroTitle}>
                {userProfile?.fullName || "Usuario activo"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {roleLabels[userProfile?.role] ||
                  userProfile?.role ||
                  "Sin rol"}
              </Text>
            </View>

            <View style={styles.alertPill}>
              <Text style={styles.alertPillText}>3 alertas</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricTile, styles.metricTilePrimary]}>
              <Text style={styles.metricValue}>18</Text>
              <Text style={styles.metricLabel}>Vehiculos</Text>
            </View>
            <View style={[styles.metricTile, styles.metricTileDark]}>
              <Text style={styles.metricValue}>5</Text>
              <Text style={styles.metricLabel}>Urgentes</Text>
            </View>
            <View style={[styles.metricTile, styles.metricTileDark]}>
              <Text style={styles.metricValue}>7</Text>
              <Text style={styles.metricLabel}>Diagnosticos</Text>
            </View>
            <View style={[styles.metricTile, styles.metricTileDark]}>
              <Text style={styles.metricValue}>11</Text>
              <Text style={styles.metricLabel}>Ordenes</Text>
            </View>
          </View>
        </LinearGradient>

        <View
          style={[
            styles.sectionPanel,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.panelEyebrow, { color: colors.primary }]}>
            Agenda
          </Text>
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Cola de hoy
          </Text>
          <Text style={[styles.panelText, { color: colors.textSecondary }]}>
            Los accesos frecuentes ahora viven en el menu inferior. Aqui quedan
            solo las prioridades operativas.
          </Text>
        </View>

        <View style={styles.listWrap}>
          {queue.map((item) => (
            <View
              key={item.key}
              style={[
                styles.queueRow,
                {
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.queueCopy}>
                <Text style={[styles.queueTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.queueDetail, { color: colors.textSecondary }]}
                >
                  {item.detail}
                </Text>
              </View>
              <Text style={[styles.queueStatus, { color: colors.primary }]}>
                {item.status}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: { flex: 1, gap: spacing.sm },
  heroEyebrow: {
    color: "#d4e5ff",
    fontSize: rf(12),
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: { color: "#ffffff", fontSize: rf(28), fontWeight: "900" },
  heroSubtitle: { color: "#d8e7ff", fontSize: rf(15), lineHeight: rf(22) },
  alertPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  alertPillText: { color: "#ffffff", fontSize: rf(12), fontWeight: "800" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricTile: {
    width: "47%",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  metricTilePrimary: { backgroundColor: "rgba(255,255,255,0.18)" },
  metricTileDark: { backgroundColor: "rgba(8,15,25,0.78)" },
  metricValue: { color: "#ffffff", fontSize: rf(28), fontWeight: "900" },
  metricLabel: { color: "#d8e7ff", fontSize: rf(13), fontWeight: "700" },
  sectionPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  panelEyebrow: {
    fontSize: rf(12),
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  panelTitle: { fontSize: rf(20), fontWeight: "900" },
  panelText: { fontSize: rf(14), lineHeight: rf(20) },
  listWrap: {
    backgroundColor: "transparent",
    paddingTop: spacing.xs,
  },
  queueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  queueCopy: { flex: 1, gap: spacing.xs },
  queueTitle: { fontSize: rf(16), fontWeight: "800" },
  queueDetail: { fontSize: rf(13), lineHeight: rf(18) },
  queueStatus: { fontSize: rf(12), fontWeight: "800", textAlign: "right" },
});
