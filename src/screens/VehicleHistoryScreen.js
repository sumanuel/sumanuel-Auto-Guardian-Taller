import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
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
import {
  listProgressEntriesByWorkOrderId,
  progressEntryTypeOptions,
} from "../services/progressEntries/progressEntryService";
import {
  listSpareParts,
  sparePartStatusOptions,
} from "../services/spareParts/sparePartService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  listWorkOrders,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
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

function formatDateTime(value) {
  const resolvedDate = value?.toDate ? value.toDate() : value;

  function resolveTimelineMeta(item) {
    if (item.type === "progress-entry") {
      return (
        progressEntryTypeOptions.find((option) => option.key === item.entryType)
          ?.label ||
        item.entryType ||
        "Avance"
      );
    }

    if (item.type === "spare-part") {
      return (
        sparePartStatusOptions.find((option) => option.key === item.status)
          ?.label ||
        item.status ||
        "Sin estado"
      );
    }

    return resolveStatusLabel(item);
  }

  function resolveTimelinePresentation(item, colors) {
    if (item.type === "diagnostic") {
      return {
        icon: "pulse-outline",
        label: "Diagnostico",
        accentColor: colors.primary,
      };
    }

    if (item.type === "work-order") {
      return {
        icon: "clipboard-outline",
        label: "Orden",
        accentColor: colors.warning,
      };
    }

    if (item.type === "progress-entry") {
      return {
        icon: "trail-sign-outline",
        label: "Avance",
        accentColor: colors.accent,
      };
    }

    return {
      icon: "cube-outline",
      label: "Repuesto",
      accentColor: colors.textSecondary,
    };
  }
  if (!(resolvedDate instanceof Date) || Number.isNaN(resolvedDate.getTime())) {
    return "Sin fecha";
  }

  return resolvedDate.toLocaleString("es-VE");
}

