import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { callPhone, openWhatsappChat } from "../../utils/contact";
import { TOUCH } from "../../utils/touch";
import BigButton from "./BigButton";

// Contacto al cliente en un toque: llamar o abrir WhatsApp con un mensaje
// prellenado. No se muestra si el cliente no tiene teléfono.
export default function ContactBar({ name, phone, message }) {
  const { colors } = useTheme();

  if (!String(phone || "").trim()) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Contactar a {name || "cliente"} · {phone}
      </Text>
      <View style={styles.row}>
        <BigButton
          icon="call-outline"
          label="Llamar"
          onPress={() => callPhone(phone)}
          style={styles.button}
          variant="secondary"
        />
        <BigButton
          icon="logo-whatsapp"
          label="WhatsApp"
          onPress={() => openWhatsappChat(phone, message)}
          style={styles.button}
          variant="success"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  caption: { fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", gap: TOUCH.gap },
  button: { flex: 1 },
});
