import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { hasPermission } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const operationalItems = [
  {
    key: "stock-tools",
    title: "Stock y herramientas",
    subtitle: "Inventario general del taller con altas, edicion y bajas.",
    icon: "cube-outline",
    eyebrow: "Operacion",
  },
];

const administrativeItems = [
  {
    key: "workshop-settings",
    title: "Datos del taller",
    subtitle: "Identidad comercial, logo, contacto y notas operativas.",
    icon: "business-outline",
    eyebrow: "Administracion",
  },
  {
    key: "team",
    title: "Colaboradores",
    subtitle: "Invitaciones, roles, estados y control de accesos.",
    icon: "people-outline",
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

function resolveActionState(
  itemKey,
  userProfile,
  memberships,
  activeWorkshopId,
) {
  const currentRole =
    memberships.find((item) => item.workshopId === activeWorkshopId)?.role ||
    userProfile?.role ||
    "";

  if (itemKey === "workshop-settings") {
    return hasPermission(currentRole, "workshop.manage")
      ? {
          iconColor: "primary",
          stateLabel: "Editable",
          stateTone: "primary",
        }
      : {
          iconColor: "textSecondary",
          stateLabel: "Solo lectura",
          stateTone: "textSecondary",
        };
  }

  if (itemKey === "stock-tools") {
    return hasPermission(currentRole, "inventory.manage")
      ? {
          iconColor: "accent",
          stateLabel: "CRUD habilitado",
          stateTone: "accent",
        }
      : {
          iconColor: "warning",
          stateLabel: "Solo consulta",
          stateTone: "warning",
        };
  }

  return hasPermission(currentRole, "invitations.manage")
    ? {
        iconColor: "accent",
        stateLabel: "Gestion activa",
        stateTone: "accent",
      }
    : {
        iconColor: "warning",
        stateLabel: "Vista limitada",
        stateTone: "warning",
      };
}

function renderActionRow({
  item,
  colors,
  onPress,
  userProfile,
  memberships,
  activeWorkshopId,
}) {
  const actionState = resolveActionState(
    item.key,
    userProfile,
    memberships,
    activeWorkshopId,
  );

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
        <Ionicons
          color={colors[actionState.iconColor]}
          name={item.icon}
          size={rf(20)}
        />
      </View>

      <View style={styles.rowCopy}>
        <View style={styles.rowTopMeta}>
          <Text style={[styles.rowEyebrow, { color: colors.primary }]}>
            {item.eyebrow}
          </Text>
          <View
            style={[
              styles.stateBadge,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.stateBadgeText,
                { color: colors[actionState.stateTone] },
              ]}
            >
              {actionState.stateLabel}
            </Text>
          </View>
        </View>
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
  onOpenCollaborators,
  onOpenStockItems,
  onOpenWorkshopSettings,
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
                onPress: onOpenStockItems,
                userProfile,
                memberships,
                activeWorkshopId,
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
                onPress:
                  item.key === "workshop-settings"
                    ? onOpenWorkshopSettings
                    : onOpenCollaborators,
                userProfile,
                memberships,
                activeWorkshopId,
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
  rowTopMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stateBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  stateBadgeText: {
    fontSize: rf(10),
    fontWeight: "800",
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
