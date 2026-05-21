import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { USER_ROLES } from "../constants/accessControl";
import { useTheme } from "../context/ThemeContext";
import {
  approveUserProfile,
  cancelStaffInvitation,
  createStaffInvitation,
  listPendingApprovals,
  listPendingInvitations,
  listStaffProfiles,
  updateStaffProfile,
} from "../services/admin/staffAdmin";
import { borderRadius, rf, spacing } from "../utils/responsive";

const roleLabels = {
  administrator: "Administrador",
  reception: "Recepcion",
  mechanic: "Mecanico",
};

const invitationRoleOptions = [
  USER_ROLES.MECHANIC,
  USER_ROLES.RECEPTION,
  USER_ROLES.ADMINISTRATOR,
];

function formatShortDate(value) {
  const resolvedDate = value?.toDate ? value.toDate() : value;

  if (!(resolvedDate instanceof Date) || Number.isNaN(resolvedDate.getTime())) {
    return "Sin fecha";
  }

  const day = String(resolvedDate.getDate()).padStart(2, "0");
  const month = String(resolvedDate.getMonth() + 1).padStart(2, "0");
  const year = resolvedDate.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function TeamAccessScreen({ onBack, userProfile }) {
  const { colors } = useTheme();
  const [adminRefreshing, setAdminRefreshing] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [invitationForm, setInvitationForm] = useState({
    email: "",
    role: USER_ROLES.MECHANIC,
  });

  const refreshAdminData = async () => {
    setAdminRefreshing(true);

    try {
      const [nextInvitations, nextApprovals, nextStaffProfiles] = await Promise.all([
        listPendingInvitations(),
        listPendingApprovals(),
        listStaffProfiles(),
      ]);
      setPendingInvitations(nextInvitations);
      setPendingApprovals(nextApprovals);
      setStaffProfiles(nextStaffProfiles);
    } catch (error) {
      Alert.alert(
        "Equipo y accesos",
        "No se pudo actualizar la informacion administrativa.",
      );
    } finally {
      setAdminRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAdminData();
  }, []);

  const handleCreateInvitation = async () => {
    const trimmedEmail = invitationForm.email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert("Invitaciones", "Ingresa el correo del colaborador.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      Alert.alert("Invitaciones", "Ingresa un correo valido.");
      return;
    }

    setAdminSubmitting(true);

    try {
      const createdInvitation = await createStaffInvitation({
        email: trimmedEmail,
        role: invitationForm.role,
        invitedByUid: userProfile?.uid,
      });

      setInvitationForm((current) => ({
        ...current,
        email: "",
      }));
      await refreshAdminData();

      Alert.alert(
        "Invitacion enviada",
        `El codigo ${createdInvitation.id} quedo emitido y el correo fue encolado en Firebase.`,
      );
    } catch (error) {
      Alert.alert(
        "Invitaciones",
        error?.message || "No se pudo emitir la invitacion.",
      );
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitation) => {
    try {
      await cancelStaffInvitation(invitation.refId || invitation.id);
      await refreshAdminData();
      Alert.alert("Invitaciones", "La invitacion fue cancelada.");
    } catch (error) {
      Alert.alert(
        "Invitaciones",
        error?.message || "No se pudo cancelar la invitacion.",
      );
    }
  };

  const handleApproveProfile = async (profile) => {
    try {
      await approveUserProfile(profile.uid);
      await refreshAdminData();
      Alert.alert(
        "Aprobaciones",
        `${profile.fullName || profile.email || "El usuario"} ya quedo activo.`,
      );
    } catch (error) {
      Alert.alert(
        "Aprobaciones",
        error?.message || "No se pudo aprobar el usuario.",
      );
    }
  };

  const handleQuickRoleChange = async (profile, role) => {
    try {
      await updateStaffProfile(profile.uid, { role });
      await refreshAdminData();
      Alert.alert("Equipo", `Rol actualizado a ${roleLabels[role] || role}.`);
    } catch (error) {
      Alert.alert(
        "Equipo",
        error?.message || "No se pudo actualizar el rol.",
      );
    }
  };

  const handleToggleStatus = async (profile) => {
    const nextStatus = profile.status === "active" ? "suspended" : "active";

    try {
      await updateStaffProfile(profile.uid, { status: nextStatus });
      await refreshAdminData();
      Alert.alert(
        "Equipo",
        nextStatus === "active"
          ? "El usuario fue reactivado."
          : "El usuario fue suspendido.",
      );
    } catch (error) {
      Alert.alert(
        "Equipo",
        error?.message || "No se pudo actualizar el estado del usuario.",
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Equipo
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Accesos e invitaciones
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Control administrativo del equipo tecnico, aprobaciones internas y
              envios de invitacion.
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
            styles.panel,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <View style={styles.panelCopy}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                Nueva invitacion
              </Text>
              <Text style={[styles.panelText, { color: colors.textSecondary }]}>
                Cada invitacion genera un codigo consecutivo y encola un correo
                en Firebase Trigger Email.
              </Text>
            </View>

            <Pressable
              onPress={refreshAdminData}
              style={[
                styles.refreshButton,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.overlay,
                },
              ]}
            >
              <Text style={[styles.refreshButtonText, { color: colors.white }]}>
                Actualizar
              </Text>
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Correo del colaborador
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(value) =>
                setInvitationForm((current) => ({
                  ...current,
                  email: value,
                }))
              }
              placeholder="tecnico@taller.com"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={invitationForm.email}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Rol operativo
            </Text>
            <View style={styles.roleOptionRow}>
              {invitationRoleOptions.map((role) => {
                const selected = invitationForm.role === role;

                return (
                  <Pressable
                    key={role}
                    onPress={() =>
                      setInvitationForm((current) => ({
                        ...current,
                        role,
                      }))
                    }
                    style={[
                      styles.roleOption,
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
                        styles.roleOptionText,
                        { color: selected ? colors.white : colors.text },
                      ]}
                    >
                      {roleLabels[role] || role}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={handleCreateInvitation}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {adminSubmitting
                ? "Encolando correo..."
                : "Emitir y enviar invitacion"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.listGrid}>
          <View
            style={[
              styles.listCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text }]}>
                Invitaciones pendientes
              </Text>
              <Text style={[styles.counterText, { color: colors.primary }]}>
                {pendingInvitations.length}
              </Text>
            </View>

            {adminRefreshing ? (
              <ActivityIndicator color={colors.primary} />
            ) : pendingInvitations.length ? (
              <View style={styles.listBody}>
                {pendingInvitations.map((invitation) => (
                  <View
                    key={invitation.refId || invitation.id}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.listCopy}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {invitation.email}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {invitation.id || invitation.refId} ·{" "}
                        {roleLabels[invitation.role] || invitation.role}
                      </Text>
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        Vence {formatShortDate(invitation.expiresAt)} · Entrega{" "}
                        {invitation.deliveryStatus || "sin estado"}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleCancelInvitation(invitation)}
                      style={[
                        styles.secondaryAction,
                        {
                          borderColor: colors.borderStrong,
                          backgroundColor: colors.overlay,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryActionText,
                          { color: colors.white },
                        ]}
                      >
                        Cancelar
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                No hay invitaciones abiertas. Emite la primera para sumar
                personal al taller.
              </Text>
            )}
          </View>

          <View
            style={[
              styles.listCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text }]}>
                Aprobaciones internas
              </Text>
              <Text style={[styles.counterText, { color: colors.warning }]}>
                {pendingApprovals.length}
              </Text>
            </View>

            {adminRefreshing ? (
              <ActivityIndicator color={colors.primary} />
            ) : pendingApprovals.length ? (
              <View style={styles.listBody}>
                {pendingApprovals.map((profile) => (
                  <View
                    key={profile.uid}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.listCopy}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {profile.fullName || "Usuario sin nombre"}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {profile.email} ·{" "}
                        {roleLabels[profile.role] || profile.role}
                      </Text>
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        Codigo {profile.userCode || "Sin consecutivo"}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleApproveProfile(profile)}
                      style={[
                        styles.approveAction,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.cardBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.approveActionText,
                          { color: colors.primary },
                        ]}
                      >
                        Aprobar
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                No hay usuarios pendientes de aprobacion interna.
              </Text>
            )}
          </View>

          <View
            style={[
              styles.listCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text }]}>
                Personal tecnico
              </Text>
              <Text style={[styles.counterText, { color: colors.accent }]}>
                {staffProfiles.length}
              </Text>
            </View>

            {adminRefreshing ? (
              <ActivityIndicator color={colors.primary} />
            ) : staffProfiles.length ? (
              <View style={styles.listBody}>
                {staffProfiles.map((profile) => (
                  <View
                    key={profile.uid}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.listCopy}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {profile.fullName || "Usuario sin nombre"}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                        {profile.userCode || "Sin codigo"} · {profile.email}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                        {roleLabels[profile.role] || profile.role} · Estado {profile.status || "sin estado"}
                      </Text>
                    </View>

                    <View style={styles.staffActions}>
                      <View style={styles.roleOptionRow}>
                        {invitationRoleOptions.map((role) => {
                          const selected = profile.role === role;

                          return (
                            <Pressable
                              key={`${profile.uid}-${role}`}
                              onPress={() => handleQuickRoleChange(profile, role)}
                              style={[
                                styles.roleOption,
                                {
                                  backgroundColor: selected
                                    ? colors.primary
                                    : colors.cardBackground,
                                  borderColor: selected
                                    ? colors.primary
                                    : colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roleOptionText,
                                  {
                                    color: selected ? colors.white : colors.text,
                                  },
                                ]}
                              >
                                {roleLabels[role] || role}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Pressable
                        onPress={() => handleToggleStatus(profile)}
                        style={[
                          styles.approveAction,
                          {
                            borderColor:
                              profile.status === "active"
                                ? colors.warning
                                : colors.success,
                            backgroundColor: colors.cardBackground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.approveActionText,
                            {
                              color:
                                profile.status === "active"
                                  ? colors.warning
                                  : colors.success,
                            },
                          ]}
                        >
                          {profile.status === "active" ? "Suspender" : "Reactivar"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}> 
                No hay personal tecnico registrado todavia.
              </Text>
            )}
          </View>
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
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: rf(28),
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  backButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  panelCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  panelTitle: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  panelText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  refreshButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  refreshButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  formGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
  },
  roleOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  roleOption: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  roleOptionText: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  primaryAction: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  listGrid: {
    gap: spacing.md,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  listTitle: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  counterText: {
    fontSize: rf(18),
    fontWeight: "900",
  },
  listBody: {
    gap: spacing.sm,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  listCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  staffActions: {
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  rowTitle: {
    fontSize: rf(15),
    fontWeight: "700",
  },
  rowMeta: {
    fontSize: rf(12),
    lineHeight: rf(18),
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  approveAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  approveActionText: {
    fontSize: rf(12),
    fontWeight: "800",
  },
  emptyStateText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
});
