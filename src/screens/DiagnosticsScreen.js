import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
  deleteDiagnostic,
  diagnosticStatusOptions,
  listDiagnostics,
} from "../services/diagnostics/diagnosticService";
import { listVehicles } from "../services/vehicles/vehicleService";
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

export default function DiagnosticsScreen({
  onBack,
  onOpenDiagnosticForm,
  onOpenWorkOrderForm,
  viewState,
}) {
  const { colors } = useTheme();
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const selectedDiagnosticId = getEntityId(selectedDiagnostic);

  const clientLookup = useMemo(() => buildLookup(clients), [clients]);
  const vehicleLookup = useMemo(() => buildLookup(vehicles), [vehicles]);

  const refreshData = async () => {
    setLoading(true);

    try {
      const [nextDiagnostics, nextClients, nextVehicles] = await Promise.all([
        listDiagnostics(),
        listClients(),
        listVehicles(),
      ]);
      setDiagnostics(nextDiagnostics);
      setClients(nextClients);
      setVehicles(nextVehicles);

      if (selectedDiagnosticId) {
        const refreshedDiagnostic = nextDiagnostics.find(
          (item) => getEntityId(item) === selectedDiagnosticId,
        );

        if (refreshedDiagnostic) {
          setSelectedDiagnostic(refreshedDiagnostic);
        } else {
          setSelectedDiagnostic(null);
          setScreenMode(SCREEN_MODES.LIST);
        }
      }
    } catch (error) {
      Alert.alert(
        "Diagnosticos",
        "No se pudo cargar el tablero operativo de diagnosticos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!viewState?.selectedDiagnosticId) {
      setSelectedDiagnostic(null);
      setScreenMode(SCREEN_MODES.LIST);
      return;
    }

    const matchedDiagnostic = diagnostics.find(
      (diagnostic) =>
        getEntityId(diagnostic) === viewState.selectedDiagnosticId,
    );

    if (!matchedDiagnostic) {
      return;
    }

    setSelectedDiagnostic(matchedDiagnostic);
    setScreenMode(SCREEN_MODES.DETAIL);
  }, [diagnostics, viewState?.selectedDiagnosticId]);

  useEffect(() => {
    if (screenMode !== SCREEN_MODES.DETAIL) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setSelectedDiagnostic(null);
        setScreenMode(SCREEN_MODES.LIST);
        return true;
      },
    );

    return () => subscription.remove();
  }, [screenMode]);

  const filteredDiagnostics = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return diagnostics.filter((diagnostic) => {
      if (activeFilter !== "all" && diagnostic.status !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const vehicle = vehicleLookup[diagnostic.vehicleId];
      const client = clientLookup[diagnostic.clientId];
      const searchableText = [
        diagnostic.id,
        diagnostic.clientId,
        diagnostic.vehicleId,
        client?.fullName,
        vehicle?.plate,
        diagnostic.concerns,
        diagnostic.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, clientLookup, diagnostics, searchQuery, vehicleLookup]);

  const handleDelete = (diagnostic) => {
    Alert.alert(
      "Eliminar diagnostico",
      `Se eliminara ${diagnostic.id || "este diagnostico"} del tablero operativo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDiagnostic(getEntityId(diagnostic));
              await refreshData();
            } catch (error) {
              Alert.alert(
                "Diagnosticos",
                error?.message || "No se pudo eliminar el diagnostico.",
              );
            }
          },
        },
      ],
    );
  };

  const openDiagnosticDetail = (diagnostic) => {
    setSelectedDiagnostic(diagnostic);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    setSelectedDiagnostic(null);
    setScreenMode(SCREEN_MODES.LIST);
  };

  const renderListScreen = () => (
    <>
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
          {diagnostics.length}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Diagnosticos registrados
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
          placeholder="Buscar por codigo, placa, cliente o hallazgo"
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
          {[{ key: "all", label: "Todos" }, ...diagnosticStatusOptions].map(
            (filter) => {
              const filterKey = filter.key;
              const selected = activeFilter === filterKey;

              return (
                <Pressable
                  key={filterKey}
                  onPress={() => setActiveFilter(filterKey)}
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
      ) : filteredDiagnostics.length ? (
        <View style={styles.listBody}>
          {filteredDiagnostics.map((diagnostic) => {
            const vehicle = vehicleLookup[diagnostic.vehicleId];
            const client = clientLookup[diagnostic.clientId];
            const isSelected =
              viewState?.selectedDiagnosticId === getEntityId(diagnostic);

            return (
              <View
                key={getEntityId(diagnostic)}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => openDiagnosticDetail(diagnostic)}
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
                        Taller
                      </Text>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {diagnostic.id}
                      </Text>
                    </View>
                    <Text style={[styles.cardTag, { color: colors.primary }]}>
                      {diagnosticStatusOptions.find(
                        (item) => item.key === diagnostic.status,
                      )?.label ||
                        diagnostic.status ||
                        "Sin estado"}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text
                      style={[styles.rowMeta, { color: colors.textSecondary }]}
                    >
                      {client?.fullName || diagnostic.clientId || "Sin cliente"}{" "}
                      ·{" "}
                      {vehicle?.plate || diagnostic.vehicleId || "Sin vehiculo"}
                    </Text>
                    <Text
                      style={[styles.rowMeta, { color: colors.textTertiary }]}
                    >
                      {diagnostic.concerns || "Sin hallazgos registrados"}
                    </Text>
                    <Pressable
                      onPress={() =>
                        onOpenWorkOrderForm?.(null, {
                          seedData: {
                            diagnosticId: diagnostic.id,
                            clientId: diagnostic.clientId,
                            vehicleId: diagnostic.vehicleId,
                          },
                        })
                      }
                      style={[
                        styles.secondaryAction,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryActionText,
                          { color: colors.accent },
                        ]}
                      >
                        Crear orden desde este diagnostico
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>

                <View style={styles.iconActionRow}>
                  <Pressable
                    onPress={() => onOpenDiagnosticForm?.(diagnostic)}
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
                    onPress={() => handleDelete(diagnostic)}
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
        <View
          style={[
            styles.emptyStateCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyEyebrow, { color: colors.primary }]}>
            Taller
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay diagnosticos para el filtro actual. Ajusta el estado o
            registra una nueva revision desde el boton flotante.
          </Text>
        </View>
      )}
    </>
  );

  const renderDetailScreen = () => {
    const client = clientLookup[selectedDiagnostic?.clientId];
    const vehicle = vehicleLookup[selectedDiagnostic?.vehicleId];

    return (
      <View
        style={[
          styles.detailCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.cardHeaderCopy}>
            <Text style={[styles.cardEyebrow, { color: colors.primary }]}>
              Taller
            </Text>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Resumen de diagnostico
            </Text>
          </View>
          <Text style={[styles.cardTag, { color: colors.primary }]}>
            {selectedDiagnostic?.id || "Sin diagnostico"}
          </Text>
        </View>

        <View style={styles.detailLines}>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Cliente:
            </Text>
            {client?.fullName || selectedDiagnostic?.clientId || "Sin cliente"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Vehiculo:
            </Text>
            {vehicle?.plate || selectedDiagnostic?.vehicleId || "Sin vehiculo"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Estado:
            </Text>
            {diagnosticStatusOptions.find(
              (item) => item.key === selectedDiagnostic?.status,
            )?.label ||
              selectedDiagnostic?.status ||
              "Sin estado"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Hallazgos:
            </Text>
            {selectedDiagnostic?.concerns || "Sin hallazgos registrados"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Notas:
            </Text>
            {selectedDiagnostic?.notes || "Sin notas adicionales"}
          </Text>
        </View>

        <View style={styles.detailActionRow}>
          <Pressable
            onPress={() => onOpenDiagnosticForm?.(selectedDiagnostic)}
            style={[
              styles.secondaryAction,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.secondaryActionText, { color: colors.primary }]}
            >
              Editar diagnostico
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              onOpenWorkOrderForm?.(null, {
                seedData: {
                  diagnosticId: selectedDiagnostic?.id,
                  clientId: selectedDiagnostic?.clientId,
                  vehicleId: selectedDiagnostic?.vehicleId,
                },
              })
            }
            style={[
              styles.secondaryAction,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.secondaryActionText, { color: colors.accent }]}
            >
              Crear orden desde este diagnostico
            </Text>
          </Pressable>
        </View>
      </View>
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
            screenMode === SCREEN_MODES.DETAIL ? handleBackToList : onBack
          }
          section={
            screenMode === SCREEN_MODES.DETAIL ? "Diagnostico" : "Taller"
          }
          subtitle={
            screenMode === SCREEN_MODES.DETAIL
              ? "Revisa el contexto y abre la orden operativa sin perder la lectura rapida del caso."
              : "Registra hallazgos, consulta el padron y abre la siguiente accion desde la lista, igual que en Auto-Guardian."
          }
          title={
            screenMode === SCREEN_MODES.DETAIL
              ? selectedDiagnostic?.id || "Detalle de diagnostico"
              : "Diagnosticos"
          }
        />

        {screenMode === SCREEN_MODES.LIST
          ? renderListScreen()
          : renderDetailScreen()}
      </ScrollView>

      {screenMode === SCREEN_MODES.LIST ? (
        <Pressable
          onPress={() => onOpenDiagnosticForm?.(null)}
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    alignSelf: "flex-start",
    minWidth: rf(132),
  },
  summaryValue: { fontSize: rf(28), fontWeight: "900" },
  summaryLabel: { fontSize: rf(14), lineHeight: rf(20) },
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
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipText: { fontSize: rf(12), fontWeight: "700" },
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  listBody: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingBottom: spacing.xs,
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
  cardBody: { gap: spacing.xs },
  rowTitle: { fontSize: rf(17), fontWeight: "800" },
  rowMeta: { fontSize: rf(13), lineHeight: rf(19) },
  detailLines: { gap: spacing.xs },
  detailLine: { fontSize: rf(14), lineHeight: rf(22) },
  detailLineLabel: { fontSize: rf(14), fontWeight: "800" },
  detailActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  secondaryActionText: { fontSize: rf(13), fontWeight: "800" },
  iconActionRow: { gap: spacing.xs, justifyContent: "center" },
  iconAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: rf(38),
    height: rf(38),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyText: { fontSize: rf(14), lineHeight: rf(21) },
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
