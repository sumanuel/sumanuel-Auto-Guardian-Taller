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
import { useTheme } from "../context/ThemeContext";
import { listClients } from "../services/clients/clientService";
import {
  createDiagnostic,
  createEmptyDiagnosticForm,
  diagnosticStatusOptions,
  updateDiagnostic,
} from "../services/diagnostics/diagnosticService";
import { listMechanicProfiles } from "../services/admin/staffAdmin";
import { listVehicles } from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getDiagnosticId(diagnostic) {
  return diagnostic?.refId || diagnostic?.id || null;
}

export default function DiagnosticFormScreen({
  initialDiagnostic,
  initialDraft,
  onBack,
  onSaved,
  userProfile,
}) {
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(
    createEmptyDiagnosticForm({
      ...initialDraft,
      ...initialDiagnostic,
    }),
  );

  const editingDiagnosticId = getDiagnosticId(initialDiagnostic);

  useEffect(() => {
    setForm(
      createEmptyDiagnosticForm({
        ...initialDraft,
        ...initialDiagnostic,
      }),
    );
  }, [initialDiagnostic, initialDraft]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [nextClients, nextMechanics, nextVehicles] = await Promise.all([
          listClients(),
          listMechanicProfiles(),
          listVehicles(),
        ]);
        setClients(nextClients);
        setMechanics(nextMechanics);
        setVehicles(nextVehicles);
      } catch (error) {
        Alert.alert(
          "Diagnosticos",
          "No se pudieron cargar clientes, vehiculos y mecanicos de apoyo.",
        );
      }
    };

    loadOptions();
  }, []);

  const filteredVehicles = useMemo(() => {
    if (!form.clientId) {
      return vehicles.slice(0, 8);
    }

    return vehicles.filter((vehicle) => vehicle.clientId === form.clientId);
  }, [form.clientId, vehicles]);

  const handleSubmit = async () => {
    if (!form.clientId.trim() || !form.vehicleId.trim()) {
      Alert.alert(
        "Diagnosticos",
        "Selecciona el cliente y el vehiculo antes de guardar.",
      );
      return;
    }

    if (!form.concerns.trim()) {
      Alert.alert("Diagnosticos", "Describe al menos el motivo de ingreso.");
      return;
    }

    setSubmitting(true);

    try {
      let savedDiagnosticId = editingDiagnosticId;

      if (editingDiagnosticId) {
        await updateDiagnostic(editingDiagnosticId, form);
      } else {
        const createdDiagnostic = await createDiagnostic({
          ...form,
          openedByUid: userProfile?.uid,
        });
        savedDiagnosticId = createdDiagnostic.id;
      }

      onSaved?.(savedDiagnosticId);
    } catch (error) {
      Alert.alert(
        "Diagnosticos",
        error?.message || "No se pudo guardar el diagnostico.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Diagnosticos
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingDiagnosticId
                ? "Editar diagnostico"
                : "Registrar diagnostico"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Completa la ficha tecnica en una pantalla dedicada y vuelve a la
              lista para decidir la siguiente accion.
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
            styles.formCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Cliente
            </Text>
            <View style={styles.optionWrap}>
              {clients.slice(0, 8).map((client) => {
                const selected = form.clientId === client.id;

                return (
                  <Pressable
                    key={client.id}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        clientId: client.id,
                        vehicleId:
                          current.vehicleId &&
                          vehicles.find((item) => item.id === current.vehicleId)
                            ?.clientId === client.id
                            ? current.vehicleId
                            : "",
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
                      {client.id} · {client.fullName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Vehiculo
            </Text>
            <View style={styles.optionWrap}>
              {filteredVehicles.slice(0, 8).map((vehicle) => {
                const selected = form.vehicleId === vehicle.id;

                return (
                  <Pressable
                    key={vehicle.id}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        vehicleId: vehicle.id,
                      }))
                    }
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selected
                          ? colors.accent
                          : colors.cardMuted,
                        borderColor: selected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: selected ? colors.white : colors.text },
                      ]}
                    >
                      {vehicle.id} · {vehicle.plate}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Mecanico asignado
            </Text>
            <View style={styles.optionWrap}>
              {mechanics.length ? (
                mechanics.map((mechanic) => {
                  const selected = form.assignedMechanicUid === mechanic.uid;

                  return (
                    <Pressable
                      key={mechanic.uid}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          assignedMechanicUid: selected ? "" : mechanic.uid,
                        }))
                      }
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

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Estado
            </Text>
            <View style={styles.optionWrap}>
              {diagnosticStatusOptions.map((statusOption) => {
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
              Motivo de ingreso
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, concerns: value }))
              }
              placeholder="Sintomas, hallazgo inicial, solicitud del cliente"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              textAlignVertical="top"
              value={form.concerns}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Servicios sugeridos
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, serviceItemsText: value }))
              }
              placeholder="Una linea por servicio"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              textAlignVertical="top"
              value={form.serviceItemsText}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Repuestos detectados
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, sparePartsText: value }))
              }
              placeholder="Una linea por repuesto"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              textAlignVertical="top"
              value={form.sparePartsText}
            />
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
              placeholder="Contexto adicional para orden y aprobacion"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textArea,
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
                ? "Guardando diagnostico..."
                : editingDiagnosticId
                  ? "Guardar cambios"
                  : "Crear diagnostico"}
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
    padding: spacing.xl,
    gap: spacing.lg,
  },
  formGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: rf(12), fontWeight: "700" },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: { fontSize: rf(12), fontWeight: "700" },
  helperText: { fontSize: rf(12), lineHeight: rf(18) },
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
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryActionText: { fontSize: rf(14), fontWeight: "800" },
});
