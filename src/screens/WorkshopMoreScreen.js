import Constants from "expo-constants";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MenuRow from "../components/common/MenuRow";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { getRoleLabel, hasPermission } from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function SectionTitle({ children, color }) {
  return <Text style={[styles.sectionTitle, { color }]}>{children}</Text>;
}

export default function WorkshopMoreScreen({
  onBack,
  onOpenCollaborators,
  onOpenOnboarding,
  onOpenStockItems,
  onOpenWorkshopManagement,
  onOpenWorkshopSettings,
  onSignOut,
  onToggleTheme,
  themeLabel,
}) {
  const { colors } = useTheme();
  const { activeWorkshop, activeWorkshopId, memberships, userProfile } =
    useAuth();
  const appVersion = Constants?.expoConfig?.version || "-";
  const activeMembership =
    memberships.find((item) => item.workshopId === activeWorkshopId) ||
    memberships[0] ||
    null;
  const workshopName = activeWorkshop?.name || activeMembership?.workshopName;
  const role = activeMembership?.role || userProfile?.role || "";
  const canManageInventory = hasPermission(role, "inventory.manage");
  const canManageWorkshop = hasPermission(role, "workshop.manage");
  const canManageTeam = hasPermission(role, "invitations.manage");

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
          section="Configuración"
          subtitle="Taller, equipo y preferencias de la app."
          title="Más opciones"
        />

        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              borderLeftColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.heroName, { color: colors.text }]}>
            {workshopName || "Taller activo"}
          </Text>
          <Text style={[styles.heroMeta, { color: colors.textSecondary }]}>
            {userProfile?.fullName || userProfile?.email || "Usuario activo"}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: colors.primary }]}>
            <Text style={styles.rolePillText}>{getRoleLabel(role)}</Text>
          </View>
        </View>

        <SectionTitle color={colors.textTertiary}>Taller</SectionTitle>
        <MenuRow
          badge={canManageInventory ? "Puedes editar" : "Solo consulta"}
          icon="cube-outline"
          onPress={onOpenStockItems}
          subtitle="Inventario general, entradas y salidas."
          title="Stock y herramientas"
          tone={canManageInventory ? "accent" : "warning"}
        />
        <MenuRow
          badge={canManageWorkshop ? "Puedes editar" : "Solo lectura"}
          icon="business-outline"
          onPress={onOpenWorkshopSettings}
          subtitle="Nombre, contacto y logo del taller."
          title="Datos del taller"
          tone={canManageWorkshop ? "primary" : "warning"}
        />
        <MenuRow
          badge={canManageTeam ? "Gestión activa" : "Vista limitada"}
          icon="people-outline"
          onPress={onOpenCollaborators}
          subtitle="Invitaciones, roles y accesos."
          title="Colaboradores"
          tone={canManageTeam ? "accent" : "warning"}
        />
        <MenuRow
          badge={`${memberships.length} ${
            memberships.length === 1 ? "taller" : "talleres"
          }`}
          icon="swap-horizontal-outline"
          onPress={onOpenWorkshopManagement}
          subtitle="Cambia de taller o revisa tus accesos."
          title="Mis talleres"
        />

        <SectionTitle color={colors.textTertiary}>Aplicación</SectionTitle>
        <MenuRow
          icon="play-circle-outline"
          onPress={onOpenOnboarding}
          subtitle="Recorre otra vez la introducción de la app."
          title="Ver introducción"
        />
        <MenuRow
          icon="contrast-outline"
          onPress={onToggleTheme}
          subtitle={themeLabel}
          title="Apariencia"
        />
        <MenuRow
          icon="log-out-outline"
          onPress={onSignOut}
          showChevron={false}
          subtitle="Finaliza la sesión en este equipo."
          title="Cerrar sesión"
          tone="danger"
        />

        <View
          style={[
            styles.about,
            { backgroundColor: colors.cardMuted, borderColor: colors.border },
          ]}
        >
          <Image
            resizeMode="contain"
            source={require("../../assets/icon-dark.png")}
            style={styles.aboutLogo}
          />
          <View style={styles.aboutCopy}>
            <Text style={[styles.aboutTitle, { color: colors.text }]}>
              Auto-Guardian Taller
            </Text>
            <Text style={[styles.aboutMeta, { color: colors.textSecondary }]}>
              Versión {appVersion}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32, gap: 12 },
  hero: {
    borderWidth: 1,
    borderLeftWidth: 8,
    borderRadius: 20,
    padding: 16,
    gap: 6,
    alignItems: "flex-start",
  },
  heroName: { fontSize: 26, fontWeight: "900" },
  heroMeta: { fontSize: 16, fontWeight: "600" },
  rolePill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  rolePillText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  sectionTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  about: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  aboutLogo: { width: 56, height: 56 },
  aboutCopy: { flex: 1, gap: 2 },
  aboutTitle: { fontSize: 17, fontWeight: "800" },
  aboutMeta: { fontSize: 14, fontWeight: "600" },
});
