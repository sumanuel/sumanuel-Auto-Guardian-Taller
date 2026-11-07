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
import OperationCard from "../components/common/OperationCard";
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
import { getDiagnosticTone, getWorkOrderTone } from "../utils/statusTone";

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

  if (!(resolvedDate instanceof Date) || Number.isNaN(resolvedDate.getTime())) {
    return "Sin fecha";
  }

  return resolvedDate.toLocaleString("es-VE");
}

function resolveTimelineMeta(item) {
  return resolveStatusLabel(item);
}

function resolveTimelinePresentation(item, colors) {
  if (item.type === "diagnostic") {
    return {
      icon: "pulse-outline",
      label: "Diagnóstico",
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

  return {
    icon: "clipboard-outline",
    label: "Orden",
    accentColor: colors.warning,
  };
}

function buildVehicleTitle(vehicle) {
  return (
    [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(" ") ||
    vehicle?.plate ||
    "Vehículo sin descripción"
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
  onOpenWorkOrderTimeline,
  vehicleContext,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    const loadData = async () => {
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

    return workOrders.filter(
      (workOrder) =>
        workOrder.vehicleId === vehicleId && workOrder.status === "delivered",
    );
  }, [resolvedVehicle, workOrders]);

  const relatedDiagnostics = useMemo(() => {
    const vehicleId = getEntityId(resolvedVehicle);

    if (!vehicleId) {
      return [];
    }

    return diagnostics.filter(
      (diagnostic) =>
        diagnostic.vehicleId === vehicleId && diagnostic.status === "closed",
    );
  }, [diagnostics, resolvedVehicle]);

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

    return [...diagnosticItems, ...workOrderItems].sort(
      (left, right) => right.sortDate - left.sortDate,
    );
  }, [relatedDiagnostics, relatedWorkOrders, resolvedVehicle]);

  const closedDiagnosticCount = relatedDiagnostics.length;
  const deliveredWorkOrderCount = relatedWorkOrders.length;

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section="Operación"
          subtitle="Diagnósticos cerrados y órdenes entregadas de esta unidad."
          title="Historial del vehículo"
        />

        <DetailHero
          code={`${timeline.length} ${timeline.length === 1 ? "registro" : "registros"}`}
          facts={[
            {
              label: "Cliente",
              value: client?.fullName || "Sin cliente asociado",
            },
            {
              label: "Trabajos",
              value: `${closedDiagnosticCount} diagnósticos cerrados · ${deliveredWorkOrderCount} órdenes entregadas`,
            },
          ]}
          plate={resolvedVehicle?.plate}
          statusLabel="Historial"
          title={buildVehicleTitle(resolvedVehicle)}
          tone={colors.primary}
        />

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : null}

        {timeline.map((item) => {
          const isDiagnostic = item.type === "diagnostic";
          const presentation = resolveTimelinePresentation(item, colors);

          return (
            <OperationCard
              code={presentation.label}
              key={`${item.type}-${item.entityId}`}
              lines={[
                {
                  label: "Fecha",
                  value: formatDateTime(item.updatedAt || item.createdAt),
                },
                {
                  label: isDiagnostic ? "Hallazgos" : "Resultado",
                  value: isDiagnostic
                    ? item.concerns || "Sin hallazgos registrados"
                    : `Entrega completada con ${item.progressPercent || 0}% de avance final`,
                },
              ]}
              onPress={() =>
                isDiagnostic
                  ? onOpenDiagnosticDetail?.(item.entityId)
                  : onOpenWorkOrderTimeline?.(item.entityId)
              }
              plate={item.id || item.refId || item.name || "Sin código"}
              statusLabel={resolveTimelineMeta(item)}
              tone={
                isDiagnostic
                  ? getDiagnosticTone(item.status, colors)
                  : getWorkOrderTone(item.status, colors)
              }
            />
          );
        })}

        {!loading && !timeline.length ? (
          <View
            style={[
              styles.empty,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sin historial todavía
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Cuando se cierre un diagnóstico o se entregue una orden de esta
              unidad, aparecerá aquí.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32, gap: 12 },
  empty: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900" },
  emptyText: { fontSize: 15, lineHeight: 22 },
});
