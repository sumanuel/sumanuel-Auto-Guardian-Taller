import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { firestoreCollections } from "../services/firestore/collections";
import { borderRadius, rf, spacing } from "../utils/responsive";

const roleLabels = {
  owner: "Dueno",
  administrator: "Administrador",
  reception: "Recepcion",
  mechanic: "Mecanico",
};

const queueTypeOptions = [
  { key: "all", label: "Todos" },
  { key: "diagnostic", label: "Diagnosticos" },
  { key: "work-order", label: "Ordenes" },
];

function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getVehicleKey(vehicle) {
  return vehicle?.refId || vehicle?.id || "";
}

function getRecordKey(record) {
  return record?.refId || record?.id || "";
}

function formatOperationalCode(record, collectionConfig) {
  const sequentialId = Number(record?.sequentialId);
  const fallbackId = getRecordKey(record);

  if (
    fallbackId &&
    typeof fallbackId === "string" &&
    fallbackId.startsWith(collectionConfig.prefix)
  ) {
    return fallbackId;
  }

  if (Number.isFinite(sequentialId) && sequentialId > 0) {
    return `${collectionConfig.prefix}${String(sequentialId).padStart(
      collectionConfig.padding,
      "0",
    )}`;
  }

  return fallbackId || "Sin codigo";
}

