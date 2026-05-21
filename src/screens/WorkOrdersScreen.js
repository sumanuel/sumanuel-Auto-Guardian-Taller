import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { listClients } from "../services/clients/clientService";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  deleteWorkOrder,
  listWorkOrders,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

function buildLookup(items, field = "id") {
  return items.reduce((accumulator, item) => {
    accumulator[item[field]] = item;
    return accumulator;
  }, {});
}

export default function WorkOrdersScreen({
  onBack,
  onOpenSparePartForm,
  onOpenWorkOrderForm,
  viewState,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const clientLookup = useMemo(() => buildLookup(clients), [clients]);
  const vehicleLookup = useMemo(() => buildLookup(vehicles), [vehicles]);
  const diagnosticLookup = useMemo(
    () => buildLookup(diagnostics),
    [diagnostics],
  );

  const refreshData = async () => {
    setLoading(true);

    try {
      const [nextOrders, nextClients, nextVehicles, nextDiagnostics] =
        await Promise.all([
          listWorkOrders(),
          listClients(),
          listVehicles(),
          listDiagnostics(),
        ]);
      setWorkOrders(nextOrders);
      setClients(nextClients);
      setVehicles(nextVehicles);
      setDiagnostics(nextDiagnostics);
    } catch (error) {
      Alert.alert(
        "Ordenes",
        "No se pudo cargar el tablero operativo de ordenes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return workOrders.filter((workOrder) => {
      if (activeFilter !== "all" && workOrder.status !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const client = clientLookup[workOrder.clientId];
      const vehicle = vehicleLookup[workOrder.vehicleId];
      const searchableText = [
        workOrder.id,
        workOrder.clientId,
        workOrder.vehicleId,
        workOrder.diagnosticId,
        client?.fullName,
        vehicle?.plate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, clientLookup, searchQuery, vehicleLookup, workOrders]);

  const handleDelete = (workOrder) => {
    Alert.alert(
      "Eliminar orden",
      `Se eliminara ${workOrder.id || "esta orden"} del tablero operativo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkOrder(getEntityId(workOrder));
              await refreshData();
            } catch (error) {
              Alert.alert(
                "Ordenes",
                error?.message || "No se pudo eliminar la orden.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.scrollWithFab]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Operacion
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Ordenes de trabajo
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Registra la orden en una pantalla dedicada y vuelve a la lista
              para editar, eliminar o continuar con repuestos.
            </Text>
          </View>

          <Pressable
            onPress={onBack}
            style={[
              styles.backButton,
              {
                borderColor: colors.borderStrong,
                backgroundColor: colors.cardBackground,
              },
            ]}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Volver
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {workOrders.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Ordenes registradas
          </Text>
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
          <TextInput
            autoCapitalize="none"
            onChangeText={setSearchQuery}
            placeholder="Buscar por orden, diagnostico, placa o cliente"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={searchQuery}
          />

          <View style={styles.filterRow}>
            {[{ key: "all", label: "Todas" }, ...workOrderStatusOptions].map(
              (filter) => {
                const selected = activeFilter === filter.key;

                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : colors.cardMuted,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selected ? colors.white : colors.text },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : filteredOrders.length ? (
            <View style={styles.listBody}>
              {filteredOrders.map((workOrder) => {
                const client = clientLookup[workOrder.clientId];
                const vehicle = vehicleLookup[workOrder.vehicleId];
                const diagnostic = diagnosticLookup[workOrder.diagnosticId];
                const isSelected =
                  viewState?.selectedWorkOrderId === getEntityId(workOrder);

                return (
                  <View
                    key={getEntityId(workOrder)}
                    style={[
                      styles.row,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {workOrder.id}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {diagnostic?.id ||
                          workOrder.diagnosticId ||
                          "Sin diagnostico"}{" "}
                        ·{" "}
                        {vehicle?.plate ||
                          workOrder.vehicleId ||
                          "Sin vehiculo"}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {client?.fullName ||
                          workOrder.clientId ||
                          "Sin cliente"}{" "}
                        ·{" "}
                        {workOrderStatusOptions.find(
                          (item) => item.key === workOrder.status,
                        )?.label || workOrder.status}
                      </Text>
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        {workOrder.assignedMechanicUids?.length || 0} mecanicos
                        asignados
                      </Text>
                    </View>

                    <View style={styles.iconActionRow}>
                      <Pressable
                        onPress={() =>
                          onOpenSparePartForm?.(null, {
                            seedData: {
                              workOrderId: workOrder.id,
                              diagnosticId: workOrder.diagnosticId,
                            },
                          })
                        }
                        style={[
                          styles.iconAction,
                          {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.accent,
                          },
                        ]}
                      >
                        <Ionicons
                          color={colors.accent}
                          name="construct-outline"
                          size={rf(18)}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => onOpenWorkOrderForm?.(workOrder)}
                        style={[
                          styles.iconAction,
                          {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Ionicons
                          color={colors.primary}
                          name="create-outline"
                          size={rf(18)}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(workOrder)}
                        style={[
                          styles.iconAction,
                          {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.danger,
                          },
                        ]}
                      >
                        <Ionicons
                          color={colors.danger}
                          name="trash-outline"
                          size={rf(18)}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay ordenes para el filtro actual. Usa el boton flotante para
              registrar la primera.
            </Text>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => onOpenWorkOrderForm?.(null)}
        style={[
          styles.fab,
          { backgroundColor: colors.primary, shadowColor: colors.shadow },
        ]}
      >
        <Ionicons color={colors.white} name="add" size={rf(24)} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, position: "relative" },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },
  scrollWithFab: { paddingBottom: spacing.xxl * 2.6 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.sm },
  kicker: {
    fontSize: rf(12),
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { fontSize: rf(28), fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { fontSize: rf(14), lineHeight: rf(20) },
  backButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButtonText: { fontSize: rf(12), fontWeight: "700" },
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  summaryValue: { fontSize: rf(30), fontWeight: "900" },
  summaryLabel: { fontSize: rf(13), lineHeight: rf(18) },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: rf(14),
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipText: { fontSize: rf(12), fontWeight: "700" },
  listBody: { gap: spacing.md },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  rowTitle: { fontSize: rf(16), fontWeight: "800" },
  rowMeta: { fontSize: rf(12), lineHeight: rf(18) },
  iconActionRow: { gap: spacing.sm, justifyContent: "center" },
  iconAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: rf(42),
    height: rf(42),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: rf(13), lineHeight: rf(20) },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: rf(58),
    height: rf(58),
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});
