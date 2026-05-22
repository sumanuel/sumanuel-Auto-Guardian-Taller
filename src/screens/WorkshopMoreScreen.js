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
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          section="Soporte"
          subtitle="Accesos secundarios, preferencias y control administrativo fuera del flujo principal del taller."
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
                <View style={styles.rowCopy}>
                  <View
                    style={[
                      styles.rowHeader,
                      { borderBottomColor: colors.border },
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
                    <View style={styles.rowHeaderCopy}>
                      <Text
                        style={[styles.rowEyebrow, { color: colors.primary }]}
                      >
                        Modulo
                      </Text>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                    </View>
                    <Ionicons
                      color={colors.textTertiary}
                      name="chevron-forward"
                      size={rf(18)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
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
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  listWrap: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconBadge: {
    width: rf(42),
    height: rf(42),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { gap: spacing.sm },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  rowHeaderCopy: { flex: 1, gap: 2 },
  rowEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rowTitle: { fontSize: rf(15), fontWeight: "800" },
  rowSubtitle: { fontSize: rf(12), lineHeight: rf(18) },
  actionsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  actionLabel: { fontSize: rf(14), fontWeight: "700" },
});
