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
import DetailHero from "../components/common/DetailHero";
import ProgressTimeline from "../components/common/ProgressTimeline";
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
import { getWorkOrderTone } from "../utils/statusTone";

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
    "Vehículo sin descripción"
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

  const assignedMechanics = useMemo(
    () =>
      (selectedWorkOrder?.assignedMechanicUids || [])
        .map((uid) => staffLookup[uid])
        .filter(Boolean),
    [selectedWorkOrder?.assignedMechanicUids, staffLookup],
  );

  const deliveryEntry = useMemo(
    () =>
      [...progressEntries]
        .reverse()
        .find(
          (entry) => entry.deliveryClosedOrder || entry.type === "delivery",
        ) || null,
    [progressEntries],
  );

  const deliveryTimestamp =
    selectedWorkOrder?.deliveredAt || deliveryEntry?.createdAt || null;
  const startedTimestamp =
    selectedWorkOrder?.startedAt || selectedWorkOrder?.createdAt || null;
  const responsibilityLabel =
    assignedMechanics.length > 1 ? "Equipo responsable" : "Técnico responsable";

  const responsibleTechnicianLabel =
    assignedMechanics[0]?.fullName ||
    assignedMechanics[0]?.email ||
    assignedMechanics[0]?.userCode ||
    staffLookup[deliveryEntry?.authorUid]?.fullName ||
    staffLookup[deliveryEntry?.authorUid]?.email ||
    "Sin técnico asignado";

  const intervenedSparePartsCount = useMemo(() => {
    const uniquePartKeys = new Set();

    progressEntries.forEach((entry) => {
      if (entry.type !== "parts" || !entry.sparePartUpdates?.length) {
        return;
      }

      entry.sparePartUpdates.forEach((item) => {
        const uniqueKey = item.sparePartId || item.sparePartName;

        if (uniqueKey) {
          uniquePartKeys.add(uniqueKey);
        }
      });
    });

    return uniquePartKeys.size;
  }, [progressEntries]);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          onBack={onBack}
          section="Operación"
          subtitle="Solo lectura: así terminó esta orden."
          title="Cronología de orden"
        />

        <DetailHero
          code={selectedWorkOrder?.id || selectedWorkOrder?.refId || "Orden"}
          facts={[
            {
              label: "Cliente",
              value: client?.fullName || "Sin cliente asociado",
            },
            { label: responsibilityLabel, value: responsibleTechnicianLabel },
            { label: "Inicio", value: formatDateTime(startedTimestamp) },
            { label: "Entrega", value: formatDateTime(deliveryTimestamp) },
            {
              label: "Resumen",
              value: `${progressEntries.length} registros · ${intervenedSparePartsCount} repuestos intervenidos`,
            },
          ]}
          plate={resolvedVehicle?.plate}
          progress={selectedWorkOrder?.progressPercent || 0}
          statusLabel={resolveWorkOrderStatusLabel(
            selectedWorkOrder?.status || "delivered",
          )}
          title={buildVehicleTitle(resolvedVehicle)}
          tone={getWorkOrderTone(
            selectedWorkOrder?.status || "delivered",
            colors,
          )}
        />

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : !selectedWorkOrder ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No se pudo encontrar la orden histórica que intentas revisar.
          </Text>
        ) : (
          <ProgressTimeline
            emptyText="Esta orden entregada no tiene registros de cronología."
            entries={progressEntries}
            staffLookup={staffLookup}
          />
        )}
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
  summaryDelivery: {
    fontSize: rf(12),
    fontWeight: "800",
    lineHeight: rf(18),
    marginTop: spacing.xs,
  },
  summaryDatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  summaryDatePill: {
    fontSize: rf(12),
    fontWeight: "800",
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
  countSupportValue: {
    fontSize: rf(14),
    lineHeight: rf(19),
    fontWeight: "800",
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
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rowTitle: {
    fontSize: rf(16),
    fontWeight: "800",
  },
  rowMeta: {
    fontSize: rf(14),
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
    fontSize: rf(12),
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
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: rf(15),
    lineHeight: rf(19),
  },
});
