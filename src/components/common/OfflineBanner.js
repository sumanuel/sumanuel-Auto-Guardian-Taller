import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useNetworkStatus } from "../../utils/connectivity";

// Aviso fijo sobre la barra inferior cuando no hay internet.
export default function OfflineBanner() {
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.warning }]}
    >
      <Ionicons color="#1a1200" name="cloud-offline-outline" size={22} />
      <Text style={styles.text}>
        Sin conexión. Verás los últimos datos guardados y no se podrán guardar
        cambios.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { flex: 1, color: "#1a1200", fontSize: 14, fontWeight: "800" },
});
