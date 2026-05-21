import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, rf, spacing } from "../../utils/responsive";

export default function WorkshopScreenHeader({
  title,
  subtitle,
  section,
  onBack,
  rightAction,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { paddingTop: Math.max(insets.top, spacing.md) }]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          {section ? (
            <Text style={[styles.section, { color: colors.primary }]}>
              {section}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

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
        ) : rightAction ? (
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
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
    gap: spacing.sm,
  },
  section: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: rf(30),
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: rf(14),
    lineHeight: rf(22),
  },
  iconButton: {
    width: rf(44),
    height: rf(44),
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
