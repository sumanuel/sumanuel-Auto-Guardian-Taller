import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MenuRow from "../components/common/MenuRow";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { getRoleLabel } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function WorkshopManagementScreen({ onBack, onSwitchWorkshop }) {
  const { colors } = useTheme();
  const { activeWorkshopId, memberships, switchWorkshop } = useAuth();
  const [switchingId, setSwitchingId] = useState(null);

  const handleSwitchWorkshop = async (workshopId) => {
    if (workshopId === activeWorkshopId || switchingId !== null) {
      return;
    }

    setSwitchingId(workshopId);
    try {
      await switchWorkshop(workshopId);
      onSwitchWorkshop?.();
    } catch (error) {
      Alert.alert(
        "Talleres",
        error?.message || "No se pudo cambiar al taller seleccionado.",
      );
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section="Gestión de talleres"
          subtitle={
            memberships.length > 1
              ? "Toca un taller para usarlo como taller activo."
              : "Este es el taller al que perteneces."
          }
          title="Mis talleres"
        />

        {memberships.map((membership) => {
          const isActive = membership.workshopId === activeWorkshopId;
          const isSwitching = switchingId === membership.workshopId;

          return (
            <MenuRow
              badge={isActive ? "Taller activo" : "Toca para entrar"}
              disabled={isActive || switchingId !== null}
              icon={isActive ? "checkmark-circle" : "construct-outline"}
              key={membership.workshopId}
              onPress={() => handleSwitchWorkshop(membership.workshopId)}
              selected={isActive}
              subtitle={getRoleLabel(membership.role)}
              title={membership.workshopName || "Taller sin nombre"}
              tone={isActive ? "success" : "primary"}
              trailing={
                isSwitching ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : null
              }
            />
          );
        })}

        {memberships.length === 0 ? (
          <View
            style={[
              styles.empty,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.textTertiary}
              name="business-outline"
              size={36}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sin talleres
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No perteneces a ningún taller todavía. Si recibiste una
              invitación, revisa tu correo o pide al administrador que te
              agregue.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32, gap: 12 },
  empty: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900" },
  emptyText: { fontSize: 16, lineHeight: 23, textAlign: "center" },
});
