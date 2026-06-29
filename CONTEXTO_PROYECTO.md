# Contexto del proyecto: Auto-Guardian-Taller

Ultima actualizacion: 2026-06-29

## Resumen rapido

Auto-Guardian-Taller es la evolucion orientada a operacion de taller del ecosistema Auto-Guardian. La app ya no esta en fase de idea: tiene autenticacion, gestion operativa, inventario y separacion de roles, con una direccion visual alineada al producto base.

## Stack y arquitectura

- Frontend movil: Expo SDK 54, React 19, React Native 0.81.
- Backend gestionado: Firebase Auth + Firestore.
- Almacenamiento adicional: Firebase Storage cuando aplique.
- Estado y sesion: contextos en src/context.
- Servicios de dominio: src/services.

## Punto de entrada y flujo base

- App principal: App.js
- Pantalla home operativa: src/screens/WorkshopHomeScreen.js
- Pantalla de mas opciones: src/screens/WorkshopMoreScreen.js
- Auth y acceso: src/context y pantallas AuthScreen / AccessStatusScreen

El proyecto ya tiene gate de sesion y onboarding. La app decide el acceso segun autenticacion, perfil y permisos del usuario.

## Modelo funcional actual

Los modulos principales ya presentes son:

- Autenticacion y perfiles.
- Taller activo y colaboradores.
- Clientes.
- Vehiculos.
- Diagnosticos.
- Ordenes de trabajo.
- Avances cronologicos.
- Repuestos.
- Stock y herramientas.

## Reglas de negocio importantes

- Firebase Auth UID es la identidad tecnica principal del usuario.
- Los mecanicos no son una identidad aparte: son userProfiles con role mechanic.
- El proyecto actual opera en modo taller unico, aunque ya paso por una base multi-taller y conserva parte de esa arquitectura conceptual.
- Los registros operativos deben pasar por servicios de Firestore e IDs consecutivos, no por escrituras ad hoc.

## Pantallas clave

- WorkshopHomeScreen
- ClientsScreen
- VehiclesDirectoryScreen
- DiagnosticsScreen
- WorkOrdersScreen
- SparePartsScreen
- StockItemsScreen
- TeamAccessScreen
- WorkshopMoreScreen

## Carpetas que conviene leer primero

- src/screens
- src/services
- src/context
- ARQUITECTURA_BASE.md
- ROADMAP.md

## Comandos utiles

```bash
npm install
npm run start
npm run android
npm run migrate:multi-workshop:dry
npm run migrate:multi-workshop
```

## Estado actual y notas operativas

- Ya existe login, recuperacion, persistencia de sesion y perfiles en Firestore.
- Ya existe emision y aceptacion de invitaciones dentro de la app.
- Clientes, vehiculos, diagnosticos y ordenes ya tienen CRUD operativo.
- El inventario general del taller vive en stockItems con movimientos atomicos.
- El rol mechanic ya quedo endurecido para ver solo trabajo asignado.

## Bloqueos o deuda visible

- El correo automatico con Firebase Trigger Email sigue condicionado por plan Blaze.
- El dashboard operativo y algunos cierres de flujo aun estan en progreso.
- Persisten pendientes en adjuntos, aprobacion del cliente, pagos y auditoria.

## Recomendacion para futuras sesiones

Antes de tocar funcionalidad, revisar siempre:

1. ROADMAP.md para estado del modulo.
2. el servicio de dominio en src/services correspondiente.
3. la pantalla principal del modulo.
4. reglas y permisos si el cambio afecta acceso por rol.
