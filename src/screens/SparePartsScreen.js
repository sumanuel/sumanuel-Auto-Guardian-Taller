import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BigButton from "../components/common/BigButton";
import BigChip from "../components/common/BigChip";
import ConfirmModal from "../components/common/ConfirmModal";
import OperationCard from "../components/common/OperationCard";
import ReasonModal from "../components/common/ReasonModal";
import WorkshopScreenHeader from "../components/common/WorkshopScreenHeader";
import {
  isMechanicRole,
  isWorkOrderAssignedToUser,
  USER_ROLES,
} from "../constants/accessControl";
import { useTheme } from "../context/ThemeContext";
import { listDiagnostics } from "../services/diagnostics/diagnosticService";
import { createProgressEntry } from "../services/progressEntries/progressEntryService";
import {
  advanceSparePart,
  canDeleteSparePartStatus,
  deleteSparePart,
  getSparePartActions,
  listSpareParts,
  sparePartStatusOptions,
} from "../services/spareParts/sparePartService";
import { listWorkOrders } from "../services/workOrders/workOrderService";
import { getSparePartTone } from "../utils/statusTone";

function getEntityId(entity) {
  return entity?.refId || entity?.id || "";
}

function buildLookup(items, field = "id") {
  return items.reduce((accumulator, item) => {
    accumulator[item[field]] = item;
    return accumulator;
  }, {});
}

function statusLabel(status) {
  return (
    sparePartStatusOptions.find((item) => item.key === status)?.label || status
  );
}

