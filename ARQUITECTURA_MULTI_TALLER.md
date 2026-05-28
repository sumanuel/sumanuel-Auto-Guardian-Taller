# Arquitectura Multi-Taller Auto-Guardian-Taller

Ultima actualizacion: 28-05-2026

## Objetivo

- Permitir que un mismo usuario tenga su propio taller y, al mismo tiempo, sea colaborador en uno o varios talleres adicionales.
- Permitir cambiar de taller activo dentro de la misma app sin cerrar sesion.
- Mantener los roles operativos del taller, pero moverlos desde un perfil global del usuario hacia una membresia por taller.

## Resultado funcional esperado

- Un usuario puede registrarse sin invitacion y crear su propio taller.
- Ese mismo usuario puede aceptar invitaciones de otros talleres.
- La app muestra un taller activo y deja cambiar entre talleres disponibles, igual que el modelo de Tiendas y colaboradores en tienda-app.
- Todos los datos operativos visibles en la app quedan filtrados por el taller activo.

## Diagnostico del modelo actual

- El proyecto actual usa un solo `userProfile` por `uid` con un `role` global.
- Las entidades operativas no tienen `workshopId`.
- Las invitaciones actuales no representan membresias por taller, sino acceso general del usuario.
- El alta publica promueve al usuario a `administrator`, lo cual resuelve acceso pero no crea separacion real entre talleres.

Conclusion: hoy Auto-Guardian-Taller no es multi-tenant. Para soportar multiples talleres por usuario, hay que introducir un contexto explicito de taller y particionar todos los datos operativos por `workshopId`.

## Principio de diseno

- La identidad del usuario es global.
- La pertenencia y el rol son locales a cada taller.
- Todo dato operativo pertenece a un taller.
- La sesion necesita conocer `activeWorkshopId`.

## Modelo propuesto

### 1. userProfiles

Se mantiene como perfil global del usuario autenticado.

Campos sugeridos:

- `uid`
- `userCode`
- `fullName`
- `email`
- `phone`
- `status`
- `defaultWorkshopId`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Cambios clave:

- El campo `role` deja de ser la fuente principal de autorizacion.
- `defaultWorkshopId` define a que taller volver cuando el usuario reabre la app.

### 2. workshops

Nueva coleccion para representar cada taller.

Campos sugeridos:

- `id`
- `sequentialId`
- `name`
- `ownerUserUid`
- `status`
- `phone`
- `email`
- `address`
- `logoUrl`
- `createdAt`
- `updatedAt`

Estados sugeridos:

- `active`
- `archived`
- `disabled`

### 3. workshopMemberships

Nueva coleccion para unir usuarios con talleres.

Campos sugeridos:

- `id`
- `workshopId`
- `userUid`
- `role`
- `status`
- `invitationId`
- `invitedByUid`
- `acceptedAt`
- `createdAt`
- `updatedAt`

Roles sugeridos:

- `owner`
- `administrator`
- `reception`
- `mechanic`

Estados sugeridos:

- `active`
- `pending`
- `suspended`
- `disabled`

Regla clave:

- Un usuario puede tener muchas membresias.
- Un taller puede tener muchos usuarios.
- El rol se evalua siempre sobre la membresia activa del taller seleccionado.

### 4. workshopInvitations

Recomendacion: reemplazar o evolucionar `staffInvitations` hacia invitaciones asociadas a taller.

Campos sugeridos:

- `id`
- `invitationCode`
- `sequentialId`
- `workshopId`
- `email`
- `emailNormalized`
- `role`
- `status`
- `invitedByUid`
- `acceptedByUid`
- `expiresAt`
- `deliveryStatus`
- `createdAt`
- `updatedAt`

Estados sugeridos:

- `pending`
- `accepted`
- `expired`
- `cancelled`

Regla clave:

- Aceptar una invitacion crea o reactiva una membresia para ese taller.
- Aceptar una invitacion no debe sustituir el perfil global del usuario ni borrar sus otras membresias.

## Entidades operativas que deben recibir workshopId

Todas estas colecciones deben quedar asociadas al taller activo:

- `clients`
- `vehicles`
- `diagnostics`
- `workOrders`
- `progressEntries`
- `spareParts`

Campo nuevo comun:

- `workshopId`

Impacto:

- Toda lectura debe filtrar por `workshopId`.
- Toda escritura debe persistir el `workshopId` activo.
- Toda regla de Firestore debe validar que el usuario pertenezca a ese taller.

## Sesion y AuthContext propuestos

El `AuthContext` debe evolucionar desde un perfil unico hacia un contexto multi-taller.

Estado sugerido:

- `authUser`
- `userProfile`
- `memberships`
- `activeWorkshopId`
- `activeMembership`
- `pendingInvitations`
- `requiresWorkshopSetup`
- `authReady`
- `authBusy`

Funciones sugeridas:

- `refreshWorkshopContext(preferredWorkshopId)`
- `switchWorkshop(workshopId)`
- `createOwnWorkshop(payload)`
- `acceptPendingInvitation(payload)`
- `loadPendingInvitations()`

Comportamiento esperado:

- Si el usuario no tiene talleres y entra por alta publica, la app debe crear su taller propio y una membresia `owner`.
- Si el usuario tiene varias membresias, la app debe restaurar `defaultWorkshopId` o usar el primer taller activo.
- Si el usuario acepta una invitacion, el taller invitado se agrega a `memberships` sin afectar su taller propio.

## Politica de roles recomendada

### owner

- Puede renombrar o archivar su taller.
- Puede administrar miembros y roles.
- Puede definir administradores.
- Tiene acceso total a la operacion del taller.

### administrator

- Puede operar el taller y gestionar colaboradores.
- No deberia poder transferir o eliminar la propiedad del taller.

