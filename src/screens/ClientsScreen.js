import { useEffect, useState } from "react";
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
import {
  createClient,
  createEmptyClientForm,
  deleteClient,
  listClients,
  updateClient,
} from "../services/clients/clientService";
import {
  createEmptyVehicleForm,
  createVehicle,
  deleteVehicle,
  listVehiclesByClientId,
  updateVehicle,
} from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

export default function ClientsScreen({ onBack, userProfile }) {
  const { colors } = useTheme();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [form, setForm] = useState(createEmptyClientForm());
  const [selectedClient, setSelectedClient] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(createEmptyVehicleForm());

  const refreshClients = async () => {
    setLoading(true);

    try {
      const nextClients = await listClients();
      setClients(nextClients);
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
    if (!selectedClient?.id) {
      setVehicles([]);
      setVehicleForm(createEmptyVehicleForm());
      setEditingVehicleId(null);
      return;
    }

    const refreshVehicles = async () => {
      setVehicleLoading(true);

      try {
        const nextVehicles = await listVehiclesByClientId(selectedClient.id);
        setVehicles(nextVehicles);
      } catch (error) {
        Alert.alert("Vehiculos", "No se pudo cargar la flota del cliente.");
      } finally {
        setVehicleLoading(false);
      }
    };

    refreshVehicles();
    setVehicleForm(createEmptyVehicleForm(selectedClient.id));
    setEditingVehicleId(null);
  }, [selectedClient?.id]);

  const resetForm = () => {
    setForm(createEmptyClientForm());
    setEditingClientId(null);
  };

  const resetVehicleForm = () => {
    setVehicleForm(createEmptyVehicleForm(selectedClient?.id || ""));
    setEditingVehicleId(null);
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      Alert.alert("Clientes", "Ingresa al menos el nombre del cliente.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingClientId) {
        await updateClient(editingClientId, form);
      } else {
        await createClient({
          ...form,
          createdByUid: userProfile?.uid,
        });
      }

      resetForm();
      await refreshClients();
      Alert.alert(
        "Clientes",
        editingClientId
          ? "El cliente fue actualizado."
          : "El cliente fue creado correctamente.",
      );
    } catch (error) {
      Alert.alert(
        "Clientes",
        error?.message || "No se pudo guardar el cliente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client) => {
    setEditingClientId(client.refId || client.id);
    setSelectedClient(client);
    setForm({
      fullName: client.fullName || "",
      address: client.address || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    });
  };

  const handleDelete = async (client) => {
    try {
      await deleteClient(client.refId || client.id);
      if (editingClientId === (client.refId || client.id)) {
        resetForm();
      }
      if ((selectedClient?.refId || selectedClient?.id) === (client.refId || client.id)) {
        setSelectedClient(null);
      }
      await refreshClients();
      Alert.alert("Clientes", "El cliente fue eliminado.");
    } catch (error) {
      Alert.alert(
        "Clientes",
        error?.message || "No se pudo eliminar el cliente.",
      );
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
  };

  const handleVehicleSubmit = async () => {
    if (!selectedClient?.id) {
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
          clientId: selectedClient.id,
        });
      }

      const nextVehicles = await listVehiclesByClientId(selectedClient.id);
      setVehicles(nextVehicles);
      resetVehicleForm();
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
    setEditingVehicleId(vehicle.refId || vehicle.id);
    setVehicleForm({
      clientId: vehicle.clientId || selectedClient?.id || "",
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
    });
  };

  const handleDeleteVehicle = async (vehicle) => {
    try {
      await deleteVehicle(vehicle.refId || vehicle.id);
      const nextVehicles = await listVehiclesByClientId(selectedClient.id);
      setVehicles(nextVehicles);
      if (editingVehicleId === (vehicle.refId || vehicle.id)) {
        resetVehicleForm();
      }
      Alert.alert("Vehiculos", "El vehiculo fue eliminado.");
    } catch (error) {
      Alert.alert(
        "Vehiculos",
        error?.message || "No se pudo eliminar el vehiculo.",
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              Clientes
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Base operativa del taller
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Crea, actualiza y consulta clientes con sus datos de contacto para
              recepcion y seguimiento.
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
                {editingClientId ? "Editar cliente" : "Nuevo cliente"}
              </Text>
              <Text
                style={[styles.formSubtitle, { color: colors.textSecondary }]}
              >
                Captura el minimo necesario para empezar a operar: nombre,
                contacto y notas.
              </Text>
            </View>

            {editingClientId ? (
              <Pressable
                onPress={resetForm}
                style={[
                  styles.cancelButton,
                  { borderColor: colors.borderStrong },
                ]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancelar edicion
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.formGrid}>
            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Nombre completo
              </Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, fullName: value }))
                }
                placeholder="Cliente principal"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.fullName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Telefono
              </Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, phone: value }))
                }
                placeholder="0412-0000000"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.phone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Correo
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, email: value }))
                }
                placeholder="cliente@correo.com"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.email}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Direccion
              </Text>
              <TextInput
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, address: value }))
                }
                placeholder="Sector, avenida, referencia"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={form.address}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Notas operativas
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, notes: value }))
              }
              placeholder="Preferencias, observaciones o instrucciones de atencion"
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
              value={form.notes}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryActionText, { color: colors.white }]}>
              {submitting
                ? "Guardando cliente..."
                : editingClientId
                  ? "Guardar cambios"
                  : "Crear cliente"}
            </Text>
          </Pressable>
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
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              Clientes registrados
            </Text>
            <Pressable onPress={refreshClients}>
              <Text style={[styles.refreshText, { color: colors.primary }]}>
                Actualizar
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : clients.length ? (
            <View style={styles.listBody}>
              {clients.map((client) => (
                <View
                  key={client.refId || client.id}
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
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => handleSelectClient(client)}
                      style={[
                        styles.rowButton,
                        {
                          borderColor:
                            selectedClient?.id === client.id
                              ? colors.accent
                              : colors.borderStrong,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rowButtonText,
                          {
                            color:
                              selectedClient?.id === client.id
                                ? colors.accent
                                : colors.text,
                          },
                        ]}
                      >
                        Vehiculos
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleEdit(client)}
                      style={[
                        styles.rowButton,
                        { borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rowButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Editar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(client)}
                      style={[styles.rowButton, { borderColor: colors.danger }]}
                    >
                      <Text
                        style={[styles.rowButtonText, { color: colors.danger }]}
                      >
                        Eliminar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              No hay clientes registrados. Crea el primero para abrir la
              operacion de recepcion y vehiculos.
            </Text>
          )}
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
          <View style={styles.listHeader}>
            <View style={styles.sectionCopy}>
              <Text style={[styles.listTitle, { color: colors.text }]}>
                Vehiculos por cliente
              </Text>
              <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                {selectedClient
                  ? `Cliente activo: ${selectedClient.fullName}`
                  : "Selecciona un cliente para asociar uno o varios vehiculos."}
              </Text>
            </View>

            {selectedClient && editingVehicleId ? (
              <Pressable
                onPress={resetVehicleForm}
                style={[styles.cancelButton, { borderColor: colors.borderStrong }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar vehiculo</Text>
              </Pressable>
            ) : null}
          </View>

          {selectedClient ? (
            <>
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
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={vehicleForm.brand}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Modelo</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setVehicleForm((current) => ({ ...current, model: value }))
                    }
                    placeholder="Hilux"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
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
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
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
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
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
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={vehicleForm.vin}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Kilometraje</Text>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) =>
                      setVehicleForm((current) => ({ ...current, mileage: value }))
                    }
                    placeholder="120000"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={vehicleForm.mileage}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Notas del vehiculo</Text>
                <TextInput
                  multiline
                  numberOfLines={3}
                  onChangeText={(value) =>
                    setVehicleForm((current) => ({ ...current, notes: value }))
                  }
                  placeholder="Observaciones, accesorios, condicion general"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
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
                      : "Agregar vehiculo"}
                </Text>
              </Pressable>

              {vehicleLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : vehicles.length ? (
                <View style={styles.listBody}>
                  {vehicles.map((vehicle) => (
                    <View
                      key={vehicle.refId || vehicle.id}
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
                        <Text style={[styles.clientMeta, { color: colors.textSecondary }]}>
                          {vehicle.brand || "Marca"} · {vehicle.model || "Modelo"} · {vehicle.year || "Ano"}
                        </Text>
                        <Text style={[styles.clientMeta, { color: colors.textSecondary }]}>
                          {vehicle.id} · {vehicle.mileage ? `${vehicle.mileage} km` : "Sin kilometraje"}
                        </Text>
                      </View>

                      <View style={styles.rowActions}>
                        <Pressable onPress={() => handleEditVehicle(vehicle)} style={[styles.rowButton, { borderColor: colors.primary }]}>
                          <Text style={[styles.rowButtonText, { color: colors.primary }]}>Editar</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDeleteVehicle(vehicle)} style={[styles.rowButton, { borderColor: colors.danger }]}>
                          <Text style={[styles.rowButtonText, { color: colors.danger }]}>Eliminar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Este cliente aun no tiene vehiculos asociados.
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Selecciona un cliente en la lista superior para asociar uno o varios vehiculos.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
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
  cancelButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelButtonText: {
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
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
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
  refreshText: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  listBody: {
    gap: spacing.sm,
  },
  clientRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  clientCopy: {
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
  rowActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  emptyStateText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
});
