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
import { useTheme } from "../context/ThemeContext";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import {
  createEmptySparePartForm,
  createSparePart,
  sparePartStatusOptions,
  updateSparePart,
} from "../services/spareParts/sparePartService";
import { listWorkOrders } from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

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
        Alert.alert("Repuestos", "No se pudieron cargar ordenes de apoyo.");
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

  const diagnosticLabel = diagnostics.find(
    (diagnostic) => diagnostic.id === form.diagnosticId,
  )?.id;

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
          section="Repuestos"
          subtitle="Registra costo y estado en una pantalla dedicada, y vuelve a la lista para decidir el siguiente movimiento."
          title={editingSparePartId ? "Editar repuesto" : "Registrar repuesto"}
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
              <Text style={[styles.cardEyebrow, { color: colors.primary }]}>
                Costos
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Registro de pieza
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {editingSparePartId ? "Revision" : "Nueva pieza"}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Orden asociada
            </Text>
            <View style={styles.optionWrap}>
              {workOrders.slice(0, 10).map((workOrder) => {
                const selected = form.workOrderId === workOrder.id;

                return (
                  <Pressable
                    key={workOrder.id}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        workOrderId: workOrder.id,
                        diagnosticId:
                          workOrder.diagnosticId || current.diagnosticId,
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
                      {workOrder.id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.summaryPanel,
              { backgroundColor: colors.cardMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: colors.text }]}>
              Diagnostico asociado:{" "}
              {diagnosticLabel || form.diagnosticId || "Sin diagnostico"}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Nombre
            </Text>
            <TextInput
              onChangeText={(value) =>
                setForm((current) => ({ ...current, name: value }))
              }
              placeholder="Filtro, sensor, pastilla..."
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
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Cantidad
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, quantity: value }))
                }
                placeholder="1"
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
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Proveedor
            </Text>
            <TextInput
              onChangeText={(value) =>
                setForm((current) => ({ ...current, supplier: value }))
              }
              placeholder="Proveedor o contacto"
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

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Estado
            </Text>
            <View style={styles.optionWrap}>
              {sparePartStatusOptions.map((statusOption) => {
                const selected = form.status === statusOption.key;

                return (
                  <Pressable
                    key={statusOption.key}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        status: statusOption.key,
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
                      {statusOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {submitting
                ? "Guardando repuesto..."
                : editingSparePartId
                  ? "Guardar cambios"
                  : "Crear repuesto"}
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: { fontSize: rf(12), fontWeight: "700" },
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
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
  cardTitle: { fontSize: rf(17), fontWeight: "800" },
  cardMeta: { fontSize: rf(12), fontWeight: "700" },
  formGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: rf(13), fontWeight: "700" },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  optionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: { fontSize: rf(13), fontWeight: "700" },
  summaryPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryText: { fontSize: rf(14), lineHeight: rf(20) },
  gridRow: { flexDirection: "row", gap: spacing.sm },
  gridItem: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: rf(15),
  },
  primaryAction: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryActionText: { fontSize: rf(15), fontWeight: "800" },
});
