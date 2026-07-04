# Lecciones Aprendidas y Troubleshooting

## Resumen de Problemas Resueltos

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | Mecánico ve todos los datos o ninguno | `currentRole` desde `userProfile` global | `currentRole` desde `activeMembership?.role` + pasar como prop |
| 2 | Al cambiar de taller no cargan datos | `workshopSession` singleton no actualizado | `setActiveWorkshopSession` SIEMPRE en `switchWorkshop` |
| 3 | `requiresWorkshopSetup` siempre true al cambiar a MECHANIC | Early return en `applyWorkshopContext` | `setRequiresWorkshopSetup(false)` SIEMPRE en `switchWorkshop` |
| 3 | Talleres duplicados en selector | `dedupeMemberships` no agrupa bien | Agrupar por `workshopId` con `membershipPriority` |
| 4 | Datos del taller anterior persisten | `useEffect` sin `activeWorkshopId` | `[activeWorkshopId]` en `useEffect` de `refreshData` |
| 5 | `defaultPublicRole: ADMINISTRATOR` | Seguridad | Cambiado a `RECEPTION` |
| 6 | Botón "Ahora no" en setup crea loop | No crea taller ni refresca | Crea taller por defecto + `refreshWorkshopContext()` |

---

## Detalle de Cada Fix

### Fix 1: Bug del Perfil Mecánico

**Archivos**: `App.js`, `WorkshopHomeScreen.js`, `DiagnosticsScreen.js`, `WorkOrdersScreen.js`, `DiagnosticFormScreen.js`, `ClientsScreen.js`

```javascript
// ANTES (❌)
const isMechanicUser = isMechanicRole(userProfile?.role);

// DESPUÉS (✓)
const isMechanicUser = isMechanicRole(currentRole);  // currentRole prop desde App.js

// App.js
const currentRole = activeMembership?.role || userProfile?.role || "";
```

---

### Fix 2: Cambio de Taller No Carga Datos

**Archivo**: `AuthContext.js` - `switchWorkshop`

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

    // FALLBACK GARANTIZADO
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

---

### Fix 3: requiresWorkshopSetup en Loop

**Archivo**: `AuthContext.js` - `switchWorkshop`

```javascript
// En el fallback SIEMPRE:
setRequiresWorkshopSetup(false);  // Evita mostrar WorkshopSetupScreen al cambiar a taller MECHANIC
```

---

### Fix 4: Talleres Duplicados

**Archivo**: `src/services/workshops/workshopService.js`

```javascript
function dedupeMemberships(items = []) {
  const grouped = new Map();
  items.forEach((membership) => {
    const key = normalizeOptional(membership?.workshopId);
    if (!key) return;
    const current = grouped.get(key);
    if (!current || membershipPriority(membership) > membershipPriority(current)) {
      grouped.set(key, membership);
    }
  });
  return Array.from(grouped.values());
}
```

---

### Fix 5: Recarga Automática en Pantallas

**Archivos**: `WorkshopHomeScreen.js`, `DiagnosticsScreen.js`, `WorkOrdersScreen.js`

```javascript
// ANTES
useEffect(() => { refreshData(); }, []);

// DESPUÉS
import { useAuth } from "../context/AuthContext";
const { activeWorkshopId } = useAuth();

useEffect(() => { refreshData(); }, [activeWorkshopId]);
```

---

### Fix 6: Setup Loop en "Ahora No"

**Archivo**: `WorkshopSetupScreen.js`

```javascript
const handleSkip = async () => {
  const defaultName = userProfile?.fullName
    ? `Taller de ${userProfile.fullName}`
    : "Mi taller";
  await ensureWorkshop(defaultName);
  await refreshWorkshopContext();  // ¡Obligatorio!
  onSaved?.();
};
```

---

## Errores Comunes y Cómo Evitarlos

| Error | Prevención |
|-------|------------|
| Usar `userProfile?.role` para permisos | **Siempre** usar `currentRole` prop desde App.js |
| Confiar solo en `refreshWorkshopContext` | **Siempre** fallback manual en `switchWorkshop` |
| Olvidar `activeWorkshopId` en `useEffect` | Agregar `[activeWorkshopId]` en todas las pantallas operativas |
| No pasar `currentRole` como prop | Verificar que TODAS las pantallas lo reciban |
| `requireActiveWorkshopId()` lanza error | `setActiveWorkshopSession` SIEMPRE en `switchWorkshop` |
| `requiresWorkshopSetup` no se resetea | `setRequiresWorkshopSetup(false)` en `switchWorkshop` |

---

## Patrones de Diseño Reutilizables

### 1. Props de Rol desde App.js
```javascript
// App.js resuelve UNA vez y distribuye
const currentRole = activeMembership?.role || userProfile?.role || "";
<DiagnosticsScreen currentRole={currentRole} userProfile={userProfile} />
```

