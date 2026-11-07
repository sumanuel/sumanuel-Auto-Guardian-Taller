import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateRangeFilterModal from "../components/common/DateRangeFilterModal";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import BigButton from "../components/common/BigButton";
import OperationCard from "../components/common/OperationCard";
import {
  isDiagnosticAssignedToUser,
  isMechanicRole,
  isWorkOrderAssignedToUser,
  getRoleLabel,
} from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
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
import {
  createLastDaysRange,
  formatDateRangeLabel,
  getSharedOperationalDateRange,
  isWithinDateRange,
  setSharedOperationalDateRange,
} from "../utils/dateRange";

const queueTypeOptions = [
  {
    key: "all",
    label: "Todos",
    title: "Panorama general",
    subtitle: "Diagnósticos y órdenes mezclados según actividad reciente.",
    icon: "grid-outline",
  },
  {
    key: "diagnostic",
    label: "Diagnósticos",
    title: "Diagnósticos del taller",
    subtitle: "Revisión inicial, cotización y aprobación antes de abrir orden.",
    icon: "pulse-outline",
  },
  {
    key: "work-order",
    label: "Órdenes",
    title: "Órdenes operativas",
    subtitle: "Seguimiento de ejecución, pausas, entregas y avance técnico.",
    icon: "clipboard-outline",
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

  return fallbackId || "Sin código";
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

function normalizeLegacyWorkOrderStatus(status) {
  return status === "approved" ? "open" : status || "";
}

function getQueueIconName(itemType) {
  return itemType === "diagnostic" ? "pulse-outline" : "clipboard-outline";
}

function getQueueTypeLabel(itemType) {
  return itemType === "diagnostic" ? "Diagnóstico" : "Orden";
}

export default function WorkshopHomeScreen({
  onOpenDiagnosticDetail,
  onOpenWorkOrderDetail,
  onOpenClients,
  onOpenVehicles,
  onOpenNewIntake,
  currentRole,
  userProfile,
}) {
  const { colors } = useTheme();
  const { activeWorkshopId } = useAuth();
  const isMechanicUser = isMechanicRole(currentRole);
  const currentUserUid = userProfile?.uid || "";
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [plateQuery, setPlateQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState(() =>
    getSharedOperationalDateRange(),
  );
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  const resetDateRangeToLastThirtyDays = () => {
    const nextRange = setSharedOperationalDateRange(createLastDaysRange(30));
    setDateRange(nextRange);
    return nextRange;
  };

  const refreshData = async () => {
    setLoading(true);

    try {
      const [
        nextClientsResult,
        nextVehiclesResult,
        nextDiagnosticsResult,
        nextWorkOrdersResult,
      ] = await Promise.allSettled([
        listClients(),
        listVehicles(),
        listDiagnostics(),
        listWorkOrders(),
      ]);

      if (
        nextDiagnosticsResult.status !== "fulfilled" &&
        nextWorkOrdersResult.status !== "fulfilled"
      ) {
        throw nextWorkOrdersResult.reason || nextDiagnosticsResult.reason;
      }

      const nextClients =
        nextClientsResult.status === "fulfilled" ? nextClientsResult.value : [];
      const nextVehicles =
        nextVehiclesResult.status === "fulfilled"
          ? nextVehiclesResult.value
          : [];
      const nextDiagnostics =
        nextDiagnosticsResult.status === "fulfilled"
          ? nextDiagnosticsResult.value
          : [];
      const nextWorkOrders =
        nextWorkOrdersResult.status === "fulfilled"
          ? nextWorkOrdersResult.value
          : [];

      setClients(nextClients);
      setVehicles(nextVehicles);
      setDiagnostics(nextDiagnostics);
      setWorkOrders(nextWorkOrders);
    } catch (error) {
      console.error("WorkshopHomeScreen refresh failed:", error);
      Alert.alert(
        "Home",
        "No se pudo refrescar la agenda operativa del taller.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeWorkshopId]);

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

  const visibleDiagnostics = useMemo(
    () =>
      isMechanicUser
        ? diagnostics.filter((diagnostic) =>
            isDiagnosticAssignedToUser(diagnostic, currentUserUid),
          )
        : diagnostics,
    [currentUserUid, diagnostics, isMechanicUser],
  );

  const visibleWorkOrders = useMemo(
    () =>
      isMechanicUser
        ? workOrders.filter((workOrder) =>
            isWorkOrderAssignedToUser(workOrder, currentUserUid),
          )
        : workOrders,
    [currentUserUid, isMechanicUser, workOrders],
  );

  const queue = useMemo(() => {
    const vehicleLookup = vehicles.reduce((accumulator, vehicle) => {
      const vehicleKey = getVehicleKey(vehicle);

      if (vehicleKey) {
        accumulator[vehicleKey] = vehicle;
      }

      return accumulator;
    }, {});

    const latestDiagnostics = visibleDiagnostics.map((diagnostic) => {
      const vehicle = vehicleLookup[diagnostic.vehicleId];
      const sequentialCode = formatOperationalCode(
        diagnostic,
        firestoreCollections.diagnostics,
      );

      return {
        key: `diagnostic-${getRecordKey(diagnostic) || sequentialCode}`,
        recordId: getRecordKey(diagnostic),
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

    const latestWorkOrders = visibleWorkOrders.map((workOrder) => {
      const vehicle = vehicleLookup[workOrder.vehicleId];
      const sequentialCode = formatOperationalCode(
        workOrder,
        firestoreCollections.workOrders,
      );
      const normalizedStatus = normalizeLegacyWorkOrderStatus(workOrder.status);

      return {
        key: `work-order-${getRecordKey(workOrder) || sequentialCode}`,
        recordId: getRecordKey(workOrder),
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
        statusKey: normalizedStatus,
        status:
          workOrderStatusOptions.find((item) => item.key === normalizedStatus)
            ?.label ||
          normalizedStatus ||
          "Sin estado",
      };
    });

    return [...latestDiagnostics, ...latestWorkOrders].sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  }, [vehicles, visibleDiagnostics, visibleWorkOrders]);

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

    return queue.filter((item) => {
      const matchesPlate = normalizedPlateQuery
        ? normalizeSearchValue(item.plate).includes(normalizedPlateQuery)
        : true;
      const matchesType =
        selectedType === "all" ? true : item.type === selectedType;
      const matchesStatus =
        selectedStatus === "all" ? true : item.statusKey === selectedStatus;
      const isFinished =
        item.statusKey === "delivered" || item.statusKey === "closed";
      const matchesDate =
        isMechanicUser && !isFinished
          ? true
          : isWithinDateRange(item.createdAt, dateRange);
      return matchesPlate && matchesType && matchesStatus && matchesDate;
    });
  }, [
    dateRange,
    isMechanicUser,
    plateQuery,
    queue,
    selectedStatus,
    selectedType,
  ]);

  const selectedQueueType =
    queueTypeOptions.find((option) => option.key === selectedType) ||
    queueTypeOptions[0];

  const tabCounters = useMemo(
    () => ({
      all: queue.length,
      diagnostic: visibleDiagnostics.length,
      "work-order": visibleWorkOrders.length,
    }),
    [queue.length, visibleDiagnostics.length, visibleWorkOrders.length],
  );

  const activeOrdersCount = visibleWorkOrders.filter(
    (workOrder) => workOrder.status !== "delivered",
  ).length;

  const boardTiles = useMemo(() => {
    const ranged = queue.filter((item) =>
      isWithinDateRange(item.createdAt, dateRange),
    );
    const count = (type, status) =>
      ranged.filter((item) => item.type === type && item.statusKey === status)
        .length;

    return [
      {
        key: "in-progress",
        type: "work-order",
        status: "in-progress",
        label: "En proceso",
        icon: "construct-outline",
        tone: "accent",
        value: count("work-order", "in-progress"),
      },
      {
        key: "paused",
        type: "work-order",
        status: "paused",
        label: "En pausa",
        icon: "pause-circle-outline",
        tone: "danger",
        value: count("work-order", "paused"),
      },
      {
        key: "ready",
        type: "work-order",
        status: "ready",
        label: "Listas para entregar",
        icon: "checkmark-circle-outline",
        tone: "success",
        value: count("work-order", "ready"),
      },
      {
        key: "quoted",
        type: "diagnostic",
        status: "quoted",
        label: "Esperando aprobación",
        icon: "hourglass-outline",
        tone: "warning",
        value: count("diagnostic", "quoted"),
      },
    ];
  }, [dateRange, queue]);

  const handleBoardTilePress = (tile) => {
    const isActive =
      selectedType === tile.type && selectedStatus === tile.status;

    // Tocar de nuevo el mosaico activo quita el filtro.
    setSelectedType(isActive ? "all" : tile.type);
    setSelectedStatus(isActive ? "all" : tile.status);
  };

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          section="Centro de control"
          subtitle={
            isMechanicUser
              ? "Supervisa solo los diagnósticos y órdenes que están bajo tu responsabilidad operativa."
              : "Supervisa recepción, diagnósticos, órdenes y alertas desde una sola vista operativa."
          }
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
                {getRoleLabel(currentRole)}
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

          {!isMechanicUser ? (
            <>
              <BigButton
                icon="add-circle-outline"
                label="Nuevo ingreso"
                onPress={onOpenNewIntake}
              />
              <View style={styles.boardGrid}>
                {boardTiles.map((tile) => {
                  const tileColor = colors[tile.tone];
                  const isActive =
                    selectedType === tile.type &&
                    selectedStatus === tile.status;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={tile.key}
                      onPress={() => handleBoardTilePress(tile)}
                      style={({ pressed }) => [
                        styles.boardTile,
                        {
                          backgroundColor: isActive
                            ? colors.cardBackground
                            : colors.cardMuted,
                          borderColor: isActive ? tileColor : colors.border,
                          borderLeftColor: tileColor,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <View style={styles.boardTileTop}>
                        <Text style={[styles.boardValue, { color: tileColor }]}>
                          {tile.value}
                        </Text>
                        <Ionicons
                          color={tileColor}
                          name={tile.icon}
                          size={26}
                        />
                      </View>
                      <Text style={[styles.boardLabel, { color: colors.text }]}>
                        {tile.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.boardShortcuts}>
                <BigButton
                  icon="people-outline"
                  label={`Clientes (${clients.length})`}
                  onPress={onOpenClients}
                  style={styles.boardShortcut}
                  variant="secondary"
                />
                <BigButton
                  icon="car-sport-outline"
                  label={`Vehículos (${vehicles.length})`}
                  onPress={onOpenVehicles}
                  style={styles.boardShortcut}
                  variant="secondary"
                />
              </View>
            </>
          ) : null}
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
                    styles.tabCardLarge,
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
            <View style={styles.searchRow}>
              <View
                style={[
                  styles.searchShell,
                  styles.searchShellLarge,
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
                  style={[
                    styles.searchInput,
                    styles.searchInputLarge,
                    { color: colors.text },
                  ]}
                  value={plateQuery}
                  onChangeText={setPlateQuery}
                  autoCapitalize="characters"
                />
              </View>

              <Pressable
                onPress={() => setIsDateFilterVisible(true)}
                style={[
                  styles.iconAction,
                  styles.iconActionLarge,
                  {
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  color={colors.primary}
                  name="calendar-outline"
                  size={rf(18)}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  resetDateRangeToLastThirtyDays();
                  refreshData();
                }}
                style={[
                  styles.iconAction,
                  styles.iconActionLarge,
                  {
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  color={colors.accent}
                  name="refresh-outline"
                  size={rf(18)}
                />
              </Pressable>
            </View>

            <Text
              style={[styles.rangeSummary, { color: colors.textSecondary }]}
            >
              Rango activo: {formatDateRangeLabel(dateRange)}
            </Text>

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
                    ? isMechanicUser
                      ? "Vista compacta con tus casos y órdenes asignadas."
                      : "Vista compacta para detectar rápido diagnósticos y órdenes activas."
                    : "Filtra por estado solo cuando estés revisando un flujo operativo específico."}
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
                        styles.filterChipLarge,
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
                          styles.filterChipTextLarge,
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
                <OperationCard
                  code={`${getQueueTypeLabel(item.type)} ${item.detail}`}
                  key={item.key}
                  onPress={() => {
                    if (item.type === "diagnostic") {
                      onOpenDiagnosticDetail?.(item.recordId);
                      return;
                    }

                    onOpenWorkOrderDetail?.(item.recordId);
                  }}
                  plate={item.plate === "Sin placa" ? "" : item.plate}
                  statusLabel={item.status}
                  title={item.title}
                  tone={accentColor}
                />
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
                  {isMechanicUser
                    ? "No tienes diagnósticos ni órdenes asignadas para esta vista. Ajusta los filtros o espera una nueva asignación."
                    : "No hay coincidencias para esta vista. Cambia de tab o ajusta la placa buscada para recuperar actividad operativa."}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <DateRangeFilterModal
        initialRange={dateRange}
        onApply={(nextRange) => {
          const sharedRange = setSharedOperationalDateRange(nextRange);
          setDateRange(sharedRange);
        }}
        onClose={() => setIsDateFilterVisible(false)}
        title="Filtrar agenda por fecha"
        visible={isDateFilterVisible}
      />
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
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 2,
  },
  metricActionTile: {
    gap: spacing.sm,
  },
  metricTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metricIconWrap: {
    width: rf(36),
    height: rf(36),
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
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
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "stretch",
  },
  searchShell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconAction: {
    width: 48,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: rf(15),
    fontWeight: "600",
  },
  rangeSummary: {
    fontSize: rf(13),
    lineHeight: rf(17),
    fontWeight: "700",
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
    fontSize: rf(13),
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
    minHeight: 48,
    justifyContent: "center",
  },
  filterChipCompact: {
    paddingHorizontal: spacing.sm,
  },
  filterChipText: {
    fontSize: rf(14),
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
  queueDetail: { fontSize: rf(14), lineHeight: rf(18) },
  tabCardLarge: { minHeight: 72, justifyContent: "center" },
  iconActionLarge: { width: 56, minHeight: 56 },
  filterChipLarge: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipTextLarge: { fontSize: 16 },
  searchShellLarge: { minHeight: 56 },
  searchInputLarge: { fontSize: 17 },
  queuePlateLarge: { fontSize: 26, letterSpacing: 1 },
  boardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  boardTile: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 92,
    borderWidth: 1,
    borderLeftWidth: 6,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    justifyContent: "space-between",
  },
  boardTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boardValue: { fontSize: 34, fontWeight: "900" },
  boardLabel: { fontSize: 15, fontWeight: "800" },
  boardShortcuts: { flexDirection: "row", gap: 12 },
  boardShortcut: { flex: 1 },
});