function buildVehicleTitle(vehicle) {
  return (
    [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(" ") ||
    vehicle?.plate ||
    "Vehiculo sin descripcion"
  );
}

function resolveStatusLabel(item) {
  if (item.type === "diagnostic") {
    return (
      diagnosticStatusOptions.find((option) => option.key === item.status)
        ?.label ||
      item.status ||
      "Sin estado"
    );
  }

  return (
    workOrderStatusOptions.find((option) => option.key === item.status)
      ?.label ||
    item.status ||
    "Sin estado"
  );
}

export default function VehicleHistoryScreen({
  onBack,
  onOpenDiagnosticDetail,
  onOpenWorkOrderDetail,
  vehicleContext,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [progressEntries, setProgressEntries] = useState([]);
  const [spareParts, setSpareParts] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [
          nextClients,
          nextVehicles,
          nextDiagnostics,
          nextWorkOrders,
          nextSpareParts,
        ] = await Promise.all([
          listClients(),
          listVehicles(),
          listDiagnostics(),
          listWorkOrders(),
          listSpareParts(),
        ]);
        setClients(nextClients);
        setVehicles(nextVehicles);
        setDiagnostics(nextDiagnostics);
        setWorkOrders(nextWorkOrders);
        setSpareParts(nextSpareParts);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const resolvedVehicle = useMemo(() => {
    const contextId = vehicleContext?.id || vehicleContext?.refId;

    return (
      vehicles.find((vehicle) => getEntityId(vehicle) === contextId) ||
      vehicleContext ||
      null
    );
  }, [vehicleContext, vehicles]);

  const client = useMemo(
    () =>
      clients.find(
        (item) =>
          getEntityId(item) === resolvedVehicle?.clientId ||
          item.id === resolvedVehicle?.clientId,
      ) || null,
    [clients, resolvedVehicle?.clientId],
  );

  const relatedWorkOrders = useMemo(() => {
    const vehicleId = getEntityId(resolvedVehicle);

    if (!vehicleId) {
      return [];
    }

    return workOrders.filter((workOrder) => workOrder.vehicleId === vehicleId);
  }, [resolvedVehicle, workOrders]);

  const relatedDiagnostics = useMemo(() => {
    const vehicleId = getEntityId(resolvedVehicle);

    if (!vehicleId) {
      return [];
    }

    return diagnostics.filter(
      (diagnostic) => diagnostic.vehicleId === vehicleId,
    );
  }, [diagnostics, resolvedVehicle]);

  useEffect(() => {
    const loadProgressEntries = async () => {
      const workOrderIds = relatedWorkOrders.map((workOrder) =>
        getEntityId(workOrder),
      );

      if (!workOrderIds.length) {
        setProgressEntries([]);
        return;
      }

      const progressGroups = await Promise.all(
        workOrderIds.map((workOrderId) =>
          listProgressEntriesByWorkOrderId(workOrderId),
        ),
      );

      setProgressEntries(progressGroups.flat());
    };

    loadProgressEntries();
  }, [relatedWorkOrders]);

  const timeline = useMemo(() => {
    const vehicleId = getEntityId(resolvedVehicle);

    if (!vehicleId) {
      return [];
    }

    const diagnosticItems = relatedDiagnostics.map((diagnostic) => ({
      ...diagnostic,
      type: "diagnostic",
      entityId: getEntityId(diagnostic),
      sortDate:
        getTimestampMillis(diagnostic.updatedAt) ||
        getTimestampMillis(diagnostic.createdAt),
    }));

    const workOrderItems = relatedWorkOrders.map((workOrder) => ({
      ...workOrder,
      type: "work-order",
      entityId: getEntityId(workOrder),
      sortDate:
        getTimestampMillis(workOrder.updatedAt) ||
        getTimestampMillis(workOrder.createdAt),
    }));

    const workOrderIds = new Set(
      relatedWorkOrders.map((workOrder) => getEntityId(workOrder)),
    );
    const diagnosticIds = new Set(
      relatedDiagnostics.map((diagnostic) => getEntityId(diagnostic)),
    );

    const progressItems = progressEntries
      .filter((entry) => workOrderIds.has(entry.workOrderId))
      .map((entry) => ({
        ...entry,
        type: "progress-entry",
        entityId: getEntityId(entry),
        entryType: entry.type,
        sortDate:
          getTimestampMillis(entry.updatedAt) ||
          getTimestampMillis(entry.createdAt),
      }));

    const sparePartItems = spareParts
      .filter(
        (sparePart) =>
          workOrderIds.has(sparePart.workOrderId) ||
          diagnosticIds.has(sparePart.diagnosticId),
      )
      .map((sparePart) => ({
        ...sparePart,
        type: "spare-part",
        entityId: getEntityId(sparePart),
        sortDate:
          getTimestampMillis(sparePart.updatedAt) ||
          getTimestampMillis(sparePart.createdAt),
      }));

    return [
      ...diagnosticItems,
      ...workOrderItems,
      ...progressItems,
      ...sparePartItems,
    ].sort((left, right) => right.sortDate - left.sortDate);
  }, [
    progressEntries,
    relatedDiagnostics,
    relatedWorkOrders,
    resolvedVehicle,
    spareParts,
  ]);

  const activeDiagnosticCount = timeline.filter(
    (item) => item.type === "diagnostic" && item.status !== "closed",
  ).length;
  const activeWorkOrderCount = timeline.filter(
    (item) => item.type === "work-order" && item.status !== "delivered",
  ).length;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          onBack={onBack}
          section="Operacion"
          subtitle="Diagnosticos y ordenes consolidados por unidad para revisar el flujo tecnico completo."
          title="Historial operativo"
        />

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <View
              style={[
                styles.summaryIconWrap,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                color={colors.accent}
                name="car-sport-outline"
                size={rf(18)}
              />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                {buildVehicleTitle(resolvedVehicle)}
              </Text>
              <Text style={[styles.summaryPlate, { color: colors.accent }]}>
                Placa: {resolvedVehicle?.plate || "Sin placa"}
              </Text>
              <Text
                style={[styles.summaryMeta, { color: colors.textSecondary }]}
              >
                Cliente: {client?.fullName || "Sin cliente asociado"}
              </Text>
            </View>
          </View>

          <View style={styles.countRow}>
            <View
              style={[
                styles.countCard,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.countValue, { color: colors.text }]}>
                {activeDiagnosticCount}
              </Text>
              <Text
                style={[styles.countLabel, { color: colors.textSecondary }]}
              >
                Diag. activas
              </Text>
            </View>
            <View
              style={[
                styles.countCard,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.countValue, { color: colors.text }]}>
                {activeWorkOrderCount}
              </Text>
              <Text
                style={[styles.countLabel, { color: colors.textSecondary }]}
              >
                Ordenes activas
              </Text>
            </View>
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        <View style={styles.timelineWrap}>
          {timeline.length ? (
            timeline.map((item) => {
              const isDiagnostic = item.type === "diagnostic";
              const presentation = resolveTimelinePresentation(item, colors);
              const accentColor = presentation.accentColor;
              const opensWorkOrder =
                item.type === "work-order" ||
                item.type === "progress-entry" ||
                (item.type === "spare-part" && item.workOrderId);
              const opensDiagnostic =
                item.type === "diagnostic" ||
                (item.type === "spare-part" &&
                  !item.workOrderId &&
                  item.diagnosticId);

              return (
                <Pressable
                  key={`${item.type}-${item.entityId}`}
                  onPress={() => {
                    if (opensWorkOrder) {
                      onOpenWorkOrderDetail?.(
                        item.workOrderId || item.entityId,
                      );
                      return;
                    }

                    if (opensDiagnostic) {
                      onOpenDiagnosticDetail?.(
                        item.diagnosticId || item.entityId,
                      );
                    }
                  }}
                  style={[
                    styles.timelineCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.timelineTopRow}>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        color={accentColor}
                        name={presentation.icon}
                        size={rf(14)}
                      />
                      <Text
                        style={[styles.typeBadgeText, { color: accentColor }]}
                      >
                        {presentation.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: accentColor,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: accentColor }]}
                      >
                        {resolveTimelineMeta(item)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.timelineCode, { color: colors.text }]}>
                    {item.id || item.refId || item.name || "Sin codigo"}
                  </Text>
                  <Text
                    style={[
                      styles.timelineDate,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatDateTime(item.updatedAt || item.createdAt)}
                  </Text>
                  <Text
                    style={[
                      styles.timelineDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {isDiagnostic
                      ? item.concerns || "Sin hallazgos registrados"
                      : item.type === "work-order"
                        ? `Progreso ${item.progressPercent || 0}%`
                        : item.type === "progress-entry"
                          ? item.message || "Sin detalle operativo"
                          : `${item.name || "Repuesto"} · ${item.quantity || 0} und.`}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyEyebrow, { color: colors.primary }]}>
                Operacion
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Esta unidad todavia no tiene diagnosticos ni ordenes
                registradas.
              </Text>
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryTopRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  summaryIconWrap: {
    width: rf(42),
    height: rf(42),
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: rf(18),
    fontWeight: "900",
  },
  summaryPlate: {
    fontSize: rf(16),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  summaryMeta: {
    fontSize: rf(13),
    lineHeight: rf(18),
  },
  countRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  countCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 2,
  },
  countValue: {
    fontSize: rf(24),
    fontWeight: "900",
  },
  countLabel: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  timelineWrap: {
    gap: spacing.md,
  },
  timelineCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  timelineTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeBadgeText: {
    fontSize: rf(11),
    fontWeight: "800",
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    fontSize: rf(11),
    fontWeight: "800",
  },
  timelineCode: {
    fontSize: rf(15),
    fontWeight: "800",
  },
  timelineDate: {
    fontSize: rf(12),
    lineHeight: rf(17),
  },
  timelineDescription: {
    fontSize: rf(13),
    lineHeight: rf(18),
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
});
