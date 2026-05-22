import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, rf, spacing } from "../../utils/responsive";

function getHeaderTone(section, isDarkMode) {
  const normalizedSection = (section || "").toLowerCase();

  if (normalizedSection.includes("recep")) {
    return {
      colors: isDarkMode
        ? ["#8a5d18", "#57380d", "#171109"]
        : ["#d99b32", "#9a5c17", "#5f3409"],
      icon: "people-outline",
    };
  }

  if (
    normalizedSection.includes("cost") ||
    normalizedSection.includes("repuesto")
  ) {
    return {
      colors: isDarkMode
        ? ["#8f5610", "#5d3607", "#171109"]
        : ["#d9821f", "#9d5710", "#623109"],
      icon: "construct-outline",
    };
  }

  if (
    normalizedSection.includes("equipo") ||
    normalizedSection.includes("control") ||
    normalizedSection.includes("soporte")
  ) {
    return {
      colors: isDarkMode
        ? ["#415067", "#253041", "#0c1117"]
        : ["#5a738f", "#31455f", "#172333"],
      icon: "shield-checkmark-outline",
    };
  }

  return {
    colors: isDarkMode
      ? ["#1350a7", "#0d3570", "#09111a"]
      : ["#1e7af1", "#0f5fd2", "#0d3f8a"],
    icon: "speedometer-outline",
  };
}

export default function WorkshopScreenHeader({
  title,
  subtitle,
  section,
  onBack,
  rightAction,
}) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const headerTone = getHeaderTone(section, isDarkMode);

  return (
    <View
      style={[styles.wrapper, { paddingTop: Math.max(insets.top, spacing.md) }]}
    >
      {onBack || rightAction ? (
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons color={colors.text} name="arrow-back" size={rf(20)} />
            </Pressable>
          ) : (
            <View style={styles.iconButtonSpacer} />
          )}

          {rightAction ? (
            <Pressable
              onPress={rightAction.onPress}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                color={rightAction.color || colors.text}
                name={rightAction.icon || "ellipsis-horizontal"}
                size={rf(20)}
              />
            </Pressable>
          ) : (
            <View style={styles.iconButtonSpacer} />
          )}
        </View>
      ) : null}

      <LinearGradient
        colors={headerTone.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSurface}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <Ionicons color="#D6E7FF" name={headerTone.icon} size={rf(26)} />
          </View>

          <View style={styles.titleWrap}>
            {section ? <Text style={styles.section}>{section}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroSurface: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroBadge: {
    width: rf(58),
    height: rf(58),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  section: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.74)",
  },
  title: {
    fontSize: rf(24),
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#ffffff",
  },
  subtitle: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: "rgba(255,255,255,0.84)",
  },
  iconButton: {
    width: rf(44),
    height: rf(44),
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSpacer: {
    width: rf(44),
    height: rf(44),
  },
});
