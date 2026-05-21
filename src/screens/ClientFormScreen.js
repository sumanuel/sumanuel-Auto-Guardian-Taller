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
import { createClient, updateClient } from "../services/clients/clientService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function getClientId(client) {
  return client?.refId || client?.id || null;
}

function buildClientForm(client) {
  return {
    fullName: client?.fullName || "",
    address: client?.address || "",
    phone: client?.phone || "",
    email: client?.email || "",
    notes: client?.notes || "",
  };
}

export default function ClientFormScreen({
  initialClient,
  onBack,
  onSaved,
  userProfile,
}) {
  const { colors } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(buildClientForm(initialClient));

  const editingClientId = getClientId(initialClient);

  useEffect(() => {
    setForm(buildClientForm(initialClient));
  }, [initialClient]);

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      Alert.alert("Clientes", "Ingresa al menos el nombre del cliente.");
      return;
    }

    setSubmitting(true);

    try {
      let savedClientId = editingClientId;

      if (editingClientId) {
        await updateClient(editingClientId, form);
      } else {
        const createdClient = await createClient({
          ...form,
          createdByUid: userProfile?.uid,
        });
        savedClientId = createdClient.id;
      }

      Alert.alert(
        "Clientes",
        editingClientId
          ? "El cliente fue actualizado."
          : "El cliente fue creado correctamente.",
      );
      onSaved?.(savedClientId);
    } catch (error) {
      Alert.alert(
        "Clientes",
        error?.message || "No se pudo guardar el cliente.",
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
          section="Clientes"
          subtitle="Completa la ficha de contacto en una pantalla dedicada, separada de la lista operativa."
          title={editingClientId ? "Editar cliente" : "Registrar cliente"}
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
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Nombre completo
            </Text>
            <TextInput
              onChangeText={(value) =>
                setForm((current) => ({ ...current, fullName: value }))
              }
              placeholder="Cliente principal"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={form.fullName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Telefono
            </Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={(value) =>
                setForm((current) => ({ ...current, phone: value }))
              }
              placeholder="0412-0000000"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={form.phone}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Correo
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(value) =>
                setForm((current) => ({ ...current, email: value }))
              }
              placeholder="cliente@correo.com"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={form.email}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Direccion
            </Text>
            <TextInput
              onChangeText={(value) =>
                setForm((current) => ({ ...current, address: value }))
              }
              placeholder="Sector, avenida, referencia"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={form.address}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Notas operativas
            </Text>
            <TextInput
              multiline
              numberOfLines={5}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, notes: value }))
              }
              placeholder="Preferencias, observaciones o instrucciones de atencion"
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
                ? "Guardando cliente..."
                : editingClientId
                  ? "Guardar cambios"
                  : "Crear cliente"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
  formGroup: {
    gap: spacing.sm,
  },
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
    minHeight: rf(96),
  },
  primaryAction: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
});
