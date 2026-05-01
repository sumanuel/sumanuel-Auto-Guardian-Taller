export const USER_ROLES = {
  ADMINISTRATOR: "administrator",
  RECEPTION: "reception",
  MECHANIC: "mechanic",
};

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
  mode: "restricted",
  allowPublicSignUp: false,
  requiresInvitation: true,
  requiresInternalApproval: true,
  authProvider: "firebase-auth",
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMINISTRATOR]: [
    "users.manage",
    "invitations.manage",
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
