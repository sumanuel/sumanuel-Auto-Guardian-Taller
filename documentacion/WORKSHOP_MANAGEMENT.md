# WorkshopManagementScreen — Selector de Taller Activo

## Propósito

Pantalla tipo **StoreManagementScreen** (inspirada en `tienda-app`) que lista todos los talleres donde el usuario tiene membresía y permite cambiar el **taller activo** con un solo toque.

---

## Acceso

Desde `WorkshopMoreScreen` → tarjeta "Talleres" → botón "Gestionar"

```javascript
// WorkshopMoreScreen.js
<Pressable onPress={onOpenWorkshopManagement} style={...}>
  <Text>{memberships.length} Talleres</Text>
  <Text>Gestionar</Text>
</Pressable>

// App.js
onOpenWorkshopManagement={() => setActiveScreen(APP_SCREENS.WORKSHOP_MANAGEMENT)}
```

---

## Flujo de Cambio de Taller

```
Usuario en WorkshopManagementScreen
    │
    ▼
Presiona "Entrar" en taller X
    │
    ▼
handleSwitchWorkshop(workshopId)
    │
    ├── switchWorkshop(workshopId) [AuthContext]
    │   ├── updateUserProfileWorkshopContext(uid, { defaultWorkshopId, role })
    │   ├── refreshWorkshopContext(workshopId)  ← intenta recargar
    │   └── setActiveWorkshopSession({ workshopId, workshopName, role })  ← SIEMPRE
    │   └── setRequiresWorkshopSetup(false)    ← SIEMPRE
    │
    ▼
onSwitchWorkshop() → setActiveScreen(HOME)
    │
    ▼
Home se monta → useEffect([activeWorkshopId]) → refreshData()
    │
    ▼
Datos del nuevo taller cargados
```

---

## switchWorkshop — Implementación Robusta

```javascript
// AuthContext.js
const switchWorkshop = async (workshopId) => {
  setAuthBusy(true);

  try {
    // 1. Encontrar membresía destino
    const selectedMembership = memberships.find(
      (membership) => membership.workshopId === workshopId,
    );

    if (!auth.currentUser?.uid || !selectedMembership) {
      throw new Error("No se pudo cambiar al taller seleccionado.");
    }

    // 2. Actualizar perfil global en Firestore
    await updateUserProfileWorkshopContext(auth.currentUser.uid, {
      defaultWorkshopId: selectedMembership.workshopId,
      role: selectedMembership.role,  // "owner", "mechanic", "reception", etc.
    });

    // 3. Intentar refrescar contexto completo
    try {
      await refreshWorkshopContext(selectedMembership.workshopId);
    } catch (error) {
      console.error("Error switching workshop:", error);
      // Si falla, continuamos igual — el fallback de abajo maneja
    }

    // 4. FALLBACK GARANTIZADO: setear sesión manualmente
    // Esto asegura que workshopSession.js (singleton) tenga el taller correcto
    // AUN si refreshWorkshopContext falla
    setRequiresWorkshopSetup(false);
    setActiveWorkshopSession({
      workshopId: selectedMembership.workshopId,
      workshopName: selectedMembership.workshopName || "Taller",
      role: selectedMembership.role,
    });
    setActiveWorkshopId(selectedMembership.workshopId);
    setActiveWorkshop(selectedMembership.workshop || null);

  } catch (error) {
    console.error("Error switching workshop:", error);
    throw error;  // Propaga para que UI muestre Alert
  } finally {
    setAuthBusy(false);
  }
};
```

### Claves del Fallback

| Paso | Por Qué Es Necesario |
|------|---------------------|
| `setRequiresWorkshopSetup(false)` | Evita que app muestre WorkshopSetupScreen al cambiar a taller MECHANIC (donde no es OWNER) |
| `setActiveWorkshopSession()` | Actualiza `workshopSession.js` singleton **inmediatamente** (no espera React render) |
| `setActiveWorkshopId/Workshop()` | Actualiza estado React para UI |
| `try/catch` en `refreshWorkshopContext` | Si Firestore rules fallan o taller corrupto, la app NO se rompe |

---

## WorkshopManagementScreen — UI

