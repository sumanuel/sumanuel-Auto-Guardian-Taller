// Color semántico por estado: indica urgencia/avance, nunca decoración.
// Compartido por Inicio, Diagnósticos, Órdenes y "Mi trabajo de hoy".
export function getWorkOrderTone(status, colors) {
  switch (status === "approved" ? "open" : status) {
    case "open":
      return colors.warning;
    case "in-progress":
      return colors.accent;
    case "paused":
      return colors.danger;
    case "ready":
      return colors.success;
    case "delivered":
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}

export function getDiagnosticTone(status, colors) {
  switch (status) {
    case "quoted":
      return colors.warning;
    case "approved":
      return colors.success;
    case "closed":
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}

export function getSparePartTone(status, colors) {
  switch (status) {
    case "requested":
      return colors.warning;
    case "received":
      return colors.accent;
    case "installed":
      return colors.success;
    case "returned":
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}
