# Arquitectura Base Auto-Guardian-Taller

Ultima actualizacion: 30-04-2026

## Stack definido

- Autenticacion: Firebase Auth.
- Base de datos principal: Firestore.
- Reglas de negocio y numeracion consecutiva: capa de servicios propia en src/services.
- Correo de invitaciones: flujo reutilizable desde la otra app o servicio backend dedicado en una fase posterior.

## Politica de acceso definida

- No habra registro publico libre dentro de la app.
- Toda cuenta nueva debe entrar por invitacion o aprobacion interna.
- El primer administrador se crea manualmente fuera del flujo publico.
- La app movil mostrara login, recuperacion de contrasena y, cuando se implemente, acceso por invitacion.

## Regla de identidad de usuarios

- Firebase Auth UID es la clave tecnica principal del usuario.
- El perfil del usuario en Firestore usa el mismo UID como documentId.
- El codigo visible interno del usuario se guarda como userCode con numeracion consecutiva, por ejemplo USR-000001.
- No se usara un ID consecutivo como clave tecnica de autenticacion.

## Roles definidos

### administrator

- Acceso total a configuracion, usuarios, invitaciones, clientes, vehiculos, diagnosticos, ordenes, avances, repuestos, costos y dashboard.

### reception

- Gestiona clientes, vehiculos, diagnosticos iniciales, ordenes de trabajo y seguimiento operativo.
- Puede ver mecanicos y asignaciones.
- No puede administrar usuarios del sistema ni cambiar configuraciones sensibles.

### mechanic

- Ve sus trabajos asignados, diagnosticos relacionados, repuestos requeridos y avances.
- Puede registrar avances, observaciones tecnicas y estatus operativos permitidos.
- No puede administrar usuarios, invitaciones, clientes o cierres administrativos.

## Entidades principales definidas

### userProfiles

- documentId: uid de Firebase Auth.
- Campos base: uid, userCode, fullName, email, phone, role, status, invitationId, createdAt, updatedAt, lastLoginAt.

### staffInvitations

- documentId: consecutivo visible, por ejemplo INV-000001.
- Campos base: id, sequentialId, email, role, status, invitedByUid, acceptedByUid, expiresAt, createdAt, updatedAt.

### clients

- documentId: consecutivo visible, por ejemplo CLI-000001.
- Campos base: id, sequentialId, fullName, address, phone, email, notes, createdByUid, createdAt, updatedAt.

### vehicles

- documentId: consecutivo visible, por ejemplo VEH-000001.
- Campos base: id, sequentialId, clientId, plate, brand, model, year, color, vin, mileage, notes, createdAt, updatedAt.

### diagnostics

- documentId: consecutivo visible, por ejemplo DIA-000001.
- Campos base: id, sequentialId, vehicleId, clientId, openedByUid, assignedMechanicUid, status, concerns, serviceItems, spareParts, notes, photos, createdAt, updatedAt.

### workOrders

- documentId: consecutivo visible, por ejemplo ORD-000001.
- Campos base: id, sequentialId, diagnosticId, vehicleId, clientId, assignedMechanicUids, status, approvedAt, startedAt, finishedAt, deliveredAt, createdAt, updatedAt.

### progressEntries

- documentId: consecutivo visible, por ejemplo AVA-000001.
- Campos base: id, sequentialId, workOrderId, diagnosticId, vehicleId, authorUid, type, message, photos, statusSnapshot, createdAt, updatedAt.

### spareParts

- documentId: consecutivo visible, por ejemplo REP-000001.
- Campos base: id, sequentialId, diagnosticId, workOrderId, name, quantity, unitCost, supplier, status, createdAt, updatedAt.

## Regla de modelado clave

- Los mecanicos no se modelan como una identidad de autenticacion separada.
- Todo mecanico es un userProfile con role igual a mechanic.
- Las asignaciones operativas se hacen por uid del usuario.

## Modulos base definidos

- auth: inicio de sesion, recuperacion, persistencia de sesion y gestion del perfil autenticado.
- users: perfiles internos, roles, estados e invitaciones.
- clients: gestion de clientes.
- vehicles: gestion de vehiculos por cliente.
- diagnostics: inspeccion inicial, partes y repuestos.
- workOrders: ejecucion del trabajo y estados operativos.
- progress: avances, historial y evidencias.
