import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const operationalItems = [
  {
    key: "spare-parts",
    title: "Repuestos",
    subtitle: "Seguimiento de piezas, costos y abastecimiento.",
    icon: "construct-outline",
    eyebrow: "Operacion",
  },
];

const administrativeItems = [
  {
    key: "team",
    title: "Taller y colaboradores",
    subtitle: "Datos del taller, invitaciones, roles y control de accesos.",
    icon: "shield-checkmark-outline",
    eyebrow: "Administracion",
  },
];

function getPrimaryMembership(memberships, activeWorkshopId) {
  return (
    memberships.find((item) => item.workshopId === activeWorkshopId) ||
    memberships[0] ||
    null
  );
}

function renderActionRow({ item, colors, onPress }) {
  return (
    <Pressable
      key={item.key}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.cardMuted,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[styles.iconBadge, { backgroundColor: colors.cardBackground }]}
      >
        <Ionicons color={colors.primary} name={item.icon} size={rf(20)} />
      </View>

      <View style={styles.rowCopy}>
        <Text style={[styles.rowEyebrow, { color: colors.primary }]}>
          {item.eyebrow}
        </Text>
        <Text style={[styles.rowTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
          {item.subtitle}
        </Text>
      </View>

      <Ionicons
        color={colors.textTertiary}
        name="chevron-forward"
        size={rf(18)}
      />
    </Pressable>
  );
}

export default function WorkshopMoreScreen({
  onBack,
  onOpenSpareParts,
  onOpenTeamAccess,
  onSignOut,
  onToggleTheme,
  themeLabel,
}) {
  const { colors } = useTheme();
  const { activeWorkshop, activeWorkshopId, memberships, userProfile } =
    useAuth();
  const activeMembership = getPrimaryMembership(memberships, activeWorkshopId);
  const workshopName = activeWorkshop?.name || activeMembership?.workshopName;
  const roleLabel =
    activeMembership?.role === "owner"
      ? "Propietario"
      : activeMembership?.role === "administrator"
        ? "Administrador"
        : activeMembership?.role === "reception"
          ? "Recepcion"
          : activeMembership?.role === "mechanic"
            ? "Mecanico"
            : "Sin rol";

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
          section="Configuracion"
          subtitle="Agrupa herramientas operativas, administracion del taller y preferencias de la app en una sola vista ordenada."
          title="Mas opciones"
        />

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: colors.cardMuted, borderColor: colors.border },
            ]}
          >
            <Ionicons
              color={colors.primary}
              name="options-outline"
              size={rf(22)}
            />
          </View>

          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: colors.primary }]}>
              Centro de configuracion
            </Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {workshopName || "Taller activo"}
            </Text>
            <Text
              style={[styles.heroSubtitle, { color: colors.textSecondary }]}
            >
              {userProfile?.fullName || userProfile?.email || "Usuario activo"}{" "}
              · {roleLabel}
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View
              style={[
                styles.heroStat,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroStatValue, { color: colors.text }]}>
                {memberships.length}
              </Text>
              <Text
                style={[styles.heroStatLabel, { color: colors.textSecondary }]}
              >
                Talleres
              </Text>
            </View>
            <View
              style={[
                styles.heroStat,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroStatValue, { color: colors.text }]}>
                {activeWorkshopId ? "Activo" : "Sin sesion"}
              </Text>
              <Text
                style={[styles.heroStatLabel, { color: colors.textSecondary }]}
              >
                Contexto
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Operacion
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            Accesos que extienden el flujo principal del taller sin mezclarlo
            con el dashboard.
          </Text>
          <View style={styles.listWrap}>
            {operationalItems.map((item) =>
              renderActionRow({
                item,
                colors,
                onPress: onOpenSpareParts,
              }),
            )}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Administracion
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            Configuracion del taller, miembros y accesos operativos.
          </Text>
          <View style={styles.listWrap}>
            {administrativeItems.map((item) =>
              renderActionRow({
                item,
                colors,
                onPress: onOpenTeamAccess,
              }),
            )}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Aplicacion
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            Preferencias visuales y acciones de sesion para este dispositivo.
          </Text>
          <View style={styles.actionList}>
            <Pressable
              onPress={onToggleTheme}
              style={[
                styles.actionRow,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: colors.cardMuted,
                },
              ]}
            >
              <View style={styles.actionCopy}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  Apariencia
                </Text>
                <Text
                  style={[styles.actionMeta, { color: colors.textSecondary }]}
                >
                  {themeLabel}
                </Text>
              </View>
              <Ionicons
                color={colors.textTertiary}
                name="contrast-outline"
                size={rf(18)}
              />
            </Pressable>

            <Pressable
              onPress={onSignOut}
              style={[styles.actionRow, { backgroundColor: colors.cardMuted }]}
            >
              <View style={styles.actionCopy}>
                <Text style={[styles.actionLabel, { color: colors.danger }]}>
                  Cerrar sesion
                </Text>
                <Text
                  style={[styles.actionMeta, { color: colors.textSecondary }]}
                >
                  Finaliza la sesion del usuario actual en este equipo.
                </Text>
              </View>
              <Ionicons
                color={colors.danger}
                name="log-out-outline"
                size={rf(18)}
              />
            </Pressable>
          </View>
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
  heroCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroIcon: {
    width: rf(54),
    height: rf(54),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroEyebrow: {
    fontSize: rf(11),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: rf(24),
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 2,
  },
  heroStatValue: {
    fontSize: rf(16),
    fontWeight: "800",
  },
  heroStatLabel: {
    fontSize: rf(12),
    fontWeight: "600",
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: rf(17),
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
  listWrap: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: rf(42),
    height: rf(42),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  rowEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rowTitle: { fontSize: rf(15), fontWeight: "800" },
  rowSubtitle: { fontSize: rf(12), lineHeight: rf(18) },
  actionList: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionLabel: { fontSize: rf(14), fontWeight: "700" },
  actionMeta: {
    fontSize: rf(12),
    lineHeight: rf(17),
  },
});
