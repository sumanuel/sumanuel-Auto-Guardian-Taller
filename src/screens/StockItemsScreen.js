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
import { hasPermission } from "../constants/accessControl";
import { useTheme } from "../context/ThemeContext";
import {
  deleteStockItem,
  listStockItems,
  stockItemTypeOptions,
} from "../services/stockItems/stockItemService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

function getItemTypeLabel(itemType) {
  return stockItemTypeOptions.find((item) => item.key === itemType)?.label || "Item";
}

function getInventoryState(item) {
  const quantity = Number(item.quantity || 0);
  const minimumQuantity =
    item.minimumQuantity === null || item.minimumQuantity === undefined
      ? null
      : Number(item.minimumQuantity);

  if (quantity <= 0) {
    return {
      label: item.itemType === "tool" ? "Sin unidades" : "Sin stock",
      tone: "danger",
    };
  }

  if (minimumQuantity !== null && quantity <= minimumQuantity) {
    return {
      label: "Stock bajo",
      tone: "warning",
    };
  }

  return {
    label: "Disponible",
    tone: "accent",
  };
}

export default function StockItemsScreen({
  onBack,
  onOpenStockItemForm,
  userProfile,
  viewState,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const canManageInventory = hasPermission(userProfile?.role, "inventory.manage");

  const refreshData = async () => {
    setLoading(true);

    try {
      const nextItems = await listStockItems();
      setStockItems(nextItems);
    } catch (error) {
      Alert.alert(
        "Stock y herramientas",
        error?.message || "No se pudo cargar el inventario del taller.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const inventoryStats = useMemo(() => {
    return stockItems.reduce(
      (accumulator, item) => {
        const inventoryState = getInventoryState(item);

        accumulator.total += 1;
        if (item.itemType === "part") {
          accumulator.parts += 1;
        }
        if (item.itemType === "tool") {
          accumulator.tools += 1;
        }
        if (inventoryState.tone === "warning" || inventoryState.tone === "danger") {
          accumulator.attention += 1;
        }

        return accumulator;
      },
      { total: 0, parts: 0, tools: 0, attention: 0 },
    );
  }, [stockItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return stockItems.filter((item) => {
      if (activeFilter !== "all" && item.itemType !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        item.id,
        item.name,
        item.supplier,
        item.location,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, searchQuery, stockItems]);

  const handleDelete = (item) => {
    Alert.alert(
      "Eliminar item",
      `Se eliminara ${item.name || item.id || "este item"} del inventario del taller.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStockItem(getEntityId(item));
              await refreshData();
            } catch (error) {
              Alert.alert(
                "Stock y herramientas",
                error?.message || "No se pudo eliminar el item.",
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section="Operacion"
          subtitle="Controla el inventario transversal del taller sin mezclarlo con los repuestos de cada orden."
          title="Stock y herramientas"
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
          <Text style={[styles.summaryEyebrow, { color: colors.primary }]}>Inventario</Text>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Tablero del taller</Text>
          <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}> 
            Visualiza repuestos generales, herramientas registradas y elementos que requieren reposicion.
          </Text>

          <View style={styles.statsRow}>
            {[
              { label: "Items", value: inventoryStats.total },
              { label: "Repuestos", value: inventoryStats.parts },
              { label: "Herramientas", value: inventoryStats.tools },
              { label: "Atencion", value: inventoryStats.attention },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          disabled={!canManageInventory}
          onPress={() => onOpenStockItemForm?.(null)}
          style={[
            styles.primaryInlineAction,
            {
              backgroundColor: canManageInventory ? colors.primary : colors.cardMuted,
              borderColor: canManageInventory ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons
            color={canManageInventory ? colors.white : colors.textSecondary}
            name="add"
            size={rf(18)}
          />
          <Text
            style={[
              styles.primaryInlineActionText,
              { color: canManageInventory ? colors.white : colors.textSecondary },
            ]}
          >
            Agregar item al inventario
          </Text>
        </Pressable>

        {!canManageInventory ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}> 
            Tu rol puede consultar el inventario, pero no crear ni editar registros.
          </Text>
        ) : null}

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
            placeholder="Buscar por nombre, proveedor, ubicacion o codigo"
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
            {[{ key: "all", label: "Todos" }, ...stockItemTypeOptions].map((filter) => {
              const selected = activeFilter === filter.key;

              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.cardMuted,
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
            })}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : filteredItems.length ? (
          <View style={styles.listBody}>
            {filteredItems.map((item) => {
              const inventoryState = getInventoryState(item);
              const isSelected = viewState?.selectedStockItemId === getEntityId(item);

              return (
                <View
                  key={getEntityId(item)}
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
                        <Text style={[styles.cardEyebrow, { color: colors.primary }]}> 
                          {getItemTypeLabel(item.itemType)}
                        </Text>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={[styles.cardTag, { color: colors[inventoryState.tone] }]}> 
                        {inventoryState.label}
                      </Text>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                        {item.id} · Cant. {item.quantity || 0}
                        {item.minimumQuantity !== null && item.minimumQuantity !== undefined
                          ? ` · Min. ${item.minimumQuantity}`
                          : ""}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}> 
                        Costo {item.unitCost || 0} · {item.location || "Sin ubicacion"}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textTertiary }]}> 
                        {item.supplier || "Sin proveedor"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.iconActionRow}>
                    <Pressable
                      disabled={!canManageInventory}
                      onPress={() => onOpenStockItemForm?.(item)}
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: canManageInventory ? colors.primary : colors.border,
                          opacity: canManageInventory ? 1 : 0.45,
                        },
                      ]}
                    >
                      <Ionicons
                        color={canManageInventory ? colors.primary : colors.textTertiary}
                        name="create-outline"
                        size={rf(18)}
                      />
                    </Pressable>
                    <Pressable
                      disabled={!canManageInventory}
                      onPress={() => handleDelete(item)}
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: canManageInventory ? colors.danger : colors.border,
                          opacity: canManageInventory ? 1 : 0.45,
                        },
                      ]}
                    >
                      <Ionicons
                        color={canManageInventory ? colors.danger : colors.textTertiary}
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
              styles.emptyCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons color={colors.primary} name="cube-outline" size={rf(28)} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}> 
              No hay items registrados
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
              Crea el primer repuesto general o herramienta del taller para empezar a controlar disponibilidad y reposicion.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryEyebrow: {
    fontSize: rf(11),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryTitle: {
    fontSize: rf(22),
    fontWeight: "800",
  },
  summarySubtitle: {
    fontSize: rf(13),
    lineHeight: rf(18),
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    minWidth: "47%",
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: rf(19),
    fontWeight: "800",
  },
  statLabel: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  primaryInlineAction: {
    minHeight: rf(52),
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryInlineActionText: {
    fontSize: rf(14),
    fontWeight: "700",
  },
  helperText: {
    marginTop: -spacing.sm,
    fontSize: rf(12),
    lineHeight: rf(17),
  },
  controlsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    minHeight: rf(52),
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: rf(14),
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  filterChipText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  listBody: {
    gap: spacing.md,
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowCopy: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingBottom: spacing.sm,
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
  cardTag: {
    fontSize: rf(11),
    fontWeight: "800",
  },
  cardBody: {
    gap: spacing.xs,
  },
  rowTitle: {
    fontSize: rf(17),
    fontWeight: "800",
  },
  rowMeta: {
    fontSize: rf(12),
    lineHeight: rf(17),
  },
  iconActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  iconAction: {
    width: rf(40),
    height: rf(40),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  emptyTitle: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  emptyText: {
    fontSize: rf(13),
    lineHeight: rf(18),
  },
});