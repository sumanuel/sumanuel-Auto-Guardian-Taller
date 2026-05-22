import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { deleteClient, listClients } from "../services/clients/clientService";
import {
  deleteVehicle,
  listVehiclesByClientId,
} from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

const SCREEN_MODES = {
  LIST: "list",
  DETAIL: "detail",
};

const CLIENT_FILTERS = {
  ALL: "all",
  WITH_EMAIL: "with-email",
  WITH_PHONE: "with-phone",
};

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

export default function ClientsScreen({
  onOpenClientForm,
  onOpenVehicleForm,
  viewState,
}) {
  const { colors } = useTheme();
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(CLIENT_FILTERS.ALL);
  const [selectedClient, setSelectedClient] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);

  const selectedClientId = getEntityId(selectedClient);

  const filteredClients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesFilter =
        activeFilter === CLIENT_FILTERS.ALL
          ? true
          : activeFilter === CLIENT_FILTERS.WITH_EMAIL
            ? Boolean(client.email)
            : Boolean(client.phone);

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        client.id,
        client.fullName,
        client.email,
        client.phone,
        client.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, clients, searchQuery]);

  const refreshClients = async () => {
    setLoading(true);

    try {
      const nextClients = await listClients();
      setClients(nextClients);

      if (selectedClientId) {
        const refreshedClient = nextClients.find(
          (client) => getEntityId(client) === selectedClientId,
        );

        if (refreshedClient) {
          setSelectedClient(refreshedClient);
        } else {
          setSelectedClient(null);
          setScreenMode(SCREEN_MODES.LIST);
        }
      }
    } catch (error) {
      Alert.alert("Clientes", "No se pudo cargar el listado de clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshClients();
  }, []);

  useEffect(() => {
    if (!viewState?.selectedClientId) {
      if (viewState?.screenMode === SCREEN_MODES.LIST) {
        setScreenMode(SCREEN_MODES.LIST);
      }
      return;
    }

    const matchedClient = clients.find(
      (client) => getEntityId(client) === viewState.selectedClientId,
    );

    if (!matchedClient) {
      return;
    }

    setSelectedClient(matchedClient);
    setScreenMode(viewState.screenMode || SCREEN_MODES.DETAIL);
  }, [clients, viewState?.screenMode, viewState?.selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setVehicles([]);
      return;
    }

    const refreshVehicles = async () => {
      setVehicleLoading(true);

      try {
        const nextVehicles = await listVehiclesByClientId(selectedClientId);
        setVehicles(nextVehicles);
      } catch (error) {
        Alert.alert("Vehiculos", "No se pudo cargar la flota del cliente.");
      } finally {
        setVehicleLoading(false);
      }
    };

    refreshVehicles();
  }, [selectedClientId]);

  const openClientDetail = (client) => {
    setSelectedClient(client);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    setScreenMode(SCREEN_MODES.LIST);
  };

  const handleDeleteClient = (client) => {
    Alert.alert(
      "Eliminar cliente",
      `Se eliminara ${client.fullName || "este cliente"} del padron operativo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClient(getEntityId(client));
              if (selectedClientId === getEntityId(client)) {
                setSelectedClient(null);
                setScreenMode(SCREEN_MODES.LIST);
              }
              await refreshClients();
            } catch (error) {
              Alert.alert(
                "Clientes",
                error?.message || "No se pudo eliminar el cliente.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      "Eliminar vehiculo",
      `Se eliminara ${vehicle.plate || "este vehiculo"} del cliente activo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(getEntityId(vehicle));
              const nextVehicles =
                await listVehiclesByClientId(selectedClientId);
              setVehicles(nextVehicles);
            } catch (error) {
              Alert.alert(
                "Vehiculos",
                error?.message || "No se pudo eliminar el vehiculo.",
              );
            }
          },
        },
      ],
    );
  };

  const renderListScreen = () => (
    <>
      <WorkshopScreenHeader
        section="Recepcion"
        subtitle="Lista operativa mas limpia, con alta y asociacion resueltas en pantallas separadas."
        title="Clientes"
      />

      <View style={styles.summaryRow}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {clients.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Clientes
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.controlsPanel,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearchQuery}
          placeholder="Buscar por nombre, codigo, telefono o correo"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={searchQuery}
        />

        <View style={styles.filterRow}>
          {[
            { key: CLIENT_FILTERS.ALL, label: "Todos" },
            { key: CLIENT_FILTERS.WITH_EMAIL, label: "Con correo" },
            { key: CLIENT_FILTERS.WITH_PHONE, label: "Con telefono" },
          ].map((filter) => {
            const selected = activeFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.cardMuted,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selected ? colors.white : colors.text },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : filteredClients.length ? (
        <View style={styles.listBody}>
          {filteredClients.map((client) => (
            <View
              key={getEntityId(client)}
              style={[
                styles.clientRow,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => openClientDetail(client)}
                style={styles.clientCopy}
              >
                <View
                  style={[
                    styles.cardHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.cardHeaderCopy}>
                    <Text
                      style={[styles.cardEyebrow, { color: colors.primary }]}
                    >
                      Recepcion
                    </Text>
                    <Text style={[styles.clientTitle, { color: colors.text }]}>
                      {client.fullName}
                    </Text>
                  </View>
                  <Text style={[styles.cardTag, { color: colors.primary }]}>
                    {client.id}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text
                    style={[styles.clientMeta, { color: colors.textSecondary }]}
                  >
                    {client.phone || "Sin telefono"}
                  </Text>
                  <Text
                    style={[styles.clientMeta, { color: colors.textSecondary }]}
                  >
                    {client.email || "Sin correo"}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.iconActionRow}>
                <Pressable
                  onPress={() =>
                    onOpenClientForm?.(client, { returnTo: "detail" })
                  }
                  style={[
                    styles.iconAction,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    color={colors.primary}
                    name="create-outline"
                    size={rf(18)}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteClient(client)}
                  style={[
                    styles.iconAction,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    color={colors.danger}
                    name="trash-outline"
                    size={rf(18)}
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {clients.length
            ? "No hay coincidencias con la busqueda o el filtro actual."
            : "No hay clientes registrados. Usa el boton flotante para crear el primero."}
        </Text>
      )}
    </>
  );

  const renderDetailScreen = () => (
    <>
      <WorkshopScreenHeader
        onBack={handleBackToList}
        section="Ficha cliente"
        subtitle="La asociacion de vehiculos ocurre en una pantalla propia; aqui solo consultas y gestionas la ficha."
        title={selectedClient?.fullName || "Cliente"}
      />

      <View
        style={[
          styles.detailCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.detailGrid}>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Codigo
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {selectedClient?.id || "Sin codigo"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Telefono
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {selectedClient?.phone || "Sin telefono"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Correo
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {selectedClient?.email || "Sin correo"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Direccion
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {selectedClient?.address || "Sin direccion"}
            </Text>
          </View>
        </View>

        {selectedClient?.notes ? (
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>
            {selectedClient.notes}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() =>
              onOpenClientForm?.(selectedClient, { returnTo: "detail" })
            }
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              Editar cliente
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenVehicleForm?.(selectedClient, null)}
            style={[styles.secondaryAction, { borderColor: colors.accent }]}
          >
            <Text
              style={[styles.secondaryActionText, { color: colors.accent }]}
            >
              Asociar vehiculo
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Vehiculos asociados
        </Text>
        <Text style={[styles.sectionMeta, { color: colors.textTertiary }]}>
          {vehicles.length} registro{vehicles.length === 1 ? "" : "s"}
        </Text>
      </View>

      {vehicleLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : vehicles.length ? (
        <View style={styles.listBody}>
          {vehicles.map((vehicle) => (
            <View
              key={getEntityId(vehicle)}
              style={[
                styles.clientRow,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.clientCopy}>
                <View
                  style={[
                    styles.cardHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.cardHeaderCopy}>
                    <Text
                      style={[styles.cardEyebrow, { color: colors.accent }]}
                    >
                      Vehiculo
                    </Text>
                    <Text style={[styles.clientTitle, { color: colors.text }]}>
                      {vehicle.plate || "Sin placa"}
                    </Text>
                  </View>
                  <Text style={[styles.cardTag, { color: colors.accent }]}>
                    {vehicle.year || "--"}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text
                    style={[styles.clientMeta, { color: colors.textSecondary }]}
                  >
                    {[vehicle.brand, vehicle.model]
                      .filter(Boolean)
                      .join(" · ") || "Sin descripcion"}
                  </Text>
                  <Text
                    style={[styles.clientMeta, { color: colors.textTertiary }]}
                  >
                    {vehicle.mileage
                      ? `${vehicle.mileage} km`
                      : "Sin kilometraje"}
                  </Text>
                </View>
              </View>

              <View style={styles.iconActionRow}>
                <Pressable
                  onPress={() => onOpenVehicleForm?.(selectedClient, vehicle)}
                  style={[
                    styles.iconAction,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    color={colors.primary}
                    name="create-outline"
                    size={rf(18)}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteVehicle(vehicle)}
                  style={[
                    styles.iconAction,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    color={colors.danger}
                    name="trash-outline"
                    size={rf(18)}
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Este cliente todavia no tiene vehiculos asociados.
        </Text>
      )}
    </>
  );

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.scrollWithFab]}
        showsVerticalScrollIndicator={false}
      >
        {screenMode === SCREEN_MODES.LIST
          ? renderListScreen()
          : renderDetailScreen()}
      </ScrollView>

      {screenMode === SCREEN_MODES.LIST ? (
        <Pressable
          onPress={() => onOpenClientForm?.(null, { returnTo: "list" })}
          style={[
            styles.fab,
            { backgroundColor: colors.primary, shadowColor: colors.shadow },
          ]}
        >
          <Ionicons color={colors.white} name="add" size={rf(24)} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, position: "relative" },
  scrollContent: { padding: spacing.lg, gap: spacing.xl },
  scrollWithFab: { paddingBottom: spacing.xxl * 2.6 },
  summaryRow: { flexDirection: "row" },
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    minWidth: rf(132),
  },
  summaryValue: { fontSize: rf(28), fontWeight: "900" },
  summaryLabel: { fontSize: rf(13), lineHeight: rf(18) },
  controlsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipText: { fontSize: rf(12), fontWeight: "700" },
  listBody: { gap: spacing.md },
  clientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
  },
  clientCopy: { flex: 1, gap: spacing.xs },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  cardHeaderCopy: { flex: 1, gap: 2 },
  cardEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardTag: { fontSize: rf(11), fontWeight: "800" },
  cardBody: { gap: 2 },
  clientTitle: { fontSize: rf(16), fontWeight: "800" },
  clientMeta: { fontSize: rf(12), lineHeight: rf(17) },
  iconActionRow: { flexDirection: "row", gap: spacing.sm },
  iconAction: {
    borderWidth: 1,
    width: rf(40),
    height: rf(40),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailBlock: { width: "48%", gap: spacing.xs },
  detailLabel: {
    fontSize: rf(10),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailValue: { fontSize: rf(14), fontWeight: "700", lineHeight: rf(20) },
  notesText: { fontSize: rf(13), lineHeight: rf(18) },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primaryAction: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryActionText: { fontSize: rf(13), fontWeight: "800" },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryActionText: { fontSize: rf(13), fontWeight: "800" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionTitle: { fontSize: rf(16), fontWeight: "900" },
  sectionMeta: { fontSize: rf(12), fontWeight: "700" },
  emptyText: { fontSize: rf(13), lineHeight: rf(20) },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: rf(58),
    height: rf(58),
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});
