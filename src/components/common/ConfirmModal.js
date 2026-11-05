import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";
import BigButton from "./BigButton";

// Confirmación con botones grandes, pensada para reemplazar Alert.alert en
// acciones críticas del modo taller (Pausar, Listo, Reabrir).
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={Boolean(visible)}
    >
      <Pressable
        onPress={loading ? undefined : onCancel}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <BigButton
              disabled={loading}
              label={cancelLabel}
              onPress={onCancel}
              style={styles.action}
              variant="secondary"
            />
            <BigButton
              haptic="medium"
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              style={styles.action}
              variant={tone}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: TOUCH.gap,
  },
  title: { fontSize: 22, fontWeight: "900" },
  message: { fontSize: 17, lineHeight: 24 },
  actions: { gap: TOUCH.gap, marginTop: 8 },
  action: { alignSelf: "stretch" },
});
