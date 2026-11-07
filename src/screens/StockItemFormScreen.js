import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import BigChip from "../components/common/BigChip";
import FormField from "../components/common/FormField";
import FormScreen from "../components/common/FormScreen";
import { hasPermission } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  createEmptyStockItemForm,
  createStockItem,
  stockItemTypeOptions,
  updateStockItem,
} from "../services/stockItems/stockItemService";
import { TOUCH } from "../utils/touch";

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
  const { activeWorkshopId, memberships, userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(
    createEmptyStockItemForm({
      ...initialDraft,
      ...initialStockItem,
    }),
  );

  const editingStockItemId = getStockItemId(initialStockItem);
  const activeMembership = memberships.find(
    (membership) => membership.workshopId === activeWorkshopId,
  );
  const activeMembershipRole = activeMembership?.role || userProfile?.role;
  const canManageInventory =
    hasPermission(activeMembershipRole, "inventory.manage") &&
    activeMembership?.status === "active";

  const setField = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setForm(
      createEmptyStockItemForm({
        ...initialDraft,
        ...initialStockItem,
      }),
    );
  }, [initialDraft, initialStockItem]);

  const handleSubmit = async () => {
    if (!canManageInventory) {
      Alert.alert(
        "Stock y herramientas",
        activeMembership?.status !== "active"
          ? "Tu acceso en este taller está suspendido y no puede crear o editar items del inventario."
          : "Tu rol actual no puede crear o editar items del inventario.",
      );
      return;
    }

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
    <FormScreen
      actionDisabled={!canManageInventory}
      actionLabel={
        submitting
          ? "Guardando item..."
          : editingStockItemId
            ? "Guardar cambios"
            : "Crear item"
      }
      onBack={onBack}
      onSubmit={handleSubmit}
      section="Stock y herramientas"
      submitting={submitting}
      subtitle="Nombre, cantidades y dónde encontrarlo."
      title={editingStockItemId ? "Editar item" : "Registrar item"}
    >
      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>Tipo</Text>
        <View style={styles.statusGrid}>
          {stockItemTypeOptions.map((itemTypeOption) => (
            <BigChip
              key={itemTypeOption.key}
              label={itemTypeOption.label}
              onPress={() =>
                setForm((current) => ({
                  ...current,
                  itemType: itemTypeOption.key,
                }))
              }
              selected={form.itemType === itemTypeOption.key}
              style={styles.statusChip}
            />
          ))}
        </View>
      </View>

      <FormField
        label="Nombre"
        onChangeText={setField("name")}
        placeholder="Llave, escáner, filtro, lubricante..."
        value={form.name}
      />

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
            hint="Avisa al bajar de aquí."
            keyboardType="number-pad"
            label="Mínimo"
            onChangeText={setField("minimumQuantity")}
            placeholder="0"
            value={String(form.minimumQuantity ?? "")}
          />
        </View>
      </View>

      <FormField
        keyboardType="decimal-pad"
        label="Costo unitario"
        onChangeText={setField("unitCost")}
        placeholder="0"
        value={String(form.unitCost ?? "")}
      />
      <FormField
        label="Proveedor"
        onChangeText={setField("supplier")}
        placeholder="Proveedor o referencia"
        value={form.supplier}
      />
      <FormField
        label="Ubicación"
        onChangeText={setField("location")}
        placeholder="Estante, gaveta o zona"
        value={form.location}
      />
      <FormField
        label="Notas"
        multiline
        onChangeText={setField("notes")}
        placeholder="Compatibilidades, estado o recordatorio de reposición"
        value={form.notes}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupLabel: { fontSize: 18, fontWeight: "800" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: TOUCH.gap },
  statusChip: { flexBasis: "47%", flexGrow: 1 },
  pair: { flexDirection: "row", gap: 12 },
  pairItem: { flex: 1 },
});
