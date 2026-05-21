import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const shortcuts = [
  {
    key: "spare-parts",
    title: "Repuestos",
    subtitle: "Seguimiento de piezas, costos y abastecimiento.",
    icon: "construct-outline",
  },
  {
    key: "team",
    title: "Equipo",
    subtitle: "Invitaciones, roles y control de accesos.",
    icon: "shield-checkmark-outline",
  },
];

export default function WorkshopMoreScreen({
  onOpenSpareParts,
  onOpenTeamAccess,
  onSignOut,
  onToggleTheme,
  themeLabel,
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          section="Operador"
          subtitle="Accesos menos frecuentes fuera del tablero principal, siguiendo un flujo mas limpio."
          title="Mas opciones"
        />

        <View style={styles.listWrap}>
          {shortcuts.map((item) => {
            const handler =
              item.key === "spare-parts" ? onOpenSpareParts : onOpenTeamAccess;

            return (
              <Pressable
                key={item.key}
                onPress={handler}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.cardMuted },
                  ]}
                >
                  <Ionicons
                    color={colors.primary}
                    name={item.icon}
                    size={rf(20)}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
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
          })}
        </View>

        <View
          style={[
            styles.actionsPanel,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={onToggleTheme}
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {themeLabel}
            </Text>
            <Ionicons
              color={colors.textTertiary}
              name="contrast-outline"
              size={rf(18)}
            />
          </Pressable>

          <Pressable onPress={onSignOut} style={styles.actionRow}>
            <Text style={[styles.actionLabel, { color: colors.danger }]}>
              Cerrar sesion
            </Text>
            <Ionicons
              color={colors.danger}
              name="log-out-outline"
              size={rf(18)}
            />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  listWrap: { gap: spacing.md },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBadge: {
    width: rf(48),
    height: rf(48),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  rowTitle: { fontSize: rf(16), fontWeight: "800" },
  rowSubtitle: { fontSize: rf(13), lineHeight: rf(19) },
  actionsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  actionLabel: { fontSize: rf(15), fontWeight: "700" },
});
