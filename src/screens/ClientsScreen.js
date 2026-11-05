import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import {
  canManageClients,
  canManageVehicles,
} from "../constants/accessControl";
import { useTheme } from "../context/ThemeContext";
import { deleteClient, listClients } from "../services/clients/clientService";
import {
  deleteVehicle,
  listVehicles,
  listVehiclesByClientId,
} from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

const SCREEN_MODES = {
  LIST: "list",
  DETAIL: "detail",
};

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

export default function ClientsScreen({
  onBack,
  onOpenClientForm,
  onOpenDiagnosticForm,
  onOpenVehicleForm,
  currentRole,
  userProfile,
  viewState,
}) {
  const { colors } = useTheme();
  const canEditClients = canManageClients(currentRole);
  const canEditVehicles = canManageVehicles(currentRole);
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [clients, setClients] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);

  const selectedClientId = getEntityId(selectedClient);

  const filteredClients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [client.identification, client.fullName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [clients, searchQuery]);

  const vehiclesByClientId = useMemo(() => {
    return allVehicles.reduce((accumulator, vehicle) => {
      const bucketKey = vehicle.clientId;

      if (!bucketKey) {
        return accumulator;
      }

      if (!accumulator[bucketKey]) {
        accumulator[bucketKey] = [];
      }

      accumulator[bucketKey].push(vehicle);
      return accumulator;
    }, {});
  }, [allVehicles]);

  const refreshClients = async () => {
    setLoading(true);

    try {
      const [nextClients, nextVehicles] = await Promise.all([
        listClients(),
        listVehicles(),
      ]);
      setClients(nextClients);
      setAllVehicles(nextVehicles);

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
      setSelectedClient(null);
      setScreenMode(SCREEN_MODES.LIST);
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
        Alert.alert("Vehículos", "No se pudo cargar la flota del cliente.");
      } finally {
        setVehicleLoading(false);
      }
    };

    refreshVehicles();
  }, [selectedClientId]);

  useEffect(() => {
    if (screenMode !== SCREEN_MODES.DETAIL) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (viewState?.returnTo === "vehicles") {
          onBack?.();
          return true;
        }

        setSelectedClient(null);
        setScreenMode(SCREEN_MODES.LIST);
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack, screenMode, viewState?.returnTo]);

  const openClientDetail = (client) => {
    setSelectedClient(client);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    if (viewState?.returnTo === "vehicles") {
      onBack?.();
      return;
    }

    setSelectedClient(null);
    setScreenMode(SCREEN_MODES.LIST);
  };

  const handleDeleteClient = (client) => {
    Alert.alert(
      "Eliminar cliente",
      `Se eliminará ${client.fullName || "este cliente"} del padrón operativo.`,
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
      "Eliminar vehículo",
      `Se eliminará ${vehicle.plate || "este vehículo"} del cliente activo.`,
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
                "Vehículos",
                error?.message || "No se pudo eliminar el vehículo.",
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
        onBack={onBack}
        section="Recepción"
        subtitle="Lista operativa más limpia, con alta y asociación resueltas en pantallas separadas."
        title="Clientes"
      />

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
          placeholder="Buscar por identificación o nombre"
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
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : filteredClients.length ? (
        <View style={styles.listBody}>
          {filteredClients.map((client) => {
            const clientVehicles = vehiclesByClientId[client.id] || [];

            return (
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
                        Recepción
                      </Text>
                      <Text
                        style={[styles.clientTitle, { color: colors.text }]}
                      >
                        {client.fullName}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <Text
                      style={[
                        styles.fieldLine,
                        { color: colors.textSecondary },
                      ]}
                    >
                      <Text
                        style={[styles.fieldLineLabel, { color: colors.text }]}
                      >
                        Identificación:
                      </Text>{" "}
                      {client.identification || "Sin identificación"}
                    </Text>
                    <Text
                      style={[
                        styles.fieldLine,
                        { color: colors.textSecondary },
                      ]}
                    >
                      <Text
                        style={[styles.fieldLineLabel, { color: colors.text }]}
                      >
                        Teléfono:
                      </Text>{" "}
                      {client.phone || "Sin teléfono"}
                    </Text>
                    <Text
                      style={[
                        styles.vehicleSectionTitle,
                        { color: colors.accent },
                      ]}
                    >
                      Vehículos asociados:
                    </Text>
                    <Text
                      style={[
                        styles.vehicleSectionHint,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Presione sobre un vehículo para ver detalles.
                    </Text>
                    {clientVehicles.length ? (
                      clientVehicles.map((vehicle) => (
                        <View
                          key={getEntityId(vehicle)}
                          style={[
                            styles.vehicleInlineCard,
                            {
                              backgroundColor: colors.cardMuted,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.vehicleInlineTitle,
                              { color: colors.text },
                            ]}
                          >
                            {[vehicle.brand, vehicle.model, vehicle.year]
                              .filter(Boolean)
                              .join(" ") || "Sin descripción"}
                          </Text>
                          <View
                            style={[
                              styles.vehicleInlineDivider,
                              { backgroundColor: colors.border },
                            ]}
                          />
                          <Text
                            style={[
                              styles.vehicleInlinePlate,
                              { color: colors.accent },
                            ]}
                          >
                            <Text
                              style={[
                                styles.vehicleInlinePlateLabel,
                                { color: colors.accent },
                              ]}
                            >
                              Placa:
                            </Text>{" "}
                            {vehicle.plate || "Sin placa"}
                          </Text>
                          <Text
                            style={[
                              styles.vehicleInlineMeta,
                              { color: colors.textTertiary },
                            ]}
                          >
                            <Text
                              style={[
                                styles.vehicleInlineMetaLabel,
                                { color: colors.text },
                              ]}
                            >
                              Kilometraje:
                            </Text>{" "}
                            {vehicle.mileage
                              ? `${vehicle.mileage} km`
                              : "Sin kilometraje"}
                          </Text>
                        </View>
                      ))
                    ) : canEditVehicles ? (
                      <Pressable
                        onPress={() => onOpenVehicleForm?.(client, null)}
                        style={[
                          styles.linkHint,
                          {
                            backgroundColor: colors.cardMuted,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.linkHintText,
                            { color: colors.accent },
                          ]}
                        >
                          Asociar vehículo ahora
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>

                {canEditClients ? (
                  <View style={styles.iconActionRow}>
                    <Pressable
                      onPress={() =>
                        onOpenClientForm?.(client, { returnTo: "detail" })
                      }
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        color={colors.textTertiary}
                        name="create-outline"
                        size={rf(17)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteClient(client)}
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        color={colors.danger}
                        name="trash-outline"
                        size={rf(17)}
                      />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View
          style={[
            styles.emptyStateCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyEyebrow, { color: colors.primary }]}>
            Recepción
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {clients.length
              ? "No hay coincidencias con la búsqueda actual. Prueba con otra identificación o nombre."
              : canEditClients
                ? "No hay clientes registrados. Usa el botón flotante para abrir la primera ficha de recepción."
                : "No hay clientes visibles en este momento."}
          </Text>
        </View>
      )}
    </>
  );

  const renderDetailScreen = () => (
    <>
      <WorkshopScreenHeader
        onBack={handleBackToList}
        section="Ficha cliente"
        subtitle="La asociación de vehículos ocurre en una pantalla propia; aquí solo consultas y gestionas la ficha."
        title="Cliente"
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
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.cardHeaderCopy}>
            <Text style={[styles.cardEyebrow, { color: colors.primary }]}>
              Recepción
            </Text>
            <Text style={[styles.clientTitle, { color: colors.text }]}>
              Resumen del cliente
            </Text>
          </View>
          <Text style={[styles.cardTag, { color: colors.primary }]}>
            {selectedClient?.id || "Sin código"}
          </Text>
        </View>

        <View style={styles.detailLines}>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Nombre:
            </Text>{" "}
            {selectedClient?.fullName || "Sin nombre"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Identificación:
            </Text>{" "}
            {selectedClient?.identification || "Sin identificación"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Teléfono:
            </Text>{" "}
            {selectedClient?.phone || "Sin teléfono"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Correo:
            </Text>{" "}
            {selectedClient?.email || "Sin correo"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Dirección:
            </Text>{" "}
            {selectedClient?.address || "Sin dirección"}
          </Text>
        </View>

        {selectedClient?.notes ? (
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>
            {selectedClient.notes}
          </Text>
        ) : null}

        {canEditVehicles ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => onOpenVehicleForm?.(selectedClient, null)}
              style={[styles.secondaryAction, { borderColor: colors.accent }]}
            >
              <Text
                style={[styles.secondaryActionText, { color: colors.accent }]}
              >
                Asociar vehículo
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Vehículos asociados
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
                      Vehículo
                    </Text>
                    <Text style={[styles.clientTitle, { color: colors.text }]}>
                      {[vehicle.brand, vehicle.model, vehicle.year]
                        .filter(Boolean)
                        .join(" ") || "Sin descripción"}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text
                    style={[styles.clientPlateMeta, { color: colors.accent }]}
                  >
                    <Text
                      style={[
                        styles.clientPlateMetaLabel,
                        { color: colors.accent },
                      ]}
                    >
                      Placa:
                    </Text>{" "}
                    {vehicle.plate || "Sin placa"}
                  </Text>
                  <Text
                    style={[styles.clientMeta, { color: colors.textTertiary }]}
                  >
                    <Text
                      style={[styles.clientMetaLabel, { color: colors.text }]}
                    >
                      Kilometraje:
                    </Text>{" "}
                    {vehicle.mileage
                      ? `${vehicle.mileage} km`
                      : "Sin kilometraje"}
                  </Text>
                  {canEditVehicles ? (
                    <Pressable
                      onPress={() =>
                        onOpenDiagnosticForm?.(null, {
                          seedData: {
                            clientId: selectedClient?.id || "",
                            vehicleId: vehicle.id || vehicle.refId || "",
                          },
                        })
                      }
                      style={[
                        styles.diagnosticLinkWrap,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.diagnosticLinkText,
                          { color: colors.accent },
                        ]}
                      >
                        Abrir diagnóstico de esta unidad
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {canEditVehicles ? (
                <View style={styles.iconActionRow}>
                  <Pressable
                    onPress={() => onOpenVehicleForm?.(selectedClient, vehicle)}
                    style={[
                      styles.iconAction,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      color={colors.textTertiary}
                      name="create-outline"
                      size={rf(17)}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteVehicle(vehicle)}
                    style={[
                      styles.iconAction,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      color={colors.danger}
                      name="trash-outline"
                      size={rf(17)}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyStateCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>
            Vehículos
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {canEditVehicles
              ? "Este cliente todavía no tiene vehículos asociados. Registra la unidad para continuar con diagnósticos u órdenes."
              : "Este cliente todavía no tiene vehículos visibles para tu perfil."}
          </Text>
        </View>
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

      {screenMode === SCREEN_MODES.LIST && canEditClients ? (
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
  scrollContent: { padding: spacing.lg, gap: spacing.lg },
  scrollWithFab: { paddingBottom: spacing.xxl * 2.6 },
  controlsPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
  },
  listBody: { gap: spacing.sm },
  clientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
  },
  clientCopy: { flex: 1, gap: spacing.xs },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
  },
  cardHeaderCopy: { flex: 1, gap: 2 },
  cardEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardBody: { gap: spacing.xs },
  clientTitle: { fontSize: rf(17), fontWeight: "800" },
  clientMeta: { fontSize: rf(13), lineHeight: rf(19) },
  clientMetaLabel: { fontSize: rf(13), fontWeight: "800" },
  clientPlateMeta: {
    fontSize: rf(16),
    lineHeight: rf(20),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  clientPlateMetaLabel: { fontSize: rf(16), fontWeight: "900" },
  fieldLine: { fontSize: rf(13), lineHeight: rf(19) },
  fieldLineLabel: { fontSize: rf(13), fontWeight: "800" },
  vehicleSectionTitle: {
    fontSize: rf(13),
    fontWeight: "900",
    lineHeight: rf(19),
  },
  vehicleSectionHint: { fontSize: rf(12), lineHeight: rf(18) },
  vehicleInlineCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  vehicleInlineDivider: {
    height: 1,
    width: "100%",
    borderRadius: borderRadius.pill,
  },
  vehicleInlineTitle: {
    fontSize: rf(15),
    fontWeight: "800",
    lineHeight: rf(21),
  },
  vehicleInlineMeta: { fontSize: rf(13), lineHeight: rf(19) },
  vehicleInlineMetaLabel: { fontSize: rf(13), fontWeight: "800" },
  vehicleInlinePlate: {
    fontSize: rf(16),
    lineHeight: rf(20),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  vehicleInlinePlateLabel: { fontSize: rf(16), fontWeight: "900" },
  linkHint: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  linkHintText: { fontSize: rf(11), fontWeight: "800" },
  iconActionRow: { flexDirection: "row", gap: spacing.xs },
  iconAction: {
    borderWidth: 1,
    width: rf(36),
    height: rf(36),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  detailLines: { gap: spacing.xs },
  detailLine: { fontSize: rf(14), lineHeight: rf(22) },
  detailLineLabel: { fontSize: rf(14), fontWeight: "800" },
  notesText: { fontSize: rf(14), lineHeight: rf(20) },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  secondaryActionText: { fontSize: rf(12), fontWeight: "800" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionTitle: { fontSize: rf(16), fontWeight: "900" },
  sectionMeta: { fontSize: rf(12), fontWeight: "700" },
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyText: { fontSize: rf(13), lineHeight: rf(20) },
  diagnosticLinkWrap: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  diagnosticLinkText: { fontSize: rf(12), fontWeight: "800" },
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
