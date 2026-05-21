import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, rf, spacing } from "../../utils/responsive";

const tabConfig = [
  { key: "home", label: "Inicio", icon: "home-outline", activeIcon: "home" },
  {
    key: "clients",
    label: "Clientes",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    key: "diagnostics",
    label: "Diagnosticos",
    icon: "pulse-outline",
    activeIcon: "pulse",
  },
  {
    key: "work-orders",
    label: "Ordenes",
    icon: "clipboard-outline",
    activeIcon: "clipboard",
  },
  {
    key: "more",
    label: "Mas",
    icon: "ellipsis-horizontal-circle-outline",
    activeIcon: "ellipsis-horizontal-circle",
  },
];

export default function WorkshopTabBar({ activeTab, onChange }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        {tabConfig.map((tab) => {
          const selected = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange?.(tab.key)}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: selected ? colors.primary : "transparent",
                  },
                ]}
              >
                <Ionicons
                  color={selected ? colors.white : colors.textTertiary}
                  name={selected ? tab.activeIcon : tab.icon}
                  size={rf(19)}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: selected ? colors.primary : colors.textTertiary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  iconWrap: {
    width: rf(38),
    height: rf(38),
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: rf(11),
    fontWeight: "800",
  },
});