```javascript
export default function WorkshopManagementScreen({ onBack, onSwitchWorkshop }) {
  const { memberships, activeWorkshopId, switchWorkshop } = useAuth();
  const [switchingId, setSwitchingId] = useState(null);

  const handleSwitchWorkshop = async (workshopId) => {
    if (workshopId === activeWorkshopId) return;
    setSwitchingId(workshopId);
    try {
      await switchWorkshop(workshopId);
      onSwitchWorkshop?.();  // Navega a HOME
    } catch (error) {
      Alert.alert("Talleres", error?.message || "No se pudo cambiar");
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <ScrollView>
      {memberships.map((membership) => {
        const isActive = membership.workshopId === activeWorkshopId;
        return (
          <Pressable
            key={membership.workshopId}
            onPress={() => handleSwitchWorkshop(membership.workshopId)}
            disabled={isActive || switchingId !== null}
            style={{ borderColor: isActive ? colors.primary : colors.border }}
          >
            <View style={{ backgroundColor: isActive ? colors.primary : colors.cardBackground }}>
              <Ionicons name="construct-outline" color={isActive ? colors.white : colors.textTertiary} />
            </View>
            <View>
              <Text>{membership.workshopName || "Taller sin nombre"}</Text>
              <Text>{roleLabels[membership.role] || membership.role}</Text>
            </View>
            {isActive ? (
              <View style={{ backgroundColor: colors.primary }}>
                <Text style={styles.activeBadgeText}>Activo</Text>
              </View>
            ) : !switchingId ? (
              <Pressable
                onPress={() => handleSwitchWorkshop(membership.workshopId)}
                style={{ backgroundColor: colors.primary }}
              >
                <Text style={styles.enterButtonText}>Entrar</Text>
              </Pressable>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

---

## Integración con App.js

```javascript
// App.js - Rutas
if (activeScreen === APP_SCREENS.WORKSHOP_MANAGEMENT) {
  return (
    <WorkshopManagementScreen
      onBack={() => setActiveScreen(APP_SCREENS.MORE)}
      onSwitchWorkshop={() => setActiveScreen(APP_SCREENS.HOME)}  // Navega a Home tras switch
      currentRole={currentRole}
      userProfile={userProfile}
    />
  );
}

// BackHandler para WORKSHOP_MANAGEMENT
if (activeScreen === APP_SCREENS.WORKSHOP_MANAGEMENT) {
  setActiveScreen(APP_SCREENS.MORE);
  return true;
}
```

---

## Resolución de Rol en Pantallas

Todas las pantallas reciben `currentRole` desde App.js:

```javascript
// App.js - línea ~218
const currentRole = activeMembership?.role || userProfile?.role || "";

// Se pasa como prop
<DiagnosticsScreen currentRole={currentRole} userProfile={userProfile} />
<WorkOrdersScreen currentRole={currentRole} userProfile={userProfile} />
<WorkshopHomeScreen currentRole={currentRole} userProfile={userProfile} />
<DiagnosticFormScreen currentRole={currentRole} userProfile={userProfile} />
<ClientsScreen currentRole={currentRole} userProfile={userProfile} />
<WorkshopManagementScreen currentRole={currentRole} userProfile={userProfile} />
```

En cada pantalla:
```javascript
const isMechanicUser = isMechanicRole(currentRole);  // ✓ Usa prop, no userProfile
```

---

## Flujo Completo: OWNER → MECHANIC → OWNER

```
1. Usuario en Taller A (OWNER)
   activeWorkshopId = "taller-A"
   activeMembership.role = "owner"
   currentRole = "owner"
   Ve todo: clientes, vehículos, diagnósticos, órdenes

2. Usuario va a WorkshopManagementScreen
   Ve lista: [Taller A - Activo - Owner] [Taller B - Mecanico]
   Presiona "Entrar" en Taller B

3. switchWorkshop("taller-B")
   - updateUserProfileWorkshopContext(uid, { defaultWorkshopId: "taller-B", role: "mechanic" })
   - refreshWorkshopContext("taller-B")
   - setActiveWorkshopSession({ workshopId: "taller-B", role: "mechanic" })
   - setRequiresWorkshopSetup(false)

4. onSwitchWorkshop() → HOME
   HOME se monta → useEffect([activeWorkshopId]) → refreshData()
   listDiagnostics() filtra por assignedMechanicUid === uid
   currentRole = "mechanic" → isMechanicUser = true

5. Usuario ve SOLO diagnósticos/órdenes asignados en Taller B

6. Usuario vuelve a WorkshopManagementScreen → "Entrar" en Taller A
   Repite pasos 3-4 con role: "owner"
```

---

## Troubleshooting Común

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Al cambiar a MECHANIC no cargan datos | `refreshWorkshopContext` falla y no se ejecuta fallback | Verificar `setActiveWorkshopSession` en `switchWorkshop` |
| Al cambiar aparece WorkshopSetupScreen | `requiresWorkshopSetup` no se setea `false` | Agregar `setRequiresWorkshopSetup(false)` en `switchWorkshop` |
| Datos del taller anterior persisten | `workshopSession` singleton no actualizado | `setActiveWorkshopSession` SIEMPRE en `switchWorkshop` |
| Rol incorrecto en pantalla | `currentRole` no pasado como prop | Verificar `currentRole` en props de pantalla |

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/screens/WorkshopManagementScreen.js` | UI lista + `handleSwitchWorkshop` |
| `src/context/AuthContext.js` | `switchWorkshop`, `refreshWorkshopContext`, `setActiveWorkshopSession` |
| `src/services/workshops/workshopSession.js` | Singleton `activeWorkshopSession` |
| `App.js` | Routing, `currentRole` resolution, `onSwitchWorkshop` navigation |
| `src/screens/WorkshopHomeScreen.js` | `useEffect([activeWorkshopId])` recarga datos |
| `src/screens/DiagnosticsScreen.js` | `useEffect([activeWorkshopId])` recarga datos |
| `src/screens/WorkOrdersScreen.js` | `useEffect([activeWorkshopId])` recarga datos |