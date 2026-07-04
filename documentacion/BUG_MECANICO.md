# Bug del Perfil Mecánico — Diagnóstico y Solución

## Problema

El usuario con perfil **Mecánico** no veía los diagnósticos, órdenes ni datos del Home que le fueron asignados. Aparecían mensajes de error:
- "No se pudo refrescar la agenda operativa del taller"
- "No se pudo cargar el tablero operativo de diagnósticos"
- "No se pudo cargar el tablero operativo de ordenes"

---

## Causa Raíz

**El rol se resolvía desde `userProfile?.role` (global) en lugar de `activeMembership?.role` (contextual).**

### Flujo Incorrecto (Antes)

```javascript
// En App.js - línea 196
const currentRole = activeMembership?.role || userProfile?.role || "";

// PERO en las pantallas se usaba:
const isMechanicUser = isMechanicRole(userProfile?.role);  // ❌ INCORRECTO
```

### Escenario Problemático

1. Usuario es **OWNER** de su Taller A
2. Usuario es invitado como **MECHANIC** al Taller B
3. Al cambiar al Taller B:
   - `activeMembership?.role` = `"mechanic"` ✓
   - `userProfile?.role` se actualizaba a `"mechanic"` en Firestore ✓
4. Al volver al Taller A:
   - `userProfile?.role` se actualizaba a `"owner"` en Firestore ✓
   - **PERO**: `userProfile` es global → ahora en Taller B también es `"owner"`
5. Resultado: El mecánico veía TODO (como owner) o NADA (filtrado incorrecto)

---

## Solución Implementada

### 1. App.js — Resolver `currentRole` Correctamente y Pasarlo como Prop

```javascript
// App.js - líneas 192-196
const activeMembership = memberships.find(
  (membership) => membership.workshopId === activeWorkshopId,
);
const currentRole = activeMembership?.role || userProfile?.role || "";
const isMechanicUser = isMechanicRole(currentRole);

// Pasar a TODAS las pantallas que necesitan el rol
<WorkshopHomeScreen currentRole={currentRole} userProfile={userProfile} />
<DiagnosticsScreen currentRole={currentRole} userProfile={userProfile} />
<WorkOrdersScreen currentRole={currentRole} userProfile={userProfile} />
<DiagnosticFormScreen currentRole={currentRole} userProfile={userProfile} />
<ClientsScreen currentRole={currentRole} userProfile={userProfile} />
<WorkshopManagementScreen currentRole={currentRole} userProfile={userProfile} />
```

### 2. Pantallas — Usar `currentRole` Prop en Lugar de `userProfile?.role`

```javascript
// WorkshopHomeScreen.js
export default function WorkshopHomeScreen({ currentRole, userProfile }) {
  const isMechanicUser = isMechanicRole(currentRole);  // ✓ CORRECTO
  // ...
}

// DiagnosticsScreen.js
export default function DiagnosticsScreen({ currentRole, userProfile }) {
  const isMechanicUser = isMechanicRole(currentRole);  // ✓ CORRECTO
  // ...
}

// WorkOrdersScreen.js
export default function WorkOrdersScreen({ currentRole, userProfile }) {
  const isMechanicUser = isMechanicRole(currentRole);  // ✓ CORRECTO
  // ...
}

// DiagnosticFormScreen.js
export default function DiagnosticFormScreen({ currentRole, userProfile }) {
  const isMechanicUser = isMechanicRole(currentRole);  // ✓ CORRECTO
  const canManageDiagnostics = hasPermission(currentRole, "diagnostics.manage");  // ✓
  // ...
}

// ClientsScreen.js
export default function ClientsScreen({ currentRole, userProfile }) {
  const canEditClients = canManageClients(currentRole);  // ✓ CORRECTO
  const canEditVehicles = canManageVehicles(currentRole);  // ✓
  // ...
}
```

### 3. WorkshopMoreScreen — Resolver Localmente (ya lo hacía bien)

```javascript
// WorkshopMoreScreen.js - ya correcto
const currentRole =
  memberships.find((item) => item.workshopId === activeWorkshopId)?.role ||
  userProfile?.role ||
  "";
```

---

## Validación de la Solución

### Casos de Prueba

| Escenario | Antes | Después |
|-----------|-------|---------|
| Usuario OWNER en su taller | Ve todo | Ve todo ✓ |
| Usuario MECHANIC en taller ajeno | Ve todo o nada | Ve solo asignados ✓ |
| Usuario OWNER + MECHANIC en otro | Bug al cambiar | Funciona correctamente ✓ |
| Cambio de taller OWNER → MECHANIC | Role global incorrecto | Role contextual correcto ✓ |

### Verificación en Código

```javascript
// grep para confirmar que no quedan referencias obsoletas
grep -r "isMechanicRole(userProfile" src/screens/
# Debe retornar 0 resultados

grep -r "currentRole" src/screens/
# Debe mostrar uso de prop currentRole en todas las pantallas
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `App.js` | Resolver `currentRole` desde `activeMembership` y pasarlo como prop |
| `src/screens/WorkshopHomeScreen.js` | Recibir `currentRole`, usar en `isMechanicRole` |
| `src/screens/DiagnosticsScreen.js` | Recibir `currentRole`, usar en `isMechanicRole` |
| `src/screens/WorkOrdersScreen.js` | Recibir `currentRole`, usar en `isMechanicRole` |
| `src/screens/DiagnosticFormScreen.js` | Recibir `currentRole`, usar en `isMechanicRole` y `hasPermission` |
| `src/screens/ClientsScreen.js` | Recibir `currentRole`, usar en `canManageClients/vehicles` |
| `src/constants/accessControl.js` | `defaultPublicRole: RECEPTION` (era ADMINISTRATOR) |
| `src/constants/domainModels.js` | Default de `userProfileModel.role: RECEPTION` (era MECHANIC) |

---

## Regla de Oro

> **El rol SIEMPRE viene de `activeMembership?.role` (membresía del taller activo), NUNCA de `userProfile?.role` (perfil global).**

```javascript
// ✓ CORRECTO
const currentRole = activeMembership?.role || userProfile?.role || "";

// ✗ INCORRECTO
const currentRole = userProfile?.role || "";
const isMechanic = isMechanicRole(userProfile?.role);
```