export default function SparePartsScreen({
  onBack,
  onOpenSparePartForm,
  currentRole,
  userProfile,
  viewState,
}) {
  const { colors } = useTheme();
  const isMechanicUser = isMechanicRole(currentRole);
  const canWorkParts = currentRole !== USER_ROLES.RECEPTION;
  const [loading, setLoading] = useState(false);
  const [spareParts, setSpareParts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [pending, setPending] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const workOrderLookup = useMemo(() => buildLookup(workOrders), [workOrders]);
  const diagnosticLookup = useMemo(
    () => buildLookup(diagnostics),
    [diagnostics],
  );
  const selectedWorkOrderId = viewState?.selectedWorkOrderId || "";
  const selectedWorkOrder = selectedWorkOrderId
    ? workOrderLookup[selectedWorkOrderId]
    : null;

  const refreshData = async () => {
    setLoading(true);

    try {
      const [nextSpareParts, nextWorkOrders, nextDiagnostics] =
        await Promise.all([
          listSpareParts(),
          listWorkOrders(),
          listDiagnostics(),
        ]);
      setSpareParts(nextSpareParts);
      setWorkOrders(nextWorkOrders);
      setDiagnostics(nextDiagnostics);
    } catch (error) {
      Alert.alert("Repuestos", "No se pudieron cargar los repuestos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Alcance: una orden concreta, o (para el mecánico) solo sus órdenes.
  const scopedParts = useMemo(
    () =>
      spareParts.filter((part) => {
        if (selectedWorkOrderId) {
          return part.workOrderId === selectedWorkOrderId;
        }

        if (isMechanicUser) {
          return isWorkOrderAssignedToUser(
            workOrderLookup[part.workOrderId],
            userProfile?.uid,
          );
        }

        return true;
      }),
    [
      isMechanicUser,
      selectedWorkOrderId,
      spareParts,
      userProfile?.uid,
      workOrderLookup,
    ],
  );

  const counts = useMemo(
    () =>
      scopedParts.reduce(
        (accumulator, part) => {
          accumulator[part.status] = (accumulator[part.status] || 0) + 1;
          return accumulator;
        },
        { all: scopedParts.length },
      ),
    [scopedParts],
  );

  const filteredParts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return scopedParts.filter((part) => {
      if (activeFilter !== "all" && part.status !== activeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [part.id, part.name, part.supplier, part.workOrderId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeFilter, scopedParts, searchQuery]);

  const handleCreateForCurrentContext = () => {
    onOpenSparePartForm?.(null, {
      seedData: selectedWorkOrder
        ? {
            workOrderId: selectedWorkOrder.id,
            diagnosticId: selectedWorkOrder.diagnosticId,
          }
        : {},
    });
  };

  const runAction = async (reason = "") => {
    if (!pending) {
      return;
    }

    const { part, action } = pending;
    setSubmitting(true);

    try {
      await advanceSparePart(getEntityId(part), action.key, {
        reason,
        authorUid: userProfile?.uid,
      });

      const relatedWorkOrder = workOrderLookup[part.workOrderId];

      if (relatedWorkOrder?.id) {
        await createProgressEntry({
          workOrderId: relatedWorkOrder.id,
          diagnosticId:
            part.diagnosticId || relatedWorkOrder.diagnosticId || "",
          vehicleId: relatedWorkOrder.vehicleId || "",
          authorUid: userProfile?.uid,
          type: "parts",
          message: reason ? `Motivo: ${reason}` : "",
          statusSnapshot: relatedWorkOrder.status || "",
          sparePartUpdates: [
            {
              sparePartId: part.id,
              sparePartName: part.name,
              status: action.key,
            },
          ],
        });
      }

      setPending(null);
      await refreshData();
    } catch (error) {
      Alert.alert(
        "Repuestos",
        error?.message || "No se pudo actualizar el repuesto.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (part) => {
    Alert.alert(
      "Eliminar repuesto",
      `Se eliminará ${part.name || part.id || "este repuesto"}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const relatedWorkOrder = workOrderLookup[part.workOrderId];

              await deleteSparePart(getEntityId(part));

              if (relatedWorkOrder?.id) {
                await createProgressEntry({
                  workOrderId: relatedWorkOrder.id,
                  diagnosticId:
                    part.diagnosticId || relatedWorkOrder.diagnosticId || "",
                  vehicleId: relatedWorkOrder.vehicleId || "",
                  authorUid: userProfile?.uid,
                  type: "parts",
                  message: `Se eliminó el repuesto ${part.name || part.id || "sin nombre"}.`,
                  statusSnapshot: relatedWorkOrder.status || "",
                });
              }

              await refreshData();
            } catch (error) {
              Alert.alert(
                "Repuestos",
                error?.message || "No se pudo eliminar el repuesto.",
              );
            }
          },
        },
      ],
    );
  };

  const filters = [{ key: "all", label: "Todos" }, ...sparePartStatusOptions];
  const needsReason = Boolean(pending?.action?.needsReason);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <WorkshopScreenHeader
          onBack={onBack}
          section={selectedWorkOrder ? selectedWorkOrder.id : "Costos"}
          subtitle="Solicitado, recibido, instalado y devuelto: cada pieza avanza en ese orden."
          title="Repuestos"
        />

        {!isMechanicUser || selectedWorkOrder ? (
          <BigButton
            icon="add-circle-outline"
            label={
              selectedWorkOrder
                ? "Agregar repuesto a esta orden"
                : "Agregar repuesto"
            }
            onPress={handleCreateForCurrentContext}
          />
        ) : null}

        <TextInput
          autoCapitalize="none"
          onChangeText={setSearchQuery}
          placeholder="Buscar por repuesto, proveedor u orden"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.borderStrong,
              color: colors.text,
            },
          ]}
          value={searchQuery}
        />

        <View style={styles.filterRow}>
          {filters.map((filter) => (
            <BigChip
              color={
                filter.key === "all"
                  ? colors.primary
                  : getSparePartTone(filter.key, colors)
              }
              key={filter.key}
              label={`${filter.label} ${counts[filter.key] || 0}`}
              onPress={() => setActiveFilter(filter.key)}
              selected={activeFilter === filter.key}
            />
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : filteredParts.length ? (
          <View style={styles.listBody}>
            {filteredParts.map((part) => {
              const relatedWorkOrder = workOrderLookup[part.workOrderId];
              const relatedDiagnostic = diagnosticLookup[part.diagnosticId];
              const canDelete =
                !isMechanicUser && canDeleteSparePartStatus(part.status);
              const actions = getSparePartActions(part.status).filter(
                (action) => !action.managerOnly || canWorkParts,
              );
              const lines = [
                {
                  label: "Cantidad",
                  value: `${part.quantity || 0}${
                    part.unitCost ? ` · Costo ${part.unitCost}` : ""
                  }`,
                },
                {
                  label: "Orden",
                  value: `${
                    relatedWorkOrder?.id || part.workOrderId || "Sin orden"
                  }${
                    relatedDiagnostic?.id ? ` · ${relatedDiagnostic.id}` : ""
                  }`,
                },
              ];

              if (part.supplier) {
                lines.push({ label: "Proveedor", value: part.supplier });
              }

              if (part.status === "returned" && part.statusReason) {
                lines.push({ label: "Devuelto por", value: part.statusReason });
              }

              return (
                <OperationCard
                  actions={
                    isMechanicUser
                      ? []
                      : [
                          {
                            key: "edit",
                            icon: "create-outline",
                            color: colors.primary,
                            label: "Editar repuesto",
                            onPress: () => onOpenSparePartForm?.(part),
                          },
                          {
                            key: "delete",
                            icon: "trash-outline",
                            color: canDelete
                              ? colors.danger
                              : colors.textTertiary,
                            disabled: !canDelete,
                            label: "Eliminar repuesto",
                            onPress: () => handleDelete(part),
                          },
                        ]
                  }
                  code={part.id}
                  key={getEntityId(part)}
                  lines={lines}
                  plain
                  plate={part.name}
                  selected={
                    viewState?.selectedSparePartId === getEntityId(part)
                  }
                  statusLabel={statusLabel(part.status)}
                  tone={getSparePartTone(part.status, colors)}
                >
                  {actions.map((action) => (
                    <BigButton
                      icon={action.icon}
                      key={action.key + action.label}
                      label={action.label}
                      onPress={() => setPending({ part, action })}
                      variant={action.tone}
                    />
                  ))}
                </OperationCard>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.empty,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedWorkOrder
                ? "Esta orden todavía no tiene repuestos. Usa «Agregar repuesto a esta orden» para registrar el primero."
                : "No hay repuestos para este filtro. Cambia el estado o registra una pieza nueva."}
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        confirmLabel={pending?.action?.label}
        loading={submitting}
        message={pending?.action?.confirm}
        onCancel={() => setPending(null)}
        onConfirm={() => runAction("")}
        title={pending ? `${pending.action.label}: ${pending.part.name}?` : ""}
        tone={
          pending?.action?.tone === "secondary"
            ? "primary"
            : pending?.action?.tone
        }
        visible={Boolean(pending) && !needsReason}
      />

      <ReasonModal
        confirmIcon={pending?.action?.icon}
        confirmLabel={pending?.action?.label}
        onCancel={() => setPending(null)}
        onSubmit={runAction}
        reasons={pending?.action?.reasons}
        submitting={submitting}
        title={pending ? `${pending.action.label}: ${pending.part.name}` : ""}
        tone="warning"
        visible={Boolean(pending) && needsReason}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32, gap: 12 },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  listBody: { gap: 12 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 16 },
  emptyText: { fontSize: 16, lineHeight: 23 },
});
