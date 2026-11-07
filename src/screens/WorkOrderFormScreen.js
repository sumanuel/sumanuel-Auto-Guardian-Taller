import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import BigChip from "../components/common/BigChip";
import DetailHero from "../components/common/DetailHero";
import FormScreen from "../components/common/FormScreen";
import { useTheme } from "../context/ThemeContext";
import { listStaffProfiles } from "../services/admin/staffAdmin";
import { listClients } from "../services/clients/clientService";
import {
  isDiagnosticClosed,
  listDiagnostics,
} from "../services/diagnostics/diagnosticService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  createEmptyWorkOrderForm,
  createWorkOrder,
  updateWorkOrder,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { getWorkOrderTone } from "../utils/statusTone";
import { TOUCH } from "../utils/touch";

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
  const [assignableStaff, setAssignableStaff] = useState([]);
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
        const [nextDiagnostics, nextClients, nextStaff, nextVehicles] =
          await Promise.all([
            listDiagnostics(),
            listClients(),
            listStaffProfiles(),
            listVehicles(),
          ]);
        setDiagnostics(nextDiagnostics);
        setClients(nextClients);
        setAssignableStaff(nextStaff);
        setVehicles(nextVehicles);
      } catch (error) {
        Alert.alert("Órdenes", "No se pudieron cargar diagnósticos de apoyo.");
      }
    };

    loadOptions();
  }, []);

  const selectedDiagnostic = useMemo(
    () => diagnostics.find((diagnostic) => diagnostic.id === form.diagnosticId),
    [diagnostics, form.diagnosticId],
  );

  const selectableDiagnostics = useMemo(
    () =>
      diagnostics.filter(
        (diagnostic) =>
          !isDiagnosticClosed(diagnostic.status) ||
          diagnostic.id === form.diagnosticId,
      ),
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
      Alert.alert("Órdenes", "Selecciona el diagnóstico base de la orden.");
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
        "Órdenes",
        error?.message || "No se pudo guardar la orden de trabajo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clientName = clients.find(
    (client) => client.id === form.clientId,
  )?.fullName;
  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === form.vehicleId,
  );

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

  const statusLabel =
    workOrderStatusOptions.find((item) => item.key === form.status)?.label ||
    "Sin estado";
  const hasContext = Boolean(selectedDiagnostic || selectedVehicle);

  return (
    <FormScreen
      actionLabel={
        submitting
          ? "Guardando orden..."
          : editingWorkOrderId
            ? "Guardar cambios"
            : "Crear orden"
      }
      onBack={onBack}
      onSubmit={handleSubmit}
      section="Órdenes"
      submitting={submitting}
      subtitle="Elige el diagnóstico base, el estado y quién trabaja la orden."
      title={editingWorkOrderId ? "Editar orden" : "Registrar orden"}
    >
      {hasContext ? (
        <DetailHero
          code={editingWorkOrderId || "Nueva"}
          facts={[
            {
              label: "Cliente",
              value: clientName || form.clientId || "Sin cliente",
            },
            {
              label: "Kilometraje",
              value: selectedVehicle?.mileage
                ? `${selectedVehicle.mileage} km`
                : "Sin kilometraje",
            },
          ]}
          plate={selectedVehicle?.plate}
          statusLabel={statusLabel}
          title={[
            selectedVehicle?.brand,
            selectedVehicle?.model,
            selectedVehicle?.year,
          ]
            .filter(Boolean)
            .join(" ")}
          tone={getWorkOrderTone(form.status, colors)}
        />
      ) : null}

      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>
          Diagnóstico base
        </Text>
        {!selectableDiagnostics.length ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            No hay diagnósticos abiertos. Registra un diagnóstico primero y
            luego crea la orden desde él.
          </Text>
        ) : null}
        <View style={styles.optionWrap}>
          {selectableDiagnostics.slice(0, 10).map((diagnostic) => {
            const isClosed = isDiagnosticClosed(diagnostic.status);

            return (
              <BigChip
                disabled={isClosed}
                key={diagnostic.id}
                label={`${diagnostic.id}${isClosed ? " · Cerrado" : ""}`}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    diagnosticId: diagnostic.id,
                    clientId: diagnostic.clientId,
                    vehicleId: diagnostic.vehicleId,
                  }))
                }
                selected={form.diagnosticId === diagnostic.id}
                style={styles.optionChip}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>Estado</Text>
        <View style={styles.statusGrid}>
          {workOrderStatusOptions.map((statusOption) => (
            <BigChip
              color={getWorkOrderTone(statusOption.key, colors)}
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

      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.text }]}>
          Responsables asignados
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Toca para asignar o quitar antes de iniciar la orden.
        </Text>
        {assignableStaff.length ? (
          <View style={styles.optionWrap}>
            {assignableStaff.map((mechanic) => (
              <BigChip
                key={mechanic.uid}
                label={mechanic.fullName || mechanic.email || mechanic.userCode}
                onPress={() => toggleMechanic(mechanic.uid)}
                selected={form.assignedMechanicUids.includes(mechanic.uid)}
                style={styles.optionChip}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            No hay responsables disponibles para asignar.
          </Text>
        )}
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
});
