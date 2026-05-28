import { useEffect, useState } from "react";
import {
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
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  createEmptyStockItemForm,
  createStockItem,
  stockItemTypeOptions,
  updateStockItem,
} from "../services/stockItems/stockItemService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getStockItemId(stockItem) {
  return stockItem?.refId || stockItem?.id || null;
}

export default function StockItemFormScreen({
  initialDraft,
  initialStockItem,
  onBack,
  onSaved,
}) {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(
    createEmptyStockItemForm({
      ...initialDraft,
      ...initialStockItem,
    }),
  );

  const editingStockItemId = getStockItemId(initialStockItem);

  useEffect(() => {
    setForm(
      createEmptyStockItemForm({
        ...initialDraft,
        ...initialStockItem,
      }),
    );
  }, [initialDraft, initialStockItem]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Stock y herramientas", "Ingresa el nombre del item.");
      return;
    }

    setSubmitting(true);

    try {
      let savedStockItemId = editingStockItemId;

      if (editingStockItemId) {
        await updateStockItem(editingStockItemId, form);
      } else {
        const createdStockItem = await createStockItem({
          ...form,
          createdByUid: userProfile?.uid,
        });
        savedStockItemId = createdStockItem.id;
      }

      onSaved?.(savedStockItemId);
    } catch (error) {
      Alert.alert(
        "Stock y herramientas",
        error?.message || "No se pudo guardar el item.",
      );
    } finally {
      setSubmitting(false);
    }
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
          section="Stock y herramientas"
          subtitle="Registra inventario general del taller con contexto claro para reponer, ubicar y costear cada item."
          title={editingStockItemId ? "Editar item" : "Registrar item"}
        />

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.cardHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.primary }]}>Inventario</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Ficha del item</Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {editingStockItemId ? "Revision" : "Nuevo registro"}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tipo</Text>
            <View style={styles.optionWrap}>
              {stockItemTypeOptions.map((itemTypeOption) => {
                const selected = form.itemType === itemTypeOption.key;

                return (
                  <Pressable
                    key={itemTypeOption.key}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        itemType: itemTypeOption.key,
                      }))
                    }
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.cardMuted,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: selected ? colors.white : colors.text },
                      ]}
                    >
                      {itemTypeOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Nombre</Text>
            <TextInput
              onChangeText={(value) =>
                setForm((current) => ({ ...current, name: value }))
              }
              placeholder="Llave, escaner, filtro, lubricante..."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={form.name}
            />
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.formGroup, styles.gridItem]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Cantidad</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, quantity: value }))
                }
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.quantity}
              />
            </View>
            <View style={[styles.formGroup, styles.gridItem]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Minimo</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, minimumQuantity: value }))
                }
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.minimumQuantity}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Costo unitario</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setForm((current) => ({ ...current, unitCost: value }))
              }
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={form.unitCost}
            />
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.formGroup, styles.gridItem]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Proveedor</Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, supplier: value }))
                }
                placeholder="Proveedor o referencia"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.supplier}
              />
            </View>
            <View style={[styles.formGroup, styles.gridItem]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Ubicacion</Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, location: value }))
                }
                placeholder="Estante, gaveta o zona"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.location}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Notas</Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, notes: value }))
              }
              placeholder="Compatibilidades, estado, detalle tecnico o recordatorio de reposicion"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              textAlignVertical="top"
              value={form.notes}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {submitting
                ? "Guardando item..."
                : editingStockItemId
                  ? "Guardar cambios"
                  : "Crear item"}
            </Text>
          </Pressable>
        </View>
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
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  cardTitle: {
    fontSize: rf(22),
    fontWeight: "800",
  },
  cardMeta: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  formGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  optionText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  input: {
    minHeight: rf(52),
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: rf(14),
  },
  notesInput: {
    minHeight: rf(120),
    paddingTop: spacing.md,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  primaryAction: {
    minHeight: rf(54),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
});