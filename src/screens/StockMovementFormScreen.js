import { useEffect, useMemo, useState } from "react";
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
import { hasPermission } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  createEmptyStockMovementForm,
  createStockMovement,
  stockMovementTypeOptions,
} from "../services/stockItems/stockItemService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getMovementMeta(movementType) {
  return movementType === "out"
    ? {
        title: "Registrar salida",
        subtitle:
          "Descuenta unidades cuando se consume una pieza o cuando una herramienta sale del inventario disponible.",
        tone: "warning",
      }
    : {
        title: "Registrar entrada",
        subtitle:
          "Suma unidades al inventario cuando recibes compra, reposicion o retorno de herramienta.",
        tone: "accent",
      };
}

export default function StockMovementFormScreen({
  initialMovementType,
  initialStockItem,
  onBack,
  onSaved,
}) {
  const { colors } = useTheme();
  const { activeWorkshopId, memberships, userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(
    createEmptyStockMovementForm({ movementType: initialMovementType }),
  );

  useEffect(() => {
    setForm(
      createEmptyStockMovementForm({ movementType: initialMovementType }),
    );
  }, [initialMovementType]);

  const movementMeta = useMemo(
    () => getMovementMeta(form.movementType),
    [form.movementType],
  );
  const activeMembership = memberships.find(
    (membership) => membership.workshopId === activeWorkshopId,
  );
  const activeMembershipRole = activeMembership?.role || userProfile?.role;
  const canManageInventory =
    hasPermission(activeMembershipRole, "inventory.manage") &&
    activeMembership?.status === "active";
  const currentQuantity = Number(initialStockItem?.quantity || 0);
  const projectedQuantity = (() => {
    const movementQuantity = Number(form.quantity || 0);

    if (!movementQuantity) {
      return currentQuantity;
    }

    return form.movementType === "out"
      ? currentQuantity - movementQuantity
      : currentQuantity + movementQuantity;
  })();

  const handleSubmit = async () => {
    if (!canManageInventory) {
      Alert.alert(
        "Stock y herramientas",
        activeMembership?.status !== "active"
          ? "Tu acceso en este taller esta suspendido y no puede registrar movimientos en el inventario."
          : "Tu rol actual no puede registrar movimientos en el inventario.",
      );
      return;
    }

    if (!initialStockItem?.id && !initialStockItem?.refId) {
      Alert.alert("Stock y herramientas", "No se encontro el item a mover.");
      return;
    }

    if (!form.quantity.trim()) {
      Alert.alert(
        "Stock y herramientas",
        "Ingresa la cantidad del movimiento.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const savedMovement = await createStockMovement({
        stockItemId: initialStockItem.refId || initialStockItem.id,
        movementType: form.movementType,
        quantity: form.quantity,
        unitCost: form.unitCost,
        notes: form.notes,
        performedByUid: userProfile?.uid,
      });

      onSaved?.(savedMovement.stockItemId);
    } catch (error) {
      Alert.alert(
        "Stock y herramientas",
        error?.message || "No se pudo registrar el movimiento.",
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
          subtitle={movementMeta.subtitle}
          title={movementMeta.title}
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
          <Text
            style={[
              styles.summaryEyebrow,
              { color: colors[movementMeta.tone] },
            ]}
          >
            Item seleccionado
          </Text>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {initialStockItem?.name || "Sin item"}
          </Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            Stock actual: {currentQuantity} · Tipo:{" "}
            {initialStockItem?.itemType === "tool" ? "Herramienta" : "Repuesto"}
          </Text>
          <Text
            style={[
              styles.summaryText,
              {
                color:
                  projectedQuantity < 0 ? colors.danger : colors.textSecondary,
              },
            ]}
          >
            Stock proyectado: {projectedQuantity}
          </Text>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Tipo de movimiento
            </Text>
            <View style={styles.optionWrap}>
              {stockMovementTypeOptions.map((movementTypeOption) => {
                const selected = form.movementType === movementTypeOption.key;

                return (
                  <Pressable
                    key={movementTypeOption.key}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        movementType: movementTypeOption.key,
                      }))
                    }
                    style={[
                      styles.optionChip,
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
                        styles.optionText,
                        { color: selected ? colors.white : colors.text },
                      ]}
                    >
                      {movementTypeOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.formGroup, styles.gridItem]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Cantidad
              </Text>
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
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Costo unitario
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, unitCost: value }))
                }
                placeholder="Opcional"
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
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Notas
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, notes: value }))
              }
              placeholder="Compra, reposicion, consumo interno, salida a servicio o detalle tecnico"
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
            disabled={!canManageInventory || submitting}
            onPress={handleSubmit}
            style={[
              styles.primaryAction,
              {
                backgroundColor: canManageInventory
                  ? colors.primary
                  : colors.cardMuted,
              },
            ]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {submitting ? "Registrando movimiento..." : movementMeta.title}
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryEyebrow: {
    fontSize: rf(11),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryTitle: {
    fontSize: rf(20),
    fontWeight: "800",
  },
  summaryText: {
    fontSize: rf(13),
    lineHeight: rf(18),
  },
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
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
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
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