### reception

- Gestiona clientes, vehiculos, diagnosticos y ordenes permitidas.

### mechanic

- Ve y actualiza sus asignaciones y avances operativos.

## UI recomendada

### Nueva pantalla o evolucion de TeamAccess

La pantalla actual [src/screens/TeamAccessScreen.js](src/screens/TeamAccessScreen.js) debe evolucionar hacia una pantalla tipo `Talleres y colaboradores`.

Bloques recomendados:

- Taller activo
- Mis talleres
- Cambiar de taller
- Crear nuevo taller
- Invitaciones pendientes para este usuario
- Miembros del taller activo
- Invitaciones emitidas por el taller activo

### Ajustes de navegacion

- En `More` debe existir la entrada `Talleres y colaboradores`.
- El home debe mostrar el nombre del taller activo.
- Los listados operativos deben recalcularse al cambiar el taller activo.

### Registro y activacion

- Registro publico: crear usuario global y luego crear taller propio.
- Registro por invitacion: crear usuario global y luego aceptar membresia al taller invitante.
- Usuario ya autenticado con invitacion pendiente: aceptar y agregar el taller a su lista de membresias.

## Reglas de Firestore recomendadas

### Idea base

- El usuario puede leer su `userProfile` global.
- El usuario puede leer `workshops` solo si tiene membresia activa en ellos.
- El usuario puede leer y escribir entidades operativas solo si el documento pertenece a un `workshopId` donde tenga membresia activa y permiso suficiente.

### Helper conceptual

Funciones de reglas sugeridas:

- `isAuthenticated()`
- `membershipDoc(workshopId)`
- `isWorkshopMember(workshopId)`
- `hasWorkshopRole(workshopId, allowedRoles)`
- `canAccessWorkshopEntity(workshopId)`

### Restriccion importante

- Ninguna lectura general de clientes, vehiculos, diagnosticos, ordenes o repuestos debe quedar abierta sin `workshopId`.
- Los contadores consecutivos deben revisarse si se quiere numeracion por taller en lugar de global.

## Numeracion consecutiva

Hay dos opciones validas:

### Opcion A. Global por coleccion

- Mantener `CLI-000001`, `DIA-000001`, `ORD-000001` globales para toda la plataforma.
- Ventaja: migracion mas simple.
- Desventaja: los codigos no reflejan pertenencia a un taller.

### Opcion B. Consecutivo por taller

- Cada taller lleva sus propios contadores, por ejemplo `ORD-000001` dentro de cada taller.
- Ventaja: operacion mas natural para el negocio.
- Desventaja: hay que refactorizar la infraestructura de `_counters` y las reglas.

Recomendacion practica:

- Fase 1 del multi-taller: mantener consecutivos globales para reducir riesgo.
- Fase 2 futura: evaluar consecutivos por taller si el negocio realmente lo necesita.

## Estrategia de migracion

### Fase M1. Introducir contexto de taller sin romper la app

- Crear `workshops`.
- Crear `workshopMemberships`.
- Crear `workshopInvitations` o extender `staffInvitations`.
- Agregar `defaultWorkshopId` en `userProfiles`.

### Fase M2. Backfill de usuarios existentes

- Crear un taller para cada usuario administrador actual que no tenga taller.
- Crear su membresia `owner`.
- Para usuarios creados por invitacion actual, decidir a que taller pertenecen y crear membresia equivalente.

### Fase M3. Backfill de entidades operativas

- Agregar `workshopId` a clientes, vehiculos, diagnosticos, ordenes, avances y repuestos.
- Asignar esos registros al taller correspondiente.

### Fase M4. Cambiar lecturas y escrituras

- Refactorizar servicios para filtrar por `workshopId`.
- Refactorizar formularios para persistir `workshopId`.
- Refactorizar dashboard y pantallas para depender del taller activo.

### Fase M5. Endurecer reglas

- Publicar nuevas reglas multi-tenant.
- Eliminar dependencias del `role` global heredado.

## Orden de implementacion sugerido

1. Crear el nuevo modelo de datos de talleres y membresias.
2. Refactorizar `AuthContext` para manejar `activeWorkshopId` y `memberships`.
3. Crear pantalla `Talleres y colaboradores` con selector de taller activo.
4. Adaptar invitaciones para apuntar a taller.
5. Agregar `workshopId` a las entidades operativas y refactorizar servicios.
6. Ajustar reglas de Firestore.
7. Ejecutar migracion de datos existentes.
8. Eliminar dependencias del modelo anterior.

## Riesgos principales

- Cambiar solo la UI sin particionar datos por taller produciria mezcla de informacion entre talleres.
- Mantener `role` global como fuente de permisos crearia incoherencias cuando un mismo usuario tenga roles distintos segun el taller.
- La migracion de invitaciones actuales requiere decidir a que taller quedaran vinculadas las cuentas ya activadas.

## Decision recomendada

- Replicar el patron conceptual de tienda-app.
- No copiarlo literalmente con nombres de tienda, sino adaptarlo a `workshops`, `memberships` y `activeWorkshopId`.
- Tratar este cambio como una evolucion estructural del producto, no como un ajuste menor de pantalla.

## Alcance del primer entregable recomendado

El primer entregable del multi-taller deberia incluir solo lo siguiente:

- Modelo `workshops`.
- Modelo `workshopMemberships`.
- Contexto `activeWorkshopId`.
- Selector de taller activo.
- Invitaciones por taller.
- Filtrado operativo por `workshopId` en clientes, vehiculos, diagnosticos y ordenes.

Con eso ya se habilita el caso de uso principal:

- tener taller propio
- aceptar invitacion a otro taller
- cambiar entre talleres dentro de la misma app
