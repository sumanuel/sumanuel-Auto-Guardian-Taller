# Patrón Multi-Taller / Multi-Tienda — Guía de Implementación

## Resumen del Patrón

Este documento describe el patrón arquitectónico para aplicaciones que soportan **múltiples talleres/tiendas por usuario**, donde un mismo usuario puede ser:
- **OWNER** de su propio taller/tienda
- **Colaborador** (MECHANIC, RECEPTION, etc.) en talleres/tiendas ajenos
- Cambiar de contexto activo sin cerrar sesión

Basado en la implementación de **tienda-app** y replicado en **Auto-Guardian-Taller**.

---

## Arquitectura General

```
Usuario (identidad global: Firebase Auth UID)
    │
    ├── Memberships (colección de membresías por taller)
    │   ├── Taller A: role = OWNER, status = ACTIVE
    │   ├── Taller B: role = MECHANIC, status = ACTIVE
    │   └── Taller C: role = RECEPTION, status = ACTIVE
    │
    ├── activeWorkshopId (string) — taller actualmente activo
    ├── defaultWorkshopId (string) — taller por defecto al abrir app
    └── requiresWorkshopSetup (boolean) — flag para mostrar setup inicial
```

### Datos Particionados por `workshopId`

Todas las entidades operativas llevan `workshopId`:
- `clients` → `workshopId`
- `vehicles` → `workshopId`
- `diagnostics` → `workshopId`
- `workOrders` → `workshopId`
- `progressEntries` → `workshopId`
- `spareParts` → `workshopId`
- `stockItems` → `workshopId`

---

## Componentes Clave

### 1. Singleton de Sesión (`workshopSession.js` / `storeSession.js`)

```javascript
// Variable en memoria (no React state)
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

export function getActiveWorkshopId() {
  return activeWorkshopSession?.workshopId || "";
}

export function requireActiveWorkshopId() {
  const workshopId = getActiveWorkshopId();
  if (!workshopId) throw new Error("No hay un taller activo seleccionado.");
  return workshopId;
}
```

**Propósito**: Los servicios usan `requireActiveWorkshopId()` para obtener el taller actual sin depender de React.

---

### 2. Contexto de Autenticación (`AuthContext.js`)

Estado expuesto:
```javascript
{
  authUser,
  userProfile,
  memberships,           // [{ workshopId, workshopName, role, status }]
  activeWorkshopId,
  activeWorkshop,
  activeMembership,      // membership del taller activo
  requiresWorkshopSetup,
  switchWorkshop(workshopId),
  refreshWorkshopContext(preferredWorkshopId),
}
```

Funciones críticas:
- **`resolveUserWorkshopContext()`** — Resuelve membresías, hidrata talleres, selecciona taller activo
- **`switchWorkshop(workshopId)`** — Cambia contexto, actualiza perfil, refresca estado
- **`refreshWorkshopContext()`** — Recarga todo desde Firestore

---

### 3. Resolución de Rol (`App.js`)

```javascript
const activeMembership = memberships.find(
  (m) => m.workshopId === activeWorkshopId
);
const currentRole = activeMembership?.role || userProfile?.role || "";
const isMechanicUser = isMechanicRole(currentRole);
```

**Regla de oro**: El rol SIEMPRE viene de `activeMembership?.role`, NUNCA de `userProfile?.role` (que es global).

---

### 4. Pantalla de Configuración Inicial (`WorkshopSetupScreen`)

Se muestra cuando `requiresWorkshopSetup === true` (usuario sin membresía OWNER).

```javascript
// En App.js
if (requiresWorkshopSetup) {
  return (
    <WorkshopSetupScreen
      onSaved={async () => {
        await refreshWorkshopContext();
        setActiveScreen(APP_SCREENS.HOME);
      }}
      userProfile={userProfile}
    />
  );
}
```

El formulario crea:
1. `workshop` (documento en colección `workshops`)
2. `workshopMembership` con `role: "owner"`
3. Llama a `refreshWorkshopContext()` para recargar contexto

---

### 5. Selector de Talleres (`WorkshopManagementScreen`)

Inspirado en `StoreManagementScreen` de tienda-app.

