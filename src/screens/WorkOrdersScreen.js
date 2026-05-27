import Slider from "@react-native-community/slider";
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
import { useTheme } from "../context/ThemeContext";
import { listStaffProfiles } from "../services/admin/staffAdmin";
import { listClients } from "../services/clients/clientService";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import {
  createProgressEntry,
  listProgressEntriesByWorkOrderId,
  progressEntryTypeOptions,
} from "../services/progressEntries/progressEntryService";
import {
  listSpareParts,
  sparePartStatusOptions,
  updateSparePart,
} from "../services/spareParts/sparePartService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  deleteWorkOrder,
  listWorkOrders,
  updateWorkOrderOperationalState,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
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

function formatDateTime(value) {
  const resolvedDate = value?.toDate ? value.toDate() : value;

  if (!(resolvedDate instanceof Date) || Number.isNaN(resolvedDate.getTime())) {
    return "Sin fecha";
  }

  return resolvedDate.toLocaleString("es-VE");
}

function createEmptyProgressForm(type = "note", progressPercent = 0) {
  return {
    type,
    message: "",
    progressPercent,
    partUpdates: {},
  };
}

function getProgressTypePalette(type, colors) {
  if (type === "status") {
    return {
      accent: colors.warning,
      surface: colors.cardMuted,
      text: colors.warning,
    };
  }

  if (type === "parts") {
    return {
      accent: colors.textTertiary,
      surface: colors.cardMuted,
      text: colors.textSecondary,
    };
  }

  if (type === "delivery") {
    return {
      accent: colors.success,
      surface: colors.cardMuted,
      text: colors.success,
    };
  }

  return {
    accent: colors.primary,
    surface: colors.cardMuted,
    text: colors.primary,
  };
}

function hexToRgb(hex) {
  const normalizedHex = String(hex || "").replace("#", "");

  if (normalizedHex.length !== 6) {
    return { red: 0, green: 0, blue: 0 };
  }

  return {
    red: parseInt(normalizedHex.slice(0, 2), 16),
    green: parseInt(normalizedHex.slice(2, 4), 16),
    blue: parseInt(normalizedHex.slice(4, 6), 16),
  };
}

