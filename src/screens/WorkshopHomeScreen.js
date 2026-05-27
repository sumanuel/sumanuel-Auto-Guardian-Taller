import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { listClients } from "../services/clients/clientService";
import {
  diagnosticStatusOptions,
  listDiagnostics,
} from "../services/diagnostics/diagnosticService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  listWorkOrders,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

const roleLabels = {
  administrator: "Administrador",
  reception: "Recepcion",
  mechanic: "Mecanico",
};

export default function WorkshopHomeScreen({ userProfile }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [nextClients, nextVehicles, nextDiagnostics, nextWorkOrders] =
          await Promise.all([
            listClients(),
            listVehicles(),
            listDiagnostics(),
            listWorkOrders(),
          ]);
        setClients(nextClients);
        setVehicles(nextVehicles);
        setDiagnostics(nextDiagnostics);
        setWorkOrders(nextWorkOrders);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const queue = useMemo(() => {
    const vehicleLookup = vehicles.reduce((accumulator, vehicle) => {
      accumulator[vehicle.id] = vehicle;
      return accumulator;
    }, {});

    const latestDiagnostics = diagnostics.slice(0, 2).map((diagnostic) => {
      const vehicle = vehicleLookup[diagnostic.vehicleId];

      return {
        key: `diagnostic-${diagnostic.id}`,
        title:
          [vehicle?.brand, vehicle?.model, vehicle?.year]
            .filter(Boolean)
            .join(" ") ||
          vehicle?.plate ||
          diagnostic.vehicleId ||
          diagnostic.id,
        detail: `Diagnostico ${diagnostic.id}`,
        status:
          diagnosticStatusOptions.find((item) => item.key === diagnostic.status)
            ?.label ||
          diagnostic.status ||
          "Sin estado",
      };
    });

    const latestWorkOrders = workOrders.slice(0, 2).map((workOrder) => {
      const vehicle = vehicleLookup[workOrder.vehicleId];

      return {
        key: `work-order-${workOrder.id}`,
        title:
          [vehicle?.brand, vehicle?.model, vehicle?.year]
            .filter(Boolean)
            .join(" ") ||
          vehicle?.plate ||
          workOrder.vehicleId ||
          workOrder.id,
        detail: `Orden ${workOrder.id}`,
        status:
          workOrderStatusOptions.find((item) => item.key === workOrder.status)
            ?.label ||
          workOrder.status ||
          "Sin estado",
      };
    });

    return [...latestDiagnostics, ...latestWorkOrders].slice(0, 3);
  }, [diagnostics, vehicles, workOrders]);

  const activeOrdersCount = workOrders.filter(
    (workOrder) => workOrder.status !== "delivered",
  ).length;

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
                {activeOrdersCount} activas
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View
              style={[styles.metricTile, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {vehicles.length}
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
                {clients.length}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Clientes
              </Text>
            </View>
            <View
              style={[styles.metricTile, { backgroundColor: colors.cardMuted }]}
            >
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {diagnostics.length}
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
                {workOrders.length}
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

        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        <View style={styles.listWrap}>
          {queue.length ? (
            queue.map((item) => (
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
                    <Text
                      style={[styles.queueStatus, { color: colors.primary }]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.queueDetail,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.detail}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View
              style={[
                styles.queueRow,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.queueCopy}>
                <Text style={[styles.queueEyebrow, { color: colors.primary }]}>
                  Agenda
                </Text>
                <Text
                  style={[styles.queueDetail, { color: colors.textSecondary }]}
                >
                  Aun no hay diagnosticos ni ordenes recientes para mostrar en
                  el home.
                </Text>
              </View>
            </View>
          )}
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
