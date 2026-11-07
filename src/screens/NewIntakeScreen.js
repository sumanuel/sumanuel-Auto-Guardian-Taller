import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BigButton from "../components/common/BigButton";
import OperationCard from "../components/common/OperationCard";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { listClients } from "../services/clients/clientService";
import { listVehicles } from "../services/vehicles/vehicleService";
import { spacing } from "../utils/responsive";
import { TOUCH } from "../utils/touch";

function normalizePlate(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Recepción: un solo punto de partida para recibir un vehículo. Se escribe la
// placa; si ya existe se abre su diagnóstico, y si no, se registra el cliente
// y el vehículo.
export default function NewIntakeScreen({
  onBack,
  onStartDiagnostic,
  onRegisterNew,
}) {
  const { colors } = useTheme();
  const { activeWorkshopId } = useAuth();
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [nextVehicles, nextClients] = await Promise.all([
        listVehicles(),
        listClients(),
      ]);

      setVehicles(nextVehicles);
      setClients(nextClients);
    } catch (error) {
      Alert.alert(
        "Nuevo ingreso",
        "No se pudo cargar la lista de vehículos. Desliza hacia abajo para reintentar.",
      );
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [activeWorkshopId, loadData]);

  const clientLookup = useMemo(
    () =>
      clients.reduce((accumulator, client) => {
        accumulator[client.id || client.refId] = client;
        return accumulator;
      }, {}),
    [clients],
  );

  const normalizedQuery = normalizePlate(query);
  const matches = useMemo(
    () =>
      normalizedQuery.length >= 2
        ? vehicles.filter((vehicle) =>
            normalizePlate(vehicle.plate).includes(normalizedQuery),
          )
        : [],
    [normalizedQuery, vehicles],
  );
  const hasExactMatch = matches.some(
    (vehicle) => normalizePlate(vehicle.plate) === normalizedQuery,
  );
  const showRegister = normalizedQuery.length >= 3 && !hasExactMatch;

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={async () => {
              setRefreshing(true);
              await loadData();
              setRefreshing(false);
            }}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section="Recepción"
          subtitle="Escribe la placa para abrir el diagnóstico o registrar el vehículo."
          title="Nuevo ingreso"
        />

        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <Ionicons
            color={colors.textTertiary}
            name="search-outline"
            size={28}
          />
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            onChangeText={setQuery}
            placeholder="Placa del vehículo"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text }]}
            value={query}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : null}

        {!loading && normalizedQuery.length < 2 ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Escribe al menos dos caracteres de la placa. Si el vehículo ya está
            registrado aparecerá aquí con su cliente.
          </Text>
        ) : null}

        {matches.map((vehicle) => {
          const client = clientLookup[vehicle.clientId];

          return (
            <OperationCard
              code={vehicle.color || ""}
              key={vehicle.refId || vehicle.id}
              lines={[
                {
                  label: "Cliente",
                  value: client?.fullName || "Sin cliente asociado",
                },
                { label: "Teléfono", value: client?.phone || "Sin teléfono" },
                {
                  label: "Kilometraje",
                  value: vehicle.mileage
                    ? `${vehicle.mileage} km`
                    : "Sin kilometraje",
                },
              ]}
              plate={vehicle.plate}
              title={[vehicle.brand, vehicle.model, vehicle.year]
                .filter(Boolean)
                .join(" ")}
              tone={colors.primary}
            >
              <BigButton
                icon="pulse-outline"
                label="Abrir diagnóstico"
                onPress={() => onStartDiagnostic?.(vehicle, client)}
              />
            </OperationCard>
          );
        })}

        {!loading && showRegister ? (
          <View
            style={[
              styles.registerCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.warning,
              },
            ]}
          >
            <Text style={[styles.registerTitle, { color: colors.text }]}>
              {matches.length
                ? `¿Es otro vehículo? ${normalizedQuery} no está registrado`
                : `${normalizedQuery} no está registrado`}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Registra primero al cliente y luego agrega el vehículo desde su
              ficha.
            </Text>
            <BigButton
              icon="person-add-outline"
              label="Registrar cliente y vehículo"
              onPress={() => onRegisterNew?.(normalizedQuery)}
              variant="warning"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: TOUCH.gap,
    paddingBottom: spacing.xxl,
  },
  inputShell: {
    minHeight: 68,
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  hint: { fontSize: 15, lineHeight: 22 },
  registerCard: {
    borderWidth: 2,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  registerTitle: { fontSize: 20, fontWeight: "900" },
});
