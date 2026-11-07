import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, View } from "react-native";
import FormField from "../components/common/FormField";
import FormScreen from "../components/common/FormScreen";
import { useTheme } from "../context/ThemeContext";
import {
  createEmptyVehicleForm,
  createVehicle,
  updateVehicle,
} from "../services/vehicles/vehicleService";
import { TOUCH } from "../utils/touch";

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
  const setField = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

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
      Alert.alert("Vehículos", "Debes entrar desde la ficha de un cliente.");
      return;
    }

    if (!form.plate.trim()) {
      Alert.alert("Vehículos", "Ingresa al menos la placa del vehículo.");
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
        "Vehículos",
        error?.message || "No se pudo guardar el vehículo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      actionLabel={
        submitting
          ? "Guardando vehículo..."
          : editingVehicleId
            ? "Guardar vehículo"
            : "Asociar vehículo"
      }
      onBack={onBack}
      onSubmit={handleSubmit}
      section="Vehículos"
      submitting={submitting}
      subtitle="La placa es lo único obligatorio."
      title={editingVehicleId ? "Editar vehículo" : "Asociar vehículo"}
    >
      <View
        style={[
          styles.owner,
          {
            backgroundColor: colors.cardMuted,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons color={colors.primary} name="person-outline" size={24} />
        <View style={styles.ownerCopy}>
          <Text style={[styles.ownerLabel, { color: colors.textTertiary }]}>
            Cliente
          </Text>
          <Text style={[styles.ownerValue, { color: colors.text }]}>
            {clientLabel}
          </Text>
        </View>
      </View>

      <FormField
        autoCapitalize="characters"
        label="Placa"
        onChangeText={setField("plate")}
        placeholder="AB123CD"
        style={styles.plateInput}
        value={form.plate}
      />
      <FormField
        label="Marca"
        onChangeText={setField("brand")}
        placeholder="Toyota"
        value={form.brand}
      />
      <FormField
        label="Modelo"
        onChangeText={setField("model")}
        placeholder="Hilux"
        value={form.model}
      />
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <FormField
            keyboardType="number-pad"
            label="Año"
            onChangeText={setField("year")}
            placeholder="2019"
            value={String(form.year ?? "")}
          />
        </View>
        <View style={styles.pairItem}>
          <FormField
            label="Color"
            onChangeText={setField("color")}
            placeholder="Blanco"
            value={form.color}
          />
        </View>
      </View>
      <FormField
        keyboardType="number-pad"
        label="Kilometraje"
        onChangeText={setField("mileage")}
        placeholder="120000"
        value={form.mileage}
      />
      <FormField
        autoCapitalize="characters"
        label="VIN"
        onChangeText={setField("vin")}
        placeholder="8X1ABC12345678901"
        value={form.vin}
      />
      <FormField
        label="Notas del vehículo"
        multiline
        onChangeText={setField("notes")}
        placeholder="Observaciones, accesorios y condición general"
        value={form.notes}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  owner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownerCopy: { flex: 1 },
  ownerLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  ownerValue: { fontSize: 18, fontWeight: "800" },
  plateInput: { fontSize: 26, fontWeight: "900", letterSpacing: 2 },
  pair: { flexDirection: "row", gap: 12 },
  pairItem: { flex: 1 },
});