```javascript
// Props esperadas
<WorkshopManagementScreen
  onBack={() => setActiveScreen(APP_SCREENS.MORE)}
  onSwitchWorkshop={() => setActiveScreen(APP_SCREENS.HOME)}
  currentRole={currentRole}
  userProfile={userProfile}
/>
```

Funcionalidad:
- Lista todas las membresías del usuario
- Marca taller activo con badge "Activo"
- Botón "Entrar" llama a `switchWorkshop(workshopId)`
- `onSwitchWorkshop` navega a HOME tras cambio exitoso

---

### 6. Cambio de Taller (`switchWorkshop`)

```javascript
const switchWorkshop = async (workshopId) => {
  setAuthBusy(true);
  try {
    const selectedMembership = memberships.find(m => m.workshopId === workshopId);
    
    await updateUserProfileWorkshopContext(auth.currentUser.uid, {
      defaultWorkshopId: selectedMembership.workshopId,
      role: selectedMembership.role,
    });

    try {
      await refreshWorkshopContext(selectedMembership.workshopId);
    } catch (error) {
      console.error("Error switching workshop:", error);
    }

    // SIEMPRE setear estado local aunque refresh falle
    setRequiresWorkshopSetup(false);
    setActiveWorkshopSession({
      workshopId: selectedMembership.workshopId,
      workshopName: selectedMembership.workshopName || "Taller",
      role: selectedMembership.role,
    });
    setActiveWorkshopId(selectedMembership.workshopId);
  } finally {
    setAuthBusy(false);
  }
};
```

**Puntos críticos**:
1. Actualiza `userProfile` en Firestore ANTES de refrescar
2. `refreshWorkshopContext` puede fallar (reglas Firestore, datos corruptos) — no debe romper el cambio
3. **Siempre** setea `activeWorkshopSession` manualmente con datos de la membership
4. `setRequiresWorkshopSetup(false)` evita mostrar setup al cambiar a taller donde es colaborador

---

## Flujo de Datos en Pantallas Operativas

### 1. Props desde App.js

```javascript
<WorkshopHomeScreen
  currentRole={currentRole}
  userProfile={userProfile}
/>
<DiagnosticsScreen
  currentRole={currentRole}
  userProfile={userProfile}
/>
<WorkOrdersScreen
  currentRole={currentRole}
  userProfile={userProfile}
/>
```

### 2. Uso en Pantallas

```javascript
import { useAuth } from "../context/AuthContext";

const { activeWorkshopId } = useAuth();
const isMechanicUser = isMechanicRole(currentRole);
const currentUserUid = userProfile?.uid || "";

// Recarga automática al cambiar taller
useEffect(() => {
  refreshData();
}, [activeWorkshopId]);  // ← Dependencia clave
```

### 3. Filtrado por Mecánico

```javascript
const visibleDiagnostics = useMemo(() =>
  isMechanicUser
    ? diagnostics.filter(d => isDiagnosticAssignedToUser(d, currentUserUid))
    : diagnostics,
  [currentUserUid, diagnostics, isMechanicUser]
);
```

---

## Servicios — Patrón de Acceso a Taller

```javascript
export async function listDiagnostics() {
  const activeWorkshopId = requireActiveWorkshopId();  // ← del singleton
  const collectionRef = collection(firestore, "diagnostics");
  const snapshot = await getDocs(
    query(
      collectionRef,
      where("workshopId", "==", activeWorkshopId),
      orderBy("sequentialId", "desc"),
    ),
  );
  return snapshot.docs.map(doc => ({ refId: doc.id, ...doc.data() }));
}
```

**Regla**: Todos los `list*`, `create*`, `update*` usan `requireActiveWorkshopId()`.

---

## Configuración de Roles (`accessControl.js`)

