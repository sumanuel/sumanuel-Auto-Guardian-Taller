# Plan de mejoras UX/funcionalidad por perfil

Fecha: 2026-11-05
Origen: revisión de código (sin ejecutar la app en dispositivo). Los tamaños táctiles y flujos salen de leer el código.

## Diagnóstico general

La base funcional es sólida: multi-taller, roles, filtro por asignación y cronología de avances. Pero la interfaz está pensada para recepción/administración (leer, filtrar, supervisar) y el mecánico ve una versión recortada. Un mecánico con guantes necesita pocas acciones grandes y directas.

---

## Parte A. Plan de implementación (mecánico primero)

Cada fase se puede probar sola sin romper a los otros roles.

### Fase 0. Higiene rápida (½ día, bajo riesgo)
- Corregir tildes: "Dueño, Mecánico, Diagnóstico, Vehículo, Órdenes, Más, Recepción".
- Centralizar etiquetas de rol en `src/constants/accessControl.js` (hoy hay copias en `WorkshopHomeScreen` y `WorkshopMoreScreen`).
- `WorkshopHomeScreen.js` (~línea 473): usar `currentRole` y no `userProfile.role`.
- Quitar `.slice(0, 8)` de la agenda; para el mecánico no filtrar por fecha las órdenes no entregadas.
- Etiqueta "Diag." de la barra inferior → "Diagnóstico".
- **Listo cuando**: ninguna pantalla muestra rol, tildes o conteos distintos entre sí.

### Fase 1. Tokens de "modo taller" (1–2 días)
- Crear `src/utils/touch.js`: `TOUCH_MIN = 56`, `TOUCH_GAP = 12`, fuente base 16–18.
- Componentes comunes en `src/components/common/`: `BigButton`, `BigChip`, `StepperPercent` (0/25/50/75/100 y −/+10), `StatusActionBar` (barra inferior fija).
- Aplicar solo cuando `isMechanicUser` (ya se calcula en `App.js`).
- Háptica corta (`expo-haptics`) y estado `pressed` visible.
- **Listo cuando**: todo control tocable del mecánico mide ≥56 px y hay feedback al pulsar.

### Fase 2. "Mi trabajo de hoy" (2–3 días)
- Nueva `MechanicHomeScreen.js` que sustituye a `WorkshopHomeScreen` solo para el mecánico.
- Tarjeta grande "Continuar" con la orden en proceso; debajo, grupos *En proceso / Pendientes / En pausa / Listas*.
- Tarjeta: placa grande, borde de color por estado, barra de progreso; sin texto descriptivo.
- Sin filtros de fecha/placa visibles (búsqueda tras un icono). Pull-to-refresh con `RefreshControl`.
- **Listo cuando**: el mecánico ve todas sus órdenes activas sin tocar filtros y abre la actual en un toque.

### Fase 3. Detalle de orden con acciones de un toque (3–4 días)
- Refactor previo: extraer de `WorkOrdersScreen.js` (~2.200 líneas) `ProgressForm` y `OrderTimeline`.
- Barra fija inferior: **Iniciar / Pausar / Listo / Nota** (reusa `handleProgressSubmit`; confirmación con modal grande propio, no `Alert`).
- Avance con `StepperPercent` en vez del slider (slider como opción avanzada).
- Botón explícito **"Reabrir"** para órdenes Listas (hoy exige nota + cambio de estado).
- Frases rápidas para notas.
- **Listo cuando**: iniciar, pausar y cerrar una orden toma como máximo 2 toques.

### Fase 4. Fotos y repuestos (3–4 días)
- Botón de cámara en notas y avances; guardar en Storage y en los campos `photos` que el modelo ya tiene (`progressEntries.photos`, `diagnostics.photos`). Revisar `storage.rules`.
- "Pedir repuesto" en un toque desde la orden (estado `requested`, ya existe) con aviso a recepción.
- **Listo cuando**: el mecánico adjunta foto y pide un repuesto sin salir de la orden.

### Fase 5. Resiliencia (2 días)
- Caché persistente de Firestore en `src/services/firebase/config.js` + indicador "sin conexión / pendiente de sincronizar".
- `BackHandler` de Android en `App.js` (la navegación es por estado).
- **Listo cuando**: se puede registrar un avance en modo avión y sincroniza al volver la señal.

### Fase 6. Extras (según prioridad)
Dictado por voz, cronómetro por orden, checklist por servicio, push de asignaciones, escaneo de placa, llamar/WhatsApp.

### Riesgos y verificación
- No hay tests ni linter. Por fase: `npx expo export --platform android` y prueba manual con un usuario mecánico y otro de recepción en el mismo taller.
- Confirmar que las reglas de Firestore también aplican el filtro por asignación en servidor (hoy el filtro está en `useMemo`).

