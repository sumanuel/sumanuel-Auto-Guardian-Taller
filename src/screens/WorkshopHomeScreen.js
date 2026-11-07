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
import BigChip from "../components/common/BigChip";
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
    icon: "grid-outline",
  },
  {
    key: "diagnostic",
    label: "Diagnósticos",
    icon: "pulse-outline",
  },
  {
    key: "work-order",
    label: "Órdenes",
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

        <View style={styles.agenda}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Agenda
          </Text>

          <View style={styles.chipRow}>
            {queueTypeOptions.map((option) => (
              <BigChip
                key={option.key}
                label={`${option.label}\n${tabCounters[option.key] || 0}`}
                onPress={() => setSelectedType(option.key)}
                selected={option.key === selectedType}
                style={styles.chipFlex}
              />
            ))}
          </View>

          <View style={styles.searchRow}>
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
                size={22}
              />
              <TextInput
                autoCapitalize="characters"
                onChangeText={setPlateQuery}
                placeholder="Buscar por placa"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
                value={plateQuery}
              />
            </View>

            <Pressable
              accessibilityLabel="Filtrar por fecha"
              accessibilityRole="button"
              onPress={() => setIsDateFilterVisible(true)}
              style={[
                styles.iconAction,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Ionicons
                color={colors.primary}
                name="calendar-outline"
                size={24}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="Actualizar"
              accessibilityRole="button"
              onPress={() => {
                resetDateRangeToLastThirtyDays();
                refreshData();
              }}
              style={[
                styles.iconAction,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Ionicons
                color={colors.accent}
                name="refresh-outline"
                size={24}
              />
            </Pressable>
          </View>

          <Text style={[styles.rangeSummary, { color: colors.textSecondary }]}>
            {filteredQueue.length} registro
            {filteredQueue.length === 1 ? "" : "s"} ·{" "}
            {formatDateRangeLabel(dateRange)}
          </Text>

          {selectedType !== "all" ? (
            <View style={styles.filterGroup}>
              {statusFilterOptions.map((option) => (
                <BigChip
                  key={option.id}
                  label={option.label}
                  onPress={() => setSelectedStatus(option.value)}
                  selected={option.value === selectedStatus}
                />
              ))}
            </View>
          ) : null}
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
  agenda: { gap: 12 },
  sectionTitle: { fontSize: 22, fontWeight: "900" },
  chipRow: { flexDirection: "row", gap: 8 },
  chipFlex: { flex: 1, minHeight: 64, paddingHorizontal: 4 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  searchShell: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 17, fontWeight: "600" },
  iconAction: {
    width: 56,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeSummary: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  listWrap: { gap: spacing.sm },
  queueRow: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  queueCopy: { flex: 1, gap: spacing.sm },
  queueEyebrow: {
    fontSize: rf(12),
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  queueDetail: { fontSize: 16, lineHeight: 23 },
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
