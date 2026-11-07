import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";
import BigButton from "./BigButton";
import BigChip from "./BigChip";

// Pide un motivo obligatorio antes de una acción (pausar una orden, devolver
// un repuesto). Motivos rápidos como botones y texto libre; el botón de
// confirmar no se activa hasta que haya motivo.
export default function ReasonModal({
  visible,
  title,
  hint = "El motivo es obligatorio y queda en la cronología.",
  reasons = [],
  confirmLabel = "Confirmar",
  confirmIcon = "checkmark",
  tone = "warning",
  submitting = false,
  onCancel,
  onSubmit,
}) {
  const { colors } = useTheme();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) {
      setReason("");
    }
  }, [visible]);

  const canSubmit = reason.trim().length > 0 && !submitting;

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
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {hint}
              </Text>

              {reasons.map((item) => (
                <BigChip
                  color={colors[tone] || colors.warning}
                  key={item}
                  label={item}
                  onPress={() => setReason(item)}
                  selected={reason.trim() === item}
                />
              ))}

              <TextInput
                multiline
                onChangeText={setReason}
                placeholder="O escribe el motivo"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.borderStrong,
                    color: colors.text,
                  },
                ]}
                textAlignVertical="top"
                value={reason}
              />
              {Platform.OS === "android" ? (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  Puedes dictar con el micrófono del teclado.
                </Text>
              ) : null}

              <BigButton
                disabled={!canSubmit}
                icon={confirmIcon}
                label={confirmLabel}
                loading={submitting}
                onPress={() => onSubmit?.(reason.trim())}
                variant={tone}
              />
              <BigButton
                disabled={submitting}
                label="Cancelar"
                onPress={onCancel}
                variant="secondary"
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderWidth: 1, borderRadius: 22, maxHeight: "92%" },
  content: { padding: 20, gap: TOUCH.gap },
  title: { fontSize: 22, fontWeight: "900" },
  hint: { fontSize: 15, lineHeight: 21 },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
  },
});
