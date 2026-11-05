import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BigButton from "../components/common/BigButton";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import {
  getRoleLabel,
  isDiagnosticAssignedToUser,
  isWorkOrderAssignedToUser,
} from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  diagnosticStatusOptions,
  listDiagnostics,
} from "../services/diagnostics/diagnosticService";
import { firestoreCollections } from "../services/firestore/collections";
import {
  loadOfflineCache,
  saveOfflineCache,
} from "../services/cache/offlineCache";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  listWorkOrders,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { isOnlineNow } from "../utils/connectivity";
import { spacing } from "../utils/responsive";
import { TOUCH, tapFeedback } from "../utils/touch";

// Agrupación pensada para "qué debo hacer ahora", no por tipo de documento.
const ORDER_GROUPS = [
  {
    key: "in-progress",
    title: "En proceso",
    statuses: ["in-progress"],
    tone: "accent",
    icon: "construct-outline",
  },
  {
    key: "paused",
    title: "En pausa",
    statuses: ["paused"],
    tone: "danger",
    icon: "pause-circle-outline",
  },
  {
    key: "open",
    title: "Pendientes",
    statuses: ["open", "approved", ""],
    tone: "warning",
    icon: "time-outline",
  },
  {
    key: "ready",
    title: "Listas para entregar",
    statuses: ["ready"],
    tone: "success",
    icon: "checkmark-circle-outline",
  },
];

