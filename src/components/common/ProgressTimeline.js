import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { workOrderStatusOptions } from "../../services/workOrders/workOrderService";
import { sparePartStatusOptions } from "../../services/spareParts/sparePartService";
import PhotoStrip from "./PhotoStrip";

// Cronología de una orden: línea vertical con un punto por evento,
// agrupada por día. Resume cada evento en una línea, muestra el estado solo
// cuando cambia y junta los eventos idénticos consecutivos.
//   entries: registros de progreso en orden cronológico
//   staffLookup: { [uid]: { fullName, email } }
//   currentUserUid: para mostrar "Tú"

function toDate(value) {
  const resolved = value?.toDate ? value.toDate() : value;
  return resolved instanceof Date && !Number.isNaN(resolved.getTime())
    ? resolved
    : null;
}

function dayKey(date) {
  return date
    ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    : "sin-fecha";
}

function dayLabel(date) {
  if (!date) {
    return "Sin fecha";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) {
    return "Hoy";
  }

  if (dayKey(date) === dayKey(yesterday)) {
    return "Ayer";
  }

  return date.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function timeLabel(date) {
  return date
    ? date.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
    : "";
}

function statusLabel(status) {
  return (
    workOrderStatusOptions.find((item) => item.key === status)?.label ||
    (status === "approved" ? "Abierta" : status) ||
    ""
  );
}

function partLabel(status) {
  return (
    sparePartStatusOptions.find((option) => option.key === status)?.label ||
    status
  );
}

function parseProgress(message) {
  const match = String(message || "").match(
    /^Avance operativo ajustado a ([0-9]+)%/i,
  );
  return match ? match[1] : null;
}

function signature(entry) {
  return JSON.stringify([
    entry.type,
    entry.authorUid,
    entry.message || "",
    entry.statusChangedTo || "",
    (entry.sparePartUpdates || []).map((item) => [
      item.sparePartId,
      item.status,
    ]),
    (entry.photos || []).length,
  ]);
}

export default function ProgressTimeline({
  entries = [],
  staffLookup = {},
  currentUserUid = "",
  loading = false,
  emptyText = "Todavía no hay registros.",
}) {
  const { colors } = useTheme();

  const groups = useMemo(() => {
    const items = [];

    entries.forEach((entry, index) => {
      const previous = items[items.length - 1];
      const sig = signature(entry);

      // Eventos idénticos seguidos: se muestran una vez con "×N".
      if (previous && previous.signature === sig && !entry.photos?.length) {
        previous.count += 1;
        return;
      }

      const before = entries[index - 1];
      const snapshot = entry.statusSnapshot;
      const changedTo =
        entry.statusChangedTo ||
        (before && snapshot && before.statusSnapshot !== snapshot
          ? snapshot
          : null);

      items.push({
        entry,
        signature: sig,
        count: 1,
        changedTo,
        date: toDate(entry.createdAt),
      });
    });

    const result = [];
    items.forEach((item) => {
      const key = dayKey(item.date);
      const last = result[result.length - 1];

      if (last && last.key === key) {
        last.items.push(item);
      } else {
        result.push({ key, label: dayLabel(item.date), items: [item] });
      }
    });

    return result;
  }, [entries]);

  const describe = (entry) => {
    const percent =
      entry.type === "status" ? parseProgress(entry.message) : null;

    if (percent !== null) {
      return {
        icon: "speedometer-outline",
        color: colors.accent,
        title: `Avance a ${percent}%`,
        lines: [],
      };
    }

    if (entry.type === "parts") {
      const lines = (entry.sparePartUpdates || []).map(
        (item) => `${item.sparePartName} → ${partLabel(item.status)}`,
      );
      return {
        icon: "cube-outline",
        color: colors.accent,
        title: lines.length ? lines[0] : entry.message || "Repuestos",
        lines: lines.slice(1),
      };
    }

    if (entry.type === "delivery") {
      return {
        icon: "checkmark-done-outline",
        color: colors.success,
        title: entry.message || "Entrega",
        lines: [],
      };
    }

    if (entry.type === "status") {
      return {
        icon: "flag-outline",
        color: colors.warning,
        title: entry.message || "Cambio de estado",
        lines: [],
      };
    }

    return {
      icon: "create-outline",
      color: colors.primary,
      title: entry.message || "Nota",
      lines: [],
    };
  };

  const authorName = (entry) => {
    if (entry.authorUid && entry.authorUid === currentUserUid) {
      return "Tú";
    }

    const author = staffLookup[entry.authorUid];
    return author?.fullName || author?.email || "Colaborador";
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Cronología</Text>
        <Text style={[styles.count, { color: colors.textTertiary }]}>
          {entries.length} registro{entries.length === 1 ? "" : "s"}
        </Text>
      </View>

      {loading ? null : !groups.length ? (
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
            {emptyText}
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
              {group.label}
            </Text>

            {group.items.map((item, itemIndex) => {
              const { entry } = item;
              const view = describe(entry);
              const isLast = itemIndex === group.items.length - 1;

              return (
                <View
                  key={entry.refId || entry.id || `${group.key}-${itemIndex}`}
                  style={styles.row}
                >
                  <View style={styles.rail}>
                    <View style={[styles.dot, { backgroundColor: view.color }]}>
                      <Ionicons color="#ffffff" name={view.icon} size={20} />
                    </View>
                    {!isLast ? (
                      <View
                        style={[
                          styles.line,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.body}>
                    <Text style={[styles.headline, { color: colors.text }]}>
                      {view.title}
                      {item.count > 1 ? (
                        <Text style={{ color: colors.textTertiary }}>
                          {"  "}×{item.count}
                        </Text>
                      ) : null}
                    </Text>

                    {view.lines.map((line) => (
                      <Text
                        key={line}
                        style={[styles.detail, { color: colors.text }]}
                      >
                        {line}
                      </Text>
                    ))}

                    {entry.type === "parts" && entry.message ? (
                      <Text
                        style={[styles.detail, { color: colors.textSecondary }]}
                      >
                        {entry.message}
                      </Text>
                    ) : null}

                    {item.changedTo ? (
                      <View
                        style={[styles.chip, { borderColor: colors.warning }]}
                      >
                        <Text
                          style={[styles.chipText, { color: colors.warning }]}
                        >
                          Pasó a {statusLabel(item.changedTo)}
                        </Text>
                      </View>
                    ) : null}

                    {entry.photos?.length ? (
                      <PhotoStrip photos={entry.photos} />
                    ) : null}

                    {entry.deliveryClosedOrder ? (
                      <Text style={[styles.detail, { color: colors.success }]}>
                        Orden cerrada y entregada.
                      </Text>
                    ) : null}

                    <Text style={[styles.meta, { color: colors.textTertiary }]}>
                      {authorName(entry)} · {timeLabel(item.date)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "900" },
  count: { fontSize: 14, fontWeight: "700" },
  group: { gap: 4 },
  dayLabel: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  row: { flexDirection: "row", gap: 12 },
  rail: { width: 40, alignItems: "center" },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { flex: 1, width: 3, borderRadius: 2, marginVertical: 4 },
  body: { flex: 1, gap: 6, paddingBottom: 18 },
  headline: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  detail: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 14, fontWeight: "600" },
  chip: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: { fontSize: 14, fontWeight: "800" },
  empty: { borderWidth: 1, borderRadius: 18, padding: 16 },
  emptyText: { fontSize: 16, lineHeight: 23 },
});
