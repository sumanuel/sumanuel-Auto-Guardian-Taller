import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BigButton from "../components/common/BigButton";
import BigChip from "../components/common/BigChip";
import DetailHero from "../components/common/DetailHero";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { hasPermission, isMechanicRole } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
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
import { getDiagnosticTone } from "../utils/statusTone";
import { TOUCH } from "../utils/touch";

function getDiagnosticId(diagnostic) {
  return diagnostic?.refId || diagnostic?.id || null;
}

const FIELD_HELP_TEXT = {
  concerns: "Síntomas, hallazgo inicial o solicitud exacta del cliente.",
  serviceItemsText: "Una línea por servicio para ordenar la cotización.",
  sparePartsText: "Una línea por repuesto previsto o detectado.",
  quoteCost: "Costo estimado total para apoyar la cotización.",
};

export default function DiagnosticFormScreen({
  initialDiagnostic,
  initialDraft,
  onBack,
  onSaved,
  currentRole,
  userProfile,
}) {
  const { colors } = useTheme();
  const { activeWorkshop } = useAuth();
  const isMechanicUser = isMechanicRole(currentRole);
  const canManageDiagnostics = hasPermission(currentRole, "diagnostics.manage");
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
  const shouldLockVehicleContext = Boolean(
    editingDiagnosticId || seededFromClientDetail,
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
    if (!isMechanicUser || !userProfile?.uid) {
      return;
    }

    setForm((current) => ({
      ...current,
      assignedMechanicUid: userProfile.uid,
    }));
  }, [isMechanicUser, userProfile?.uid]);

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
          "Diagnósticos",
          "No se pudieron cargar clientes, vehículos y mecánicos de apoyo.",
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

  const shouldRenderSelectionSummary = Boolean(
    selectedClient || selectedVehicle,
  );

  const handleSubmit = async () => {
    if (isClosedDiagnostic) {
      Alert.alert(
        "Diagnósticos",
        "Este diagnóstico ya está cerrado y no se puede editar.",
      );
      return;
    }

    if (!form.clientId.trim() || !form.vehicleId.trim()) {
      Alert.alert(
        "Diagnósticos",
        "Selecciona el cliente y el vehículo antes de guardar.",
      );
      return;
    }

    if (!form.concerns.trim()) {
      Alert.alert("Diagnósticos", "Describe al menos el motivo de ingreso.");
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
              quoteCost: form.quoteCost,
            },
            client: selectedClient,
            vehicle: selectedVehicle,
            workshopProfile: {
              ...activeWorkshop,
              ...userProfile,
              workshopName:
                activeWorkshop?.name ||
                userProfile?.workshopName ||
                "Auto-Guardian Taller",
              assignedMechanicName:
                assignedMechanic?.fullName ||
                assignedMechanic?.email ||
                assignedMechanic?.userCode ||
                "Sin asignar",
            },
          });
        } catch (quoteError) {
          quoteGenerationError =
            quoteError?.message || "no se pudo generar el PDF de cotización.";
        }
      }

      if (quoteGenerationError) {
        Alert.alert(
          "Diagnósticos",
          `El diagnóstico se guardó, pero ${quoteGenerationError}`,
        );
      }

      onSaved?.(savedDiagnosticId);
    } catch (error) {
      Alert.alert(
        "Diagnósticos",
        error?.message || "No se pudo guardar el diagnóstico.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel =
    diagnosticStatusOptions.find((item) => item.key === form.status)?.label ||
    "Sin estado";
  const statusTone = getDiagnosticTone(form.status, colors);
  const vehicleTitle = [
    selectedVehicle?.brand,
    selectedVehicle?.model,
    selectedVehicle?.year,
  ]
    .filter(Boolean)
    .join(" ");
  const submitLabel = isClosedDiagnostic
    ? "Diagnóstico cerrado"
    : submitting
      ? "Guardando diagnóstico..."
      : editingDiagnosticId
        ? "Guardar cambios"
        : "Crear diagnóstico";

  const setField = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const inputBase = {
    backgroundColor: colors.inputBackground,
    borderColor: colors.borderStrong,
    color: colors.text,
  };

  const renderTextField = (label, hint, key, props = {}) => (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.text }]}>{label}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {hint}
        </Text>
      ) : null}
      <TextInput
        editable={!isClosedDiagnostic}
        onChangeText={setField(key)}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, props.multiline && styles.textArea, inputBase]}
        textAlignVertical={props.multiline ? "top" : "center"}
        value={form[key]}
        {...props}
      />
    </View>
  );

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section="Diagnósticos"
          subtitle={
            editingDiagnosticId
              ? "Actualiza la ficha técnica y el estado."
              : "Registra el motivo de ingreso y la cotización."
          }
          title={
            editingDiagnosticId ? "Editar diagnóstico" : "Registrar diagnóstico"
          }
        />

        {shouldRenderSelectionSummary ? (
          <DetailHero
            code={editingDiagnosticId || "Nuevo"}
            facts={[
              {
                label: "Cliente",
                value:
                  selectedClient?.fullName || form.clientId || "Sin cliente",
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
            title={vehicleTitle}
            tone={statusTone}
          />
        ) : null}

        {!shouldLockVehicleContext ? (
          <>
            <View style={styles.group}>
              <Text style={[styles.groupLabel, { color: colors.text }]}>
                Cliente
              </Text>
              <View style={styles.optionWrap}>
                {clients.slice(0, 8).map((client) => (
                  <BigChip
                    key={client.id}
                    label={`${client.id} · ${client.fullName}`}
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
                    selected={form.clientId === client.id}
                    style={styles.optionChip}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={[styles.groupLabel, { color: colors.text }]}>
                Vehículo
              </Text>
              {!filteredVehicles.length ? (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Este cliente no tiene vehículos. Regístralo desde Clientes.
                </Text>
              ) : null}
              <View style={styles.optionWrap}>
                {filteredVehicles.slice(0, 8).map((vehicle) => (
                  <BigChip
                    key={vehicle.id}
                    label={[
                      vehicle.plate,
                      [vehicle.brand, vehicle.model].filter(Boolean).join(" "),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        vehicleId: vehicle.id,
                      }))
                    }
                    selected={form.vehicleId === vehicle.id}
                    style={styles.optionChip}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.text }]}>
            Estado
          </Text>
          <View style={styles.statusGrid}>
            {editableStatusOptions.map((statusOption) => (
              <BigChip
                color={getDiagnosticTone(statusOption.key, colors)}
                disabled={isClosedDiagnostic}
                key={statusOption.key}
                label={statusOption.label}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    status: statusOption.key,
                  }))
                }
                selected={form.status === statusOption.key}
                style={styles.statusChip}
              />
            ))}
          </View>
          {form.status === "quoted" ? (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Al guardar como Cotizado se genera el PDF de la cotización.
            </Text>
          ) : null}
        </View>

        <View style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.text }]}>
            Mecánico asignado
          </Text>
          {canManageDiagnostics ? (
            mechanics.length ? (
              <View style={styles.optionWrap}>
                {mechanics.map((mechanic) => {
                  const selected = form.assignedMechanicUid === mechanic.uid;

                  return (
                    <BigChip
                      key={mechanic.uid}
                      label={
                        mechanic.fullName || mechanic.email || mechanic.userCode
                      }
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          assignedMechanicUid: selected ? "" : mechanic.uid,
                        }))
                      }
                      selected={selected}
                      style={styles.optionChip}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                No hay mecánicos disponibles para asignar.
              </Text>
            )
          ) : (
            <View
              style={[
                styles.selfRow,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                color={colors.primary}
                name="construct-outline"
                size={24}
              />
              <Text style={[styles.selfText, { color: colors.text }]}>
                Este diagnóstico queda asignado a ti.
              </Text>
            </View>
          )}
        </View>

        {isClosedDiagnostic ? (
          <Text style={[styles.closedNote, { color: colors.textSecondary }]}>
            Este diagnóstico ya fue cerrado al crear su orden y queda solo en
            consulta.
          </Text>
        ) : null}

        {renderTextField(
          "Motivo de ingreso",
          FIELD_HELP_TEXT.concerns,
          "concerns",
          {
            multiline: true,
            placeholder: "Síntomas, hallazgo inicial, solicitud del cliente",
          },
        )}
        {renderTextField(
          "Servicios sugeridos",
          FIELD_HELP_TEXT.serviceItemsText,
          "serviceItemsText",
          { multiline: true, placeholder: "Una línea por servicio" },
        )}
        {renderTextField(
          "Repuestos detectados",
          FIELD_HELP_TEXT.sparePartsText,
          "sparePartsText",
          { multiline: true, placeholder: "Una línea por repuesto" },
        )}
        {renderTextField(
          "Costo estimado",
          FIELD_HELP_TEXT.quoteCost,
          "quoteCost",
          { keyboardType: "decimal-pad", placeholder: "0.00" },
        )}
        {renderTextField("Notas", null, "notes", {
          multiline: true,
          placeholder: "Contexto adicional para orden y aprobación",
        })}
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
          },
        ]}
      >
        <BigButton
          disabled={isClosedDiagnostic}
          haptic="medium"
          icon={isClosedDiagnostic ? "lock-closed-outline" : "save-outline"}
          label={submitLabel}
          loading={submitting}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  group: { gap: spacing.sm },
  groupLabel: { fontSize: rf(18), fontWeight: "800" },
  hint: { fontSize: rf(14), lineHeight: rf(20) },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: TOUCH.gap },
  optionChip: { flexGrow: 1 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: TOUCH.gap },
  statusChip: { flexBasis: "47%", flexGrow: 1 },
  selfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 16,
  },
  selfText: { flex: 1, fontSize: TOUCH.fontLabel, fontWeight: "700" },
  closedNote: { fontSize: rf(14), lineHeight: rf(20) },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(17),
    minHeight: 56,
  },
  textArea: { minHeight: 120 },
  actionBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
});
