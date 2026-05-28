let activeWorkshopSession = null;

export function setActiveWorkshopSession(session) {
  activeWorkshopSession = session
    ? {
        workshopId: String(session.workshopId || "").trim(),
        workshopName: String(session.workshopName || "").trim(),
        role: String(session.role || "").trim(),
      }
    : null;

  return activeWorkshopSession;
}

export function getActiveWorkshopSession() {
  return activeWorkshopSession;
}

export function getActiveWorkshopId() {
  return activeWorkshopSession?.workshopId || "";
}

export function requireActiveWorkshopId() {
  const workshopId = getActiveWorkshopId();

  if (!workshopId) {
    throw new Error("No hay un taller activo seleccionado.");
  }

  return workshopId;
}

export function clearActiveWorkshopSession() {
  activeWorkshopSession = null;
}
