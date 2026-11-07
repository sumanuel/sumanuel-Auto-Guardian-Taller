import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import BigButton from "../components/common/BigButton";
import FormField from "../components/common/FormField";
import FormScreen from "../components/common/FormScreen";
import { USER_ROLES } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  createWorkshop,
  upsertWorkshopMembership,
} from "../services/workshops/workshopService";
import { TOUCH } from "../utils/touch";

export default function WorkshopSetupScreen({ onSaved, userProfile }) {
  const { colors } = useTheme();
  const { refreshWorkshopContext } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [rif, setRif] = useState("");

  const ensureWorkshop = async (workshopName) => {
    const workshop = await createWorkshop({
      name: workshopName,
      ownerUserUid: userProfile?.uid,
      phone: phone.trim(),
      email: userProfile?.email || "",
      address: address.trim(),
      rif: rif.trim(),
    });

    await upsertWorkshopMembership({
      workshopId: workshop.id,
      userUid: userProfile?.uid,
      role: USER_ROLES.OWNER,
      status: "active",
      invitedByUid: userProfile?.uid,
    });

    return workshop;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Taller", "Ingresa el nombre del taller.");
      return;
    }

    setSubmitting(true);
    try {
      await ensureWorkshop(name.trim());
      await refreshWorkshopContext();
      onSaved?.();
    } catch (error) {
      Alert.alert(
        "Taller",
        error?.message || "No se pudo guardar la información del taller.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      const defaultName = userProfile?.fullName
        ? `Taller de ${userProfile.fullName}`
        : "Mi taller";
      await ensureWorkshop(defaultName);
      await refreshWorkshopContext();
      onSaved?.();
    } catch (error) {
      Alert.alert(
        "Taller",
        error?.message || "No se pudo configurar el taller.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      actionIcon="checkmark-circle-outline"
      actionLabel="Crear taller"
      edges={["left", "right", "bottom"]}
      onSubmit={handleSave}
      section="Configuración inicial"
      submitting={submitting}
      subtitle="Así te identifican tu equipo y tus clientes."
      title="Datos del taller"
    >
      <FormField
        autoCapitalize="words"
        label="Nombre del taller"
        onChangeText={setName}
        placeholder="Ej: Taller Mecánico Central"
        value={name}
      />
      <FormField
        keyboardType="phone-pad"
        label="Teléfono"
        onChangeText={setPhone}
        placeholder="Ej: 0412-1234567"
        value={phone}
      />
      <FormField
        autoCapitalize="sentences"
        label="Dirección"
        multiline
        onChangeText={setAddress}
        placeholder="Ej: Av. Principal, Local 5"
        value={address}
      />
      <FormField
        autoCapitalize="characters"
        label="RIF"
        onChangeText={setRif}
        placeholder="Ej: J-12345678-9"
        value={rif}
      />

      <View
        style={[
          styles.info,
          { backgroundColor: colors.cardMuted, borderColor: colors.border },
        ]}
      >
        <Ionicons
          color={colors.primary}
          name="information-circle-outline"
          size={24}
        />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Solo el nombre es obligatorio. Puedes completar el resto más tarde
          desde la configuración del taller.
        </Text>
      </View>

      <BigButton
        disabled={submitting}
        label="Omitir por ahora"
        onPress={handleSkip}
        variant="secondary"
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
