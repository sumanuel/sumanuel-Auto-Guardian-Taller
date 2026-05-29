import { Ionicons } from "@expo/vector-icons";
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
import { listStaffProfiles } from "../services/admin/staffAdmin";
import { listClients } from "../services/clients/clientService";
import {
  listProgressEntriesByWorkOrderId,
  progressEntryTypeOptions,
} from "../services/progressEntries/progressEntryService";
import { sparePartStatusOptions } from "../services/spareParts/sparePartService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  listWorkOrders,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

function formatDateTime(value) {
  const resolvedDate = value?.toDate ? value.toDate() : value;

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

function parseOperationalProgressMessage(message) {
  const normalizedMessage = String(message || "");
  const match = normalizedMessage.match(
    /^(Avance operativo ajustado a )([0-9]+%\.?)(.*)$/i,
  );

  if (!match) {
    return null;
  }

  return {
    prefix: match[1],
    value: match[2],
    suffix: match[3] || "",
  };
}

function resolveWorkOrderStatusLabel(status) {
  return (
    workOrderStatusOptions.find((item) => item.key === status)?.label ||
    (status === "approved" ? "Abierta" : status) ||
    "Sin estado"
  );
}

function hexToRgb(hex) {
  const normalizedHex = String(hex || "").replace("#", "");

  if (normalizedHex.length !== 6) {
    return { red: 0, green: 0, blue: 0 };
  }

  return {
    red: parseInt(normalizedHex.slice(0, 2), 16),
    green: parseInt(normalizedHex.slice(2, 4), 16),
    blue: parseInt(normalizedHex.slice(4, 6), 16),
  };
}

function rgbToHex({ red, green, blue }) {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getProgressMeterColor(progressPercent, colors) {
  const start = hexToRgb(colors.danger);
  const end = hexToRgb(colors.success);
  const clampedProgress =
    Math.max(0, Math.min(100, Number(progressPercent) || 0)) / 100;

  return rgbToHex({
    red: start.red + (end.red - start.red) * clampedProgress,
    green: start.green + (end.green - start.green) * clampedProgress,
    blue: start.blue + (end.blue - start.blue) * clampedProgress,
  });
}

function getProgressTypePalette(type, colors) {
  if (type === "status") {
    return {
      accent: colors.warning,
      surface: colors.cardMuted,
      text: colors.warning,
    };
  }

  if (type === "parts") {
    return {
      accent: colors.textTertiary,
      surface: colors.cardMuted,
      text: colors.textSecondary,
    };
  }

  if (type === "delivery") {
    return {
      accent: colors.success,
      surface: colors.cardMuted,
      text: colors.success,
    };
  }

  return {
    accent: colors.primary,
    surface: colors.cardMuted,
    text: colors.primary,
  };
}

export default function WorkOrderHistoryTimelineScreen({
  onBack,
  workOrderId,
  vehicleContext,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [progressEntries, setProgressEntries] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!workOrderId) {
        setWorkOrders([]);
        setProgressEntries([]);
        return;
      }

      setLoading(true);

      try {
        const [
          nextWorkOrders,
          nextClients,
          nextVehicles,
          nextStaffProfiles,
          nextProgressEntries,
        ] = await Promise.all([
          listWorkOrders(),
          listClients(),
          listVehicles(),
          listStaffProfiles(),
          listProgressEntriesByWorkOrderId(workOrderId),
        ]);

        setWorkOrders(nextWorkOrders);
        setClients(nextClients);
        setVehicles(nextVehicles);
        setStaffProfiles(nextStaffProfiles);
        setProgressEntries(nextProgressEntries);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workOrderId]);

  const selectedWorkOrder = useMemo(
    () =>
      workOrders.find((workOrder) => getEntityId(workOrder) === workOrderId) ||
      null,
    [workOrderId, workOrders],
  );

  const resolvedVehicle = useMemo(() => {
    const selectedVehicleId = selectedWorkOrder?.vehicleId;

    return (
      vehicles.find((vehicle) => getEntityId(vehicle) === selectedVehicleId) ||
      vehicleContext ||
      null
    );
  }, [selectedWorkOrder?.vehicleId, vehicleContext, vehicles]);

  const client = useMemo(
    () =>
      clients.find(
        (item) =>
          getEntityId(item) === resolvedVehicle?.clientId ||
          item.id === resolvedVehicle?.clientId,
      ) || null,
    [clients, resolvedVehicle?.clientId],
  );

  const staffLookup = useMemo(
    () =>
      staffProfiles.reduce((accumulator, item) => {
        accumulator[item.uid] = item;
        return accumulator;
      }, {}),
    [staffProfiles],
  );

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          onBack={onBack}
          section="Operacion"
          subtitle="Vista historica de solo lectura para revisar la cronologia final de esta orden por unidad."
          title="Cronologia de orden"
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
                color={colors.warning}
                name="clipboard-outline"
                size={rf(18)}
              />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                {selectedWorkOrder?.id || selectedWorkOrder?.refId || "Orden"}
              </Text>
              <Text style={[styles.summaryMeta, { color: colors.text }]}>
                {buildVehicleTitle(resolvedVehicle)}
              </Text>
              <Text style={[styles.summaryPlate, { color: colors.accent }]}>
                Placa: {resolvedVehicle?.plate || "Sin placa"}
              </Text>
              <Text
                style={[styles.summarySupport, { color: colors.textSecondary }]}
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
                {selectedWorkOrder?.progressPercent || 0}%
              </Text>
              <Text
                style={[styles.countLabel, { color: colors.textSecondary }]}
              >
                Avance final
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
                {progressEntries.length}
              </Text>
              <Text
                style={[styles.countLabel, { color: colors.textSecondary }]}
              >
                Registros
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.success,
              },
            ]}
          >
            <Text style={[styles.statusChipText, { color: colors.success }]}>
              {resolveWorkOrderStatusLabel(selectedWorkOrder?.status || "delivered")}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.primary }]}>
                Historial
              </Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}> 
                Cronologia final
              </Text>
            </View>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
              Solo lectura
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !selectedWorkOrder ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyEyebrow, { color: colors.warning }]}> 
                Orden
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                No se pudo encontrar la orden historica que intentas revisar.
              </Text>
            </View>
          ) : progressEntries.length ? (
            <View style={styles.timelineList}>
              {progressEntries.map((entry) => {
                const author = staffLookup[entry.authorUid];
                const palette = getProgressTypePalette(entry.type, colors);
                const parsedProgressMessage =
                  entry.type === "status"
                    ? parseOperationalProgressMessage(entry.message)
                    : null;

                return (
                  <View
                    key={getEntityId(entry)}
                    style={[
                      styles.timelineRow,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: palette.accent,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timelineMarker,
                        { backgroundColor: palette.accent },
                      ]}
                    />
                    <View style={styles.timelineCopy}>
                      <View style={styles.timelineTitleRow}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>
                          {progressEntryTypeOptions.find(
                            (item) => item.key === entry.type,
                          )?.label || entry.type}
                        </Text>
                        <View
                          style={[
                            styles.timelineTypeChip,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.accent,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timelineTypeChipText,
                              { color: palette.text },
                            ]}
                          >
                            {progressEntryTypeOptions.find(
                              (item) => item.key === entry.type,
                            )?.label || entry.type}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {author?.fullName ||
                          author?.email ||
                          entry.authorUid ||
                          "Sin autor"}{" "}
                        · {formatDateTime(entry.createdAt)}
                      </Text>

                      {entry.type === "status" ? (
                        parsedProgressMessage ? (
                          <Text style={styles.timelineProgressText}>
                            <Text
                              style={[
                                styles.timelineProgressPrefix,
                                { color: colors.text },
                              ]}
                            >
                              {parsedProgressMessage.prefix}
                            </Text>
                            <Text
                              style={{
                                color: getProgressMeterColor(
                                  entry.progressPercent,
                                  colors,
                                ),
                              }}
                            >
                              {parsedProgressMessage.value}
                            </Text>
                            <Text
                              style={[
                                styles.timelineProgressPrefix,
                                { color: colors.text },
                              ]}
                            >
                              {parsedProgressMessage.suffix}
                            </Text>
                          </Text>
                        ) : (
                          <Text
                            style={[
                              styles.timelineProgressText,
                              { color: colors.text },
                            ]}
                          >
                            {entry.message}
                          </Text>
                        )
                      ) : (
                        <Text style={[styles.rowMeta, { color: colors.text }]}>
                          {entry.message || "Sin detalle operativo"}
                        </Text>
                      )}

                      {entry.statusChangedTo ? (
                        <View
                          style={[
                            styles.timelineTypeChip,
                            {
                              backgroundColor: colors.cardBackground,
                              borderColor: colors.warning,
                              alignSelf: "flex-start",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timelineTypeChipText,
                              { color: colors.warning },
                            ]}
                          >
                            Estado actualizado a{" "}
                            {resolveWorkOrderStatusLabel(entry.statusChangedTo)}
                          </Text>
                        </View>
                      ) : null}

                      {entry.type === "parts" && entry.sparePartUpdates?.length ? (
                        <View style={styles.timelineNestedList}>
                          {entry.sparePartUpdates.map((item) => (
                            <Text
                              key={`${item.sparePartId}-${item.status}`}
                              style={[
                                styles.rowMeta,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {item.sparePartName}: {sparePartStatusOptions.find(
                                (option) => option.key === item.status,
                              )?.label || item.status}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {entry.deliveryClosedOrder ? (
                        <Text style={[styles.rowMeta, { color: colors.success }]}>
                          Orden cerrada y entregada.
                        </Text>
                      ) : null}

                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        Estado capturado: {resolveWorkOrderStatusLabel(entry.statusSnapshot)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyEyebrow, { color: colors.primary }]}> 
                Cronologia
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                Esta orden entregada no tiene registros de cronologia disponibles.
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
  summaryMeta: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  summaryPlate: {
    fontSize: rf(15),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  summarySupport: {
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
  statusChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusChipText: {
    fontSize: rf(11),
    fontWeight: "800",
  },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rowTitle: {
    fontSize: rf(16),
    fontWeight: "800",
  },
  rowMeta: {
    fontSize: rf(12),
    lineHeight: rf(18),
  },
  timelineList: {
    gap: spacing.md,
  },
  timelineRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  timelineMarker: {
    width: rf(10),
    height: rf(10),
    borderRadius: borderRadius.pill,
    marginTop: rf(6),
  },
  timelineCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  timelineTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  timelineTypeChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timelineTypeChipText: {
    fontSize: rf(11),
    fontWeight: "800",
  },
  timelineProgressText: {
    fontSize: rf(13),
    lineHeight: rf(19),
    fontWeight: "700",
  },
  timelineProgressPrefix: {
    fontWeight: "700",
  },
  timelineNestedList: {
    gap: spacing.xs,
  },
  emptyWrap: {
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