function getQueueAccentColor(item, colors) {
  if (item.type === "diagnostic") {
    switch (item.statusKey) {
      case "quoted":
        return colors.warning;
      case "approved":
        return colors.success;
      case "closed":
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  }

  switch (item.statusKey) {
    case "open":
      return colors.warning;
    case "approved":
      return colors.primary;
    case "in-progress":
      return colors.accent;
    case "paused":
      return colors.danger;
    case "ready":
      return colors.success;
    case "delivered":
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}

function getQueueCaseColor(item, colors) {
  return item.type === "diagnostic" ? colors.primary : colors.warning;
}

export default function WorkshopHomeScreen({ userProfile }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [plateQuery, setPlateQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

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

  useEffect(() => {
    if (selectedType === "all") {
      return;
    }

    const isStatusAvailable =
      selectedType === "diagnostic"
        ? diagnosticStatusOptions.some(
            (option) => option.key === selectedStatus,
          )
        : workOrderStatusOptions.some(
            (option) => option.key === selectedStatus,
          );

    if (!isStatusAvailable) {
      setSelectedStatus("all");
    }
  }, [selectedStatus, selectedType]);

  const queue = useMemo(() => {
    const vehicleLookup = vehicles.reduce((accumulator, vehicle) => {
      const vehicleKey = getVehicleKey(vehicle);

      if (vehicleKey) {
        accumulator[vehicleKey] = vehicle;
      }

      return accumulator;
    }, {});

    const latestDiagnostics = diagnostics.slice(0, 2).map((diagnostic) => {
      const vehicle = vehicleLookup[diagnostic.vehicleId];
      const sequentialCode = formatOperationalCode(
        diagnostic,
        firestoreCollections.diagnostics,
      );

      return {
        key: `diagnostic-${getRecordKey(diagnostic) || sequentialCode}`,
        type: "diagnostic",
        title:
          [vehicle?.brand, vehicle?.model, vehicle?.year]
            .filter(Boolean)
            .join(" ") ||
          vehicle?.plate ||
          diagnostic.vehicleId ||
          sequentialCode,
        plate: vehicle?.plate || "Sin placa",
        detail: sequentialCode,
        statusKey: diagnostic.status || "",
        status:
          diagnosticStatusOptions.find((item) => item.key === diagnostic.status)
            ?.label ||
          diagnostic.status ||
          "Sin estado",
      };
    });

    const latestWorkOrders = workOrders.slice(0, 2).map((workOrder) => {
      const vehicle = vehicleLookup[workOrder.vehicleId];
      const sequentialCode = formatOperationalCode(
        workOrder,
        firestoreCollections.workOrders,
      );

      return {
        key: `work-order-${getRecordKey(workOrder) || sequentialCode}`,
        type: "work-order",
        title:
          [vehicle?.brand, vehicle?.model, vehicle?.year]
            .filter(Boolean)
            .join(" ") ||
          vehicle?.plate ||
          workOrder.vehicleId ||
          sequentialCode,
        plate: vehicle?.plate || "Sin placa",
        detail: sequentialCode,
        statusKey: workOrder.status || "",
        status:
          workOrderStatusOptions.find((item) => item.key === workOrder.status)
            ?.label ||
          workOrder.status ||
          "Sin estado",
      };
    });

    return [...latestDiagnostics, ...latestWorkOrders].slice(0, 3);
  }, [diagnostics, vehicles, workOrders]);

  const statusFilterOptions = useMemo(() => {
    if (selectedType === "diagnostic") {
      return [
        { id: "all", value: "all", label: "Todos los estados" },
        ...diagnosticStatusOptions.map((option) => ({
          id: `diagnostic-${option.key}`,
          value: option.key,
          label: option.label,
        })),
      ];
    }

    if (selectedType === "work-order") {
      return [
        { id: "all", value: "all", label: "Todos los estados" },
        ...workOrderStatusOptions.map((option) => ({
          id: `work-order-${option.key}`,
          value: option.key,
          label: option.label,
        })),
      ];
    }

    return [
      { id: "all", value: "all", label: "Todos los estados" },
      ...diagnosticStatusOptions.map((option) => ({
        id: `diagnostic-${option.key}`,
        value: option.key,
        label: `Diag. ${option.label}`,
      })),
      ...workOrderStatusOptions.map((option) => ({
        id: `work-order-${option.key}`,
        value: option.key,
        label: `Ord. ${option.label}`,
      })),
    ];
  }, [selectedType]);

  const filteredQueue = useMemo(() => {
    const normalizedPlateQuery = normalizeSearchValue(plateQuery);

    return queue.filter((item) => {
      const matchesPlate = normalizedPlateQuery
        ? normalizeSearchValue(item.plate).includes(normalizedPlateQuery)
        : true;
      const matchesType =
        selectedType === "all" ? true : item.type === selectedType;
      const matchesStatus =
        selectedStatus === "all" ? true : item.statusKey === selectedStatus;

      return matchesPlate && matchesType && matchesStatus;
    });
  }, [plateQuery, queue, selectedStatus, selectedType]);

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

          <View style={styles.filtersBlock}>
            <TextInput
              placeholder="Buscar por placa"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={plateQuery}
              onChangeText={setPlateQuery}
              autoCapitalize="characters"
            />

            <View style={styles.filterGroup}>
              {queueTypeOptions.map((option) => {
                const isActive = option.key === selectedType;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setSelectedType(option.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.cardMuted,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? colors.white : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filterGroup}>
              {statusFilterOptions.map((option) => {
                const isActive = option.value === selectedStatus;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedStatus(option.value)}
                    style={[
                      styles.filterChip,
                      styles.filterChipCompact,
                      {
                        backgroundColor: isActive
                          ? colors.primaryStrong
                          : colors.cardMuted,
                        borderColor: isActive
                          ? colors.primaryStrong
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? colors.white : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        <View style={styles.listWrap}>
          {filteredQueue.length ? (
            filteredQueue.map((item) => {
              const accentColor = getQueueAccentColor(item, colors);
              const caseColor = getQueueCaseColor(item, colors);

              return (
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
                          style={[styles.queueEyebrow, { color: accentColor }]}
                        >
                          Agenda
                        </Text>
                        <Text
                          style={[styles.queueTitle, { color: colors.text }]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.queuePlate,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Placa: {item.plate}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.queueStatusBadge,
                          {
                            backgroundColor: colors.cardMuted,
                            borderColor: accentColor,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.queueStatus, { color: accentColor }]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.queueCaseTag, { color: caseColor }]}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              );
            })
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
                  No hay coincidencias con los filtros actuales para mostrar en
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
  filtersBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
    fontWeight: "600",
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipCompact: {
    paddingHorizontal: spacing.sm,
  },
  filterChipText: {
    fontSize: rf(12),
    fontWeight: "800",
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
    gap: spacing.sm,
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
  queuePlate: { fontSize: rf(16), fontWeight: "600" },
  queueStatusBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  queueStatus: { fontSize: rf(14), fontWeight: "900", textAlign: "right" },
  queueCaseTag: { fontSize: rf(15), fontWeight: "900", lineHeight: rf(20) },
  queueDetail: { fontSize: rf(13), lineHeight: rf(18) },
});
