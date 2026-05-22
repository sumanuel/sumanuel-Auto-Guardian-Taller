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
import { listMechanicProfiles } from "../services/admin/staffAdmin";
import { listClients } from "../services/clients/clientService";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  createEmptyWorkOrderForm,
  createWorkOrder,
  updateWorkOrder,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getWorkOrderId(workOrder) {
  return workOrder?.refId || workOrder?.id || null;
}

export default function WorkOrderFormScreen({
  initialDraft,
  initialWorkOrder,
  onBack,
  onSaved,
}) {
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [clients, setClients] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(
    createEmptyWorkOrderForm({
      ...initialDraft,
      ...initialWorkOrder,
    }),
  );

  const editingWorkOrderId = getWorkOrderId(initialWorkOrder);

  useEffect(() => {
    setForm(
      createEmptyWorkOrderForm({
        ...initialDraft,
        ...initialWorkOrder,
      }),
    );
  }, [initialDraft, initialWorkOrder]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [nextDiagnostics, nextClients, nextMechanics, nextVehicles] =
          await Promise.all([
            listDiagnostics(),
            listClients(),
            listMechanicProfiles(),
            listVehicles(),
          ]);
        setDiagnostics(nextDiagnostics);
        setClients(nextClients);
        setMechanics(nextMechanics);
        setVehicles(nextVehicles);
      } catch (error) {
        Alert.alert("Ordenes", "No se pudieron cargar diagnosticos de apoyo.");
      }
    };

    loadOptions();
  }, []);

  const selectedDiagnostic = useMemo(
    () => diagnostics.find((diagnostic) => diagnostic.id === form.diagnosticId),
    [diagnostics, form.diagnosticId],
  );

  useEffect(() => {
    if (!selectedDiagnostic) {
      return;
    }

    setForm((current) => ({
      ...current,
      clientId: selectedDiagnostic.clientId || current.clientId,
      vehicleId: selectedDiagnostic.vehicleId || current.vehicleId,
    }));
  }, [selectedDiagnostic?.id]);

  const handleSubmit = async () => {
    if (!form.diagnosticId.trim()) {
      Alert.alert("Ordenes", "Selecciona el diagnostico base de la orden.");
      return;
    }

    setSubmitting(true);

    try {
      let savedWorkOrderId = editingWorkOrderId;

      if (editingWorkOrderId) {
        await updateWorkOrder(editingWorkOrderId, form);
      } else {
        const createdWorkOrder = await createWorkOrder(form);
        savedWorkOrderId = createdWorkOrder.id;
      }

      onSaved?.(savedWorkOrderId);
    } catch (error) {
      Alert.alert(
        "Ordenes",
        error?.message || "No se pudo guardar la orden de trabajo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clientName = clients.find(
    (client) => client.id === form.clientId,
  )?.fullName;
  const vehiclePlate = vehicles.find(
    (vehicle) => vehicle.id === form.vehicleId,
  )?.plate;

  const toggleMechanic = (uid) => {
    setForm((current) => {
      const exists = current.assignedMechanicUids.includes(uid);

      return {
        ...current,
        assignedMechanicUids: exists
          ? current.assignedMechanicUids.filter((item) => item !== uid)
          : [...current.assignedMechanicUids, uid],
      };
    });
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
          section="Ordenes"
          subtitle="La orden queda en una pantalla dedicada y luego vuelve a la lista para seguir con repuestos o cambios de estado."
          title={editingWorkOrderId ? "Editar orden" : "Registrar orden"}
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
                Operacion
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Plan de trabajo
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {editingWorkOrderId ? "Actualizacion" : "Nueva orden"}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Diagnostico base
            </Text>
            <View style={styles.optionWrap}>
              {diagnostics.slice(0, 10).map((diagnostic) => {
                const selected = form.diagnosticId === diagnostic.id;

                return (
                  <Pressable
                    key={diagnostic.id}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        diagnosticId: diagnostic.id,
                        clientId: diagnostic.clientId,
                        vehicleId: diagnostic.vehicleId,
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
                      {diagnostic.id}
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
              <Text style={[styles.summaryTextLabel, { color: colors.text }]}>
                Cliente:{" "}
              </Text>
              {clientName || form.clientId || "Sin cliente"}
            </Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              <Text style={[styles.summaryTextLabel, { color: colors.text }]}>
                Vehiculo:{" "}
              </Text>
              {vehiclePlate || form.vehicleId || "Sin vehiculo"}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Estado
            </Text>
            <View style={styles.optionWrap}>
              {workOrderStatusOptions.map((statusOption) => {
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

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Mecanicos asignados
            </Text>
            <View style={styles.optionWrap}>
              {mechanics.length ? (
                mechanics.map((mechanic) => {
                  const selected = form.assignedMechanicUids.includes(
                    mechanic.uid,
                  );

                  return (
                    <Pressable
                      key={mechanic.uid}
                      onPress={() => toggleMechanic(mechanic.uid)}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: selected
                            ? colors.primaryStrong
                            : colors.cardMuted,
                          borderColor: selected
                            ? colors.primaryStrong
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selected ? colors.white : colors.text },
                        ]}
                      >
                        {mechanic.fullName ||
                          mechanic.email ||
                          mechanic.userCode}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text
                  style={[styles.helperText, { color: colors.textSecondary }]}
                >
                  No hay mecanicos disponibles para asignar.
                </Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {submitting
                ? "Guardando orden..."
                : editingWorkOrderId
                  ? "Guardar cambios"
                  : "Crear orden"}
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
    gap: spacing.xl,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
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
  cardTitle: { fontSize: rf(16), fontWeight: "800" },
  cardMeta: { fontSize: rf(11), fontWeight: "700" },
  formGroup: { gap: spacing.sm },
  fieldLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionText: { fontSize: rf(12), fontWeight: "700" },
  helperText: { fontSize: rf(13), lineHeight: rf(18) },
  summaryPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryText: { fontSize: rf(13), lineHeight: rf(19) },
  summaryTextLabel: { fontSize: rf(13), fontWeight: "800" },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: rf(92),
    fontSize: rf(14),
  },
  primaryAction: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryActionText: { fontSize: rf(14), fontWeight: "800" },
});
