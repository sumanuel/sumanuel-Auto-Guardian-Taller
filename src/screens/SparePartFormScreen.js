import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, View } from "react-native";
import BigChip from "../components/common/BigChip";
import FormField from "../components/common/FormField";
import FormScreen from "../components/common/FormScreen";
import { useTheme } from "../context/ThemeContext";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import {
  createEmptySparePartForm,
  createSparePart,
  sparePartStatusOptions,
  updateSparePart,
} from "../services/spareParts/sparePartService";
import { listWorkOrders } from "../services/workOrders/workOrderService";
import { getSparePartTone } from "../utils/statusTone";
import { TOUCH } from "../utils/touch";

function getSparePartId(sparePart) {
  return sparePart?.refId || sparePart?.id || null;
}

export default function SparePartFormScreen({
  initialDraft,
  initialSparePart,
  onBack,
  onSaved,
}) {
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [form, setForm] = useState(
    createEmptySparePartForm({
      ...initialDraft,
      ...initialSparePart,
    }),
  );

  const editingSparePartId = getSparePartId(initialSparePart);

  useEffect(() => {
    setForm(
      createEmptySparePartForm({
        ...initialDraft,
        ...initialSparePart,
      }),
    );
  }, [initialDraft, initialSparePart]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [nextWorkOrders, nextDiagnostics] = await Promise.all([
          listWorkOrders(),
          listDiagnostics(),
        ]);
        setWorkOrders(nextWorkOrders);
        setDiagnostics(nextDiagnostics);
      } catch (error) {
        Alert.alert("Repuestos", "No se pudieron cargar órdenes de apoyo.");
      }
    };

    loadOptions();
  }, []);

  const selectedWorkOrder = useMemo(
    () => workOrders.find((workOrder) => workOrder.id === form.workOrderId),
    [form.workOrderId, workOrders],
  );

  useEffect(() => {
    if (!selectedWorkOrder?.diagnosticId) {
      return;
    }

    setForm((current) => ({
      ...current,
      diagnosticId: selectedWorkOrder.diagnosticId,
    }));
  }, [selectedWorkOrder?.id]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Repuestos", "Ingresa el nombre del repuesto.");
      return;
    }

    setSubmitting(true);

    try {
      let savedSparePartId = editingSparePartId;

      if (editingSparePartId) {
        await updateSparePart(editingSparePartId, form);
      } else {
        const createdSparePart = await createSparePart(form);
        savedSparePartId = createdSparePart.id;
      }

      onSaved?.(savedSparePartId);
    } catch (error) {
      Alert.alert(
        "Repuestos",
        error?.message || "No se pudo guardar el repuesto.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const diagnosticLabel = diagnostics.find(
    (diagnostic) => diagnostic.id === form.diagnosticId,
  )?.id;

  return (
    <FormScreen
      actionLabel={
        submitting
          ? "Guardando repuesto..."
          : editingSparePartId
            ? "Guardar cambios"
            : "Crear repuesto"
      }
      onBack={onBack}
      onSubmit={handleSubmit}
      section="Repuestos"
      submitting={submitting}
      subtitle="Nombre, cantidad, costo y estado de la pieza."
      title={editingSparePartId ? "Editar repuesto" : "Registrar repuesto"}
    >
      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>
          Orden asociada
        </Text>
        {!workOrders.length ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Aún no hay órdenes. Crea una orden para asociarle repuestos.
          </Text>
        ) : null}
        <View style={styles.optionWrap}>
          {workOrders.slice(0, 10).map((workOrder) => (
            <BigChip
              key={workOrder.id}
              label={workOrder.id}
              onPress={() =>
                setForm((current) => ({
                  ...current,
                  workOrderId: workOrder.id,
                  diagnosticId: workOrder.diagnosticId || current.diagnosticId,
                }))
              }
              selected={form.workOrderId === workOrder.id}
              style={styles.optionChip}
            />
          ))}
        </View>
        <View
          style={[
            styles.linkRow,
            { backgroundColor: colors.cardMuted, borderColor: colors.border },
          ]}
        >
          <Ionicons color={colors.primary} name="link-outline" size={22} />
          <Text style={[styles.linkText, { color: colors.text }]}>
            Diagnóstico:{" "}
            {diagnosticLabel || form.diagnosticId || "Sin diagnóstico"}
          </Text>
        </View>
      </View>

      <FormField
        label="Nombre"
        onChangeText={setField("name")}
        placeholder="Filtro, sensor, pastilla..."
        value={form.name}
      />

      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <FormField
            keyboardType="number-pad"
            label="Cantidad"
            onChangeText={setField("quantity")}
            placeholder="1"
            value={String(form.quantity ?? "")}
          />
        </View>
        <View style={styles.pairItem}>
          <FormField
            keyboardType="decimal-pad"
            label="Costo unitario"
            onChangeText={setField("unitCost")}
            placeholder="0"
            value={String(form.unitCost ?? "")}
          />
        </View>
      </View>

      <FormField
        label="Proveedor"
        onChangeText={setField("supplier")}
        placeholder="Proveedor o contacto"
        value={form.supplier}
      />

      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>Estado</Text>
        <View style={styles.statusGrid}>
          {sparePartStatusOptions.map((statusOption) => (
            <BigChip
              color={getSparePartTone(statusOption.key, colors)}
              key={statusOption.key}
              label={statusOption.label}
              onPress={() =>
                setForm((current) => ({ ...current, status: statusOption.key }))
              }
              selected={form.status === statusOption.key}
              style={styles.statusChip}
            />
          ))}
        </View>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupLabel: { fontSize: 18, fontWeight: "800" },
  hint: { fontSize: 14, lineHeight: 20 },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: TOUCH.gap },
  optionChip: { flexGrow: 1 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: TOUCH.gap },
  statusChip: { flexBasis: "47%", flexGrow: 1 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 14,
  },
  linkText: { flex: 1, fontSize: 15, fontWeight: "700" },
  pair: { flexDirection: "row", gap: 12 },
  pairItem: { flex: 1 },
});
