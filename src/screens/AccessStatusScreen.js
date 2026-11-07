import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BigButton from "../components/common/BigButton";
import FormField from "../components/common/FormField";
import { getRoleLabel, USER_STATUSES } from "../constants/accessControl";
import { useTheme } from "../context/ThemeContext";

const statusContent = {
  missing: {
    title: "Perfil no disponible",
    description:
      "Tu cuenta existe, pero todavía no tiene un perfil dentro de un taller.",
    label: "Requiere revisión",
    icon: "help-circle-outline",
    tone: "warning",
  },
  [USER_STATUSES.PENDING_APPROVAL]: {
    title: "Cuenta en revisión",
    description:
      "Tu acceso ya fue creado. Falta que el taller lo apruebe para que puedas operar.",
    label: "Pendiente de aprobación",
    icon: "hourglass-outline",
    tone: "warning",
  },
  [USER_STATUSES.SUSPENDED]: {
    title: "Cuenta suspendida",
    description:
      "Tu acceso fue suspendido temporalmente. Contacta al administrador para revisarlo.",
    label: "Suspendida",
    icon: "pause-circle-outline",
    tone: "danger",
  },
  [USER_STATUSES.DISABLED]: {
    title: "Cuenta deshabilitada",
    description: "Tu acceso fue deshabilitado y no puede usar la aplicación.",
    label: "Bloqueada",
    icon: "ban-outline",
    tone: "danger",
  },
};

export default function AccessStatusScreen({
  authUser,
  onAcceptInvitation,
  onSignOut,
  pendingInvitation,
  userProfile,
}) {
  const { colors } = useTheme();
  const currentStatus = userProfile?.status || "missing";
  const content = statusContent[currentStatus] || statusContent.missing;
  const accent = colors[content.tone] || colors.warning;
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [invitationForm, setInvitationForm] = useState({
    fullName: authUser?.displayName || "",
    phone: "",
    invitationCode:
      pendingInvitation?.id || pendingInvitation?.invitationCode || "",
  });

  useEffect(() => {
    setInvitationForm({
      fullName: authUser?.displayName || "",
      phone: "",
      invitationCode:
        pendingInvitation?.id || pendingInvitation?.invitationCode || "",
    });
  }, [
    authUser?.displayName,
    pendingInvitation?.id,
    pendingInvitation?.invitationCode,
  ]);

  const setInvitationField = (key) => (value) =>
    setInvitationForm((current) => ({ ...current, [key]: value }));

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation || !onAcceptInvitation) {
      return;
    }

    if (!invitationForm.fullName.trim()) {
      return;
    }

    setAcceptingInvitation(true);

    try {
      await onAcceptInvitation(invitationForm);
    } catch (error) {
      console.error("Error accepting pending invitation:", error);
    } finally {
      setAcceptingInvitation(false);
    }
  };

  const showInvitation = currentStatus === "missing" && pendingInvitation;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              borderLeftColor: accent,
            },
          ]}
        >
          <View
            style={[styles.heroIcon, { backgroundColor: colors.cardMuted }]}
          >
            <Ionicons color={accent} name={content.icon} size={34} />
          </View>
          <View style={[styles.pill, { backgroundColor: accent }]}>
            <Text style={styles.pillText}>{content.label}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {content.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {content.description}
          </Text>
          <Text style={[styles.user, { color: colors.textTertiary }]}>
            {userProfile?.fullName || authUser?.email || "Sin perfil asignado"}
          </Text>
        </View>

        {showInvitation ? (
          <View
            style={[
              styles.invitation,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.invitationTitle, { color: colors.text }]}>
              Tienes una invitación
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Encontramos una invitación pendiente para {authUser?.email}. Al
              aceptarla se crea tu perfil con el rol asignado.
            </Text>
            <View
              style={[
                styles.roleRow,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                color={colors.primary}
                name="ribbon-outline"
                size={24}
              />
              <View style={styles.roleCopy}>
                <Text
                  style={[styles.roleLabel, { color: colors.textTertiary }]}
                >
                  Rol asignado
                </Text>
                <Text style={[styles.roleValue, { color: colors.text }]}>
                  {getRoleLabel(pendingInvitation.role, pendingInvitation.role)}
                </Text>
              </View>
            </View>

            <FormField
              label="Nombre completo"
              onChangeText={setInvitationField("fullName")}
              placeholder="Tu nombre"
              value={invitationForm.fullName}
            />
            <FormField
              keyboardType="phone-pad"
              label="Teléfono"
              onChangeText={setInvitationField("phone")}
              placeholder="0412-0000000"
              value={invitationForm.phone}
            />
            <FormField
              autoCapitalize="characters"
              label="Código de invitación"
              onChangeText={setInvitationField("invitationCode")}
              placeholder="INV-000001"
              value={invitationForm.invitationCode}
            />
            <BigButton
              icon="checkmark-circle-outline"
              label="Aceptar invitación"
              loading={acceptingInvitation}
              onPress={handleAcceptInvitation}
            />
          </View>
        ) : null}

        <BigButton
          icon="log-out-outline"
          label="Cerrar sesión"
          onPress={onSignOut}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  hero: {
    borderWidth: 1,
    borderLeftWidth: 8,
    borderRadius: 20,
    padding: 20,
    gap: 10,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  title: { fontSize: 28, fontWeight: "900" },
  description: { fontSize: 16, lineHeight: 23 },
  user: { fontSize: 14, fontWeight: "700" },
  invitation: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  invitationTitle: { fontSize: 22, fontWeight: "900" },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  roleCopy: { flex: 1 },
  roleLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  roleValue: { fontSize: 18, fontWeight: "800" },
});
