import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, rf, spacing } from "../../utils/responsive";
import { TOUCH, tapFeedback } from "../../utils/touch";

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
    label: "Diagnóstico",
    icon: "pulse-outline",
    activeIcon: "pulse",
  },
  {
    key: "work-orders",
    label: "Órdenes",
    icon: "clipboard-outline",
    activeIcon: "clipboard",
  },
  {
    key: "more",
    label: "Más",
    icon: "ellipsis-horizontal-circle-outline",
    activeIcon: "ellipsis-horizontal-circle",
  },
];

export default function WorkshopTabBar({
  activeTab,
  onChange,
  visibleTabs,
  large = false,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const renderedTabs = Array.isArray(visibleTabs)
    ? tabConfig.filter((tab) => visibleTabs.includes(tab.key))
    : tabConfig;

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.xs),
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
        {renderedTabs.map((tab) => {
          const selected = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              hitSlop={large ? TOUCH.hitSlop : undefined}
              onPress={() => {
                if (large) {
                  tapFeedback("light");
                }

                onChange?.(tab.key);
              }}
              style={[styles.tabButton, large && styles.tabButtonLarge]}
            >
              <View
                style={[
                  styles.iconWrap,
                  large && styles.iconWrapLarge,
                  {
                    backgroundColor: selected ? colors.primary : "transparent",
                  },
                ]}
              >
                <Ionicons
                  color={selected ? colors.white : colors.textTertiary}
                  name={selected ? tab.activeIcon : tab.icon}
                  size={large ? 26 : rf(19)}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  large && styles.tabLabelLarge,
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
    paddingTop: spacing.xs,
  },
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  iconWrap: {
    width: rf(34),
    height: rf(34),
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: rf(10),
    fontWeight: "800",
  },
  tabButtonLarge: { minHeight: TOUCH.large, justifyContent: "center" },
  iconWrapLarge: { width: 48, height: 40 },
  tabLabelLarge: { fontSize: 12 },
});