```javascript
export const USER_ROLES = {
  OWNER: "owner",
  ADMINISTRATOR: "administrator",
  RECEPTION: "reception",
  MECHANIC: "mechanic",
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.OWNER]: [
    "users.manage", "invitations.manage", "workshop.manage",
    "clients.manage", "vehicles.manage", "diagnostics.manage",
    "workOrders.manage", "progress.manage", "spareParts.manage",
    "dashboard.view", "settings.manage", ...
  ],
  [USER_ROLES.MECHANIC]: [
    "workOrders.assigned.view",
    "diagnostics.assigned.view",
    "progress.assigned.manage",
    "spareParts.assigned.view",
  ],
  // ...
};

export function isMechanicRole(role) {
  return role === USER_ROLES.MECHANIC;
}
```

---

## Manejo de `requiresWorkshopSetup`

En `resolveUserWorkshopContext`:

```javascript
if (!selectionPool.length) {
  return { memberships: [], activeMembership: null, activeWorkshop: null, requiresWorkshopSetup: true };
}

// Si hay al menos una membresía válida (aunque no sea OWNER), se usa
// NO se fuerza requiresWorkshopSetup solo por no ser OWNER
const activeMembership = selectionPool.find(
  (m) => m.workshopId === normalizedPreferredWorkshopId,
) || selectionPool.find((m) => m.role === USER_ROLES.OWNER) || selectionPool[0];

return {
  memberships: orderedMemberships,
  activeMembership,
  activeWorkshop: activeMembership?.workshop || null,
  requiresWorkshopSetup: false,
};
```

**Filosofía**: Si el usuario tiene CUALQUIER membresía válida (MECHANIC, RECEPTION, etc.), puede operar. El setup solo se fuerza cuando NO TIENE NINGUNA membresía.

---

## Troubleshooting Común

| Problema | Causa | Solución |
|----------|-------|----------|
| Al cambiar de taller no cargan datos | `activeWorkshopSession` no se actualizó | Setear `activeWorkshopSession` manualmente en `switchWorkshop` |
| `requiresWorkshopSetup` siempre true | No hay membresía OWNER válida | Permitir operación con membresías no-OWNER; solo forzar setup si 0 membresías |
| Mecánico no ve sus datos | `currentRole` viene de `userProfile` global | Usar `activeMembership?.role` desde App.js y pasarlo como prop |
| Talleres duplicados en selector | `dedupeMemberships` no agrupa bien | Agrupar por `workshopId` en `dedupeMemberships`; usar `membershipPriority` |
| Datos del taller viejo después de switch | `useEffect` sin `activeWorkshopId` en dependencias | Agregar `[activeWorkshopId]` a `useEffect` de `refreshData` |

---

## Referencia Rápida de Archivos Clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/services/workshops/workshopSession.js` | Singleton de sesión activa |
| `src/context/AuthContext.js` | Estado global, `switchWorkshop`, `refreshWorkshopContext` |
| `src/services/workshops/workshopService.js` | `resolveUserWorkshopContext`, `ensurePersonalWorkshopForUser` |
| `src/screens/WorkshopSetupScreen.js` | Formulario post-onboarding |
| `src/screens/WorkshopManagementScreen.js` | Selector de talleres |
| `src/screens/WorkshopHomeScreen.js` | Home con recarga por `activeWorkshopId` |
| `src/screens/DiagnosticsScreen.js` | Lista diagnósticos + filtro mecánico |
| `src/screens/WorkOrdersScreen.js` | Lista órdenes + filtro mecánico |
| `src/constants/accessControl.js` | Roles, permisos, helpers |
| `App.js` | Routing, `currentRole`, `requiresWorkshopSetup` |

---

## Lecciones Aprendidas

1. **El singleton es la fuente de verdad para servicios**, React state para UI. Mantenerlos sincronizados manualmente en `switchWorkshop`.

2. **El rol es contextual**, no global. Siempre `activeMembership?.role`.

3. **El setup de taller es opcional para colaboradores**. Solo bloquear cuando 0 membresías.

4. **Recarga automática**: Todas las pantallas operativas deben tener `useEffect(() => refreshData(), [activeWorkshopId])`.

5. **Error handling en switch**: `refreshWorkshopContext` puede fallar por reglas Firestore o datos corruptos. El cambio de taller DEBE funcionar aunque el refresh falle.

6. **Deduplicación temprana**: `dedupeMemberships` por `workshopId` evita duplicados en UI.

7. **Keys únicas en listas**: Usar `workshopId` como key, no índices.