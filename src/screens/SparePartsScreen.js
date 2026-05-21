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
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.scrollWithFab]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Costos
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Repuestos
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Registra piezas en una ficha dedicada y vuelve a la lista para
              revisar estado, costo y relacion con la orden.
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
            {spareParts.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Repuestos en seguimiento
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
                        backgroundColor: colors.cardMuted,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {part.name}
                      </Text>
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
                        {part.supplier || "Sin proveedor"} ·{" "}
                        {sparePartStatusOptions.find(
                          (item) => item.key === part.status,
                        )?.label || part.status}
                      </Text>
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
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay repuestos para el filtro actual. Usa el boton flotante para
              registrar el primero.
            </Text>
          )}
        </View>
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
