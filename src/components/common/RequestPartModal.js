import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";
import BigButton from "./BigButton";

// Solicitud rápida de repuesto desde la orden: nombre + cantidad.
export default function RequestPartModal({
  visible,
  submitting = false,
  onCancel,
  onSubmit,
}) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (visible) {
      setName("");
      setQuantity(1);
    }
  }, [visible]);

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={Boolean(visible)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <Pressable
          onPress={submitting ? undefined : onCancel}
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
            <Text style={[styles.title, { color: colors.text }]}>
              Pedir repuesto
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Queda como "Solicitado" en esta orden para que recepción lo
              gestione.
            </Text>

            <TextInput
              autoFocus
              onChangeText={setName}
              placeholder="¿Qué repuesto necesitas?"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.borderStrong,
                  color: colors.text,
                },
              ]}
              value={name}
            />

            <View style={styles.quantityRow}>
              <BigButton
                disabled={quantity <= 1}
                icon="remove"
                label=""
                onPress={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                style={styles.step}
                variant="secondary"
              />
              <View style={styles.quantityBox}>
                <Text style={[styles.quantity, { color: colors.text }]}>
                  {quantity}
                </Text>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {quantity === 1 ? "unidad" : "unidades"}
                </Text>
              </View>
              <BigButton
                icon="add"
                label=""
                onPress={() => setQuantity((current) => current + 1)}
                style={styles.step}
                variant="secondary"
              />
            </View>

            <BigButton
              disabled={!canSubmit}
              icon="send"
              label="Solicitar repuesto"
              loading={submitting}
              onPress={() => onSubmit?.({ name: name.trim(), quantity })}
            />
            <BigButton
              disabled={submitting}
              label="Cancelar"
              onPress={onCancel}
              variant="secondary"
            />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderWidth: 1, borderRadius: 22, padding: 20, gap: TOUCH.gap },
  title: { fontSize: 22, fontWeight: "900" },
  hint: { fontSize: 15, lineHeight: 21 },
  input: {
    minHeight: TOUCH.min,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "600",
  },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: TOUCH.gap },
  step: { flex: 1 },
  quantityBox: { flex: 1.2, alignItems: "center" },
  quantity: { fontSize: 36, fontWeight: "900" },
});