function rgbToHex({ red, green, blue }) {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getProgressMeterColor(progressPercent, colors) {
  const start = hexToRgb(colors.danger);
  const end = hexToRgb(colors.success);
  const clampedProgress =
    Math.max(0, Math.min(100, Number(progressPercent) || 0)) / 100;

  return rgbToHex({
    red: start.red + (end.red - start.red) * clampedProgress,
    green: start.green + (end.green - start.green) * clampedProgress,
    blue: start.blue + (end.blue - start.blue) * clampedProgress,
  });
}

function resolveProgressButtonLabel(type) {
  if (type === "delivery") {
    return "Confirmar entrega";
  }

  if (type === "parts") {
    return "Registrar repuestos";
  }

  if (type === "status") {
    return "Registrar estado";
  }

  return "Registrar avance";
}

export default function WorkOrdersScreen({
  onBack,
  onOpenSpareParts,
  onOpenSparePartForm,
  onOpenWorkOrderForm,
  userProfile,
  viewState,
}) {
  const { colors } = useTheme();
  const [screenMode, setScreenMode] = useState(SCREEN_MODES.LIST);
  const [loading, setLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [progressEntries, setProgressEntries] = useState([]);
  const [progressForm, setProgressForm] = useState(createEmptyProgressForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const selectedWorkOrderId = getEntityId(selectedWorkOrder);
  const clientLookup = useMemo(() => buildLookup(clients), [clients]);
  const vehicleLookup = useMemo(() => buildLookup(vehicles), [vehicles]);
  const diagnosticLookup = useMemo(
    () => buildLookup(diagnostics),
    [diagnostics],
  );
  const staffLookup = useMemo(
    () => buildLookup(staffProfiles, "uid"),
    [staffProfiles],
  );

  const refreshData = async () => {
    setLoading(true);

    try {
      const [
        nextOrders,
        nextClients,
        nextVehicles,
        nextDiagnostics,
        nextStaff,
        nextSpareParts,
      ] = await Promise.all([
        listWorkOrders(),
        listClients(),
        listVehicles(),
        listDiagnostics(),
        listStaffProfiles(),
        listSpareParts(),
      ]);
      setWorkOrders(nextOrders);
      setClients(nextClients);
      setVehicles(nextVehicles);
      setDiagnostics(nextDiagnostics);
      setStaffProfiles(nextStaff);
      setSpareParts(nextSpareParts);

      if (selectedWorkOrderId) {
        const refreshedOrder = nextOrders.find(
          (item) => getEntityId(item) === selectedWorkOrderId,
        );

        if (refreshedOrder) {
          setSelectedWorkOrder(refreshedOrder);
        } else {
          setSelectedWorkOrder(null);
          setScreenMode(SCREEN_MODES.LIST);
        }
      }
    } catch (error) {
      Alert.alert(
        "Ordenes",
        "No se pudo cargar el tablero operativo de ordenes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!viewState?.selectedWorkOrderId) {
      return;
    }

    const matchedWorkOrder = workOrders.find(
      (workOrder) => getEntityId(workOrder) === viewState.selectedWorkOrderId,
    );

    if (!matchedWorkOrder) {
      return;
    }

    setSelectedWorkOrder(matchedWorkOrder);
    setScreenMode(SCREEN_MODES.DETAIL);
  }, [viewState?.selectedWorkOrderId, workOrders]);

  useEffect(() => {
    if (screenMode !== SCREEN_MODES.DETAIL) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setSelectedWorkOrder(null);
        setScreenMode(SCREEN_MODES.LIST);
        return true;
      },
    );

    return () => subscription.remove();
  }, [screenMode]);

  useEffect(() => {
    if (!selectedWorkOrder?.id) {
      setProgressEntries([]);
      setProgressForm(createEmptyProgressForm());
      return;
    }

    const loadProgress = async () => {
      setProgressLoading(true);

      try {
        const nextEntries = await listProgressEntriesByWorkOrderId(
          selectedWorkOrder.id,
        );
        setProgressEntries(nextEntries);
      } catch (error) {
        Alert.alert(
          "Ordenes",
          "No se pudo cargar la cronologia de avances de esta orden.",
        );
      } finally {
        setProgressLoading(false);
      }
    };

    loadProgress();
  }, [selectedWorkOrder?.id]);

  useEffect(() => {
    setProgressForm(
      createEmptyProgressForm(
        "note",
        Number(selectedWorkOrder?.progressPercent) || 0,
      ),
    );
  }, [selectedWorkOrder?.id, selectedWorkOrder?.progressPercent]);

  const selectedWorkOrderSpareParts = useMemo(
    () =>
      spareParts.filter((part) => part.workOrderId === selectedWorkOrder?.id),
    [selectedWorkOrder?.id, spareParts],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return workOrders.filter((workOrder) => {
      if (activeFilter !== "all" && workOrder.status !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const client = clientLookup[workOrder.clientId];
      const vehicle = vehicleLookup[workOrder.vehicleId];
      const searchableText = [
        workOrder.id,
        workOrder.clientId,
        workOrder.vehicleId,
        workOrder.diagnosticId,
        client?.fullName,
        vehicle?.plate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, clientLookup, searchQuery, vehicleLookup, workOrders]);

  const openWorkOrderDetail = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    setSelectedWorkOrder(null);
    setScreenMode(SCREEN_MODES.LIST);
  };

  const handleDelete = (workOrder) => {
    Alert.alert(
      "Eliminar orden",
      `Se eliminara ${workOrder.id || "esta orden"} del tablero operativo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkOrder(getEntityId(workOrder));

              if (selectedWorkOrderId === getEntityId(workOrder)) {
                handleBackToList();
              }

              await refreshData();
            } catch (error) {
              Alert.alert(
                "Ordenes",
                error?.message || "No se pudo eliminar la orden.",
              );
            }
          },
        },
      ],
    );
  };

  const handleProgressSubmit = async () => {
    if (!selectedWorkOrder) {
      return;
    }

    const selectedPartUpdates = Object.entries(progressForm.partUpdates || {})
      .map(([sparePartId, status]) => {
        const matchedPart = selectedWorkOrderSpareParts.find(
          (part) => getEntityId(part) === sparePartId,
        );

        if (!matchedPart || !status) {
          return null;
        }

        return {
          refId: getEntityId(matchedPart),
          sparePartId: matchedPart.id,
          sparePartName: matchedPart.name,
          status,
          payload: matchedPart,
        };
      })
      .filter(Boolean);

    if (progressForm.type === "note" && !progressForm.message.trim()) {
      Alert.alert("Ordenes", "Describe la nota para registrarla.");
      return;
    }

    if (progressForm.type === "parts" && !selectedPartUpdates.length) {
      Alert.alert(
        "Ordenes",
        "Selecciona al menos un repuesto y su estado para registrarlo.",
      );
      return;
    }

    if (progressForm.type === "delivery" && !progressForm.message.trim()) {
      Alert.alert("Ordenes", "Describe la entrega antes de cerrar la orden.");
      return;
    }

    const confirmDelivery = async () => {
      if (progressForm.type !== "delivery") {
        return true;
      }

      return new Promise((resolve) => {
        Alert.alert(
          "Cerrar orden",
          "Se marcara la orden como terminada y entregada. Deseas continuar?",
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => resolve(false),
            },
            { text: "Cerrar orden", onPress: () => resolve(true) },
          ],
        );
      });
    };

    const deliveryConfirmed = await confirmDelivery();

    if (!deliveryConfirmed) {
      return;
    }

    setProgressSubmitting(true);

    try {
      let entryMessage = progressForm.message.trim();
      let statusSnapshot = selectedWorkOrder.status;
      let progressPercent = null;
      let sparePartUpdates = [];
      let deliveryClosedOrder = false;

      if (progressForm.type === "status") {
        progressPercent = Math.max(
          0,
          Math.min(100, Math.round(Number(progressForm.progressPercent) || 0)),
        );
        entryMessage =
          entryMessage || `Avance operativo ajustado a ${progressPercent}%.`;

        await updateWorkOrderOperationalState(selectedWorkOrderId, {
          progressPercent,
        });
      }

      if (progressForm.type === "parts") {
        await Promise.all(
          selectedPartUpdates.map((partUpdate) =>
            updateSparePart(partUpdate.refId, {
              ...partUpdate.payload,
              status: partUpdate.status,
            }),
          ),
        );

        sparePartUpdates = selectedPartUpdates.map((partUpdate) => ({
          sparePartId: partUpdate.sparePartId,
          sparePartName: partUpdate.sparePartName,
          status: partUpdate.status,
        }));

        entryMessage =
          entryMessage ||
          sparePartUpdates
            .map(
              (item) =>
                `${item.sparePartName} -> ${
                  sparePartStatusOptions.find(
                    (option) => option.key === item.status,
                  )?.label || item.status
                }`,
            )
            .join(". ");
      }

      if (progressForm.type === "delivery") {
        deliveryClosedOrder = true;
        progressPercent = 100;
        statusSnapshot = "delivered";

        await updateWorkOrderOperationalState(selectedWorkOrderId, {
          status: "delivered",
          progressPercent: 100,
        });
      }

      await createProgressEntry({
        workOrderId: selectedWorkOrder.id,
        diagnosticId: selectedWorkOrder.diagnosticId,
        vehicleId: selectedWorkOrder.vehicleId,
        authorUid: userProfile?.uid,
        type: progressForm.type,
        message: entryMessage,
        statusSnapshot,
        progressPercent,
        sparePartUpdates,
        deliveryClosedOrder,
      });

      await refreshData();
      const nextEntries = await listProgressEntriesByWorkOrderId(
        selectedWorkOrder.id,
      );
      setProgressEntries(nextEntries);
      setProgressForm(
        createEmptyProgressForm(
          "note",
          progressForm.type === "delivery"
            ? 100
            : progressForm.type === "status"
              ? Math.round(Number(progressForm.progressPercent) || 0)
              : Number(selectedWorkOrder?.progressPercent) || 0,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Ordenes",
        error?.message || "No se pudo registrar el avance de la orden.",
      );
    } finally {
      setProgressSubmitting(false);
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
          placeholder="Buscar por orden, diagnostico, placa o cliente"
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
          {[{ key: "all", label: "Todas" }, ...workOrderStatusOptions].map(
            (filter) => {
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
            },
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : filteredOrders.length ? (
        <View style={styles.listBody}>
          {filteredOrders.map((workOrder) => {
            const client = clientLookup[workOrder.clientId];
            const vehicle = vehicleLookup[workOrder.vehicleId];
            const diagnostic = diagnosticLookup[workOrder.diagnosticId];
            const assignedMechanics = (workOrder.assignedMechanicUids || [])
              .map(
                (uid) => staffLookup[uid]?.fullName || staffLookup[uid]?.email,
              )
              .filter(Boolean)
              .join(", ");
            const isSelected =
              viewState?.selectedWorkOrderId === getEntityId(workOrder);

            return (
              <View
                key={getEntityId(workOrder)}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => openWorkOrderDetail(workOrder)}
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
                        Operacion
                      </Text>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {workOrder.id}
                      </Text>
                    </View>
                    <Text style={[styles.cardTag, { color: colors.primary }]}>
                      {workOrderStatusOptions.find(
                        (item) => item.key === workOrder.status,
                      )?.label || workOrder.status}
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
                        Diagnostico:
                      </Text>{" "}
                      {diagnostic?.id ||
                        workOrder.diagnosticId ||
                        "Sin diagnostico"}
                    </Text>
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
                      {client?.fullName || workOrder.clientId || "Sin cliente"}
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
                          workOrder.vehicleId ||
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
                          styles.vehicleMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.vehicleMetaLabel,
                            { color: colors.text },
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
                        Mecanicos:
                      </Text>{" "}
                      {assignedMechanics || "Sin mecanicos asignados"}
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.iconActionRow}>
                  <Pressable
                    onPress={() => onOpenWorkOrderForm?.(workOrder)}
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
                    onPress={() => handleDelete(workOrder)}
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
            Operacion
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay ordenes para el filtro actual. Cambia el estado o crea la
            primera orden desde un diagnostico activo.
          </Text>
        </View>
      )}
    </>
  );

  const renderDetailScreen = () => {
    const client = clientLookup[selectedWorkOrder?.clientId];
    const vehicle = vehicleLookup[selectedWorkOrder?.vehicleId];
    const diagnostic = diagnosticLookup[selectedWorkOrder?.diagnosticId];
    const assignedMechanics = (selectedWorkOrder?.assignedMechanicUids || [])
      .map((uid) => staffLookup[uid])
      .filter(Boolean);
    const progressMeterColor = getProgressMeterColor(
      progressForm.progressPercent,
      colors,
    );

    return (
      <>
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.cardHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.primary }]}>
                Operacion
              </Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Resumen de orden
              </Text>
            </View>
            <Text style={[styles.cardTag, { color: colors.primary }]}>
              {selectedWorkOrder?.id || "Sin orden"}
            </Text>
          </View>

          <View style={styles.detailLines}>
            <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
              <Text style={[styles.detailLineLabel, { color: colors.text }]}>
                Diagnostico:
              </Text>{" "}
              {diagnostic?.id ||
                selectedWorkOrder?.diagnosticId ||
                "Sin diagnostico"}
            </Text>
            <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
              <Text style={[styles.detailLineLabel, { color: colors.text }]}>
                Cliente:
              </Text>{" "}
              {client?.fullName || selectedWorkOrder?.clientId || "Sin cliente"}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Vehiculo
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
                  selectedWorkOrder?.vehicleId ||
                  "Sin vehiculo"}
              </Text>
              <View
                style={[
                  styles.vehicleDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <Text
                style={[styles.vehicleMeta, { color: colors.textSecondary }]}
              >
                <Text style={[styles.vehicleMetaLabel, { color: colors.text }]}>
                  Placa:
                </Text>{" "}
                {vehicle?.plate || "Sin placa"}
              </Text>
              <Text
                style={[styles.vehicleMeta, { color: colors.textTertiary }]}
              >
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
              {workOrderStatusOptions.find(
                (item) => item.key === selectedWorkOrder?.status,
              )?.label ||
                selectedWorkOrder?.status ||
                "Sin estado"}
            </Text>
            <Text style={[styles.detailLine, { color: colors.textSecondary }]}>
              <Text style={[styles.detailLineLabel, { color: colors.text }]}>
                Avance:
              </Text>{" "}
              <Text
                style={[
                  styles.detailProgressValue,
                  {
                    color: getProgressMeterColor(
                      selectedWorkOrder?.progressPercent,
                      colors,
                    ),
                  },
                ]}
              >
                {Math.round(Number(selectedWorkOrder?.progressPercent) || 0)}%
              </Text>
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Mecanicos asignados
            </Text>
            <View style={styles.filterRow}>
              {assignedMechanics.length ? (
                assignedMechanics.map((mechanic) => (
                  <View
                    key={mechanic.uid}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.filterChipText, { color: colors.text }]}
                    >
                      {mechanic.fullName || mechanic.email || mechanic.userCode}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.emptyInlineChip,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.emptyInlineChipText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Sin mecanicos asignados
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailActionRow}>
            <Pressable
              onPress={() => onOpenWorkOrderForm?.(selectedWorkOrder)}
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
                Editar orden
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onOpenSpareParts?.(selectedWorkOrder)}
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
                Abrir repuestos de esta orden
              </Text>
            </Pressable>
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
          <View
            style={[styles.cardHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
                Taller
              </Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Registrar avance
              </Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {progressEntryTypeOptions.map((typeOption) => {
              const selected = progressForm.type === typeOption.key;
              const palette = getProgressTypePalette(typeOption.key, colors);

              return (
                <Pressable
                  key={typeOption.key}
                  onPress={() =>
                    setProgressForm(
                      createEmptyProgressForm(
                        typeOption.key,
                        Number(selectedWorkOrder?.progressPercent) || 0,
                      ),
                    )
                  }
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selected
                        ? palette.accent
                        : colors.cardMuted,
                      borderColor: selected ? palette.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selected ? colors.white : palette.text },
                    ]}
                  >
                    {typeOption.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {progressForm.type === "status" ? (
            <View
              style={[
                styles.progressPanel,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.progressHeaderRow}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Avance operativo
                </Text>
                <Text
                  style={[styles.progressValue, { color: progressMeterColor }]}
                >
                  {Math.round(Number(progressForm.progressPercent) || 0)}%
                </Text>
              </View>
              <Slider
                maximumTrackTintColor={colors.borderStrong}
                maximumValue={100}
                minimumTrackTintColor={progressMeterColor}
                minimumValue={0}
                onValueChange={(value) =>
                  setProgressForm((current) => ({
                    ...current,
                    progressPercent: Math.round(value),
                  }))
                }
                step={1}
                style={styles.slider}
                thumbTintColor={progressMeterColor}
                value={Number(progressForm.progressPercent) || 0}
              />
              <View style={styles.progressScaleRow}>
                {[0, 25, 50, 75, 100].map((value) => (
                  <Text
                    key={value}
                    style={[
                      styles.progressScaleText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {value}%
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {progressForm.type === "parts" ? (
            selectedWorkOrderSpareParts.length ? (
              <View style={styles.partsList}>
                {selectedWorkOrderSpareParts.map((part) => {
                  const selectedStatus =
                    progressForm.partUpdates[getEntityId(part)] || "";

                  return (
                    <View
                      key={getEntityId(part)}
                      style={[
                        styles.partCard,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {part.name}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Estado actual:{" "}
                        {sparePartStatusOptions.find(
                          (option) => option.key === part.status,
                        )?.label ||
                          part.status ||
                          "Sin estado"}
                      </Text>
                      <View style={styles.filterRow}>
                        {[
                          { key: "received", label: "Recibido" },
                          { key: "installed", label: "Instalado" },
                        ].map((statusOption) => {
                          const selected = selectedStatus === statusOption.key;

                          return (
                            <Pressable
                              key={statusOption.key}
                              onPress={() =>
                                setProgressForm((current) => ({
                                  ...current,
                                  partUpdates: {
                                    ...current.partUpdates,
                                    [getEntityId(part)]: selected
                                      ? ""
                                      : statusOption.key,
                                  },
                                }))
                              }
                              style={[
                                styles.filterChip,
                                {
                                  backgroundColor: selected
                                    ? colors.textTertiary
                                    : colors.cardBackground,
                                  borderColor: selected
                                    ? colors.textTertiary
                                    : colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.filterChipText,
                                  {
                                    color: selected
                                      ? colors.white
                                      : colors.textSecondary,
                                  },
                                ]}
                              >
                                {statusOption.label}
                              </Text>
                            </Pressable>
                          );
                        })}
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
                    backgroundColor: colors.cardMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.emptyEyebrow, { color: colors.textSecondary }]}
                >
                  Repuestos
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  Esta orden todavia no tiene repuestos cargados. Abrelos desde
                  el bloque superior para agregarlos primero.
                </Text>
              </View>
            )
          ) : null}

          {progressForm.type !== "status" && progressForm.type !== "parts" ? (
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) =>
                setProgressForm((current) => ({ ...current, message: value }))
              }
              placeholder={
                progressForm.type === "delivery"
                  ? "Describe la entrega final, observaciones y conformidad"
                  : "Describe la nota tecnica o novedad operativa"
              }
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
              value={progressForm.message}
            />
          ) : null}

          <Pressable
            onPress={handleProgressSubmit}
            style={[
              styles.primaryButton,
              {
                backgroundColor: getProgressTypePalette(
                  progressForm.type,
                  colors,
                ).accent,
              },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              {progressSubmitting
                ? "Guardando avance..."
                : resolveProgressButtonLabel(progressForm.type)}
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
          <View
            style={[styles.cardHeader, { borderBottomColor: colors.border }]}
          >
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.primary }]}>
                Taller
              </Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                Cronologia
              </Text>
            </View>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
              {progressEntries.length} registro
              {progressEntries.length === 1 ? "" : "s"}
            </Text>
          </View>

          {progressLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : progressEntries.length ? (
            <View style={styles.timelineList}>
              {progressEntries.map((entry) => {
                const author = staffLookup[entry.authorUid];
                const palette = getProgressTypePalette(entry.type, colors);

                return (
                  <View
                    key={getEntityId(entry)}
                    style={[
                      styles.timelineRow,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: palette.accent,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timelineMarker,
                        { backgroundColor: palette.accent },
                      ]}
                    />
                    <View style={styles.timelineCopy}>
                      <View style={styles.timelineTitleRow}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>
                          {progressEntryTypeOptions.find(
                            (item) => item.key === entry.type,
                          )?.label || entry.type}
                        </Text>
                        <View
                          style={[
                            styles.timelineTypeChip,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.accent,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timelineTypeChipText,
                              { color: palette.text },
                            ]}
                          >
                            {progressEntryTypeOptions.find(
                              (item) => item.key === entry.type,
                            )?.label || entry.type}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.rowMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {author?.fullName ||
                          author?.email ||
                          entry.authorUid ||
                          "Sin autor"}{" "}
                        · {formatDateTime(entry.createdAt)}
                      </Text>
                      <Text
                        style={
                          entry.type === "status"
                            ? [
                                styles.timelineProgressText,
                                {
                                  color: getProgressMeterColor(
                                    entry.progressPercent,
                                    colors,
                                  ),
                                },
                              ]
                            : [styles.rowMeta, { color: colors.text }]
                        }
                      >
                        {entry.message}
                      </Text>
                      {entry.type === "parts" &&
                      entry.sparePartUpdates?.length ? (
                        <View style={styles.timelineNestedList}>
                          {entry.sparePartUpdates.map((item) => (
                            <Text
                              key={`${item.sparePartId}-${item.status}`}
                              style={[
                                styles.rowMeta,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {item.sparePartName}:{" "}
                              {sparePartStatusOptions.find(
                                (option) => option.key === item.status,
                              )?.label || item.status}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      {entry.deliveryClosedOrder ? (
                        <Text
                          style={[styles.rowMeta, { color: colors.success }]}
                        >
                          Orden cerrada y entregada.
                        </Text>
                      ) : null}
                      <Text
                        style={[styles.rowMeta, { color: colors.textTertiary }]}
                      >
                        Estado capturado: {entry.statusSnapshot || "sin estado"}
                      </Text>
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
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>
                Cronologia
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay avances registrados todavia. Usa el bloque superior para
                documentar el primer movimiento tecnico.
              </Text>
            </View>
          )}
        </View>
      </>
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
            screenMode === SCREEN_MODES.DETAIL ? handleBackToList : undefined
          }
          section={
            screenMode === SCREEN_MODES.DETAIL ? "Orden activa" : "Operacion"
          }
          subtitle={
            screenMode === SCREEN_MODES.DETAIL
              ? "Desde aqui puedes revisar contexto, mecanicos asignados y avances cronologicos."
              : "Abre la orden desde un diagnostico activo y vuelve a la lista para editar, eliminar o continuar con repuestos."
          }
          title={
            screenMode === SCREEN_MODES.DETAIL
              ? selectedWorkOrder?.id || "Detalle de orden"
              : "Ordenes de trabajo"
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
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
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
  listBody: { gap: spacing.sm },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
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
  formGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: rf(13), fontWeight: "700" },
  vehicleSectionLabel: {
    fontSize: rf(13),
    fontWeight: "900",
    lineHeight: rf(19),
    textTransform: "none",
  },
  listCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  detailLines: { gap: spacing.xs },
  detailLine: { fontSize: rf(14), lineHeight: rf(22) },
  detailLineLabel: { fontSize: rf(14), fontWeight: "800" },
  detailProgressValue: { fontSize: rf(18), fontWeight: "900" },
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
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: rf(88),
    fontSize: rf(14),
  },
  progressPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  progressValue: { fontSize: rf(18), fontWeight: "900" },
  slider: { width: "100%", height: rf(32) },
  progressScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  progressScaleText: { fontSize: rf(11), fontWeight: "700" },
  partsList: { gap: spacing.sm },
  partCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  primaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryButtonText: { fontSize: rf(15), fontWeight: "800" },
  timelineList: { gap: spacing.sm },
  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  timelineRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  timelineMarker: {
    width: rf(10),
    borderRadius: borderRadius.pill,
  },
  timelineCopy: { flex: 1, gap: spacing.xs },
  timelineTypeChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timelineTypeChipText: { fontSize: rf(11), fontWeight: "800" },
  timelineProgressText: { fontSize: rf(18), fontWeight: "900" },
  timelineNestedList: { gap: 2 },
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
  emptyInlineChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  emptyInlineChipText: { fontSize: rf(11), fontWeight: "700" },
  emptyText: { fontSize: rf(14), lineHeight: rf(21) },
});
