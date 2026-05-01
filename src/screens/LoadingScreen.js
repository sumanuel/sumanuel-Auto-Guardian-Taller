import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { rf, spacing } from "../utils/responsive";

export default function LoadingScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.title, { color: colors.text }]}>
          Preparando acceso
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Verificando sesion y perfil del taller.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    fontSize: rf(22),
    fontWeight: "800",
  },
  subtitle: {
    fontSize: rf(14),
    textAlign: "center",
    lineHeight: rf(20),
  },
});
