import { useEffect, useState } from "react";
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
import {
  createEmptyVehicleForm,
  createVehicle,
  updateVehicle,
} from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getVehicleId(vehicle) {
  return vehicle?.refId || vehicle?.id || null;
}

function buildVehicleForm(vehicle, clientId = "") {
  if (!vehicle) {
    return createEmptyVehicleForm(clientId);
  }

  return {
    clientId: vehicle.clientId || clientId,
    plate: vehicle.plate || "",
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    year: vehicle.year || "",
    color: vehicle.color || "",
    vin: vehicle.vin || "",
    mileage:
      vehicle.mileage === null || vehicle.mileage === undefined
        ? ""
        : String(vehicle.mileage),
    notes: vehicle.notes || "",
  };
}

export default function VehicleFormScreen({
  initialClient,
  initialVehicle,
  onBack,
  onSaved,
}) {
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(
    buildVehicleForm(
      initialVehicle,
      initialClient?.id || initialClient?.refId || "",
    ),
  );

  const editingVehicleId = getVehicleId(initialVehicle);
  const clientLabel = initialClient?.fullName || initialClient?.id || "Cliente";

  useEffect(() => {
    setForm(
      buildVehicleForm(
        initialVehicle,
        initialClient?.id || initialClient?.refId || "",
      ),
    );
  }, [initialClient, initialVehicle]);

  const handleSubmit = async () => {
    if (!form.clientId) {
      Alert.alert("Vehiculos", "Debes entrar desde la ficha de un cliente.");
      return;
    }

    if (!form.plate.trim()) {
      Alert.alert("Vehiculos", "Ingresa al menos la placa del vehiculo.");
      return;
    }

    setSubmitting(true);

    try {
      let savedVehicleId = editingVehicleId;

      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, form);
      } else {
        const createdVehicle = await createVehicle(form);
        savedVehicleId = createdVehicle.id;
      }

      onSaved?.(savedVehicleId);
    } catch (error) {
      Alert.alert(
        "Vehiculos",
        error?.message || "No se pudo guardar el vehiculo.",
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
          section="Vehiculos"
          subtitle="Registro operativo separado de la ficha del cliente para mantener una sola accion por pantalla."
          title={editingVehicleId ? "Editar vehiculo" : "Asociar vehiculo"}
        />

        <View
          style={[
            styles.clientBadge,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.clientLabel, { color: colors.textSecondary }]}>
            Cliente
          </Text>
          <Text style={[styles.clientValue, { color: colors.text }]}>
            {clientLabel}
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
          <View
            style={[styles.cardHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
                Taller
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Identificacion del vehiculo
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {editingVehicleId ? "Edicion" : "Asociacion"}
            </Text>
          </View>

          <View style={styles.formGrid}>
            <View style={[styles.formGroup, styles.fullWidth]}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Placa
              </Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, plate: value }))
                }
                placeholder="AB123CD"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.plate}
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Marca
              </Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, brand: value }))
                }
                placeholder="Toyota"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.brand}
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Modelo
              </Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, model: value }))
                }
                placeholder="Hilux"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.model}
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Ano
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, year: value }))
                }
                placeholder="2019"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.year}
              />
            </View>

            <View style={styles.formGroup}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Color
              </Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, color: value }))
                }
                placeholder="Blanco"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.color}
              />
            </View>

            <View style={[styles.formGroup, styles.fullWidth]}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                VIN
              </Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, vin: value }))
                }
                placeholder="8X1ABC12345678901"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.vin}
              />
            </View>

            <View style={[styles.formGroup, styles.fullWidth]}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Kilometraje
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, mileage: value }))
                }
                placeholder="120000"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.mileage}
              />
            </View>

            <View style={[styles.formGroup, styles.fullWidth]}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Notas del vehiculo
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, notes: value }))
                }
                placeholder="Observaciones, accesorios y condicion general"
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
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {submitting
                ? "Guardando vehiculo..."
                : editingVehicleId
                  ? "Guardar vehiculo"
                  : "Asociar vehiculo"}
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
  clientBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  clientLabel: {
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  clientValue: { fontSize: rf(16), fontWeight: "800" },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  formGroup: { width: "47%", gap: spacing.sm },
  fullWidth: { width: "100%" },
  fieldLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: rf(14),
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: rf(14),
    minHeight: rf(92),
  },
  primaryAction: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
});
