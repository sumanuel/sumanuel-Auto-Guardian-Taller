import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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
  {
    key: "all",
    label: "Todos",
    title: "Panorama general",
    subtitle: "Diagnosticos y ordenes mezclados segun actividad reciente.",
    icon: "grid-outline",
  },
  {
    key: "diagnostic",
    label: "Diagnosticos",
    title: "Diagnosticos del taller",
    subtitle: "Revision inicial, cotizacion y aprobacion antes de abrir orden.",
    icon: "clipboard-outline",
  },
  {
    key: "work-order",
    label: "Ordenes",
    title: "Ordenes operativas",
    subtitle: "Seguimiento de ejecucion, pausas, entregas y avance tecnico.",
    icon: "construct-outline",
  },
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

function getTimestampMillis(value) {
  if (value?.toMillis) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
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

function getQueueIconName(itemType) {
  return itemType === "diagnostic" ? "clipboard-outline" : "construct-outline";
}

function getQueueTypeLabel(itemType) {
  return itemType === "diagnostic" ? "Diagnostico" : "Orden";
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

    const latestDiagnostics = diagnostics.map((diagnostic) => {
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
        createdAt:
          getTimestampMillis(diagnostic?.updatedAt) ||
          getTimestampMillis(diagnostic?.createdAt),
        statusKey: diagnostic.status || "",
        status:
          diagnosticStatusOptions.find((item) => item.key === diagnostic.status)
            ?.label ||
          diagnostic.status ||
          "Sin estado",
      };
    });

    const latestWorkOrders = workOrders.map((workOrder) => {
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
        createdAt:
          getTimestampMillis(workOrder?.updatedAt) ||
          getTimestampMillis(workOrder?.createdAt),
        statusKey: workOrder.status || "",
        status:
          workOrderStatusOptions.find((item) => item.key === workOrder.status)
            ?.label ||
          workOrder.status ||
          "Sin estado",
      };
    });

    return [...latestDiagnostics, ...latestWorkOrders].sort(
      (left, right) => right.createdAt - left.createdAt,
    );
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

    return [{ id: "all", value: "all", label: "Todo" }];
  }, [selectedType]);

  const filteredQueue = useMemo(() => {
    const normalizedPlateQuery = normalizeSearchValue(plateQuery);

    return queue
      .filter((item) => {
        const matchesPlate = normalizedPlateQuery
          ? normalizeSearchValue(item.plate).includes(normalizedPlateQuery)
          : true;
        const matchesType =
          selectedType === "all" ? true : item.type === selectedType;
        const matchesStatus =
          selectedStatus === "all" ? true : item.statusKey === selectedStatus;
        return matchesPlate && matchesType && matchesStatus;
      })
      .slice(0, 8);
  }, [plateQuery, queue, selectedStatus, selectedType]);

  const selectedQueueType =
    queueTypeOptions.find((option) => option.key === selectedType) ||
    queueTypeOptions[0];

  const tabCounters = useMemo(
    () => ({
      all: queue.length,
      diagnostic: diagnostics.length,
      "work-order": workOrders.length,
    }),
    [diagnostics.length, queue.length, workOrders.length],
  );

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
          <View style={styles.panelHeaderBlock}>
            <Text style={[styles.panelEyebrow, { color: colors.primary }]}>
              Agenda operativa
            </Text>
            <Text style={[styles.panelTitle, { color: colors.text }]}>
              {selectedQueueType.title}
            </Text>
            <Text style={[styles.panelText, { color: colors.textSecondary }]}>
              {selectedQueueType.subtitle}
            </Text>
          </View>

          <View style={styles.tabRail}>
            {queueTypeOptions.map((option) => {
              const isActive = option.key === selectedType;

              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSelectedType(option.key)}
                  style={[
                    styles.tabCard,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.cardMuted,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.tabCardTopRow}>
                    <Ionicons
                      color={isActive ? colors.white : colors.textSecondary}
                      name={option.icon}
                      size={rf(16)}
                    />
                    <Text
                      style={[
                        styles.tabCardCount,
                        { color: isActive ? colors.white : colors.text },
                      ]}
                    >
                      {tabCounters[option.key] || 0}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tabCardLabel,
                      { color: isActive ? colors.white : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filtersBlock}>
            <View
              style={[
                styles.searchShell,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                color={colors.textTertiary}
                name="search-outline"
                size={rf(18)}
              />
              <TextInput
                placeholder="Buscar por placa"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
                value={plateQuery}
                onChangeText={setPlateQuery}
                autoCapitalize="characters"
              />
            </View>

            <View
              style={[
                styles.contextStrip,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.contextStripCopy}>
                <Text
                  style={[styles.contextStripTitle, { color: colors.text }]}
                >
                  {filteredQueue.length} registro
                  {filteredQueue.length === 1 ? "" : "s"} visibles
                </Text>
                <Text
                  style={[
                    styles.contextStripSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectedType === "all"
                    ? "Vista compacta para detectar rapido diagnosticos y ordenes activas."
                    : "Filtra por estado solo cuando estes revisando un flujo operativo especifico."}
                </Text>
              </View>
              <View
                style={[
                  styles.contextBadge,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.contextBadgeText, { color: colors.primary }]}
                >
                  {selectedQueueType.label}
                </Text>
              </View>
            </View>

            {selectedType !== "all" ? (
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
            ) : null}
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
                    <View style={styles.queueTopRow}>
                      <View
                        style={[
                          styles.queueTypeBadge,
                          {
                            backgroundColor: colors.cardMuted,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          color={accentColor}
                          name={getQueueIconName(item.type)}
                          size={rf(15)}
                        />
                        <Text
                          style={[
                            styles.queueTypeBadgeText,
                            { color: accentColor },
                          ]}
                        >
                          {getQueueTypeLabel(item.type)}
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

                    <Text style={[styles.queueTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.queuePlate, { color: colors.accent }]}>
                      Placa: {item.plate}
                    </Text>
                    <Text style={[styles.queueCaseTag, { color: caseColor }]}>
                      {item.detail}
                    </Text>
                    <Text
                      style={[
                        styles.queueDetail,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.type === "diagnostic"
                        ? "Listo para revision tecnica, cotizacion o aprobacion."
                        : "Sigue el avance de ejecucion y prepara la entrega del vehiculo."}
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
                  No hay coincidencias para esta vista. Cambia de tab o ajusta
                  la placa buscada para recuperar actividad operativa.
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
  panelHeaderBlock: {
    gap: spacing.xs,
  },
  tabRail: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tabCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tabCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tabCardCount: {
    fontSize: rf(16),
    fontWeight: "900",
  },
  tabCardLabel: {
    fontSize: rf(12),
    fontWeight: "800",
  },
  filtersBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchShell: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
    fontWeight: "600",
  },
  contextStrip: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  contextStripCopy: {
    flex: 1,
    gap: 2,
  },
  contextStripTitle: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  contextStripSubtitle: {
    fontSize: rf(12),
    lineHeight: rf(17),
  },
  contextBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  contextBadgeText: {
    fontSize: rf(12),
    fontWeight: "800",
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
  queueTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  queueTypeBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  queueTypeBadgeText: {
    fontSize: rf(11),
    fontWeight: "800",
  },
  queueTitle: { fontSize: rf(16), fontWeight: "800" },
  queuePlate: {
    fontSize: rf(18),
    fontWeight: "900",
    letterSpacing: 0.6,
  },
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
