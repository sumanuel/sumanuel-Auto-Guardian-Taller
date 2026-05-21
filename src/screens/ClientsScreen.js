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
import { useTheme } from "../context/ThemeContext";
import { deleteClient, listClients } from "../services/clients/clientService";
import {
  createEmptyVehicleForm,
  createVehicle,
  deleteVehicle,
  listVehiclesByClientId,
  updateVehicle,
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

function buildVehicleForm(vehicle, clientId = "") {
  if (!vehicle) {
    return createEmptyVehicleForm(clientId);
  }

  return {
    clientId: vehicle.clientId || clientId,
    plate: vehicle.plate || "",
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    year: vehicle.year || "",
    color: vehicle.color || "",
    vin: vehicle.vin || "",
    mileage:
      vehicle.mileage === null || vehicle.mileage === undefined
        ? ""
        : String(vehicle.mileage),
    notes: vehicle.notes || "",
  };
}

export default function ClientsScreen({ onBack, onOpenClientForm, viewState }) {
  const { colors } = useTheme();
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(CLIENT_FILTERS.ALL);
  const [selectedClient, setSelectedClient] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [vehicleFormVisible, setVehicleFormVisible] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(createEmptyVehicleForm());

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

  const clientStats = useMemo(
    () => ({
      totalClients: clients.length,
      selectedLabel: selectedClient?.fullName || "Sin cliente activo",
    }),
    [clients.length, selectedClient?.fullName],
  );

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
          setVehicleFormVisible(false);
        }
      }

      return nextClients;
    } catch (error) {
      Alert.alert("Clientes", "No se pudo cargar el listado de clientes.");
      return [];
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
      setVehicleForm(createEmptyVehicleForm());
      setEditingVehicleId(null);
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
    setVehicleForm(createEmptyVehicleForm(selectedClientId));
    setEditingVehicleId(null);
  }, [selectedClientId]);

  const resetVehicleForm = () => {
    setVehicleForm(createEmptyVehicleForm(selectedClientId));
    setEditingVehicleId(null);
  };

  const closeVehicleForm = () => {
    resetVehicleForm();
    setVehicleFormVisible(false);
  };

  const openClientDetail = (client, options = {}) => {
    setSelectedClient(client);
    setScreenMode(SCREEN_MODES.DETAIL);
    setVehicleFormVisible(Boolean(options.openVehicleForm));
    setEditingVehicleId(null);
    setVehicleForm(createEmptyVehicleForm(getEntityId(client)));
  };

  const handleBackToList = () => {
    setScreenMode(SCREEN_MODES.LIST);
    setVehicleFormVisible(false);
    setEditingVehicleId(null);
  };

  const handleDelete = (client) => {
    Alert.alert(
      "Eliminar cliente",
      `Se eliminara ${client.fullName || "este cliente"} del padron operativo.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClient(getEntityId(client));

              if (selectedClientId === getEntityId(client)) {
                setSelectedClient(null);
                setScreenMode(SCREEN_MODES.LIST);
                closeVehicleForm();
              }

              await refreshClients();
              Alert.alert("Clientes", "El cliente fue eliminado.");
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

  const openCreateVehicleForm = () => {
    if (!selectedClientId) {
      return;
    }

    resetVehicleForm();
    setVehicleFormVisible(true);
  };

  const handleVehicleSubmit = async () => {
    if (!selectedClientId) {
      Alert.alert("Vehiculos", "Selecciona primero un cliente.");
      return;
    }

    if (!vehicleForm.plate.trim()) {
      Alert.alert("Vehiculos", "Ingresa al menos la placa del vehiculo.");
      return;
    }

    setVehicleSubmitting(true);

    try {
      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleForm);
      } else {
        await createVehicle({
          ...vehicleForm,
          clientId: selectedClientId,
        });
      }

      const nextVehicles = await listVehiclesByClientId(selectedClientId);
      setVehicles(nextVehicles);
      closeVehicleForm();
      Alert.alert(
        "Vehiculos",
        editingVehicleId
          ? "El vehiculo fue actualizado."
          : "El vehiculo fue agregado al cliente.",
      );
    } catch (error) {
      Alert.alert(
        "Vehiculos",
        error?.message || "No se pudo guardar el vehiculo.",
      );
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(getEntityId(vehicle));
    setVehicleForm(buildVehicleForm(vehicle, selectedClientId));
    setVehicleFormVisible(true);
  };

  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      "Eliminar vehiculo",
      `Se eliminara ${vehicle.plate || "este vehiculo"} del cliente activo.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(getEntityId(vehicle));
              const nextVehicles =
                await listVehiclesByClientId(selectedClientId);
              setVehicles(nextVehicles);

              if (editingVehicleId === getEntityId(vehicle)) {
                closeVehicleForm();
              }

              Alert.alert("Vehiculos", "El vehiculo fue eliminado.");
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

  const renderVehicleForm = () => (
    <View
      style={[
        styles.formCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.formHeader}>
        <View style={styles.formHeaderCopy}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {editingVehicleId ? "Editar vehiculo" : "Asociar vehiculo"}
          </Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            Placa, datos operativos y contexto rapido del vehiculo.
          </Text>
        </View>

        <Pressable
          onPress={closeVehicleForm}
          style={[
            styles.secondaryButton,
            {
              borderColor: colors.borderStrong,
              backgroundColor: colors.cardBackground,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Cerrar
          </Text>
        </Pressable>
      </View>

      <View style={styles.formGrid}>
        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Placa</Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, plate: value }))
            }
            placeholder="AB123CD"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.plate}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Marca</Text>
          <TextInput
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, brand: value }))
            }
            placeholder="Toyota"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.brand}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Modelo
          </Text>
          <TextInput
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, model: value }))
            }
            placeholder="Hilux"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.model}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Ano</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, year: value }))
            }
            placeholder="2019"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.year}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Color</Text>
          <TextInput
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, color: value }))
            }
            placeholder="Blanco"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.color}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>VIN</Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, vin: value }))
            }
            placeholder="8X1ABC12345678901"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.vin}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Kilometraje
          </Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) =>
              setVehicleForm((current) => ({ ...current, mileage: value }))
            }
            placeholder="120000"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={vehicleForm.mileage}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          Notas del vehiculo
        </Text>
        <TextInput
          multiline
          numberOfLines={3}
          onChangeText={(value) =>
            setVehicleForm((current) => ({ ...current, notes: value }))
          }
          placeholder="Observaciones, accesorios, condicion general"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.textArea,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          textAlignVertical="top"
          value={vehicleForm.notes}
        />
      </View>

      <Pressable
        onPress={handleVehicleSubmit}
        style={[styles.primaryAction, { backgroundColor: colors.accent }]}
      >
        <Text style={[styles.primaryActionText, { color: colors.white }]}>
          {vehicleSubmitting
            ? "Guardando vehiculo..."
            : editingVehicleId
              ? "Guardar vehiculo"
              : "Asociar vehiculo"}
        </Text>
      </Pressable>
    </View>
  );

  const renderListScreen = () => (
    <>
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.summaryEyebrow, { color: colors.primary }]}>
          Recepcion
        </Text>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          Clientes registrados
        </Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          La lista prioriza la consulta rapida, con busqueda, filtros y accesos
          directos a la ficha del cliente.
        </Text>

        <View style={styles.summaryMetrics}>
          <View
            style={[
              styles.summaryMetric,
              { backgroundColor: colors.cardMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryMetricValue, { color: colors.text }]}>
              {clientStats.totalClients}
            </Text>
            <Text
              style={[
                styles.summaryMetricLabel,
                { color: colors.textSecondary },
              ]}
            >
              Clientes
            </Text>
          </View>
          <View
            style={[
              styles.summaryMetricWide,
              { backgroundColor: colors.cardMuted, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.summaryMetricLabel,
                { color: colors.textSecondary },
              ]}
            >
              Cliente activo
            </Text>
            <Text
              style={[styles.summaryMetricWideText, { color: colors.text }]}
            >
              {clientStats.selectedLabel}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.listCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.searchSection}>
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

        <View style={styles.listHeader}>
          <View style={styles.sectionCopy}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              Lista de clientes
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Usa los iconos para editar, eliminar o asociar vehiculos.
            </Text>
          </View>

          <Pressable onPress={refreshClients}>
            <Text style={[styles.refreshText, { color: colors.primary }]}>
              Actualizar
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : filteredClients.length ? (
          <View style={styles.listBody}>
            {filteredClients.map((client) => {
              const isSelected = getEntityId(client) === selectedClientId;

              return (
                <View
                  key={getEntityId(client)}
                  style={[
                    styles.clientRow,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => openClientDetail(client)}
                    style={styles.clientCopy}
                  >
                    <Text style={[styles.clientTitle, { color: colors.text }]}>
                      {client.fullName}
                    </Text>
                    <Text
                      style={[
                        styles.clientMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {client.id} · {client.phone || "Sin telefono"}
                    </Text>
                    <Text
                      style={[
                        styles.clientMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {client.email || "Sin correo"}
                    </Text>
                    <Text
                      style={[
                        styles.clientMeta,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {client.address || "Sin direccion"}
                    </Text>
                  </Pressable>

                  <View style={styles.iconActionRow}>
                    <Pressable
                      onPress={() =>
                        openClientDetail(client, { openVehicleForm: true })
                      }
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.accent,
                        },
                      ]}
                    >
                      <Ionicons
                        color={colors.accent}
                        name="car-sport-outline"
                        size={rf(18)}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        onOpenClientForm?.(client, {
                          returnTo:
                            screenMode === SCREEN_MODES.DETAIL
                              ? "detail"
                              : "list",
                        })
                      }
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.primary,
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
                      onPress={() => handleDelete(client)}
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.danger,
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
              );
            })}
          </View>
        ) : (
          <Text
            style={[styles.emptyStateText, { color: colors.textSecondary }]}
          >
            {clients.length
              ? "No hay coincidencias con la busqueda o el filtro actual."
              : "No hay clientes registrados. Usa el boton flotante para crear el primero y abrir la operacion de recepcion."}
          </Text>
        )}
      </View>
    </>
  );

  const renderDetailScreen = () => (
    <>
      <View
        style={[
          styles.detailHero,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.detailHeaderRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Cliente activo
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {selectedClient?.fullName || "Detalle del cliente"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ficha operativa con datos de contacto, contexto y vehiculos
              asociados.
            </Text>
          </View>

          <Pressable
            onPress={handleBackToList}
            style={[
              styles.secondaryButton,
              {
                borderColor: colors.borderStrong,
                backgroundColor: colors.cardBackground,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Ver lista
            </Text>
          </Pressable>
        </View>

        <View style={styles.detailMetaGrid}>
          <View style={styles.detailMetaBlock}>
            <Text
              style={[styles.detailMetaLabel, { color: colors.textSecondary }]}
            >
              Codigo
            </Text>
            <Text style={[styles.detailMetaValue, { color: colors.text }]}>
              {selectedClient?.id || "Sin codigo"}
            </Text>
          </View>
          <View style={styles.detailMetaBlock}>
            <Text
              style={[styles.detailMetaLabel, { color: colors.textSecondary }]}
            >
              Telefono
            </Text>
            <Text style={[styles.detailMetaValue, { color: colors.text }]}>
              {selectedClient?.phone || "Sin telefono"}
            </Text>
          </View>
          <View style={styles.detailMetaBlock}>
            <Text
              style={[styles.detailMetaLabel, { color: colors.textSecondary }]}
            >
              Correo
            </Text>
            <Text style={[styles.detailMetaValue, { color: colors.text }]}>
              {selectedClient?.email || "Sin correo"}
            </Text>
          </View>
          <View style={styles.detailMetaBlock}>
            <Text
              style={[styles.detailMetaLabel, { color: colors.textSecondary }]}
            >
              Direccion
            </Text>
            <Text style={[styles.detailMetaValue, { color: colors.text }]}>
              {selectedClient?.address || "Sin direccion"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.notesPanel,
            { backgroundColor: colors.cardMuted, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.detailMetaLabel, { color: colors.textSecondary }]}
          >
            Notas operativas
          </Text>
          <Text style={[styles.notesText, { color: colors.text }]}>
            {selectedClient?.notes || "Sin notas operativas registradas."}
          </Text>
        </View>

        <View style={styles.detailActionRow}>
          <Pressable
            onPress={() =>
              onOpenClientForm?.(selectedClient, {
                returnTo: "detail",
              })
            }
            style={[styles.actionPill, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              color={colors.white}
              name="create-outline"
              size={rf(16)}
            />
            <Text style={[styles.actionPillText, { color: colors.white }]}>
              Editar ficha
            </Text>
          </Pressable>
          <Pressable
            onPress={openCreateVehicleForm}
            style={[styles.actionPill, { backgroundColor: colors.accent }]}
          >
            <Ionicons
              color={colors.white}
              name="car-sport-outline"
              size={rf(16)}
            />
            <Text style={[styles.actionPillText, { color: colors.white }]}>
              Asociar vehiculo
            </Text>
          </Pressable>
        </View>
      </View>

      {vehicleFormVisible && renderVehicleForm()}

      <View
        style={[
          styles.listCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.listHeader}>
          <View style={styles.sectionCopy}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              Vehiculos asociados
            </Text>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              Administra los vehiculos vinculados a este cliente.
            </Text>
          </View>

          <Text style={[styles.counterText, { color: colors.accent }]}>
            {vehicles.length}
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
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.clientCopy}>
                  <Text style={[styles.clientTitle, { color: colors.text }]}>
                    {vehicle.plate}
                  </Text>
                  <Text
                    style={[styles.clientMeta, { color: colors.textSecondary }]}
                  >
                    {vehicle.brand || "Marca"} · {vehicle.model || "Modelo"} ·{" "}
                    {vehicle.year || "Ano"}
                  </Text>
                  <Text
                    style={[styles.clientMeta, { color: colors.textSecondary }]}
                  >
                    {vehicle.id} ·{" "}
                    {vehicle.mileage
                      ? `${vehicle.mileage} km`
                      : "Sin kilometraje"}
                  </Text>
                  <Text
                    style={[styles.clientMeta, { color: colors.textTertiary }]}
                  >
                    {vehicle.notes || "Sin notas del vehiculo"}
                  </Text>
                </View>

                <View style={styles.iconActionRow}>
                  <Pressable
                    onPress={() => handleEditVehicle(vehicle)}
                    style={[
                      styles.iconAction,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.primary,
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
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.danger,
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
          <Text
            style={[styles.emptyStateText, { color: colors.textSecondary }]}
          >
            Este cliente aun no tiene vehiculos asociados. Usa la accion de la
            ficha para registrar el primero.
          </Text>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          screenMode === SCREEN_MODES.LIST && styles.scrollContentWithFab,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Clientes
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {screenMode === SCREEN_MODES.DETAIL
                ? "Detalle operativo"
                : "Base operativa del taller"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {screenMode === SCREEN_MODES.DETAIL
                ? "Consulta la ficha del cliente y administra sus vehiculos desde un solo lugar."
                : "Lista prioritaria de clientes con busqueda, filtros y accesos rapidos para recepcion."}
            </Text>
          </View>

          <Pressable
            onPress={onBack}
            style={[
              styles.backButton,
              {
                borderColor: colors.borderStrong,
                backgroundColor: colors.cardBackground,
              },
            ]}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Volver
            </Text>
          </Pressable>
        </View>

        {screenMode === SCREEN_MODES.LIST
          ? renderListScreen()
          : renderDetailScreen()}
      </ScrollView>

      {screenMode === SCREEN_MODES.LIST && (
        <Pressable
          onPress={() =>
            onOpenClientForm?.(null, {
              returnTo: "detail",
            })
          }
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Ionicons color={colors.white} name="add" size={rf(24)} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  scrollContentWithFab: {
    paddingBottom: spacing.xxl * 2.6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: rf(28),
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  backButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  summaryEyebrow: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryTitle: {
    fontSize: rf(22),
    fontWeight: "900",
  },
  summaryText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryMetric: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: spacing.xxl * 2.1,
    gap: spacing.xs,
  },
  summaryMetricWide: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryMetricValue: {
    fontSize: rf(24),
    fontWeight: "900",
  },
  summaryMetricLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryMetricWideText: {
    fontSize: rf(14),
    fontWeight: "700",
  },
  searchSection: {
    gap: spacing.sm,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  listTitle: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  sectionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionText: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
  refreshText: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filterChipText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
  },
  listBody: {
    gap: spacing.sm,
  },
  clientRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  clientCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  clientTitle: {
    fontSize: rf(15),
    fontWeight: "700",
  },
  clientMeta: {
    fontSize: rf(12),
    lineHeight: rf(18),
  },
  iconActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconAction: {
    width: rf(38),
    height: rf(38),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  formHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  formTitle: {
    fontSize: rf(18),
    fontWeight: "800",
  },
  formSubtitle: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  formGrid: {
    gap: spacing.md,
  },
  formGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
    minHeight: spacing.xxl * 2.5,
  },
  primaryAction: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  primaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  detailHero: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  detailMetaGrid: {
    gap: spacing.md,
  },
  detailMetaBlock: {
    gap: spacing.xs,
  },
  detailMetaLabel: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailMetaValue: {
    fontSize: rf(15),
    fontWeight: "700",
    lineHeight: rf(21),
  },
  notesPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notesText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  detailActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionPillText: {
    fontSize: rf(13),
    fontWeight: "800",
  },
  counterText: {
    fontSize: rf(18),
    fontWeight: "900",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: rf(60),
    height: rf(60),
    borderRadius: rf(30),
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },
});
