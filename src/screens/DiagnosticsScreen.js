import { Ionicons } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
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
import {
  deleteDiagnostic,
  diagnosticStatusOptions,
  listDiagnostics,
} from "../services/diagnostics/diagnosticService";
import { ensureDiagnosticQuotePdfFile } from "../services/diagnostics/diagnosticQuotePdfService";
import { listVehicles } from "../services/vehicles/vehicleService";
import { borderRadius, rf, spacing } from "../utils/responsive";

const SCREEN_MODES = {
  LIST: "list",
  DETAIL: "detail",
};

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

function buildLookup(items, field = "id") {
  return items.reduce((accumulator, item) => {
    accumulator[item[field]] = item;
    return accumulator;
  }, {});
}

function normalizeWhatsappPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `58${digits.slice(1)}`;
  }

  return digits;
}

const WHATSAPP_PACKAGES = ["com.whatsapp", "com.whatsapp.w4b"];

export default function DiagnosticsScreen({
  onBack,
  onOpenDiagnosticForm,
  onOpenWorkOrderForm,
  viewState,
}) {
  const { colors } = useTheme();
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const selectedDiagnosticId = getEntityId(selectedDiagnostic);

  const clientLookup = useMemo(() => buildLookup(clients), [clients]);
  const vehicleLookup = useMemo(() => buildLookup(vehicles), [vehicles]);

  const refreshData = async () => {
    setLoading(true);

    try {
      const [nextDiagnostics, nextClients, nextVehicles] = await Promise.all([
        listDiagnostics(),
        listClients(),
        listVehicles(),
      ]);
      setDiagnostics(nextDiagnostics);
      setClients(nextClients);
      setVehicles(nextVehicles);

      if (selectedDiagnosticId) {
        const refreshedDiagnostic = nextDiagnostics.find(
          (item) => getEntityId(item) === selectedDiagnosticId,
        );

        if (refreshedDiagnostic) {
          setSelectedDiagnostic(refreshedDiagnostic);
        } else {
          setSelectedDiagnostic(null);
          setScreenMode(SCREEN_MODES.LIST);
        }
      }
    } catch (error) {
      Alert.alert(
        "Diagnosticos",
        "No se pudo cargar el tablero operativo de diagnosticos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!viewState?.selectedDiagnosticId) {
      setSelectedDiagnostic(null);
      setScreenMode(SCREEN_MODES.LIST);
      return;
    }

    const matchedDiagnostic = diagnostics.find(
      (diagnostic) =>
        getEntityId(diagnostic) === viewState.selectedDiagnosticId,
    );

    if (!matchedDiagnostic) {
      return;
    }

    setSelectedDiagnostic(matchedDiagnostic);
    setScreenMode(SCREEN_MODES.DETAIL);
  }, [diagnostics, viewState?.selectedDiagnosticId]);

  useEffect(() => {
    if (screenMode !== SCREEN_MODES.DETAIL) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setSelectedDiagnostic(null);
        setScreenMode(SCREEN_MODES.LIST);
        return true;
      },
    );

    return () => subscription.remove();
  }, [screenMode]);

  const filteredDiagnostics = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return diagnostics.filter((diagnostic) => {
      if (activeFilter !== "all" && diagnostic.status !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const vehicle = vehicleLookup[diagnostic.vehicleId];
      const client = clientLookup[diagnostic.clientId];
      const searchableText = [
        diagnostic.id,
        diagnostic.clientId,
        diagnostic.vehicleId,
        client?.fullName,
        vehicle?.plate,
        diagnostic.concerns,
        diagnostic.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, clientLookup, diagnostics, searchQuery, vehicleLookup]);

  const handleDelete = (diagnostic) => {
    Alert.alert(
      "Eliminar diagnostico",
      `Se eliminara ${diagnostic.id || "este diagnostico"} del tablero operativo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDiagnostic(getEntityId(diagnostic));
              await refreshData();
            } catch (error) {
              Alert.alert(
                "Diagnosticos",
                error?.message || "No se pudo eliminar el diagnostico.",
              );
            }
          },
        },
      ],
    );
  };

  const openDiagnosticDetail = (diagnostic) => {
    setSelectedDiagnostic(diagnostic);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    setSelectedDiagnostic(null);
    setScreenMode(SCREEN_MODES.LIST);
  };

  const handleOpenQuotePdf = async (diagnostic) => {
    try {
      const { fileUri, contentUri, mimeType } =
        await ensureDiagnosticQuotePdfFile(diagnostic);

      if (Platform.OS === "android") {
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: mimeType,
        });
        return;
      }

      await Linking.openURL(fileUri);
    } catch (error) {
      Alert.alert(
        "Diagnosticos",
        error?.message || "No se pudo abrir el PDF de cotizacion.",
      );
    }
  };

  const handleSendQuoteWhatsapp = async (diagnostic, client) => {
    if (!client?.phone) {
      Alert.alert(
        "Diagnosticos",
        "Se debe registrar el numero de telefono del cliente.",
      );
      return;
    }

    const whatsappPhone = normalizeWhatsappPhone(client.phone);

    if (!whatsappPhone) {
      Alert.alert(
        "Diagnosticos",
        "Se debe registrar un numero de telefono valido del cliente.",
      );
      return;
    }

    try {
      const { fileUri, contentUri, mimeType } =
        await ensureDiagnosticQuotePdfFile(diagnostic);
      const canShare = await Sharing.isAvailableAsync();

      const shareOptions = {
        mimeType,
        dialogTitle: `Compartir cotizacion para ${client.fullName || "cliente"}`,
        UTI: "com.adobe.pdf",
      };

      if (Platform.OS === "android") {
        const shareText = `Cotizacion ${diagnostic.id || ""}`.trim();

        for (const packageName of WHATSAPP_PACKAGES) {
          try {
            await IntentLauncher.startActivityAsync(
              "android.intent.action.SEND",
              {
                packageName,
                type: mimeType,
                flags: 1,
                extra: {
                  "android.intent.extra.STREAM": contentUri,
                  "android.intent.extra.TEXT": shareText,
                },
              },
            );
            return;
          } catch (error) {
            if (!String(error?.message || "").includes("Package not found")) {
              throw error;
            }
          }
        }
      }

      if (!canShare) {
        throw new Error("El dispositivo no permite compartir archivos PDF.");
      }

      await Sharing.shareAsync(fileUri, shareOptions);
    } catch (error) {
      Alert.alert(
        "Diagnosticos",
        error?.message ||
          "No se pudo compartir el PDF de cotizacion por WhatsApp.",
      );
    }
  };

  const renderListScreen = () => (
    <>
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
          placeholder="Buscar por codigo, placa, cliente o hallazgo"
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
          {[{ key: "all", label: "Todos" }, ...diagnosticStatusOptions].map(
            (filter) => {
              const filterKey = filter.key;
              const selected = activeFilter === filterKey;

              return (
                <Pressable
                  key={filterKey}
                  onPress={() => setActiveFilter(filterKey)}
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
            },
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : filteredDiagnostics.length ? (
        <View style={styles.listBody}>
          {filteredDiagnostics.map((diagnostic) => {
            const vehicle = vehicleLookup[diagnostic.vehicleId];
            const client = clientLookup[diagnostic.clientId];
            const isClosedDiagnostic = diagnostic.status === "closed";
            const hasQuotePdf = Boolean(
              diagnostic.quotePdfBase64 || diagnostic.quotePdfDownloadUrl,
            );
            const isSelected =
              viewState?.selectedDiagnosticId === getEntityId(diagnostic);

            return (
              <View
                key={getEntityId(diagnostic)}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => openDiagnosticDetail(diagnostic)}
                  style={styles.rowCopy}
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
                        Taller
                      </Text>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {diagnostic.id}
                      </Text>
                    </View>
                    <Text style={[styles.cardTag, { color: colors.primary }]}>
                      {diagnosticStatusOptions.find(
                        (item) => item.key === diagnostic.status,
                      )?.label ||
                        diagnostic.status ||
                        "Sin estado"}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text
                      style={[
                        styles.detailMetaLine,
                        { color: colors.textSecondary },
                      ]}
                    >
                      <Text
                        style={[styles.detailMetaLabel, { color: colors.text }]}
                      >
                        Cliente:
                      </Text>{" "}
                      {client?.fullName || diagnostic.clientId || "Sin cliente"}
                    </Text>
                    <Text
                      style={[
                        styles.vehicleSectionLabel,
                        { color: colors.accent },
                      ]}
                    >
                      vehiculo:
                    </Text>
                    <View
                      style={[
                        styles.vehicleCard,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.vehicleTitle, { color: colors.text }]}
                      >
                        {[vehicle?.brand, vehicle?.model, vehicle?.year]
                          .filter(Boolean)
                          .join(" ") ||
                          vehicle?.plate ||
                          diagnostic.vehicleId ||
                          "Sin vehiculo"}
                      </Text>
                      <View
                        style={[
                          styles.vehicleDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <Text
                        style={[
                          styles.vehiclePlate,
                          { color: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.vehiclePlateLabel,
                            { color: colors.accent },
                          ]}
                        >
                          Placa:
                        </Text>{" "}
                        {vehicle?.plate || "Sin placa"}
                      </Text>
                      <Text
                        style={[
                          styles.vehicleMeta,
                          { color: colors.textTertiary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.vehicleMetaLabel,
                            { color: colors.text },
                          ]}
                        >
                          Kilometraje:
                        </Text>{" "}
                        {vehicle?.mileage
                          ? `${vehicle.mileage} km`
                          : "Sin kilometraje"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.detailMetaLine,
                        { color: colors.textTertiary },
                      ]}
                    >
                      <Text
                        style={[styles.detailMetaLabel, { color: colors.text }]}
                      >
                        Hallazgos:
                      </Text>{" "}
                      {diagnostic.concerns || "Sin hallazgos registrados"}
                    </Text>
                    {isClosedDiagnostic ? (
                      <View
                        style={[
                          styles.closedNotice,
                          {
                            backgroundColor: colors.cardMuted,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.closedNoticeTitle,
                            { color: colors.accent },
                          ]}
                        >
                          Ya convertido en orden
                        </Text>
                        <Text
                          style={[
                            styles.closedNoticeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Este diagnostico ya fue cerrado al abrir su orden de
                          trabajo.
                        </Text>
                      </View>
                    ) : null}
                    {!isClosedDiagnostic ? (
                      <Pressable
                        onPress={() =>
                          onOpenWorkOrderForm?.(null, {
                            seedData: {
                              diagnosticId: diagnostic.id,
                              clientId: diagnostic.clientId,
                              vehicleId: diagnostic.vehicleId,
                            },
                          })
                        }
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
                            { color: colors.accent },
                          ]}
                        >
                          Crear orden desde este diagnostico
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.iconActionRow}>
                  {!isClosedDiagnostic ? (
                    <Pressable
                      onPress={() => onOpenDiagnosticForm?.(diagnostic)}
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
                  ) : null}
                  <Pressable
                    onPress={() => handleDelete(diagnostic)}
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
                  {hasQuotePdf ? (
                    <Pressable
                      onPress={() => handleOpenQuotePdf(diagnostic)}
                      style={[
                        styles.iconAction,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        color={colors.accent}
                        name="document-text-outline"
                        size={rf(17)}
                      />
                    </Pressable>
                  ) : null}
                  {hasQuotePdf ? (
                    <Pressable
                      onPress={() =>
                        handleSendQuoteWhatsapp(diagnostic, client)
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
                        color="#25D366"
                        name="logo-whatsapp"
                        size={rf(17)}
                      />
                    </Pressable>
                  ) : null}
                </View>
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
            Taller
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay diagnosticos para el filtro actual. Ajusta el estado o
            registra una nueva revision desde la ficha del cliente.
          </Text>
        </View>
      )}
    </>
  );

  const renderDetailScreen = () => {
    const client = clientLookup[selectedDiagnostic?.clientId];
    const vehicle = vehicleLookup[selectedDiagnostic?.vehicleId];
    const isClosedDiagnostic = selectedDiagnostic?.status === "closed";

    return (
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
              Taller
            </Text>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Resumen de diagnostico
            </Text>
          </View>
          <Text style={[styles.cardTag, { color: colors.primary }]}>
            {selectedDiagnostic?.id || "Sin diagnostico"}
          </Text>
        </View>

        <View style={styles.detailLines}>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Cliente:
            </Text>{" "}
            {client?.fullName || selectedDiagnostic?.clientId || "Sin cliente"}
          </Text>
          <Text style={[styles.vehicleSectionLabel, { color: colors.accent }]}>
            vehiculo:
          </Text>
          <View
            style={[
              styles.vehicleCard,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.vehicleTitle, { color: colors.text }]}>
              {[vehicle?.brand, vehicle?.model, vehicle?.year]
                .filter(Boolean)
                .join(" ") ||
                vehicle?.plate ||
                selectedDiagnostic?.vehicleId ||
                "Sin vehiculo"}
            </Text>
            <View
              style={[
                styles.vehicleDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <Text style={[styles.vehiclePlate, { color: colors.accent }]}> 
              <Text
                style={[styles.vehiclePlateLabel, { color: colors.accent }]}
              >
                Placa:
              </Text>{" "}
              {vehicle?.plate || "Sin placa"}
            </Text>
            <Text style={[styles.vehicleMeta, { color: colors.textTertiary }]}>
              <Text style={[styles.vehicleMetaLabel, { color: colors.text }]}>
                Kilometraje:
              </Text>{" "}
              {vehicle?.mileage ? `${vehicle.mileage} km` : "Sin kilometraje"}
            </Text>
          </View>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Estado:
            </Text>{" "}
            {diagnosticStatusOptions.find(
              (item) => item.key === selectedDiagnostic?.status,
            )?.label ||
              selectedDiagnostic?.status ||
              "Sin estado"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Hallazgos:
            </Text>{" "}
            {selectedDiagnostic?.concerns || "Sin hallazgos registrados"}
          </Text>
          <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
            <Text style={[styles.detailLineLabel, { color: colors.text }]}>
              Notas:
            </Text>{" "}
            {selectedDiagnostic?.notes || "Sin notas adicionales"}
          </Text>
        </View>

        <View style={styles.detailActionRow}>
          {!isClosedDiagnostic ? (
            <Pressable
              onPress={() => onOpenDiagnosticForm?.(selectedDiagnostic)}
              style={[
                styles.secondaryAction,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.secondaryActionText, { color: colors.primary }]}
              >
                Editar diagnostico
              </Text>
            </Pressable>
          ) : null}
          {!isClosedDiagnostic ? (
            <Pressable
              onPress={() =>
                onOpenWorkOrderForm?.(null, {
                  seedData: {
                    diagnosticId: selectedDiagnostic?.id,
                    clientId: selectedDiagnostic?.clientId,
                    vehicleId: selectedDiagnostic?.vehicleId,
                  },
                })
              }
              style={[
                styles.secondaryAction,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.secondaryActionText, { color: colors.accent }]}
              >
                Crear orden desde este diagnostico
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={
            screenMode === SCREEN_MODES.DETAIL ? handleBackToList : onBack
          }
          section={
            screenMode === SCREEN_MODES.DETAIL ? "Diagnostico" : "Taller"
          }
          subtitle={
            screenMode === SCREEN_MODES.DETAIL
              ? "Revisa el contexto y abre la orden operativa sin perder la lectura rapida del caso."
              : "Registra hallazgos, consulta el padron y abre la siguiente accion desde la lista, igual que en Auto-Guardian."
          }
          title={
            screenMode === SCREEN_MODES.DETAIL
              ? selectedDiagnostic?.id || "Detalle de diagnostico"
              : "Diagnosticos"
          }
        />

        {screenMode === SCREEN_MODES.LIST
          ? renderListScreen()
          : renderDetailScreen()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, position: "relative" },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },
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
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipText: { fontSize: rf(12), fontWeight: "700" },
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  listBody: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
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
  cardTag: { fontSize: rf(11), fontWeight: "800", textAlign: "right" },
  cardBody: { gap: spacing.xs },
  rowTitle: { fontSize: rf(17), fontWeight: "800" },
  rowMeta: { fontSize: rf(13), lineHeight: rf(19) },
  detailMetaLine: { fontSize: rf(13), lineHeight: rf(19) },
  detailMetaLabel: { fontSize: rf(13), fontWeight: "800" },
  fieldLabel: { fontSize: rf(13), fontWeight: "700" },
  vehicleSectionLabel: {
    fontSize: rf(13),
    fontWeight: "900",
    lineHeight: rf(19),
    textTransform: "none",
  },
  detailLines: { gap: spacing.xs },
  detailLine: { fontSize: rf(14), lineHeight: rf(22) },
  detailLineLabel: { fontSize: rf(14), fontWeight: "800" },
  vehicleCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  vehicleTitle: { fontSize: rf(15), fontWeight: "800", lineHeight: rf(21) },
  vehicleDivider: {
    height: 1,
    width: "100%",
    borderRadius: borderRadius.pill,
  },
  vehicleMeta: { fontSize: rf(13), lineHeight: rf(19) },
  vehicleMetaLabel: { fontSize: rf(13), fontWeight: "800" },
  vehiclePlate: {
    fontSize: rf(16),
    lineHeight: rf(20),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  vehiclePlateLabel: { fontSize: rf(16), fontWeight: "900" },
  closedNotice: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  closedNoticeTitle: { fontSize: rf(12), fontWeight: "900" },
  closedNoticeText: { fontSize: rf(12), lineHeight: rf(18) },
  detailActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  secondaryActionText: { fontSize: rf(13), fontWeight: "800" },
  iconActionRow: { gap: spacing.xs, justifyContent: "center" },
  iconAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: rf(36),
    height: rf(36),
    alignItems: "center",
    justifyContent: "center",
  },
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
  emptyText: { fontSize: rf(14), lineHeight: rf(21) },
});
