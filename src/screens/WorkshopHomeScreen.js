import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MetricCard from "../components/common/MetricCard";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const agenda = [
  {
    title: "Toyota Hilux 2019",
    detail: "Cambio de aceite y filtro - 09:00 AM",
    status: "Confirmado",
  },
  {
    title: "Ford Fiesta 2014",
    detail: "Revision de frenos delanteros - 11:30 AM",
    status: "En espera de repuesto",
  },
  {
    title: "Chevrolet Cruze 2017",
    detail: "Diagnostico electrico - 03:15 PM",
    status: "Prioridad alta",
  },
];

const shortcuts = ["Nueva orden", "Registrar gasto", "Inventario", "Clientes"];

const roleLabels = {
  administrator: "Administrador",
  reception: "Recepcion",
  mechanic: "Mecanico",
};

export default function WorkshopHomeScreen({ onSignOut, userProfile }) {
  const { colors, isDarkMode, toggleTheme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["#18314b", "#0c1724", "#09111a"]
              : ["#dce8f7", "#f2f6fb", "#eef2f6"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: colors.borderStrong }]}
        >
          <View style={styles.topBar}>
            <View style={styles.userSummary}>
              <Text style={[styles.userLabel, { color: colors.textSecondary }]}>
                Sesion activa
              </Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {userProfile?.fullName || "Usuario sin nombre"}
              </Text>
              <Text style={[styles.userRole, { color: colors.primary }]}>
                {roleLabels[userProfile?.role] ||
                  userProfile?.role ||
                  "Sin rol"}
              </Text>
            </View>
            <Pressable
              onPress={onSignOut}
              style={[
                styles.signOutButton,
                { borderColor: colors.borderStrong },
              ]}
            >
              <Text style={[styles.signOutText, { color: colors.text }]}>
                Cerrar sesion
              </Text>
            </Pressable>
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={[styles.kicker, { color: colors.primary }]}>
                Panel del taller
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                Auto-Guardian Taller
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Control operativo para recepcion, servicio, costos y entregas.
              </Text>
            </View>
            <Pressable
              onPress={toggleTheme}
              style={[
                styles.themeButton,
                {
                  backgroundColor: colors.overlay,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Text style={[styles.themeButtonText, { color: colors.white }]}>
                {isDarkMode ? "Modo claro" : "Modo oscuro"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard value="18" label="Vehiculos hoy" />
            <MetricCard value="5" label="Urgentes" tone="danger" />
            <MetricCard value="92%" label="Entrega a tiempo" tone="accent" />
          </View>
        </LinearGradient>

        <View
          style={[
            styles.alertCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.alertHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Atencion inmediata
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.cardMuted }]}>
              <Text style={[styles.badgeText, { color: colors.warning }]}>
                3 pendientes
              </Text>
            </View>
          </View>
          <Text style={[styles.alertTitle, { color: colors.text }]}>
            2 vehiculos superaron el tiempo estimado
          </Text>
          <Text style={[styles.alertText, { color: colors.textSecondary }]}>
            Revisa aprobaciones de repuestos y actualiza promesa de entrega
            antes del mediodia.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accesos rapidos
          </Text>
          <Text style={[styles.sectionMeta, { color: colors.textTertiary }]}>
            Flujos de alta frecuencia
          </Text>
        </View>

        <View style={styles.shortcutGrid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item}
              style={[
                styles.shortcutCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.shortcutTitle, { color: colors.text }]}>
                {item}
              </Text>
              <Text
                style={[
                  styles.shortcutCaption,
                  { color: colors.textSecondary },
                ]}
              >
                Abrir
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Agenda del dia
          </Text>
          <Text style={[styles.sectionMeta, { color: colors.textTertiary }]}>
            Recepcion y servicio
          </Text>
        </View>

        <View style={styles.listWrap}>
          {agenda.map((item) => (
            <View
              key={item.title}
              style={[
                styles.listCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.listTopRow}>
                <Text style={[styles.listTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.listStatus, { color: colors.primary }]}>
                  {item.status}
                </Text>
              </View>
              <Text
                style={[styles.listDetail, { color: colors.textSecondary }]}
              >
                {item.detail}
              </Text>
            </View>
          ))}
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
  heroCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  userSummary: {
    flex: 1,
    gap: spacing.xs,
  },
  userLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  userName: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  userRole: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  signOutButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  signOutText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  heroHeader: {
    gap: spacing.lg,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  kicker: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(30),
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: rf(14),
    lineHeight: rf(20),
    maxWidth: 420,
  },
  themeButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  themeButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  alertTitle: {
    fontSize: rf(19),
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  alertText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: rf(19),
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontSize: rf(12),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  shortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  shortcutCard: {
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  shortcutTitle: {
    fontSize: rf(16),
    fontWeight: "700",
  },
  shortcutCaption: {
    fontSize: rf(12),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  listWrap: {
    gap: spacing.md,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  listTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  listTitle: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "700",
  },
  listStatus: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  listDetail: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
});