function normalizeStatus(status) {
  return status === "approved" ? "open" : status || "";
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

function formatCode(record, collectionConfig) {
  const key = getRecordKey(record);

  if (
    key &&
    typeof key === "string" &&
    key.startsWith(collectionConfig.prefix)
  ) {
    return key;
  }

  const sequentialId = Number(record?.sequentialId);

  if (Number.isFinite(sequentialId) && sequentialId > 0) {
    return `${collectionConfig.prefix}${String(sequentialId).padStart(
      collectionConfig.padding,
      "0",
    )}`;
  }

  return key || "Sin código";
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function MechanicHomeScreen({
  onOpenWorkOrderDetail,
  onOpenDiagnosticDetail,
  onOpenWorkOrders,
  onOpenDiagnostics,
  currentRole,
  userProfile,
}) {
  const { colors } = useTheme();
  const { activeWorkshopId, activeWorkshop } = useAuth();
  const currentUserUid = userProfile?.uid || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [plateQuery, setPlateQuery] = useState("");
  const [cachedAt, setCachedAt] = useState(null);
  const cacheKey = `mechanicHome:${activeWorkshopId || "none"}:${currentUserUid}`;

  const applyData = useCallback((data) => {
    setVehicles(data.vehicles || []);
    setDiagnostics(data.diagnostics || []);
    setWorkOrders(data.workOrders || []);
  }, []);

  const restoreCachedData = useCallback(async () => {
    const cached = await loadOfflineCache(cacheKey);

    if (!cached?.data) {
      return false;
    }

    applyData(cached.data);
    setCachedAt(cached.savedAt);

    return true;
  }, [applyData, cacheKey]);

  const refreshData = useCallback(async () => {
    // Sin internet no se espera el timeout de Firestore: se muestra lo último
    // guardado.
    if (!(await isOnlineNow())) {
      const hadCache = await restoreCachedData();

      if (!hadCache) {
        Alert.alert(
          "Sin conexión",
          "No hay datos guardados todavía. Conéctate a internet para cargar tu trabajo.",
        );
      }

      return;
    }

    try {
      const [vehiclesResult, diagnosticsResult, workOrdersResult] =
        await Promise.allSettled([
          listVehicles(),
          listDiagnostics(),
          listWorkOrders(),
        ]);

      if (
        diagnosticsResult.status !== "fulfilled" &&
        workOrdersResult.status !== "fulfilled"
      ) {
        throw workOrdersResult.reason || diagnosticsResult.reason;
      }

      const data = {
        vehicles:
          vehiclesResult.status === "fulfilled" ? vehiclesResult.value : [],
        diagnostics:
          diagnosticsResult.status === "fulfilled"
            ? diagnosticsResult.value
            : [],
        workOrders:
          workOrdersResult.status === "fulfilled" ? workOrdersResult.value : [],
      };

      applyData(data);
      setCachedAt(null);
      saveOfflineCache(cacheKey, data);
    } catch (error) {
      console.error("MechanicHomeScreen refresh failed:", error);

      if (!(await restoreCachedData())) {
        Alert.alert(
          "Mi trabajo",
          "No se pudo actualizar tu trabajo. Desliza hacia abajo para reintentar.",
        );
      }
    }
  }, [applyData, cacheKey, restoreCachedData]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    // Muestra al instante lo último guardado y luego actualiza.
    loadOfflineCache(cacheKey).then((cached) => {
      if (!cancelled && cached?.data) {
        applyData(cached.data);
        setLoading(false);
      }
    });

    refreshData().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeWorkshopId, applyData, cacheKey, refreshData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const vehicleLookup = useMemo(
    () =>
      vehicles.reduce((accumulator, vehicle) => {
        const key = getRecordKey(vehicle);

        if (key) {
          accumulator[key] = vehicle;
        }

        return accumulator;
      }, {}),
    [vehicles],
  );

  const describeVehicle = useCallback(
    (vehicleId) => {
      const vehicle = vehicleLookup[vehicleId];

      return {
        plate: vehicle?.plate || "Sin placa",
        title:
          [vehicle?.brand, vehicle?.model, vehicle?.year]
            .filter(Boolean)
            .join(" ") || "Vehículo sin datos",
      };
    },
    [vehicleLookup],
  );

  const orderItems = useMemo(
    () =>
      workOrders
        .filter((workOrder) =>
          isWorkOrderAssignedToUser(workOrder, currentUserUid),
        )
        .map((workOrder) => {
          const status = normalizeStatus(workOrder.status);

          return {
            key: `work-order-${getRecordKey(workOrder)}`,
            recordId: getRecordKey(workOrder),
            code: formatCode(workOrder, firestoreCollections.workOrders),
            status,
            statusLabel:
              workOrderStatusOptions.find((option) => option.key === status)
                ?.label || "Sin estado",
            progress: Math.max(
              0,
              Math.min(100, Math.round(Number(workOrder.progressPercent) || 0)),
            ),
            updatedAt:
              getTimestampMillis(workOrder.updatedAt) ||
              getTimestampMillis(workOrder.createdAt),
            ...describeVehicle(workOrder.vehicleId),
          };
        })
        .filter((item) => item.status !== "delivered"),
    [currentUserUid, describeVehicle, workOrders],
  );

  const diagnosticItems = useMemo(
    () =>
      diagnostics
        .filter((diagnostic) =>
          isDiagnosticAssignedToUser(diagnostic, currentUserUid),
        )
        .filter((diagnostic) => diagnostic.status !== "closed")
        .map((diagnostic) => ({
          key: `diagnostic-${getRecordKey(diagnostic)}`,
          recordId: getRecordKey(diagnostic),
          code: formatCode(diagnostic, firestoreCollections.diagnostics),
          statusLabel:
            diagnosticStatusOptions.find(
              (option) => option.key === diagnostic.status,
            )?.label || "Sin estado",
          updatedAt:
            getTimestampMillis(diagnostic.updatedAt) ||
            getTimestampMillis(diagnostic.createdAt),
          ...describeVehicle(diagnostic.vehicleId),
        })),
    [currentUserUid, describeVehicle, diagnostics],
  );

  const matchesQuery = useCallback(
    (item) => {
      const query = normalizeSearch(plateQuery);

      return query
        ? normalizeSearch(item.plate).includes(query) ||
            normalizeSearch(item.code).includes(query)
        : true;
    },
    [plateQuery],
  );

  const groups = useMemo(
    () =>
      ORDER_GROUPS.map((group) => ({
        ...group,
        items: orderItems
          .filter(
            (item) =>
              group.statuses.includes(item.status) && matchesQuery(item),
          )
          .sort((left, right) => right.updatedAt - left.updatedAt),
      })).filter((group) => group.items.length),
    [matchesQuery, orderItems],
  );

  const visibleDiagnostics = useMemo(
    () =>
      diagnosticItems
        .filter(matchesQuery)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [diagnosticItems, matchesQuery],
  );

  // La orden a "Continuar": la más reciente en proceso; si no hay, la
  // pendiente más reciente.
  const continueItem = useMemo(() => {
    const inProgress = orderItems
      .filter((item) => item.status === "in-progress")
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    return (
      inProgress ||
      orderItems
        .filter((item) => item.status === "open")
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ||
      null
    );
  }, [orderItems]);

  const toneColor = (tone) => colors[tone] || colors.primary;
  const hasSearch = Boolean(normalizeSearch(plateQuery));
  const hasAnything = groups.length || visibleDiagnostics.length;

  const renderProgress = (percent, color) => (
    <View style={styles.progressRow}>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: color, width: `${percent}%` },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color }]}>{percent}%</Text>
    </View>
  );

  const renderOrderCard = (item, color) => (
    <Pressable
      accessibilityRole="button"
      key={item.key}
      onPress={() => {
        tapFeedback("light");
        onOpenWorkOrderDetail?.(item.recordId);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderLeftColor: color,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.cardCopy}>
        <Text style={[styles.plate, { color: colors.text }]}>{item.plate}</Text>
        <Text
          numberOfLines={1}
          style={[styles.vehicleTitle, { color: colors.textSecondary }]}
        >
          {item.title}
        </Text>
        <Text style={[styles.code, { color }]}>
          {item.code} · {item.statusLabel}
        </Text>
        {renderProgress(item.progress, color)}
      </View>
      <Ionicons color={colors.textTertiary} name="chevron-forward" size={28} />
    </Pressable>
  );

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        <WorkshopScreenHeader
          section={activeWorkshop?.name || "Taller activo"}
          subtitle={`${userProfile?.fullName || "Usuario activo"} · ${getRoleLabel(currentRole)}`}
          title="Mi trabajo de hoy"
        />

        {cachedAt ? (
          <View
            style={[
              styles.cacheNotice,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.warning,
              },
            ]}
          >
            <Ionicons color={colors.warning} name="time-outline" size={22} />
            <Text style={[styles.cacheText, { color: colors.text }]}>
              Datos guardados de las{" "}
              {new Date(cachedAt).toLocaleTimeString("es", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Desliza hacia abajo para actualizar cuando haya conexión.
            </Text>
          </View>
        ) : null}

        {continueItem && !hasSearch ? (
          <View
            style={[
              styles.continueCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: toneColor(
                  continueItem.status === "in-progress" ? "accent" : "warning",
                ),
              },
            ]}
          >
            <Text
              style={[
                styles.continueEyebrow,
                {
                  color: toneColor(
                    continueItem.status === "in-progress"
                      ? "accent"
                      : "warning",
                  ),
                },
              ]}
            >
              {continueItem.status === "in-progress"
                ? "Estás trabajando en"
                : "Siguiente por iniciar"}
            </Text>
            <Text style={[styles.continuePlate, { color: colors.text }]}>
              {continueItem.plate}
            </Text>
            <Text
              style={[styles.vehicleTitle, { color: colors.textSecondary }]}
            >
              {continueItem.title} · {continueItem.code}
            </Text>
            {renderProgress(
              continueItem.progress,
              toneColor(
                continueItem.status === "in-progress" ? "accent" : "warning",
              ),
            )}
            <BigButton
              icon="play"
              label="Continuar"
              onPress={() => onOpenWorkOrderDetail?.(continueItem.recordId)}
            />
          </View>
        ) : null}

        <View style={styles.searchRow}>
          {searchVisible ? (
            <View
              style={[
                styles.searchShell,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.borderStrong,
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
                autoFocus
                onChangeText={setPlateQuery}
                placeholder="Placa o código"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
                value={plateQuery}
              />
            </View>
          ) : (
            <Text style={[styles.summary, { color: colors.textSecondary }]}>
              {orderItems.length} orden{orderItems.length === 1 ? "" : "es"}{" "}
              activa{orderItems.length === 1 ? "" : "s"}
              {diagnosticItems.length
                ? ` · ${diagnosticItems.length} diagnóstico${
                    diagnosticItems.length === 1 ? "" : "s"
                  }`
                : ""}
            </Text>
          )}
          <Pressable
            accessibilityLabel={searchVisible ? "Cerrar búsqueda" : "Buscar"}
            accessibilityRole="button"
            hitSlop={TOUCH.hitSlop}
            onPress={() => {
              tapFeedback("light");

              if (searchVisible) {
                setPlateQuery("");
              }

              setSearchVisible((current) => !current);
            }}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Ionicons
              color={colors.primary}
              name={searchVisible ? "close" : "search-outline"}
              size={26}
            />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : null}

        {!loading
          ? groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Ionicons
                    color={toneColor(group.tone)}
                    name={group.icon}
                    size={24}
                  />
                  <Text style={[styles.groupTitle, { color: colors.text }]}>
                    {group.title}
                  </Text>
                  <View
                    style={[
                      styles.groupCount,
                      { backgroundColor: toneColor(group.tone) },
                    ]}
                  >
                    <Text style={[styles.groupCountText, { color: "#ffffff" }]}>
                      {group.items.length}
                    </Text>
                  </View>
                </View>
                {group.items.map((item) =>
                  renderOrderCard(item, toneColor(group.tone)),
                )}
              </View>
            ))
          : null}

        {!loading && visibleDiagnostics.length ? (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons color={colors.primary} name="pulse-outline" size={24} />
              <Text style={[styles.groupTitle, { color: colors.text }]}>
                Diagnósticos por revisar
              </Text>
              <View
                style={[styles.groupCount, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.groupCountText, { color: "#ffffff" }]}>
                  {visibleDiagnostics.length}
                </Text>
              </View>
            </View>
            {visibleDiagnostics.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => {
                  tapFeedback("light");
                  onOpenDiagnosticDetail?.(item.recordId);
                }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    borderLeftColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cardCopy}>
                  <Text style={[styles.plate, { color: colors.text }]}>
                    {item.plate}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.vehicleTitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.code, { color: colors.primary }]}>
                    {item.code} · {item.statusLabel}
                  </Text>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="chevron-forward"
                  size={28}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && !hasAnything ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.textTertiary}
              name={hasSearch ? "search-outline" : "checkmark-done-outline"}
              size={40}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {hasSearch ? "Sin coincidencias" : "No tienes trabajo asignado"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {hasSearch
                ? "Revisa la placa o el código e intenta de nuevo."
                : "Cuando recepción te asigne una orden o un diagnóstico aparecerá aquí. Desliza hacia abajo para actualizar."}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerActions}>
          <BigButton
            icon="clipboard-outline"
            label="Todas mis órdenes"
            onPress={onOpenWorkOrders}
            style={styles.footerButton}
            variant="secondary"
          />
          <BigButton
            icon="pulse-outline"
            label="Mis diagnósticos"
            onPress={onOpenDiagnostics}
            style={styles.footerButton}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: TOUCH.gap,
    paddingBottom: spacing.xxl,
  },
  cacheNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  cacheText: { flex: 1, fontSize: 15, fontWeight: "700" },
  continueCard: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  continueEyebrow: {
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  continuePlate: { fontSize: 34, fontWeight: "900", letterSpacing: 1.2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOUCH.gap,
  },
  summary: { flex: 1, fontSize: 16, fontWeight: "700" },
  searchShell: {
    flex: 1,
    minHeight: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 18, fontWeight: "700" },
  iconButton: {
    width: TOUCH.min,
    height: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  group: { gap: 10 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupTitle: { flex: 1, fontSize: 20, fontWeight: "900" },
  groupCount: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCountText: { fontSize: 16, fontWeight: "900" },
  card: {
    minHeight: 96,
    borderWidth: 1,
    borderLeftWidth: 8,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardCopy: { flex: 1, gap: 4 },
  plate: { fontSize: 26, fontWeight: "900", letterSpacing: 1 },
  vehicleTitle: { fontSize: 16, fontWeight: "600" },
  code: { fontSize: 15, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6 },
  progressText: { fontSize: 16, fontWeight: "900", minWidth: 48 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  emptyText: { fontSize: 16, lineHeight: 23, textAlign: "center" },
  footerActions: { gap: TOUCH.gap, marginTop: 8 },
  footerButton: { alignSelf: "stretch" },
});
