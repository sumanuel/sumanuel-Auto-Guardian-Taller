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
import { listClients } from "../services/clients/clientService";
import {
  createDiagnostic,
  createEmptyDiagnosticForm,
  diagnosticStatusOptions,
  isDiagnosticClosed,
  updateDiagnostic,
} from "../services/diagnostics/diagnosticService";
import { createDiagnosticQuotePdf } from "../services/diagnostics/diagnosticQuotePdfService";
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
  const isClosedDiagnostic = isDiagnosticClosed(initialDiagnostic?.status);
  const seededFromClientDetail = Boolean(
    initialDraft?.clientId && initialDraft?.vehicleId,
  );
  const editableStatusOptions = diagnosticStatusOptions.filter(
    (statusOption) => statusOption.key !== "closed",
  );

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

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clientId),
    [clients, form.clientId],
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === form.vehicleId),
    [form.vehicleId, vehicles],
  );

  const handleSubmit = async () => {
    if (isClosedDiagnostic) {
      Alert.alert(
        "Diagnosticos",
        "Este diagnostico ya esta cerrado y no se puede editar.",
      );
      return;
    }

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

      let quoteGenerationError = "";

      if (form.status === "quoted") {
        try {
          const assignedMechanic = mechanics.find(
            (mechanic) => mechanic.uid === form.assignedMechanicUid,
          );

          await createDiagnosticQuotePdf({
            diagnosticId: savedDiagnosticId,
            diagnostic: {
              ...initialDiagnostic,
              ...form,
              id: savedDiagnosticId,
              serviceItems: String(form.serviceItemsText || "")
                .split(/\n|,/)
                .map((item) => item.trim())
                .filter(Boolean),
              spareParts: String(form.sparePartsText || "")
                .split(/\n|,/)
                .map((item) => item.trim())
                .filter(Boolean),
            },
            client: selectedClient,
            vehicle: selectedVehicle,
            workshopProfile: {
              ...userProfile,
              assignedMechanicName:
                assignedMechanic?.fullName ||
                assignedMechanic?.email ||
                assignedMechanic?.userCode ||
                "Sin asignar",
            },
          });
        } catch (quoteError) {
          quoteGenerationError =
            quoteError?.message || "no se pudo generar el PDF de cotizacion.";
        }
      }

      if (quoteGenerationError) {
        Alert.alert(
          "Diagnosticos",
          `El diagnostico se guardo, pero ${quoteGenerationError}`,
        );
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
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section="Diagnosticos"
          subtitle="Completa la ficha tecnica en una pantalla dedicada y vuelve a la lista para decidir la siguiente accion."
          title={
            editingDiagnosticId ? "Editar diagnostico" : "Registrar diagnostico"
          }
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
                Taller
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Apertura tecnica
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {editingDiagnosticId ? "Revision" : "Ingreso"}
            </Text>
          </View>

          {seededFromClientDetail ? (
            <View style={styles.selectionSummary}>
              <Text
                style={[styles.selectionLine, { color: colors.textSecondary }]}
              >
                <Text
                  style={[styles.selectionLineLabel, { color: colors.text }]}
                >
                  Cliente:
                </Text>{" "}
                {selectedClient?.fullName || form.clientId || "Sin cliente"}
              </Text>

              <Text
                style={[styles.vehicleSummaryLabel, { color: colors.accent }]}
              >
                vehiculo:
              </Text>
              <View
                style={[
                  styles.seededVehicleCard,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.selectionValue, { color: colors.text }]}>
                  {[
                    selectedVehicle?.brand,
                    selectedVehicle?.model,
                    selectedVehicle?.year,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                    selectedVehicle?.plate ||
                    form.vehicleId ||
                    "Sin vehiculo"}
                </Text>
                <View
                  style={[
                    styles.seededVehicleDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.selectionMeta,
                    { color: colors.textSecondary },
                  ]}
                >
                  <Text
                    style={[styles.selectionMetaLabel, { color: colors.text }]}
                  >
                    Placa:
                  </Text>{" "}
                  {selectedVehicle?.plate || "Sin placa"}
                </Text>
                <Text
                  style={[
                    styles.selectionMeta,
                    { color: colors.textSecondary },
                  ]}
                >
                  <Text
                    style={[styles.selectionMetaLabel, { color: colors.text }]}
                  >
                    Kilometraje:
                  </Text>{" "}
                  {selectedVehicle?.mileage
                    ? `${selectedVehicle.mileage} km`
                    : "Sin kilometraje"}
                </Text>
              </View>
            </View>
          ) : (
            <>
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
                              vehicles.find(
                                (item) => item.id === current.vehicleId,
                              )?.clientId === client.id
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
                            borderColor: selected
                              ? colors.primary
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
                            borderColor: selected
                              ? colors.accent
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
                          {vehicle.id} · {vehicle.plate}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}

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
              {editableStatusOptions.map((statusOption) => {
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

          {isClosedDiagnostic ? (
            <Text style={[styles.closedNote, { color: colors.textSecondary }]}>
              Este diagnostico ya fue cerrado al crear su orden y queda solo en
              consulta.
            </Text>
          ) : null}

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
            disabled={isClosedDiagnostic || submitting}
            onPress={handleSubmit}
            style={[
              styles.primaryAction,
              {
                backgroundColor: isClosedDiagnostic
                  ? colors.cardMuted
                  : colors.primary,
              },
            ]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {isClosedDiagnostic
                ? "Diagnostico cerrado"
                : submitting
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
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  optionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionText: { fontSize: rf(13), fontWeight: "700" },
  helperText: { fontSize: rf(14), lineHeight: rf(20) },
  selectionSummary: { gap: spacing.xs },
  selectionLine: { fontSize: rf(14), lineHeight: rf(21) },
  selectionLineLabel: { fontSize: rf(14), fontWeight: "800" },
  vehicleSummaryLabel: {
    fontSize: rf(13),
    fontWeight: "900",
    lineHeight: rf(19),
    textTransform: "none",
  },
  seededVehicleCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  seededVehicleDivider: {
    height: 1,
    width: "100%",
    borderRadius: borderRadius.pill,
  },
  selectionValue: { fontSize: rf(15), fontWeight: "800" },
  selectionMeta: { fontSize: rf(13), lineHeight: rf(19) },
  selectionMetaLabel: { fontSize: rf(13), fontWeight: "800" },
  closedNote: { fontSize: rf(13), lineHeight: rf(19) },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: rf(88),
    fontSize: rf(15),
  },
  primaryAction: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryActionText: { fontSize: rf(15), fontWeight: "800" },
});
