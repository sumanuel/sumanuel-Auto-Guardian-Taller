import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";

// Campo de formulario del modo taller: etiqueta clara, ayuda opcional y entrada
// de 56 dp. Acepta cualquier prop de TextInput (keyboardType, multiline...).
export default function FormField({
  label,
  hint,
  value,
  onChangeText,
  multiline = false,
  editable = true,
  style,
  ...inputProps
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      {hint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {hint}
        </Text>
      ) : null}
      <TextInput
        editable={editable}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.borderStrong,
            color: colors.text,
            opacity: editable ? 1 : 0.6,
          },
          style,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 18, fontWeight: "800" },
  hint: { fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: TOUCH.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    minHeight: TOUCH.min,
  },
  multiline: { minHeight: 120 },
});
