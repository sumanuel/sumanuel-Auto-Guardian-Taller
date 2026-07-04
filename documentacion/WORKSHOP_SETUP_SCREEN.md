# WorkshopSetupScreen — Flujo de Primer Taller

## Propósito

Formulario post-onboarding para que el usuario configure su **primer taller propio** (rol OWNER). Se muestra automáticamente cuando `requiresWorkshopSetup === true`.

---

## Cuándo se Muestra

En `App.js`:

```javascript
// AuthContext expone requiresWorkshopSetup
const { requiresWorkshopSetup } = useAuth();

// App.js - antes de renderAuthenticatedScreen
if (requiresWorkshopSetup) {
  return (
    <WorkshopSetupScreen
      onSaved={async () => {
        await refreshWorkshopContext();  // Recarga contexto tras crear
        setActiveScreen(APP_SCREENS.HOME);
      }}
      userProfile={userProfile}
    />
  );
}
```

`requiresWorkshopSetup` es `true` cuando:
- Usuario no tiene NINGUNA membresía válida (`resolveUserWorkshopContext` retorna `requiresWorkshopSetup: true`)
- Usuario recién registrado sin invitación
- Usuario que aceptó invitación pero el taller no existe (migración corrupta)

---

## Flujo Completo

```
Usuario se registra (sin invitación)
    │
    ▼
OnboardingScreen → onComplete()
    │
    ▼
App.js: showOnboarding = false
    │
    ▼
AuthContext: resolveUserWorkshopContext()
    │
    ├── Usuario sin membresías → ensurePersonalWorkshopForUser()
    │   Crea taller "Mi taller" + membresía OWNER
    │
    ▼
requiresWorkshopSetup = true
    │
    ▼
App.js renderiza WorkshopSetupScreen
    │
    ▼
Usuario llena formulario (o presiona "Ahora no")
    │
    ▼
handleSave() / handleSkip()
    │
    ├── createWorkshop({ name, ownerUserUid, ... })
    ├── upsertWorkshopMembership({ role: "owner", ... })
    │
    ▼
refreshWorkshopContext()
    │
    ▼
resolveUserWorkshopContext() → encuentra membresía OWNER → requiresWorkshopSetup: false
    │
    ▼
onSaved() → setActiveScreen(HOME)
```

---

## WorkshopSetupScreen — Implementación

```javascript
// Props
export default function WorkshopSetupScreen({ onSaved, userProfile }) {
  const { refreshWorkshopContext } = useAuth();
  const [name, setName] = useState("");
  // phone, address, rif...

  const ensureWorkshop = async (workshopName) => {
    const workshop = await createWorkshop({
      name: workshopName,
      ownerUserUid: userProfile?.uid,
      phone: phone.trim(),
      email: userProfile?.email || "",
      address: address.trim(),
      rif: rif.trim(),
    });

    await upsertWorkshopMembership({
      workshopId: workshop.id,
      userUid: userProfile?.uid,
      role: USER_ROLES.OWNER,
      status: "active",
      invitedByUid: userProfile?.uid,
    });

    return workshop;
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Taller", "Ingresa el nombre del taller."); return; }
    
    setSubmitting(true);
    try {
      await ensureWorkshop(name.trim());
      await refreshWorkshopContext();  // ¡Clave! Recarga contexto
      onSaved?.();
    } catch (error) {
      Alert.alert("Taller", error?.message || "No se pudo guardar");
    } finally { setSubmitting(false); }
  };

  const handleSkip = async () => {
    // Crea taller con nombre por defecto
    const defaultName = userProfile?.fullName
      ? `Taller de ${userProfile.fullName}`
      : "Mi taller";
    await ensureWorkshop(defaultName);
    await refreshWorkshopContext();
    onSaved?.();
  };
}
```

---

## Campos del Formulario

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre del taller** | ✓ Sí | Identificación del negocio |
| Teléfono | No | Contacto del taller |
| Dirección | No | Ubicación física |
| RIF | No | Registro de información fiscal (Venezuela) |

---

## Integración con `ensurePersonalWorkshopForUser`

```javascript
// src/services/workshops/workshopService.js
export async function ensurePersonalWorkshopForUser({ uid, fullName, email }) {
  const existingMemberships = await listRawUserWorkshopMemberships(uid);

  // Buscar membresía con taller VÁLIDO
  for (const membership of existingMemberships) {
    const workshop = await getWorkshopById(membership.workshopId);
    if (workshop) {
      return { workshop, membership };
    }
  }

  // Ninguna válida → crear nueva
  const workshop = await createWorkshop({
    name: buildDefaultWorkshopName(fullName),  // "Mi taller" o "Taller de {nombre}"
    ownerUserUid: uid,
    email,
  });
  
  const membership = await upsertWorkshopMembership({
    workshopId: workshop.id,
    userUid: uid,
    role: USER_ROLES.OWNER,
    status: USER_STATUSES.ACTIVE,
    invitedByUid: uid,
  });

  return { workshop, membership };
}
```

---

## Puntos Críticos

### 1. `refreshWorkshopContext()` Después de Crear

```javascript
// En handleSave / handleSkip
await ensureWorkshop(name);
await refreshWorkshopContext();  // ¡OBLIGATORIO!
onSaved?.();
```

Sin este refresh, `requiresWorkshopSetup` sigue `true` y la app queda en loop.

### 2. Nombre por Defecto en "Ahora No"

```javascript
const handleSkip = async () => {
  const defaultName = userProfile?.fullName
    ? `Taller de ${userProfile.fullName}`
    : "Mi taller";
  await ensureWorkshop(defaultName);
  await refreshWorkshopContext();
  onSaved?.();
};
```

Crea el taller con nombre generado automáticamente para que el usuario pueda editarlo después desde "Datos del taller" en WorkshopMoreScreen.

### 3. `refreshWorkshopContext` en App.js

```javascript
onSaved={async () => {
  await refreshWorkshopContext();  // Recarga desde AuthContext
  setActiveScreen(APP_SCREENS.HOME);
}}
```

---

## Flujo Alternativo: Usuario con Invitación

Si el usuario entra por invitación:
1. Acepta invitación → `acceptPendingInvitation()`
2. Se crea membresía en taller ajeno (rol MECHANIC/RECEPTION)
3. `resolveUserWorkshopContext` encuentra membresía válida
4. `requiresWorkshopSetup = false` → **NO se muestra WorkshopSetupScreen**
5. Usuario opera directamente en taller invitado

Solo verá el setup si **tampoco tiene taller propio** y decide crearlo después desde "Mis talleres".

---

## Archivos Relacionados

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/screens/WorkshopSetupScreen.js` | Formulario UI + lógica de creación |
| `src/services/workshops/workshopService.js` | `ensurePersonalWorkshopForUser`, `createWorkshop`, `upsertWorkshopMembership` |
| `src/context/AuthContext.js` | `requiresWorkshopSetup`, `refreshWorkshopContext` |
| `App.js` | Render condicional + `onSaved` handler |