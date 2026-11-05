export const USER_ROLES = {
  OWNER: "owner",
  ADMINISTRATOR: "administrator",
  RECEPTION: "reception",
  MECHANIC: "mechanic",
};

export const ROLE_LABELS = {
  [USER_ROLES.OWNER]: "Propietario",
  [USER_ROLES.ADMINISTRATOR]: "Administrador",
  [USER_ROLES.RECEPTION]: "Recepción",
  [USER_ROLES.MECHANIC]: "Mecánico",
};

export function getRoleLabel(role, fallback = "Sin rol") {
  return ROLE_LABELS[role] || role || fallback;
}

export const USER_STATUSES = {
  INVITED: "invited",
  PENDING_APPROVAL: "pendingApproval",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DISABLED: "disabled",
};

export const INVITATION_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
};

export const REGISTRATION_POLICY = {
  mode: "hybrid",
  allowPublicSignUp: true,
  requiresInvitation: false,
  requiresInternalApproval: false,
  defaultPublicRole: USER_ROLES.RECEPTION,
  authProvider: "firebase-auth",
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.OWNER]: [
    "users.manage",
    "invitations.manage",
    "inventory.manage",
    "clients.manage",
    "vehicles.manage",
    "diagnostics.manage",
    "workOrders.manage",
    "progress.manage",
    "spareParts.manage",
    "payments.manage",
    "dashboard.view",
    "settings.manage",
    "workshop.manage",
  ],
  [USER_ROLES.ADMINISTRATOR]: [
    "users.manage",
    "invitations.manage",
    "inventory.manage",
    "clients.manage",
    "vehicles.manage",
    "diagnostics.manage",
    "workOrders.manage",
    "progress.manage",
    "spareParts.manage",
    "payments.manage",
    "dashboard.view",
    "settings.manage",
  ],
  [USER_ROLES.RECEPTION]: [
    "inventory.manage",
    "clients.manage",
    "vehicles.manage",
    "diagnostics.manage",
    "workOrders.manage",
    "progress.view",
    "spareParts.view",
    "dashboard.view",
  ],
  [USER_ROLES.MECHANIC]: [
    "workOrders.assigned.view",
    "diagnostics.assigned.view",
    "progress.assigned.manage",
    "spareParts.assigned.view",
  ],
};

export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function isMechanicRole(role) {
  return role === USER_ROLES.MECHANIC;
}

export function canManageClients(role) {
  return hasPermission(role, "clients.manage");
}

export function canManageVehicles(role) {
  return hasPermission(role, "vehicles.manage");
}

export function canManageWorkshop(role) {
  return hasPermission(role, "workshop.manage");
}

export function canManageCollaborators(role) {
  return hasPermission(role, "invitations.manage");
}

export function isDiagnosticAssignedToUser(diagnostic, uid) {
  const normalizedUid = String(uid || "").trim();
  return (
    Boolean(normalizedUid) && diagnostic?.assignedMechanicUid === normalizedUid
  );
}

export function isWorkOrderAssignedToUser(workOrder, uid) {
  const normalizedUid = String(uid || "").trim();

  if (!normalizedUid) {
    return false;
  }

  return (workOrder?.assignedMechanicUids || []).some(
    (assignedUid) => String(assignedUid || "").trim() === normalizedUid,
  );
}
