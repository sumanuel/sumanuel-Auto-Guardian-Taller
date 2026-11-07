import Slider from "@react-native-community/slider";
import BigButton from "../components/common/BigButton";
import BigChip from "../components/common/BigChip";
import ContactBar from "../components/common/ContactBar";
import DetailHero from "../components/common/DetailHero";
import ConfirmModal from "../components/common/ConfirmModal";
import PhotoStrip from "../components/common/PhotoStrip";
import ProgressTimeline from "../components/common/ProgressTimeline";
import RequestPartModal from "../components/common/RequestPartModal";
import StatusActionBar from "../components/common/StatusActionBar";
import StepperPercent from "../components/common/StepperPercent";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
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
import DateRangeFilterModal from "../components/common/DateRangeFilterModal";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import OperationCard from "../components/common/OperationCard";
import { getWorkOrderTone } from "../utils/statusTone";
import {
  isMechanicRole,
  isWorkOrderAssignedToUser,
} from "../constants/accessControl";
import { useAuth } from "../context/AuthContext";
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
  captureWorkPhoto,
  MAX_ENTRY_PHOTOS,
  pickWorkPhoto,
  uploadWorkOrderPhotos,
} from "../services/media/photoService";
import {
  createSparePart,
  listSpareParts,
  sparePartStatusOptions,
  updateSparePart,
} from "../services/spareParts/sparePartService";
import { listVehicles } from "../services/vehicles/vehicleService";
import {
  listWorkOrders,
  updateWorkOrderOperationalState,
  workOrderStatusOptions,
} from "../services/workOrders/workOrderService";
import { isOnlineNow, OFFLINE_WRITE_MESSAGE } from "../utils/connectivity";
import { borderRadius, rf, spacing } from "../utils/responsive";
import {
  createLastDaysRange,
  formatDateRangeLabel,
  getSharedOperationalDateRange,
  getTimestampMillis,
  isWithinDateRange,
  setSharedOperationalDateRange,
} from "../utils/dateRange";

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

function parseOperationalProgressMessage(message) {
  const normalizedMessage = String(message || "");
  const match = normalizedMessage.match(
    /^(Avance operativo ajustado a )([0-9]+%\.?)(.*)$/i,
  );

  if (!match) {
    return null;
  }

  return {
    prefix: match[1],
    value: match[2],
    suffix: match[3] || "",
  };
}

function createEmptyProgressForm(type = "note", progressPercent = 0) {
  return {
    type,
    message: "",
    operationalStatus: "",
    progressPercent,
    partUpdates: {},
    photos: [],
  };
}

function getSuggestedReactivationProgress(progressPercent) {
  const currentProgress = Math.round(Number(progressPercent) || 0);

  if (currentProgress >= 100) {
    return 90;
  }

  if (currentProgress <= 0) {
    return 10;
  }

  return currentProgress;
}

const noteOperationalStatusOptions = [
  { key: "in-progress", label: "En proceso" },
  { key: "paused", label: "En pausa" },
  { key: "ready", label: "Lista" },
];

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

function resolveWorkOrderStatusLabel(status) {
  return (
    workOrderStatusOptions.find((item) => item.key === status)?.label ||
    (status === "approved" ? "Abierta" : status) ||
    "Sin estado"
  );
}

function isWorkOrderProgressLocked(status) {
  return status === "ready" || status === "delivered";
}

