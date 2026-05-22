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
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import {
  deleteSparePart,
  listSpareParts,
  sparePartStatusOptions,
} from "../services/spareParts/sparePartService";
import { listWorkOrders } from "../services/workOrders/workOrderService";
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

export default function SparePartsScreen({
  onBack,
  onOpenSparePartForm,
  viewState,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [spareParts, setSpareParts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const workOrderLookup = useMemo(() => buildLookup(workOrders), [workOrders]);
  const diagnosticLookup = useMemo(
    () => buildLookup(diagnostics),
    [diagnostics],
  );

  const refreshData = async () => {
    setLoading(true);

    try {
      const [nextSpareParts, nextWorkOrders, nextDiagnostics] =
        await Promise.all([
          listSpareParts(),
          listWorkOrders(),
          listDiagnostics(),
        ]);
      setSpareParts(nextSpareParts);
      setWorkOrders(nextWorkOrders);
      setDiagnostics(nextDiagnostics);
    } catch (error) {
      Alert.alert(
        "Repuestos",
        "No se pudo cargar el tablero operativo de repuestos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const filteredParts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return spareParts.filter((part) => {
      if (activeFilter !== "all" && part.status !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        part.id,
        part.name,
        part.supplier,
        part.workOrderId,
        part.diagnosticId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, searchQuery, spareParts]);

  const handleDelete = (part) => {
    Alert.alert(
      "Eliminar repuesto",
      `Se eliminara ${part.name || part.id || "este repuesto"} del tablero operativo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSparePart(getEntityId(part));
              await refreshData();
            } catch (error) {
              Alert.alert(
                "Repuestos",
                error?.message || "No se pudo eliminar el repuesto.",
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
          section="Costos"
          subtitle="Registra piezas en una ficha dedicada y vuelve a la lista para revisar estado, costo y relacion con la orden."
          title="Repuestos"
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
            {spareParts.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Repuestos en seguimiento
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
            placeholder="Buscar por repuesto, proveedor, orden o diagnostico"
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
            {[{ key: "all", label: "Todos" }, ...sparePartStatusOptions].map(
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
        ) : filteredParts.length ? (
          <View style={styles.listBody}>
            {filteredParts.map((part) => {
              const isSelected =
                viewState?.selectedSparePartId === getEntityId(part);
              const relatedWorkOrder = workOrderLookup[part.workOrderId];
              const relatedDiagnostic = diagnosticLookup[part.diagnosticId];

              return (
                <View
                  key={getEntityId(part)}
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
                          Costos
                        </Text>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>
                          {part.name}
                        </Text>
                      </View>
                      <Text style={[styles.cardTag, { color: colors.primary }]}>
                        {sparePartStatusOptions.find(
                          (item) => item.key === part.status,
                        )?.label || part.status}
                      </Text>
                    </View>
                    <View style={styles.cardBody}>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {part.id} · Cant. {part.quantity || 0} · Costo{" "}
                        {part.unitCost || 0}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {relatedWorkOrder?.id ||
                          part.workOrderId ||
                          "Sin orden"}{" "}
                        ·{" "}
                        {relatedDiagnostic?.id ||
                          part.diagnosticId ||
                          "Sin diagnostico"}
                      </Text>
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        {part.supplier || "Sin proveedor"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.iconActionRow}>
                    <Pressable
                      onPress={() => onOpenSparePartForm?.(part)}
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
                      onPress={() => handleDelete(part)}
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
              Costos
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay repuestos para el filtro actual. Cambia el estado o carga
              la primera pieza para seguir el costo del servicio.
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => onOpenSparePartForm?.(null)}
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
  summaryLabel: { fontSize: rf(14), lineHeight: rf(20) },
  controlsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipText: { fontSize: rf(12), fontWeight: "700" },
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