---

## Parte B. Recomendaciones por perfil

### Mecánico (hallazgos)
- Objetivos táctiles pequeños: `filterChip` (~28 px), botones de ícono 36 px, píldoras secundarias ~30 px, tab bar con ícono 34 px y etiqueta `rf(10)`.
- Slider de avance (altura `rf(32)`, `step=1`) inviable con guantes.
- Registrar avance exige muchos pasos y mucho texto de ayuda.
- Sin fotos pese a tener `expo-image-picker` instalado y campos `photos` en el modelo.
- Agenda con rango de 30 días y tope de 8 registros: puede ocultar órdenes activas.
- Diagnósticos y órdenes mezclados en la misma cola.
- Sin pull-to-refresh, sin `BackHandler`, sin caché offline.
- Contraste bajo en `textTertiary`; `Alert` nativos con botones apretados.
- `ROLE_PERMISSIONS` da al mecánico solo `diagnostics.assigned.view`, pero `DiagnosticFormScreen` lo pre-asigna: alinear permisos, UI y reglas.

### Recepción
1. Flujo único "Nuevo ingreso" (placa → cliente+vehículo → diagnóstico) en vez de 4 pantallas separadas.
2. Llamar / WhatsApp con un toque (no hay `Linking` en el código) y mensaje "Tu vehículo está listo" prellenado.
3. Cotización PDF (`diagnosticQuotePdfService.js`): enviar directo por WhatsApp/correo y registrar respuesta del cliente.
4. Botón "Crear orden" desde un diagnóstico Aprobado, con datos precargados.
5. Fecha prometida y prioridad en la orden (no existen en el modelo `workOrders`).
6. Recibo de entrega con firma y fotos de recepción (daños previos).
7. Archivar en vez de borrar clientes/vehículos con historial.
8. `FlatList` en listados largos y búsqueda por placa/teléfono global.

### Administrador
1. Tablero de gestión: órdenes por estado, atrasadas, esperando repuesto, listas sin entregar, diagnósticos sin respuesta (hoy el Home solo cuenta vehículos y clientes).
2. Vista de carga por mecánico y reasignación rápida; mostrar carga al asignar.
3. Alertas de stock bajo en el Home (la lógica existe en `StockItemsScreen.js`) y "pedir reposición".
4. Vincular `spareParts` con `stockItems`: hoy instalar un repuesto no descuenta inventario.
5. Vista de auditoría (quién cambió qué y cuándo).

### Dueño
1. Módulo de pagos: existe el permiso `payments.manage` pero no hay módulo. Empezar con total por orden, anticipos, saldo, método y estado "cobrada".
2. Métricas (`dashboard.view`): ingresos por periodo, ticket promedio, tiempo promedio de reparación, órdenes por mecánico, tasa de aprobación, repuestos más usados.
3. Costos y margen: añadir precio de venta (hoy solo `unitCost`).
4. Dividir `TeamAccessScreen.js` (~2.300 líneas): equipo / invitaciones / datos del taller; invitación simple "correo + rol".
5. Mostrar siempre el taller activo en el encabezado.
6. Invitaciones por correo bloqueadas por plan Blaze (ver `ROADMAP.md`): compartir enlace/código por WhatsApp mientras tanto.
7. Exportación CSV/PDF; el reinicio de datos (`workshopResetService.js`) debe exigir exportación previa y doble confirmación escrita.

### Transversal
- Estados vacíos que expliquen el siguiente paso; acortar mensajes largos.
- Accesibilidad: contraste, tamaño de fuente configurable, modo de alto contraste.
- Banner claro cuando cambie el rol/membresía.
- Antes de refactors grandes: pruebas de lógica pura (`workOrderService`, `accessControl`) y ESLint básico.

---

## Prioridad conjunta

| # | Qué | Perfil | Esfuerzo | Impacto |
|---|-----|--------|----------|---------|
| 1 | Fase 0 (textos, rol, tope de 8) | Todos | Bajo | Medio |
| 2 | Fases 1–3 (modo taller, "Mi trabajo de hoy", acciones de un toque) | Mecánico | Medio-alto | Muy alto |
| 3 | Llamar/WhatsApp y "Crear orden" desde diagnóstico aprobado | Recepción | Bajo-medio | Alto |
| 4 | Tablero de gestión y alertas de stock en Home | Admin/Dueño | Medio | Alto |
| 5 | Fotos y pedir repuesto | Mecánico/Recepción | Medio | Alto |
| 6 | Pagos y métricas | Dueño | Alto | Muy alto |
| 7 | Offline y `BackHandler` | Todos | Bajo-medio | Alto |
| 8 | Vincular repuestos con inventario | Admin | Medio | Medio |
