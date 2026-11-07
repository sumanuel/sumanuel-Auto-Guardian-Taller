import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import BigButton from "./BigButton";
import WorkshopScreenHeader from "./WorkshopScreenHeader";

// Estructura común de los formularios: cabecera, contenido con scroll y un
// botón principal fijo abajo, siempre al alcance del pulgar.
export default function FormScreen({
  onBack,
  section,
  subtitle,
  title,
  actionLabel,
  actionIcon = "save-outline",
  actionVariant = "primary",
  actionDisabled = false,
  submitting = false,
  onSubmit,
  edges = ["left", "right"],
  children,
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section={section}
          subtitle={subtitle}
          title={title}
        />
        {children}
      </ScrollView>

      {onSubmit ? (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: colors.cardBackground,
              borderTopColor: colors.border,
            },
          ]}
        >
          <BigButton
            disabled={actionDisabled}
            haptic="medium"
            icon={actionIcon}
            label={actionLabel}
            loading={submitting}
            onPress={onSubmit}
            variant={actionVariant}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, gap: 20 },
  actionBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
});
