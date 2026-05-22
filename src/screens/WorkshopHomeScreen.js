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
  const { colors } = useTheme();

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

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroEyebrow, { color: colors.primary }]}>
                Estado operativo
              </Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {userProfile?.fullName || "Usuario activo"}
              </Text>
              <Text
                style={[styles.heroSubtitle, { color: colors.textSecondary }]}
              >
                {roleLabels[userProfile?.role] ||
                  userProfile?.role ||
                  "Sin rol"}
              </Text>
            </View>

            <View
              style={[styles.alertPill, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.alertPillText, { color: colors.primary }]}>
                3 alertas
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View
              style={[styles.metricTile, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.metricValue, { color: colors.text }]}>
                18
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Vehiculos
              </Text>
            </View>
            <View
              style={[styles.metricTile, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.metricValue, { color: colors.text }]}>
                5
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Urgentes
              </Text>
            </View>
            <View
              style={[styles.metricTile, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.metricValue, { color: colors.text }]}>
                7
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Diagnosticos
              </Text>
            </View>
            <View
              style={[styles.metricTile, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.metricValue, { color: colors.text }]}>
                11
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Ordenes
              </Text>
            </View>
          </View>
        </View>

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
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.queueCopy}>
                <View
                  style={[
                    styles.queueHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.queueHeaderCopy}>
                    <Text
                      style={[styles.queueEyebrow, { color: colors.primary }]}
                    >
                      Agenda
                    </Text>
                    <Text style={[styles.queueTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                  </View>
                  <Text style={[styles.queueStatus, { color: colors.primary }]}>
                    {item.status}
                  </Text>
                </View>
                <Text
                  style={[styles.queueDetail, { color: colors.textSecondary }]}
                >
                  {item.detail}
                </Text>
              </View>
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
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
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
  heroTitle: { fontSize: rf(24), fontWeight: "900" },
  heroSubtitle: { fontSize: rf(14), lineHeight: rf(20) },
  alertPill: {
    alignSelf: "flex-start",
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  alertPillText: { fontSize: rf(12), fontWeight: "800" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricTile: {
    width: "47%",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 2,
  },
  metricValue: { fontSize: rf(24), fontWeight: "900" },
  metricLabel: { fontSize: rf(12), fontWeight: "700" },
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
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  queueCopy: { flex: 1, gap: spacing.sm },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  queueHeaderCopy: { flex: 1, gap: 2 },
  queueEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  queueTitle: { fontSize: rf(16), fontWeight: "800" },
  queueDetail: { fontSize: rf(13), lineHeight: rf(18) },
  queueStatus: { fontSize: rf(11), fontWeight: "800", textAlign: "right" },
});
