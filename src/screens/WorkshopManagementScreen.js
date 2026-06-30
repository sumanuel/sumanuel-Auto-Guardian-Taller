import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { isMechanicRole } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const roleLabels = {
  owner: "Propietario",
  administrator: "Administrador",
  reception: "Recepcion",
  mechanic: "Mecanico",
};

export default function WorkshopManagementScreen({ onBack }) {
  const { colors } = useTheme();
  const {
    activeWorkshopId,
    activeWorkshop,
    memberships,
    switchWorkshop,
  } = useAuth();
  const [switchingId, setSwitchingId] = useState(null);

  const handleSwitchWorkshop = async (workshopId) => {
    if (workshopId === activeWorkshopId) {
      return;
    }

    setSwitchingId(workshopId);
    try {
      await switchWorkshop(workshopId);
    } catch (error) {
      Alert.alert(
        "Talleres",
        error?.message || "No se pudo cambiar al taller seleccionado.",
      );
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          onBack={onBack}
          section="Gestion de talleres"
          subtitle={
            memberships.length > 1
              ? "Tienes acceso a varios talleres. Selecciona el que quieras usar como contexto activo."
              : "Este es el taller al que perteneces actualmente."
          }
          title="Mis talleres"
        />

        <View style={styles.listWrap}>
          {memberships.map((membership) => {
            const isActive = membership.workshopId === activeWorkshopId;
            const isSwitching = switchingId === membership.workshopId;
            const workshopName =
              membership.workshopName || "Taller sin nombre";
            const roleLabel =
              roleLabels[membership.role] || membership.role || "Sin rol";

            return (
              <Pressable
                key={membership.workshopId}
                onPress={() => handleSwitchWorkshop(membership.workshopId)}
                disabled={isActive || switchingId !== null}
                style={[
                  styles.workshopRow,
                  {
                    backgroundColor: isActive
                      ? colors.cardBackground
                      : colors.cardMuted,
                    borderColor: isActive ? colors.primary : colors.border,
                    opacity: isSwitching ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.cardBackground,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    color={isActive ? colors.white : colors.textTertiary}
                    name="construct-outline"
                    size={rf(20)}
                  />
                </View>

                <View style={styles.workshopCopy}>
                  <View style={styles.workshopTopRow}>
                    <Text
                      style={[styles.workshopName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {workshopName}
                    </Text>
                    {isActive ? (
                      <View
                        style={[
                          styles.activeBadge,
                          {
                            backgroundColor: colors.primary,
                          },
                        ]}
                      >
                        <Text style={styles.activeBadgeText}>Activo</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.workshopRole,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {roleLabel}
                  </Text>
                </View>

                {isSwitching ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : !isActive ? (
                  <Pressable
                    onPress={() => handleSwitchWorkshop(membership.workshopId)}
                    style={[
                      styles.enterButton,
                      {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.enterButtonText}>Entrar</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {memberships.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.textTertiary}
              name="business-outline"
              size={rf(32)}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sin talleres
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              No perteneces a ningun taller aun. Si recibiste una invitacion,
              revisa tu correo o contacta al administrador.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  listWrap: {
    gap: spacing.sm,
  },
  workshopRow: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: rf(48),
    height: rf(48),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  workshopCopy: {
    flex: 1,
    gap: 2,
  },
  workshopTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  workshopName: {
    fontSize: rf(16),
    fontWeight: "800",
    flex: 1,
  },
  workshopRole: {
    fontSize: rf(13),
    fontWeight: "600",
  },
  activeBadge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: {
    color: "#ffffff",
    fontSize: rf(10),
    fontWeight: "800",
  },
  enterButton: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  enterButtonText: {
    color: "#ffffff",
    fontSize: rf(12),
    fontWeight: "900",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  emptyText: {
    fontSize: rf(14),
    lineHeight: rf(20),
    textAlign: "center",
    fontWeight: "500",
  },
});