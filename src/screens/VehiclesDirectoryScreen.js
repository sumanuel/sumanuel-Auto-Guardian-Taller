import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
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
import { listClients } from "../services/clients/clientService";
import { listVehicles } from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildVehicleTitle(vehicle) {
  return (
    [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(" ") ||
    vehicle?.plate ||
    "Vehiculo sin descripcion"
  );
}

export default function VehiclesDirectoryScreen({
  onBack,
  onOpenClientDetail,
  onOpenVehicleHistory,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [nextClients, nextVehicles] = await Promise.all([
          listClients(),
          listVehicles(),
        ]);
        setClients(nextClients);
        setVehicles(nextVehicles);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const clientLookup = useMemo(
    () =>
      clients.reduce((accumulator, client) => {
        accumulator[client.id || client.refId] = client;
        return accumulator;
      }, {}),
    [clients],
  );

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery);

    return vehicles.filter((vehicle) => {
      if (!normalizedQuery) {
        return true;
      }

      const client = clientLookup[vehicle.clientId];
      const haystack = [
        vehicle.plate,
        vehicle.brand,
        vehicle.model,
        vehicle.year,
        vehicle.color,
        vehicle.vin,
        client?.fullName,
        client?.identification,
      ]
        .map(normalizeSearchValue)
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [clientLookup, searchQuery, vehicles]);

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WorkshopScreenHeader
          onBack={onBack}
          section="Recepcion"
          subtitle="Consulta toda la flota del taller desde una sola vista con busqueda por placa, cliente o descripcion."
          title="Vehiculos"
        />

        <View
          style={[
            styles.searchShell,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.textTertiary}
              name="search-outline"
              size={rf(18)}
            />
            <TextInput
              autoCapitalize="characters"
              onChangeText={setSearchQuery}
              placeholder="Buscar por placa, cliente, marca o VIN"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
            />
          </View>

          <View
            style={[
              styles.summaryStrip,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {filteredVehicles.length}
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              unidad{filteredVehicles.length === 1 ? "" : "es"} visible
              {filteredVehicles.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        <View style={styles.listWrap}>
          {filteredVehicles.length ? (
            filteredVehicles.map((vehicle) => {
              const client = clientLookup[vehicle.clientId];

              return (
                <Pressable
                  key={vehicle.refId || vehicle.id}
                  onPress={() => onOpenClientDetail?.(vehicle.clientId)}
                  style={[
                    styles.vehicleCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.vehicleCardTopRow}>
                    <View
                      style={[
                        styles.vehicleIconWrap,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        color={colors.accent}
                        name="car-sport-outline"
                        size={rf(18)}
                      />
                    </View>
                    <View style={styles.vehicleTitleBlock}>
                      <Text
                        style={[styles.vehicleTitle, { color: colors.text }]}
                      >
                        {buildVehicleTitle(vehicle)}
                      </Text>
                      <Text
                        style={[styles.vehiclePlate, { color: colors.accent }]}
                      >
                        Placa: {vehicle.plate || "Sin placa"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaGrid}>
                    <Text
                      style={[styles.metaLine, { color: colors.textSecondary }]}
                    >
                      <Text style={[styles.metaLabel, { color: colors.text }]}>
                        Cliente:
                      </Text>{" "}
                      {client?.fullName || "Sin cliente asociado"}
                    </Text>
                    <Text
                      style={[styles.metaLine, { color: colors.textSecondary }]}
                    >
                      <Text style={[styles.metaLabel, { color: colors.text }]}>
                        Color:
                      </Text>{" "}
                      {vehicle.color || "Sin color"}
                    </Text>
                    <Text
                      style={[styles.metaLine, { color: colors.textSecondary }]}
                    >
                      <Text style={[styles.metaLabel, { color: colors.text }]}>
                        Kilometraje:
                      </Text>{" "}
                      {vehicle.mileage
                        ? `${vehicle.mileage} km`
                        : "Sin kilometraje"}
                    </Text>
                    <Text
                      style={[styles.metaLine, { color: colors.textSecondary }]}
                    >
                      <Text style={[styles.metaLabel, { color: colors.text }]}>
                        VIN:
                      </Text>{" "}
                      {vehicle.vin || "Sin VIN"}
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => onOpenClientDetail?.(vehicle.clientId)}
                      style={[
                        styles.secondaryAction,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryActionText,
                          { color: colors.text },
                        ]}
                      >
                        Abrir cliente
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onOpenVehicleHistory?.(vehicle)}
                      style={[
                        styles.secondaryAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryActionText,
                          { color: colors.primary },
                        ]}
                      >
                        Historial operativo
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyEyebrow, { color: colors.primary }]}>
                Flota
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay vehiculos que coincidan con la busqueda actual.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  searchShell: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: rf(14),
    fontWeight: "600",
  },
  summaryStrip: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  summaryValue: {
    fontSize: rf(24),
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  listWrap: {
    gap: spacing.md,
  },
  vehicleCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  vehicleCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  vehicleIconWrap: {
    width: rf(40),
    height: rf(40),
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleTitleBlock: {
    flex: 1,
    gap: 2,
  },
  vehicleTitle: {
    fontSize: rf(16),
    fontWeight: "800",
  },
  vehiclePlate: {
    fontSize: rf(16),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  metaGrid: {
    gap: spacing.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaLine: {
    fontSize: rf(13),
    lineHeight: rf(18),
  },
  metaLabel: {
    fontWeight: "800",
  },
  secondaryAction: {
    flex: 1,
    minHeight: rf(42),
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    fontSize: rf(12),
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyEyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
});
