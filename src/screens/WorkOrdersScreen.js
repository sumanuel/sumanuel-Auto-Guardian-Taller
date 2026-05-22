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
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { listStaffProfiles } from "../services/admin/staffAdmin";
import { listClients } from "../services/clients/clientService";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import {
  createProgressEntry,
  listProgressEntriesByWorkOrderId,
  progressEntryTypeOptions,
} from "../services/progressEntries/progressEntryService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  deleteWorkOrder,
  listWorkOrders,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

const SCREEN_MODES = {
  LIST: "list",
  DETAIL: "detail",
};

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

function buildLookup(items, field = "id") {
  return items.reduce((accumulator, item) => {
    accumulator[item[field]] = item;
    return accumulator;
  }, {});
}

function formatDateTime(value) {
  const resolvedDate = value?.toDate ? value.toDate() : value;

  if (!(resolvedDate instanceof Date) || Number.isNaN(resolvedDate.getTime())) {
    return "Sin fecha";
  }

  return resolvedDate.toLocaleString("es-VE");
}

export default function WorkOrdersScreen({
  onBack,
  onOpenSparePartForm,
  onOpenWorkOrderForm,
  userProfile,
  viewState,
}) {
  const { colors } = useTheme();
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [loading, setLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [progressEntries, setProgressEntries] = useState([]);
  const [progressForm, setProgressForm] = useState({
    type: "note",
    message: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const selectedWorkOrderId = getEntityId(selectedWorkOrder);
  const clientLookup = useMemo(() => buildLookup(clients), [clients]);
  const vehicleLookup = useMemo(() => buildLookup(vehicles), [vehicles]);
  const diagnosticLookup = useMemo(
    () => buildLookup(diagnostics),
    [diagnostics],
  );
  const staffLookup = useMemo(
    () => buildLookup(staffProfiles, "uid"),
    [staffProfiles],
  );

  const refreshData = async () => {
    setLoading(true);

    try {
      const [
        nextOrders,
        nextClients,
        nextVehicles,
        nextDiagnostics,
        nextStaff,
      ] = await Promise.all([
        listWorkOrders(),
        listClients(),
        listVehicles(),
        listDiagnostics(),
        listStaffProfiles(),
      ]);
      setWorkOrders(nextOrders);
      setClients(nextClients);
      setVehicles(nextVehicles);
      setDiagnostics(nextDiagnostics);
      setStaffProfiles(nextStaff);

      if (selectedWorkOrderId) {
        const refreshedOrder = nextOrders.find(
          (item) => getEntityId(item) === selectedWorkOrderId,
        );

        if (refreshedOrder) {
          setSelectedWorkOrder(refreshedOrder);
        } else {
          setSelectedWorkOrder(null);
          setScreenMode(SCREEN_MODES.LIST);
        }
      }
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

  useEffect(() => {
    if (!viewState?.selectedWorkOrderId) {
      return;
    }

    const matchedWorkOrder = workOrders.find(
      (workOrder) => getEntityId(workOrder) === viewState.selectedWorkOrderId,
    );

    if (!matchedWorkOrder) {
      return;
    }

    setSelectedWorkOrder(matchedWorkOrder);
    setScreenMode(SCREEN_MODES.DETAIL);
  }, [viewState?.selectedWorkOrderId, workOrders]);

  useEffect(() => {
    if (!selectedWorkOrder?.id) {
      setProgressEntries([]);
      setProgressForm({ type: "note", message: "" });
      return;
    }

    const loadProgress = async () => {
      setProgressLoading(true);

      try {
        const nextEntries = await listProgressEntriesByWorkOrderId(
          selectedWorkOrder.id,
        );
        setProgressEntries(nextEntries);
      } catch (error) {
        Alert.alert(
          "Ordenes",
          "No se pudo cargar la cronologia de avances de esta orden.",
        );
      } finally {
        setProgressLoading(false);
      }
    };

    loadProgress();
  }, [selectedWorkOrder?.id]);

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

  const openWorkOrderDetail = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    setSelectedWorkOrder(null);
    setScreenMode(SCREEN_MODES.LIST);
  };

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

              if (selectedWorkOrderId === getEntityId(workOrder)) {
                handleBackToList();
              }

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

  const handleProgressSubmit = async () => {
    if (!selectedWorkOrder) {
      return;
    }

    if (!progressForm.message.trim()) {
      Alert.alert("Ordenes", "Describe el avance para registrarlo.");
      return;
    }

    setProgressSubmitting(true);

    try {
      await createProgressEntry({
        workOrderId: selectedWorkOrder.id,
        diagnosticId: selectedWorkOrder.diagnosticId,
        vehicleId: selectedWorkOrder.vehicleId,
        authorUid: userProfile?.uid,
        type: progressForm.type,
        message: progressForm.message,
        statusSnapshot: selectedWorkOrder.status,
      });

      const nextEntries = await listProgressEntriesByWorkOrderId(
        selectedWorkOrder.id,
      );
      setProgressEntries(nextEntries);
      setProgressForm({ type: "note", message: "" });
    } catch (error) {
      Alert.alert(
        "Ordenes",
        error?.message || "No se pudo registrar el avance de la orden.",
      );
    } finally {
      setProgressSubmitting(false);
    }
  };

  const renderListScreen = () => (
    <>
      <View
        style={[
          styles.statCard,
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
          styles.controlsPanel,
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
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : filteredOrders.length ? (
        <View style={styles.listBody}>
          {filteredOrders.map((workOrder) => {
            const client = clientLookup[workOrder.clientId];
            const vehicle = vehicleLookup[workOrder.vehicleId];
            const diagnostic = diagnosticLookup[workOrder.diagnosticId];
            const assignedMechanics = (workOrder.assignedMechanicUids || [])
              .map(
                (uid) => staffLookup[uid]?.fullName || staffLookup[uid]?.email,
              )
              .filter(Boolean)
              .join(", ");
            const isSelected =
              viewState?.selectedWorkOrderId === getEntityId(workOrder);

            return (
              <View
                key={getEntityId(workOrder)}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => openWorkOrderDetail(workOrder)}
                  style={styles.rowCopy}
                >
                  <View
                    style={[
                      styles.cardHeader,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.cardHeaderCopy}>
                      <Text
                        style={[styles.cardEyebrow, { color: colors.primary }]}
                      >
                        Operacion
                      </Text>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {workOrder.id}
                      </Text>
                    </View>
                    <Text style={[styles.cardTag, { color: colors.primary }]}>
                      {workOrderStatusOptions.find(
                        (item) => item.key === workOrder.status,
                      )?.label || workOrder.status}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text
                      style={[styles.rowMeta, { color: colors.textSecondary }]}
                    >
                      {diagnostic?.id ||
                        workOrder.diagnosticId ||
                        "Sin diagnostico"}{" "}
                      ·{" "}
                      {vehicle?.plate || workOrder.vehicleId || "Sin vehiculo"}
                    </Text>
                    <Text
                      style={[styles.rowMeta, { color: colors.textSecondary }]}
                    >
                      {client?.fullName || workOrder.clientId || "Sin cliente"}
                    </Text>
                    <Text
                      style={[styles.rowMeta, { color: colors.textTertiary }]}
                    >
                      {assignedMechanics || "Sin mecanicos asignados"}
                    </Text>
                  </View>
                </Pressable>

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
    </>
  );

  const renderDetailScreen = () => {
    const client = clientLookup[selectedWorkOrder?.clientId];
    const vehicle = vehicleLookup[selectedWorkOrder?.vehicleId];
    const diagnostic = diagnosticLookup[selectedWorkOrder?.diagnosticId];
    const assignedMechanics = (selectedWorkOrder?.assignedMechanicUids || [])
      .map((uid) => staffLookup[uid])
      .filter(Boolean);

    return (
      <>
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.detailGrid}>
            <View style={styles.detailBlock}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Diagnostico
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {diagnostic?.id ||
                  selectedWorkOrder?.diagnosticId ||
                  "Sin diagnostico"}
              </Text>
            </View>
            <View style={styles.detailBlock}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Cliente
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {client?.fullName ||
                  selectedWorkOrder?.clientId ||
                  "Sin cliente"}
              </Text>
            </View>
            <View style={styles.detailBlock}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Vehiculo
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {vehicle?.plate ||
                  selectedWorkOrder?.vehicleId ||
                  "Sin vehiculo"}
              </Text>
            </View>
            <View style={styles.detailBlock}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Estado
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {workOrderStatusOptions.find(
                  (item) => item.key === selectedWorkOrder?.status,
                )?.label ||
                  selectedWorkOrder?.status ||
                  "Sin estado"}
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Mecanicos asignados
            </Text>
            <View style={styles.filterRow}>
              {assignedMechanics.length ? (
                assignedMechanics.map((mechanic) => (
                  <View
                    key={mechanic.uid}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.filterChipText, { color: colors.text }]}
                    >
                      {mechanic.fullName || mechanic.email || mechanic.userCode}
                    </Text>
                  </View>
                ))
              ) : (
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  Sin mecanicos asignados.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailActionRow}>
            <Pressable
              onPress={() => onOpenWorkOrderForm?.(selectedWorkOrder)}
              style={[styles.actionPill, { backgroundColor: colors.primary }]}
            >
              <Ionicons
                color={colors.white}
                name="create-outline"
                size={rf(16)}
              />
              <Text style={[styles.actionPillText, { color: colors.white }]}>
                Editar orden
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                onOpenSparePartForm?.(null, {
                  seedData: {
                    workOrderId: selectedWorkOrder.id,
                    diagnosticId: selectedWorkOrder.diagnosticId,
                  },
                })
              }
              style={[styles.actionPill, { backgroundColor: colors.accent }]}
            >
              <Ionicons
                color={colors.white}
                name="construct-outline"
                size={rf(16)}
              />
              <Text style={[styles.actionPillText, { color: colors.white }]}>
                Agregar repuesto
              </Text>
            </Pressable>
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
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            Registrar avance
          </Text>

          <View style={styles.filterRow}>
            {progressEntryTypeOptions.map((typeOption) => {
              const selected = progressForm.type === typeOption.key;

              return (
                <Pressable
                  key={typeOption.key}
                  onPress={() =>
                    setProgressForm((current) => ({
                      ...current,
                      type: typeOption.key,
                    }))
                  }
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
                    {typeOption.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={(value) =>
              setProgressForm((current) => ({ ...current, message: value }))
            }
            placeholder="Describe el avance, cambio de estado o novedad tecnica"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.textArea,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            textAlignVertical="top"
            value={progressForm.message}
          />

          <Pressable
            onPress={handleProgressSubmit}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              {progressSubmitting ? "Guardando avance..." : "Registrar avance"}
            </Text>
          </Pressable>
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
          <View style={styles.listHeaderRow}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Cronologia
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
              {progressEntries.length} registro
              {progressEntries.length === 1 ? "" : "s"}
            </Text>
          </View>

          {progressLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : progressEntries.length ? (
            <View style={styles.timelineList}>
              {progressEntries.map((entry) => {
                const author = staffLookup[entry.authorUid];

                return (
                  <View
                    key={getEntityId(entry)}
                    style={[
                      styles.timelineRow,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timelineMarker,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <View style={styles.timelineCopy}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {progressEntryTypeOptions.find(
                          (item) => item.key === entry.type,
                        )?.label || entry.type}
                      </Text>
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
                      <Text style={[styles.rowMeta, { color: colors.text }]}>
                        {entry.message}
                      </Text>
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        Estado capturado: {entry.statusSnapshot || "sin estado"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay avances registrados todavia para esta orden.
            </Text>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.scrollWithFab]}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={
            screenMode === SCREEN_MODES.DETAIL ? handleBackToList : undefined
          }
          section={
            screenMode === SCREEN_MODES.DETAIL ? "Orden activa" : "Operacion"
          }
          subtitle={
            screenMode === SCREEN_MODES.DETAIL
              ? "Desde aqui puedes revisar contexto, mecanicos asignados y avances cronologicos."
              : "Registra la orden en una pantalla dedicada y vuelve a la lista para editar, eliminar o continuar con repuestos."
          }
          title={
            screenMode === SCREEN_MODES.DETAIL
              ? selectedWorkOrder?.id || "Detalle de orden"
              : "Ordenes de trabajo"
          }
        />

        {screenMode === SCREEN_MODES.LIST
          ? renderListScreen()
          : renderDetailScreen()}
      </ScrollView>

      {screenMode === SCREEN_MODES.LIST ? (
        <Pressable
          onPress={() => onOpenWorkOrderForm?.(null)}
          style={[
            styles.fab,
            { backgroundColor: colors.primary, shadowColor: colors.shadow },
          ]}
        >
          <Ionicons color={colors.white} name="add" size={rf(24)} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, position: "relative" },
  scrollContent: { padding: spacing.lg, gap: spacing.xl },
  scrollWithFab: { paddingBottom: spacing.xxl * 2.6 },
  statCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    alignSelf: "flex-start",
    minWidth: rf(132),
  },
  summaryValue: { fontSize: rf(28), fontWeight: "900" },
  summaryLabel: { fontSize: rf(13), lineHeight: rf(18) },
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  controlsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipText: { fontSize: rf(12), fontWeight: "700" },
  listBody: { gap: spacing.md },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  cardHeaderCopy: { flex: 1, gap: 2 },
  cardEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardTag: { fontSize: rf(11), fontWeight: "800", textAlign: "right" },
  cardBody: { gap: 2 },
  rowTitle: { fontSize: rf(16), fontWeight: "800" },
  rowMeta: { fontSize: rf(12), lineHeight: rf(17) },
  formGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: rf(12), fontWeight: "700" },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  detailBlock: {
    minWidth: "48%",
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: rf(10),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailValue: { fontSize: rf(14), fontWeight: "700", lineHeight: rf(20) },
  detailActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionPillText: { fontSize: rf(12), fontWeight: "800" },
  iconActionRow: { gap: spacing.sm, justifyContent: "center" },
  iconAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: rf(42),
    height: rf(42),
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: rf(88),
    fontSize: rf(14),
  },
  primaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryButtonText: { fontSize: rf(14), fontWeight: "800" },
  timelineList: { gap: spacing.md },
  timelineRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  timelineMarker: {
    width: rf(10),
    borderRadius: borderRadius.pill,
  },
  timelineCopy: { flex: 1, gap: spacing.xs },
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