export default function WorkOrdersScreen({
  onBack,
  onOpenSpareParts,
  onOpenSparePartForm,
  onOpenWorkOrderForm,
  currentRole,
  userProfile,
  viewState,
}) {
  const { colors } = useTheme();
  const { activeWorkshopId } = useAuth();
  const isMechanicUser = isMechanicRole(currentRole);
  const currentUserUid = userProfile?.uid || "";
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
  const [dateRange, setDateRange] = useState(() =>
    getSharedOperationalDateRange(),
  );
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);

  const resetDateRangeToLastThirtyDays = () => {
    const nextRange = setSharedOperationalDateRange(createLastDaysRange(30));
    setDateRange(nextRange);
    return nextRange;
  };

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
  const visibleWorkOrders = useMemo(
    () =>
      isMechanicUser
        ? workOrders.filter((workOrder) =>
            isWorkOrderAssignedToUser(workOrder, currentUserUid),
          )
        : workOrders,
    [currentUserUid, isMechanicUser, workOrders],
  );

  const refreshData = async () => {
    setLoading(true);

    try {
      const [
        nextOrdersResult,
        nextClientsResult,
        nextVehiclesResult,
        nextDiagnosticsResult,
        nextStaffResult,
        nextSparePartsResult,
      ] = await Promise.allSettled([
        listWorkOrders(),
        listClients(),
        listVehicles(),
        listDiagnostics(),
        listStaffProfiles(),
        listSpareParts(),
      ]);

      if (nextOrdersResult.status !== "fulfilled") {
        throw nextOrdersResult.reason;
      }

      const nextOrders = nextOrdersResult.value;
      const nextClients =
        nextClientsResult.status === "fulfilled" ? nextClientsResult.value : [];
      const nextVehicles =
        nextVehiclesResult.status === "fulfilled"
          ? nextVehiclesResult.value
          : [];
      const nextDiagnostics =
        nextDiagnosticsResult.status === "fulfilled"
          ? nextDiagnosticsResult.value
          : [];
      const nextStaff =
        nextStaffResult.status === "fulfilled" ? nextStaffResult.value : [];
      const nextSpareParts =
        nextSparePartsResult.status === "fulfilled"
          ? nextSparePartsResult.value
          : [];

      setWorkOrders(nextOrders);
      setClients(nextClients);
      setVehicles(nextVehicles);
      setDiagnostics(nextDiagnostics);
      setStaffProfiles(nextStaff);
      setSpareParts(nextSpareParts);

      if (selectedWorkOrderId) {
        const refreshedOrder = (
          isMechanicUser
            ? nextOrders.filter((workOrder) =>
                isWorkOrderAssignedToUser(workOrder, currentUserUid),
              )
            : nextOrders
        ).find((item) => getEntityId(item) === selectedWorkOrderId);

        if (refreshedOrder) {
          setSelectedWorkOrder(refreshedOrder);
        } else {
          setSelectedWorkOrder(null);
          setScreenMode(SCREEN_MODES.LIST);
        }
      }
    } catch (error) {
      console.error("WorkOrdersScreen refresh failed:", error);
      Alert.alert(
        "Órdenes",
        "No se pudo cargar el tablero operativo de órdenes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeWorkshopId]);

  useEffect(() => {
    if (!viewState?.selectedWorkOrderId) {
      return;
    }

    const matchedWorkOrder = visibleWorkOrders.find(
      (workOrder) => getEntityId(workOrder) === viewState.selectedWorkOrderId,
    );

    if (!matchedWorkOrder) {
      return;
    }

    setSelectedWorkOrder(matchedWorkOrder);
    setScreenMode(SCREEN_MODES.DETAIL);
  }, [viewState?.selectedWorkOrderId, visibleWorkOrders]);

  useEffect(() => {
    if (screenMode !== SCREEN_MODES.DETAIL) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (viewState?.detailEntry) {
          onBack?.();
          return true;
        }

        setSelectedWorkOrder(null);
        setScreenMode(SCREEN_MODES.LIST);
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack, screenMode, viewState?.detailEntry]);

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
          "Órdenes",
          "No se pudo cargar la cronología de avances de esta orden.",
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

    return visibleWorkOrders.filter((workOrder) => {
      if (activeFilter !== "all" && workOrder.status !== activeFilter) {
        return false;
      }

      const matchesDate = isWithinDateRange(
        getTimestampMillis(workOrder.updatedAt) ||
          getTimestampMillis(workOrder.createdAt),
        dateRange,
      );

      if (!matchesDate) {
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
  }, [
    activeFilter,
    clientLookup,
    dateRange,
    searchQuery,
    vehicleLookup,
    visibleWorkOrders,
  ]);

  const openWorkOrderDetail = (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setScreenMode(SCREEN_MODES.DETAIL);
  };

  const handleBackToList = () => {
    if (viewState?.detailEntry) {
      onBack?.();
      return;
    }

    setSelectedWorkOrder(null);
    setScreenMode(SCREEN_MODES.LIST);
  };

  const handleProgressSubmit = async (formOverride) => {
    if (!(await isOnlineNow())) {
      Alert.alert("Sin conexión", OFFLINE_WRITE_MESSAGE);
      return;
    }

    const activeForm =
      formOverride && formOverride.partUpdates ? formOverride : progressForm;

    if (!selectedWorkOrder) {
      return;
    }

    const isProgressLocked = isWorkOrderProgressLocked(
      selectedWorkOrder.status,
    );
    const canReopenWithNote =
      activeForm.type === "note" &&
      activeForm.operationalStatus === "in-progress";

    if (isProgressLocked && !canReopenWithNote) {
      Alert.alert(
        "Órdenes",
        "Esta orden está lista o entregada. Para registrar más avances debes agregar una nota y cambiar su estado a En proceso.",
      );
      return;
    }

    const selectedPartUpdates = Object.entries(activeForm.partUpdates || {})
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

    if (
      activeForm.type === "note" &&
      !activeForm.message.trim() &&
      !(activeForm.photos || []).length
    ) {
      Alert.alert("Órdenes", "Describe la nota para registrarla.");
      return;
    }

    if (activeForm.type === "parts" && !selectedPartUpdates.length) {
      Alert.alert(
        "Órdenes",
        "Selecciona al menos un repuesto y su estado para registrarlo.",
      );
      return;
    }

    if (activeForm.type === "delivery" && !activeForm.message.trim()) {
      Alert.alert("Órdenes", "Describe la entrega antes de cerrar la orden.");
      return;
    }

    const confirmDelivery = async () => {
      if (activeForm.type !== "delivery") {
        return true;
      }

      return new Promise((resolve) => {
        Alert.alert(
          "Cerrar orden",
          "Se marcará la orden como terminada y entregada. Deseas continuar?",
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
      const uploadedPhotos = (activeForm.photos || []).length
        ? await uploadWorkOrderPhotos(selectedWorkOrder.id, activeForm.photos)
        : [];
      let entryMessage =
        activeForm.message.trim() ||
        (uploadedPhotos.length ? "Foto adjunta." : "");
      let statusSnapshot = selectedWorkOrder.status;
      let statusChangedTo = "";
      let progressPercent = null;
      let sparePartUpdates = [];
      let deliveryClosedOrder = false;
      const nextOperationalStatus = activeForm.operationalStatus || "";

      if (activeForm.type === "note" && nextOperationalStatus) {
        statusSnapshot = nextOperationalStatus;
        statusChangedTo =
          nextOperationalStatus !== selectedWorkOrder.status
            ? nextOperationalStatus
            : "";

        if (nextOperationalStatus === "ready") {
          progressPercent = 100;
        }

        if (
          nextOperationalStatus === "in-progress" &&
          isProgressLocked &&
          Number(selectedWorkOrder?.progressPercent) >= 100
        ) {
          progressPercent = Math.round(Number(activeForm.progressPercent) || 0);
        }

        if (
          nextOperationalStatus !== selectedWorkOrder.status ||
          nextOperationalStatus === "ready" ||
          (nextOperationalStatus === "in-progress" && isProgressLocked)
        ) {
          await updateWorkOrderOperationalState(selectedWorkOrderId, {
            status: nextOperationalStatus,
            progressPercent,
          });
        }
      }

      if (activeForm.type === "status") {
        progressPercent = Math.max(
          0,
          Math.min(100, Math.round(Number(activeForm.progressPercent) || 0)),
        );
        entryMessage =
          entryMessage || `Avance operativo ajustado a ${progressPercent}%.`;

        await updateWorkOrderOperationalState(selectedWorkOrderId, {
          progressPercent,
        });
      }

      if (activeForm.type === "parts") {
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

      if (activeForm.type === "delivery") {
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
        type: activeForm.type,
        message: entryMessage,
        statusSnapshot,
        statusChangedTo,
        progressPercent,
        sparePartUpdates,
        deliveryClosedOrder,
        photos: uploadedPhotos,
      });

      await refreshData();
      const nextEntries = await listProgressEntriesByWorkOrderId(
        selectedWorkOrder.id,
      );
      setProgressEntries(nextEntries);
      setProgressForm(
        createEmptyProgressForm(
          "note",
          activeForm.type === "delivery"
            ? 100
            : activeForm.type === "status"
              ? Math.round(Number(activeForm.progressPercent) || 0)
              : activeForm.type === "note" &&
                  activeForm.operationalStatus === "ready"
                ? 100
                : Number(selectedWorkOrder?.progressPercent) || 0,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Órdenes",
        error?.message || "No se pudo registrar el avance de la orden.",
      );
    } finally {
      setProgressSubmitting(false);
    }
  };

  const [partModalVisible, setPartModalVisible] = useState(false);
  const [partSubmitting, setPartSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const formAnchorY = useRef(0);
  const [pendingAction, setPendingAction] = useState(null);

  const scrollToProgressForm = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, formAnchorY.current - 12),
      animated: true,
    });
  };

  const buildQuickForm = (kind) => {
    const currentProgress = Number(selectedWorkOrder?.progressPercent) || 0;
    const locked = isWorkOrderProgressLocked(selectedWorkOrder?.status);

    if (kind === "start") {
      return {
        ...createEmptyProgressForm("note", currentProgress),
        operationalStatus: "in-progress",
        message:
          selectedWorkOrder?.status === "paused"
            ? "Trabajo reanudado."
            : "Trabajo iniciado.",
      };
    }

    if (kind === "pause") {
      return {
        ...createEmptyProgressForm("note", currentProgress),
        operationalStatus: "paused",
        message: "Orden en pausa.",
      };
    }

    if (kind === "ready") {
      return {
        ...createEmptyProgressForm("note", 100),
        operationalStatus: "ready",
        message: "Trabajo terminado. Orden lista para entrega.",
      };
    }

    return {
      ...createEmptyProgressForm(
        "note",
        locked
          ? getSuggestedReactivationProgress(currentProgress)
          : currentProgress,
      ),
      operationalStatus: "in-progress",
      message: "Orden reabierta para continuar el trabajo.",
    };
  };

  const addPhoto = async (source) => {
    if ((progressForm.photos || []).length >= MAX_ENTRY_PHOTOS) {
      Alert.alert(
        "Fotos",
        `Puedes adjuntar hasta ${MAX_ENTRY_PHOTOS} fotos por registro.`,
      );
      return;
    }

    try {
      const uri =
        source === "camera" ? await captureWorkPhoto() : await pickWorkPhoto();

      if (uri) {
        setProgressForm((current) => ({
          ...current,
          photos: [...(current.photos || []), uri],
        }));
      }
    } catch (error) {
      Alert.alert("Fotos", error?.message || "No se pudo obtener la foto.");
    }
  };

  const removePhoto = (index) =>
    setProgressForm((current) => ({
      ...current,
      photos: (current.photos || []).filter((_, i) => i !== index),
    }));

  const handleRequestPart = async ({ name, quantity }) => {
    if (!selectedWorkOrder) {
      return;
    }

    if (!(await isOnlineNow())) {
      Alert.alert("Sin conexión", OFFLINE_WRITE_MESSAGE);
      return;
    }

    setPartSubmitting(true);

    try {
      await createSparePart({
        workOrderId: selectedWorkOrder.id,
        diagnosticId: selectedWorkOrder.diagnosticId,
        name,
        quantity,
        status: "requested",
      });

      await createProgressEntry({
        workOrderId: selectedWorkOrder.id,
        diagnosticId: selectedWorkOrder.diagnosticId,
        vehicleId: selectedWorkOrder.vehicleId,
        authorUid: userProfile?.uid,
        type: "parts",
        message: `Repuesto solicitado: ${name} (x${quantity}).`,
        statusSnapshot: selectedWorkOrder.status,
      });

      setPartModalVisible(false);
      await refreshData();
      setProgressEntries(
        await listProgressEntriesByWorkOrderId(selectedWorkOrder.id),
      );
    } catch (error) {
      Alert.alert(
        "Repuestos",
        error?.message || "No se pudo registrar la solicitud del repuesto.",
      );
    } finally {
      setPartSubmitting(false);
    }
  };

  const quickActionCopy = {
    pause: {
      title: "¿Pausar la orden?",
      message:
        "La orden quedará en pausa. Después puedes agregar el motivo con una nota.",
      confirmLabel: "Pausar",
      tone: "warning",
    },
    ready: {
      title: "¿Marcar como lista?",
      message:
        "La orden pasará a Lista con 100% de avance y recepción podrá coordinar la entrega.",
      confirmLabel: "Sí, está lista",
      tone: "success",
    },
    reopen: {
      title: "¿Reabrir la orden?",
      message:
        "La orden vuelve a En proceso. Ajusta el avance real desde Avance si hace falta.",
      confirmLabel: "Reabrir",
      tone: "primary",
    },
  };

  const runQuickAction = async (kind) => {
    setPendingAction(null);
    await handleProgressSubmit(buildQuickForm(kind));
  };

  const requestQuickAction = (kind) => {
    if (kind === "start") {
      runQuickAction(kind);
      return;
    }

    setPendingAction(kind);
  };

  const openProgressForm = (type) => {
    setProgressForm(
      createEmptyProgressForm(
        type,
        Number(selectedWorkOrder?.progressPercent) || 0,
      ),
    );
    setTimeout(scrollToProgressForm, 50);
  };

  const quickPhrases = [
    "Falta repuesto",
    "Esperando aprobación del cliente",
    "Pieza instalada",
    "Prueba de ruta OK",
    "Fuga detectada",
    "Se requiere más tiempo",
  ];

  const appendQuickPhrase = (phrase) =>
    setProgressForm((current) => ({
      ...current,
      message: current.message
        ? `${current.message.trim()}. ${phrase}`
        : phrase,
    }));

  const statusBarActions = (() => {
    if (!isMechanicUser || !selectedWorkOrder) {
      return [];
    }

    const status =
      selectedWorkOrder.status === "approved"
        ? "open"
        : selectedWorkOrder.status;
    const busy = progressSubmitting;
    const noteAction = {
      key: "note",
      label: "Nota",
      icon: "create-outline",
      tone: "primary",
      disabled: busy,
      onPress: () => openProgressForm("note"),
    };
    const progressAction = {
      key: "progress",
      label: "Avance",
      icon: "speedometer-outline",
      tone: "primary",
      disabled: busy,
      onPress: () => openProgressForm("status"),
    };

    if (status === "in-progress") {
      return [
        {
          key: "pause",
          label: "Pausar",
          icon: "pause",
          tone: "warning",
          disabled: busy,
          onPress: () => requestQuickAction("pause"),
        },
        progressAction,
        {
          key: "ready",
          label: "Listo",
          icon: "checkmark-circle",
          tone: "success",
          active: true,
          disabled: busy,
          onPress: () => requestQuickAction("ready"),
        },
        noteAction,
      ];
    }

    if (status === "paused") {
      return [
        {
          key: "start",
          label: "Reanudar",
          icon: "play",
          tone: "primary",
          active: true,
          disabled: busy,
          onPress: () => requestQuickAction("start"),
        },
        noteAction,
      ];
    }

    // Una orden entregada también puede reabrirse (el cliente vuelve por un
    // detalle); la lógica de guardado ya lo permite con una nota En proceso.
    if (status === "ready" || status === "delivered") {
      return [
        {
          key: "reopen",
          label: "Reabrir",
          icon: "refresh",
          tone: "warning",
          active: true,
          disabled: busy,
          onPress: () => requestQuickAction("reopen"),
        },
        noteAction,
      ];
    }

    return [
      {
        key: "start",
        label: "Iniciar",
        icon: "play",
        tone: "primary",
        active: true,
        disabled: busy,
        onPress: () => requestQuickAction("start"),
      },
      noteAction,
    ];
  })();

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
        <View style={styles.searchRow}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setSearchQuery}
            placeholder="Buscar por orden, diagnóstico, placa o cliente"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              styles.searchInput,
              styles.inputLarge,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={searchQuery}
          />
          <Pressable
            onPress={() => setIsDateFilterVisible(true)}
            style={[
              styles.iconAction,
              styles.iconActionLarge,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.primary}
              name="calendar-outline"
              size={rf(18)}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              resetDateRangeToLastThirtyDays();
              refreshData();
            }}
            style={[
              styles.iconAction,
              styles.iconActionLarge,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              color={colors.accent}
              name="refresh-outline"
              size={rf(18)}
            />
          </Pressable>
        </View>

        <Text style={[styles.rangeSummary, { color: colors.textSecondary }]}>
          Rango activo: {formatDateRangeLabel(dateRange)}
        </Text>

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
                    styles.filterChipLarge,
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
                      styles.filterChipTextLarge,
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
              <OperationCard
                actions={
                  isMechanicUser
                    ? []
                    : [
                        {
                          key: "edit",
                          icon: "create-outline",
                          label: "Editar orden",
                          onPress: () => onOpenWorkOrderForm?.(workOrder),
                        },
                      ]
                }
                code={workOrder.id}
                key={getEntityId(workOrder)}
                lines={[
                  {
                    label: "Cliente",
                    value:
                      client?.fullName || workOrder.clientId || "Sin cliente",
                  },
                  {
                    label: "Responsables",
                    value: assignedMechanics || "Sin mecánicos asignados",
                  },
                ]}
                onPress={() => openWorkOrderDetail(workOrder)}
                plate={vehicle?.plate}
                progress={workOrder.progressPercent}
                selected={isSelected}
                statusLabel={
                  workOrderStatusOptions.find(
                    (item) => item.key === workOrder.status,
                  )?.label || workOrder.status
                }
                title={
                  [vehicle?.brand, vehicle?.model, vehicle?.year]
                    .filter(Boolean)
                    .join(" ") ||
                  workOrder.vehicleId ||
                  "Sin vehículo"
                }
                tone={getWorkOrderTone(workOrder.status, colors)}
              />
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
            Operación
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isMechanicUser
              ? "No tienes órdenes asignadas para el filtro actual. Cambia el estado o espera una nueva asignación."
              : "No hay órdenes para el filtro actual. Cambia el estado o crea la primera orden desde un diagnóstico activo."}
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
    const isProgressLocked = isWorkOrderProgressLocked(
      selectedWorkOrder?.status,
    );
    const canReopenWithNote =
      progressForm.type === "note" &&
      progressForm.operationalStatus === "in-progress";
    const shouldDisableSubmit =
      progressSubmitting || (isProgressLocked && !canReopenWithNote);

    return (
      <>
        <DetailHero
          code={selectedWorkOrder?.id || "Sin orden"}
          facts={[
            {
              label: "Cliente",
              value:
                client?.fullName ||
                selectedWorkOrder?.clientId ||
                "Sin cliente",
            },
            {
              label: "Kilometraje",
              value: vehicle?.mileage
                ? `${vehicle.mileage} km`
                : "Sin kilometraje",
            },
            {
              label: "Diagnóstico",
              value:
                diagnostic?.id ||
                selectedWorkOrder?.diagnosticId ||
                "Sin diagnóstico",
            },
          ]}
          plate={vehicle?.plate}
          progress={selectedWorkOrder?.progressPercent}
          statusLabel={resolveWorkOrderStatusLabel(selectedWorkOrder?.status)}
          title={
            [vehicle?.brand, vehicle?.model, vehicle?.year]
              .filter(Boolean)
              .join(" ") ||
            selectedWorkOrder?.vehicleId ||
            "Sin vehículo"
          }
          tone={getWorkOrderTone(selectedWorkOrder?.status, colors)}
        >
          <ContactBar
            message={`Hola, te escribimos del taller sobre tu vehículo ${
              vehicle?.plate || ""
            } (orden ${selectedWorkOrder?.id || ""}).`}
            name={client?.fullName}
            phone={client?.phone}
          />

          <View style={styles.heroSection}>
            <Text
              style={[styles.heroSectionLabel, { color: colors.textTertiary }]}
            >
              Responsables
            </Text>
            <View style={styles.filterRow}>
              {assignedMechanics.length ? (
                assignedMechanics.map((mechanic) => (
                  <View
                    key={mechanic.uid}
                    style={[
                      styles.mechanicChip,
                      {
                        backgroundColor: colors.cardMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.mechanicChipText, { color: colors.text }]}
                    >
                      {mechanic.fullName || mechanic.email || mechanic.userCode}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  Sin responsables asignados
                </Text>
              )}
            </View>
          </View>

          <View style={styles.heroActions}>
            {!isMechanicUser ? (
              <BigButton
                icon="create-outline"
                label={
                  assignedMechanics.length
                    ? "Editar orden y responsables"
                    : "Asignar responsables"
                }
                onPress={() => onOpenWorkOrderForm?.(selectedWorkOrder)}
                variant="secondary"
              />
            ) : null}
            <BigButton
              icon="cube-outline"
              label="Repuestos de esta orden"
              onPress={() => onOpenSpareParts?.(selectedWorkOrder)}
              variant="secondary"
            />
            {isMechanicUser && !isProgressLocked ? (
              <BigButton
                icon="construct-outline"
                label="Pedir repuesto"
                onPress={() => setPartModalVisible(true)}
                variant="warning"
              />
            ) : null}
          </View>
        </DetailHero>

        <View
          onLayout={(event) => {
            formAnchorY.current = event.nativeEvent.layout.y;
          }}
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
              const isTypeLocked =
                isProgressLocked && typeOption.key !== "note";

              return (
                <Pressable
                  key={typeOption.key}
                  disabled={isTypeLocked}
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
                    styles.filterChipLarge,
                    {
                      backgroundColor: selected
                        ? palette.accent
                        : colors.cardMuted,
                      borderColor: selected ? palette.accent : colors.border,
                      opacity: isTypeLocked ? 0.45 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      styles.filterChipTextLarge,
                      { color: selected ? colors.white : palette.text },
                    ]}
                  >
                    {typeOption.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isProgressLocked ? (
            <View
              style={[
                styles.progressPanel,
                {
                  backgroundColor: colors.cardMuted,
                  borderColor: colors.warning,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: colors.warning }]}>
                Orden temporalmente cerrada para avances
              </Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                Mientras la orden este en{" "}
                {resolveWorkOrderStatusLabel(
                  selectedWorkOrder?.status,
                ).toLowerCase()}
                , no se pueden registrar avances, estados ni repuestos. Para
                continuar, agrega una nota y cambia el estado a En proceso.
              </Text>
            </View>
          ) : null}

          {progressForm.type === "note" ? (
            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Estado operativo
              </Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                Opcional: si lo seleccionas, la nota también actualiza el estado
                actual de la orden.
              </Text>
              <View style={styles.filterRow}>
                {noteOperationalStatusOptions.map((statusOption) => {
                  const selected =
                    progressForm.operationalStatus === statusOption.key;
                  const isStatusLocked =
                    isProgressLocked && statusOption.key !== "in-progress";

                  return (
                    <Pressable
                      key={statusOption.key}
                      disabled={isStatusLocked}
                      onPress={() =>
                        setProgressForm((current) => ({
                          ...current,
                          operationalStatus: selected ? "" : statusOption.key,
                          progressPercent:
                            !selected &&
                            statusOption.key === "in-progress" &&
                            isProgressLocked
                              ? getSuggestedReactivationProgress(
                                  selectedWorkOrder?.progressPercent,
                                )
                              : !selected && statusOption.key === "ready"
                                ? 100
                                : current.progressPercent,
                        }))
                      }
                      style={[
                        styles.filterChip,
                        styles.filterChipLarge,
                        {
                          backgroundColor: selected
                            ? colors.warning
                            : colors.cardMuted,
                          borderColor: selected
                            ? colors.warning
                            : colors.border,
                          opacity: isStatusLocked ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          styles.filterChipTextLarge,
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
              {progressForm.operationalStatus === "ready" ? (
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  Al marcar la orden como lista, se guardará automáticamente con
                  100% de avance.
                </Text>
              ) : null}
              {isProgressLocked &&
              progressForm.operationalStatus === "in-progress" ? (
                <View
                  style={[
                    styles.progressPanel,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <View style={styles.progressHeaderRow}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>
                      Nuevo avance sugerido al reactivar
                    </Text>
                    <Text
                      style={[
                        styles.progressValue,
                        {
                          color: getProgressMeterColor(
                            progressForm.progressPercent,
                            colors,
                          ),
                        },
                      ]}
                    >
                      {Math.round(Number(progressForm.progressPercent) || 0)}%
                    </Text>
                  </View>
                  <Text
                    style={[styles.rowMeta, { color: colors.textSecondary }]}
                  >
                    La orden estaba al 100%. Puedes bajar este valor antes de
                    reactivarla para reflejar el avance real restante.
                  </Text>
                  {isMechanicUser ? (
                    <StepperPercent
                      color={getProgressMeterColor(
                        progressForm.progressPercent,
                        colors,
                      )}
                      onChange={(value) =>
                        setProgressForm((current) => ({
                          ...current,
                          progressPercent: value,
                        }))
                      }
                      value={progressForm.progressPercent}
                    />
                  ) : (
                    <Slider
                      maximumTrackTintColor={colors.borderStrong}
                      maximumValue={100}
                      minimumTrackTintColor={getProgressMeterColor(
                        progressForm.progressPercent,
                        colors,
                      )}
                      minimumValue={0}
                      onValueChange={(value) =>
                        setProgressForm((current) => ({
                          ...current,
                          progressPercent: Math.round(value),
                        }))
                      }
                      step={1}
                      style={styles.slider}
                      thumbTintColor={getProgressMeterColor(
                        progressForm.progressPercent,
                        colors,
                      )}
                      value={Number(progressForm.progressPercent) || 0}
                    />
                  )}
                </View>
              ) : null}
              {isProgressLocked ? (
                <Text style={[styles.rowMeta, { color: colors.warning }]}>
                  En este estado solo se permite reactivar la orden con una nota
                  en En proceso.
                </Text>
              ) : null}
            </View>
          ) : null}

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
              {isMechanicUser ? (
                <StepperPercent
                  color={progressMeterColor}
                  onChange={(value) =>
                    setProgressForm((current) => ({
                      ...current,
                      progressPercent: value,
                    }))
                  }
                  value={progressForm.progressPercent}
                />
              ) : (
                <>
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
                </>
              )}
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
                          { key: "returned", label: "Devuelto" },
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
                                styles.filterChipLarge,
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
                                  styles.filterChipTextLarge,
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
                  Esta orden todavía no tiene repuestos cargados. Ábrelos desde
                  el bloque superior para agregarlos primero.
                </Text>
              </View>
            )
          ) : null}

          {isMechanicUser && progressForm.type === "note" ? (
            <View style={styles.quickPhraseGrid}>
              {quickPhrases.map((phrase) => (
                <BigChip
                  key={phrase}
                  label={phrase}
                  onPress={() => appendQuickPhrase(phrase)}
                  style={styles.quickPhraseChip}
                />
              ))}
            </View>
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
                  : "Describe la nota técnica o novedad operativa"
              }
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textArea,
                styles.textAreaLarge,
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

          {progressForm.type === "note" || progressForm.type === "delivery" ? (
            <View style={styles.formGroup}>
              <View style={styles.filterRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={progressSubmitting}
                  onPress={() => addPhoto("camera")}
                  style={[
                    styles.secondaryAction,
                    styles.secondaryActionLarge,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryActionText,
                      styles.secondaryActionTextLarge,
                      { color: colors.primary },
                    ]}
                  >
                    Tomar foto
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={progressSubmitting}
                  onPress={() => addPhoto("library")}
                  style={[
                    styles.secondaryAction,
                    styles.secondaryActionLarge,
                    {
                      backgroundColor: colors.cardMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryActionText,
                      styles.secondaryActionTextLarge,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Galería
                  </Text>
                </Pressable>
              </View>
              <PhotoStrip
                onRemove={removePhoto}
                photos={progressForm.photos || []}
              />
            </View>
          ) : null}

          <Pressable
            disabled={shouldDisableSubmit}
            onPress={() => handleProgressSubmit()}
            style={[
              styles.primaryButton,
              styles.primaryButtonLarge,
              {
                backgroundColor: getProgressTypePalette(
                  progressForm.type,
                  colors,
                ).accent,
                opacity: shouldDisableSubmit ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                styles.primaryButtonTextLarge,
                { color: colors.white },
              ]}
            >
              {progressSubmitting
                ? "Guardando avance..."
                : resolveProgressButtonLabel(progressForm.type)}
            </Text>
          </Pressable>
        </View>

        <ProgressTimeline
          currentUserUid={currentUserUid}
          emptyText="Aún no hay avances. Usa Avance o Nota para registrar el primer movimiento."
          entries={progressEntries}
          loading={progressLoading}
          staffLookup={staffLookup}
        />
        {progressLoading ? <ActivityIndicator color={colors.primary} /> : null}
      </>
    );
  };

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={
            screenMode === SCREEN_MODES.DETAIL ? handleBackToList : undefined
          }
          section={
            screenMode === SCREEN_MODES.DETAIL ? "Orden activa" : "Operación"
          }
          subtitle={
            screenMode === SCREEN_MODES.DETAIL
              ? "Desde aquí puedes revisar contexto, mecánicos asignados y avances cronológicos."
              : "Abre la orden desde un diagnóstico activo y vuelve a la lista para editar o continuar con repuestos."
          }
          title={
            screenMode === SCREEN_MODES.DETAIL
              ? selectedWorkOrder?.id || "Detalle de orden"
              : "Órdenes de trabajo"
          }
        />

        {screenMode === SCREEN_MODES.LIST
          ? renderListScreen()
          : renderDetailScreen()}
      </ScrollView>

      {screenMode === SCREEN_MODES.DETAIL ? (
        <StatusActionBar actions={statusBarActions} />
      ) : null}

      <ConfirmModal
        {...(quickActionCopy[pendingAction] || {})}
        loading={progressSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => runQuickAction(pendingAction)}
        visible={Boolean(pendingAction)}
      />

      <RequestPartModal
        onCancel={() => setPartModalVisible(false)}
        onSubmit={handleRequestPart}
        submitting={partSubmitting}
        visible={partModalVisible}
      />

      <DateRangeFilterModal
        initialRange={dateRange}
        onApply={(nextRange) => {
          const sharedRange = setSharedOperationalDateRange(nextRange);
          setDateRange(sharedRange);
        }}
        onClose={() => setIsDateFilterVisible(false)}
        title="Filtrar órdenes por fecha"
        visible={isDateFilterVisible}
      />
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
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "stretch",
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: rf(15),
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
  },
  iconAction: {
    width: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  rangeSummary: {
    fontSize: rf(13),
    lineHeight: rf(17),
    fontWeight: "700",
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filterChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 48,
    justifyContent: "center",
  },
  filterChipText: { fontSize: rf(14), fontWeight: "700" },
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
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardTag: { fontSize: rf(12), fontWeight: "800", textAlign: "right" },
  cardBody: { gap: spacing.xs },
  rowTitle: { fontSize: rf(17), fontWeight: "800" },
  rowMeta: { fontSize: rf(14), lineHeight: rf(19) },
  detailMetaLine: { fontSize: rf(14), lineHeight: rf(19) },
  detailMetaLabel: { fontSize: rf(14), fontWeight: "800" },
  formGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: rf(14), fontWeight: "700" },
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
  vehicleMeta: { fontSize: rf(14), lineHeight: rf(19) },
  vehicleMetaLabel: { fontSize: rf(14), fontWeight: "800" },
  vehiclePlate: {
    fontSize: rf(16),
    lineHeight: rf(20),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  vehiclePlateLabel: { fontSize: rf(16), fontWeight: "900" },
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
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryActionText: { fontSize: rf(14), fontWeight: "800" },
  iconActionRow: { gap: spacing.xs, justifyContent: "center" },
  iconAction: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 110,
    fontSize: rf(15),
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
  progressScaleText: { fontSize: rf(12), fontWeight: "700" },
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
    minHeight: 56,
    justifyContent: "center",
  },
  primaryButtonText: { fontSize: rf(16), fontWeight: "800" },
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
  timelineTypeChipText: { fontSize: rf(12), fontWeight: "800" },
  timelineProgressText: { fontSize: rf(18), fontWeight: "900" },
  timelineProgressPrefix: { fontSize: rf(14), fontWeight: "700" },
  timelineNestedList: { gap: 2 },
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyEyebrow: {
    fontSize: rf(12),
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
  emptyText: { fontSize: rf(15), lineHeight: rf(21) },
  quickPhraseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickPhraseChip: { flexBasis: "48%", flexGrow: 1, paddingHorizontal: 8 },
  filterChipLarge: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipTextLarge: { fontSize: 16 },
  secondaryActionLarge: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  secondaryActionTextLarge: { fontSize: 16 },
  primaryButtonLarge: { minHeight: 64, justifyContent: "center" },
  primaryButtonTextLarge: { fontSize: 18 },
  iconActionLarge: { width: 56, height: 56 },
  inputLarge: { fontSize: 17, minHeight: 56 },
  textAreaLarge: { fontSize: 17, minHeight: 120 },
  heroSection: { gap: 6 },
  heroSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroActions: { gap: 12 },
  mechanicChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mechanicChipText: { fontSize: 15, fontWeight: "700" },
});
