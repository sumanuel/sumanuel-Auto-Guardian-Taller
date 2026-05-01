import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { USER_STATUSES } from "../constants/accessControl";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const statusContent = {
  missing: {
    title: "Perfil no disponible",
    description:
      "La cuenta existe en autenticacion, pero no tiene un perfil operativo en el taller.",
    label: "Requiere revision",
  },
  [USER_STATUSES.PENDING_APPROVAL]: {
    title: "Cuenta en revision",
    description:
      "Tu acceso ya fue creado, pero aun falta la aprobacion interna del taller para habilitar la operacion.",
    label: "Pendiente",
  },
  [USER_STATUSES.SUSPENDED]: {
    title: "Cuenta suspendida",
    description:
      "El acceso fue suspendido temporalmente. Contacta al administrador para revisar el estado.",
    label: "Suspendida",
  },
  [USER_STATUSES.DISABLED]: {
    title: "Cuenta deshabilitada",
    description:
      "El acceso fue deshabilitado y no puede operar dentro de la aplicacion.",
    label: "Bloqueada",
  },
};

export default function AccessStatusScreen({ onSignOut, userProfile }) {
  const { colors, isDarkMode } = useTheme();
  const currentStatus = userProfile?.status || "missing";
  const content = statusContent[currentStatus] || statusContent.missing;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={
            isDarkMode
              ? ["#18314b", "#0c1724", "#09111a"]
              : ["#dce8f7", "#f2f6fb", "#eef2f6"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: colors.borderStrong }]}
        >
          <Text style={[styles.kicker, { color: colors.primary }]}>
            Estado de acceso
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {content.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {content.description}
          </Text>

          <View
            style={[
              styles.statusBox,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textTertiary }]}>
              Usuario
            </Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>
              {userProfile?.fullName || "Sin perfil asignado"}
            </Text>
            <Text style={[styles.statusMeta, { color: colors.primary }]}>
              {content.label}
            </Text>
          </View>

          <Pressable
            onPress={onSignOut}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>
              Cerrar sesion
            </Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  kicker: {
    fontSize: rf(12),
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: rf(30),
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  description: {
    fontSize: rf(14),
    lineHeight: rf(21),
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statusLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusValue: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  statusMeta: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
});
