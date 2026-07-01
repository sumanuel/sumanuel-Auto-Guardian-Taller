import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  createWorkshop,
  upsertWorkshopMembership,
} from "../services/workshops/workshopService";
import { borderRadius, rf, spacing } from "../utils/responsive";

export default function WorkshopSetupScreen({ onSaved, userProfile }) {
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [rif, setRif] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Taller", "Ingresa el nombre del taller.");
      return;
    }

    setSubmitting(true);
    try {
      const workshop = await createWorkshop({
        name: name.trim(),
        ownerUserUid: userProfile?.uid,
        phone: phone.trim(),
        email: userProfile?.email || "",
        address: address.trim(),
        rif: rif.trim(),
      });

      await upsertWorkshopMembership({
        workshopId: workshop.id,
        userUid: userProfile?.uid,
        role: "owner",
        status: "active",
        invitedByUid: userProfile?.uid,
      });

      onSaved?.();
    } catch (error) {
      Alert.alert("Taller", error?.message || "No se pudo guardar la informacion del taller.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <WorkshopScreenHeader
            section="Configuracion inicial"
            subtitle="Define los datos de tu taller para que el equipo y los clientes lo identifiquen correctamente."
            title="Datos del taller"
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
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Nombre del taller *
              </Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Ej: Taller Mecanico Central"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={name}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Telefono
              </Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="Ej: 0412-1234567"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={phone}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Direccion
              </Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                onChangeText={setAddress}
                placeholder="Ej: Av. Principal, Local 5"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={address}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                RIF
              </Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setRif}
                placeholder="Ej: J-12345678-9"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={rif}
              />
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.primary}
              name="information-circle-outline"
              size={rf(20)}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Puedes completar o editar estos datos mas tarde desde la seccion
              de configuracion del taller.
            </Text>
          </View>

          {submitting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => onSaved?.()}
                style={[
                  styles.secondaryAction,
                  {
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
                  Ahora no
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
              >
                <Ionicons color={colors.white} name="save-outline" size={rf(18)} />
                <Text style={styles.primaryActionText}>
                  Configurar taller
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: rf(13),
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
    fontWeight: "600",
  },
  textArea: {
    minHeight: rf(80),
    textAlignVertical: "top",
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: rf(13),
    lineHeight: rf(18),
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: rf(50),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  primaryAction: {
    flex: 2,
    borderRadius: borderRadius.lg,
    minHeight: rf(50),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: rf(14),
    fontWeight: "900",
  },
});