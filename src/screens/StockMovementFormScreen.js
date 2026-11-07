import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import BigChip from "../components/common/BigChip";
import FormField from "../components/common/FormField";
import FormScreen from "../components/common/FormScreen";
import { hasPermission } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  createEmptyStockMovementForm,
  createStockMovement,
  stockMovementTypeOptions,
} from "../services/stockItems/stockItemService";
import { TOUCH } from "../utils/touch";

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
          "Suma unidades al inventario cuando recibes compra, reposición o retorno de herramienta.",
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

  const setField = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!canManageInventory) {
      Alert.alert(
        "Stock y herramientas",
        activeMembership?.status !== "active"
          ? "Tu acceso en este taller está suspendido y no puede registrar movimientos en el inventario."
          : "Tu rol actual no puede registrar movimientos en el inventario.",
      );
      return;
    }

    if (!initialStockItem?.id && !initialStockItem?.refId) {
      Alert.alert("Stock y herramientas", "No se encontró el item a mover.");
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

  const isOut = form.movementType === "out";
  const movementColor = isOut ? colors.warning : colors.success;

  return (
    <FormScreen
      actionDisabled={!canManageInventory}
      actionIcon={
        isOut ? "arrow-down-circle-outline" : "arrow-up-circle-outline"
      }
      actionLabel={
        submitting ? "Registrando movimiento..." : movementMeta.title
      }
      actionVariant={isOut ? "warning" : "success"}
      onBack={onBack}
      onSubmit={handleSubmit}
      section="Stock y herramientas"
      submitting={submitting}
      subtitle={movementMeta.subtitle}
      title={movementMeta.title}
    >
      <View
        style={[
          styles.summary,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            borderLeftColor: movementColor,
          },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {initialStockItem?.name || "Sin item"}
        </Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {initialStockItem?.itemType === "tool" ? "Herramienta" : "Repuesto"}
        </Text>
        <View style={styles.stockRow}>
          <View style={styles.stockCell}>
            <Text style={[styles.stockLabel, { color: colors.textTertiary }]}>
              Stock actual
            </Text>
            <Text style={[styles.stockValue, { color: colors.text }]}>
              {currentQuantity}
            </Text>
          </View>
          <View style={styles.stockCell}>
            <Text style={[styles.stockLabel, { color: colors.textTertiary }]}>
              Quedaría en
            </Text>
            <Text
              style={[
                styles.stockValue,
                {
                  color: projectedQuantity < 0 ? colors.danger : movementColor,
                },
              ]}
            >
              {projectedQuantity}
            </Text>
          </View>
        </View>
        {projectedQuantity < 0 ? (
          <Text style={[styles.summaryText, { color: colors.danger }]}>
            La salida supera el stock disponible.
          </Text>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>
          Tipo de movimiento
        </Text>
        <View style={styles.statusGrid}>
          {stockMovementTypeOptions.map((movementTypeOption) => (
            <BigChip
              color={
                movementTypeOption.key === "out"
                  ? colors.warning
                  : colors.success
              }
              key={movementTypeOption.key}
              label={movementTypeOption.label}
              onPress={() =>
                setForm((current) => ({
                  ...current,
                  movementType: movementTypeOption.key,
                }))
              }
              selected={form.movementType === movementTypeOption.key}
              style={styles.statusChip}
            />
          ))}
        </View>
      </View>

      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <FormField
            keyboardType="number-pad"
            label="Cantidad"
            onChangeText={setField("quantity")}
            placeholder="0"
            value={String(form.quantity ?? "")}
          />
        </View>
        <View style={styles.pairItem}>
          <FormField
            keyboardType="decimal-pad"
            label="Costo unitario"
            onChangeText={setField("unitCost")}
            placeholder="Opcional"
            value={String(form.unitCost ?? "")}
          />
        </View>
      </View>

      <FormField
        label="Notas"
        multiline
        onChangeText={setField("notes")}
        placeholder="Compra, reposición, consumo interno o salida a servicio"
        value={form.notes}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderLeftWidth: 8,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  summaryTitle: { fontSize: 22, fontWeight: "900" },
  summaryText: { fontSize: 15, fontWeight: "600" },
  stockRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  stockCell: { flex: 1, gap: 2 },
  stockLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  stockValue: { fontSize: 34, fontWeight: "900" },
  group: { gap: 8 },
  groupLabel: { fontSize: 18, fontWeight: "800" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: TOUCH.gap },
  statusChip: { flexBasis: "47%", flexGrow: 1 },
  pair: { flexDirection: "row", gap: 12 },
  pairItem: { flex: 1 },
});