### 2. Fallback Garantizado en Operaciones Críticas
```javascript
try {
  await operacionCompleja();
} catch (error) {
  console.error("Error:", error);
}
operacionFallbackGarantizada();  // Siempre se ejecuta
```

### 3. Recarga Automática por Contexto
```javascript
const { activeWorkshopId } = useAuth();
useEffect(() => { refreshData(); }, [activeWorkshopId]);
```

### 4. Formulario Setup con Fallback
```javascript
const handleSkip = async () => {
  await ensureWorkshop(defaultName);
  await refreshWorkshopContext();
  onSaved?.();
};
```

---

## Referencia Rápida de Archivos Modificados

### Archivos Principales
| Archivo | Cambios Clave |
|---------|---------------|
| `App.js` | `currentRole`, `requiresWorkshopSetup`, routing, `onSaved` handlers |
| `src/context/AuthContext.js` | `switchWorkshop` (fallback), `applyWorkshopContext`, `requiresWorkshopSetup` state |
| `src/services/workshops/workshopService.js` | `resolveUserWorkshopContext` (no fuerza setup sin OWNER), `dedupeMemberships` |
| `src/services/workshops/workshopSession.js` | Singleton `activeWorkshopSession` |
| `src/screens/WorkshopSetupScreen.js` | `handleSkip` crea taller + refresh |
| `src/screens/WorkshopManagementScreen.js` | `onSwitchWorkshop` callback |
| `src/screens/WorkshopHomeScreen.js` | `useEffect([activeWorkshopId])` |
| `src/screens/DiagnosticsScreen.js` | `useEffect([activeWorkshopId])` + `currentRole` prop |
| `src/screens/WorkOrdersScreen.js` | `useEffect([activeWorkshopId])` + `currentRole` prop |
| `src/screens/DiagnosticFormScreen.js` | `currentRole` prop |
| `src/screens/ClientsScreen.js` | `currentRole` prop |
| `src/screens/WorkshopMoreScreen.js` | Tarjeta "Talleres" con navegación |
| `src/constants/accessControl.js` | `defaultPublicRole: RECEPTION` |
| `src/constants/domainModels.js` | `userProfileModel.defaults.role: RECEPTION` |

---

## Checklist para Nuevas Apps Multi-Taller

- [ ] Singleton de sesión (`workshopSession.js`)
- [ ] Contexto `AuthContext` con `switchWorkshop`, `refreshWorkshopContext`, `requiresWorkshopSetup`
- [ ] `resolveUserWorkshopContext` que NO fuerza setup si hay membresías válidas no-OWNER
- [ ] `App.js` resuelve `currentRole` desde `activeMembership` y lo pasa como prop
- [ ] `switchWorkshop` con fallback garantizado + `setRequiresWorkshopSetup(false)`
- [ ] Todas las pantallas operativas: `useEffect([activeWorkshopId])`
- [ ] `WorkshopSetupScreen` con `handleSkip que crea taller + refresh
- [ ] `WorkshopManagementScreen` con `onSwitchWorkshop` callback
- [ ] `dedupeMemberships` por `workshopId`
- [ ] `defaultPublicRole: RECEPTION` (no ADMINISTRATOR)

---

## Comandos de Verificación

```bash
# Verificar que no hay referencias obsoletas a userProfile?.role
grep -r "isMechanicRole(userProfile" src/screens/

# Verificar currentRole en todas las pantallas
grep -r "currentRole" src/screens/

# Verificar activeWorkshopId en useEffect
grep -r "activeWorkshopId" src/screens/ --include="*.js" | grep useEffect

# Compilar y testear
npx expo export --platform android
```

---

## Referencias a Documentación del Proyecto

| Documento | Ubicación | Contenido |
|-----------|-----------|-----------|
| Patrón Multi-Taller | `documentacion/PATRON_MULTI_TALLER.md` | Arquitectura completa |
| Bug Mecánico | `documentacion/BUG_MECANICO.md` | Diagnóstico y fix detallado |
| WorkshopSetupScreen | `documentacion/WORKSHOP_SETUP_SCREEN.md` | Flujo post-onboarding |
| WorkshopManagement | `documentacion/WORKSHOP_MANAGEMENT.md` | Selector y cambio de taller |
| Contexto Proyecto | `CONTEXTO_PROYECTO.md` | Visión general |
| Arquitectura Base | `ARQUITECTURA_BASE.md` | Decisiones fundacionales |
| Arquitectura Multi | `ARQUITECTURA_MULTI_TALLER.md` | Diseño multi-taller |
| Roadmap | `ROADMAP.md` | Estado de features |
| Arranque Rápido | `ARRANQUE_RAPIDO.md` | Setup y deploy |