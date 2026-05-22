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
import { listClients } from "../services/clients/clientService";
import {
  deleteDiagnostic,
  diagnosticStatusOptions,
  listDiagnostics,
} from "../services/diagnostics/diagnosticService";
import { listVehicles } from "../services/vehicles/vehicleService";
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

export default function DiagnosticsScreen({
  onBack,
  onOpenDiagnosticForm,
  onOpenWorkOrderForm,
  viewState,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

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
          onBack={onBack}
          section="Taller"
          subtitle="Registra hallazgos, consulta el padron y abre la siguiente accion desde la lista, igual que en Auto-Guardian."
          title="Diagnosticos"
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
                  <View style={styles.rowCopy}>
                    <View
                      style={[
                        styles.cardHeader,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.cardHeaderCopy}>
                        <Text
                          style={[
                            styles.cardEyebrow,
                            { color: colors.primary },
                          ]}
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
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {client?.fullName ||
                          diagnostic.clientId ||
                          "Sin cliente"}{" "}
                        ·{" "}
                        {vehicle?.plate ||
                          diagnostic.vehicleId ||
                          "Sin vehiculo"}
                      </Text>
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        {diagnostic.concerns || "Sin hallazgos registrados"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.iconActionRow}>
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
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.accent,
                        },
                      ]}
                    >
                      <Ionicons
                        color={colors.accent}
                        name="clipboard-outline"
                        size={rf(18)}
                      />
                    </Pressable>
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
      </ScrollView>

      <Pressable
        onPress={() => onOpenDiagnosticForm?.(null)}
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
  summaryLabel: { fontSize: rf(13), lineHeight: rf(18) },
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
  filterChipText: { fontSize: rf(11), fontWeight: "700" },
  listBody: { gap: spacing.md },
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
  iconActionRow: { gap: spacing.sm, justifyContent: "center" },
  iconAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: rf(42),
    height: rf(42),
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
