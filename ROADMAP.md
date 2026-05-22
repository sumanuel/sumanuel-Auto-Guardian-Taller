# Roadmap Auto-Guardian-Taller

Ultima actualizacion: 22-05-2026

## Como se actualiza este roadmap

- Cambiar el estado de cada item cuando pase de pendiente a en progreso o completado.
- Agregar la fecha real en la columna de completado cuando aplique.
- Registrar un resumen corto en Historial de avances cada vez que se cierre un aspecto importante.
- Mantener el mismo lenguaje visual y de experiencia de Auto-Guardian usando el skill del proyecto.

## Leyenda de estado

- Pendiente
- En progreso
- Completado
- Bloqueado

## Situacion actual

- Completado: base Expo creada y publicada en GitHub.
- Completado: sistema inicial de tema y responsive alineado con Auto-Guardian.
- Completado: skill e instrucciones de UI agregadas al repositorio.
- Completado: Firestore definido e integrado como base de datos inicial del proyecto.
- Completado: estrategia base de IDs consecutivos definida por coleccion mediante contadores transaccionales.
- Completado: Firebase Auth definido como proveedor de autenticacion.
- Completado: registro definido como mixto, con registro directo y activacion opcional por invitacion; temporalmente el alta publica eleva al usuario como administrador para destrabar la operacion.
- Completado: UID de Firebase Auth definido como identificador tecnico principal del usuario.
- Completado: codigo consecutivo visible del usuario definido como campo de Firestore, no como clave tecnica.
- Completado: login, recuperacion de contrasena y persistencia de sesion implementados con Firebase Auth.
- Completado: lectura del perfil userProfiles vinculada al uid autenticado.
- Completado: reglas base de Firestore y Storage definidas para autenticacion, perfiles, invitaciones y modulos operativos.
- Completado: alta directa y alta por invitacion operativas con perfil userProfiles en Firestore.
- Completado: emision administrativa de invitaciones operativas desde pantalla dedicada de equipo, con activacion en app por correo invitado y codigo visible opcional.
- Bloqueado: notificacion automatica por correo para invitaciones; Firebase Trigger Email sigue pendiente hasta subir el proyecto a Blaze por dependencia de Secret Manager.
- Completado: CRUD base de clientes disponible en pantalla dedicada para recepcion.
- Completado: asociacion de uno o varios vehiculos por cliente y CRUD base de vehiculos desde la pantalla de clientes.
- Completado: vista de detalle real por cliente con acciones rapidas, vehiculos asociados, acceso directo a diagnostico por vehiculo y boton flotante para alta.
- Completado: directorio formal de personal tecnico con ficha editable de nombre, telefono, rol y estado desde la pantalla de equipo.
- Pendiente: funcionalidad de negocio, autenticacion, datos y flujos operativos del taller.

## Fase 0. Fundacion tecnica

| ID   | Aspecto                                                                                                 | Estado     | Prioridad | Dependencias | Completado |
| ---- | ------------------------------------------------------------------------------------------------------- | ---------- | --------- | ------------ | ---------- |
| F0-1 | Definir arquitectura de datos y modulos principales de la app                                           | Completado | Alta      | Ninguna      | 30-04-2026 |
| F0-2 | Definir backend o proveedor de servicios para auth, base de datos y correo                              | Completado | Alta      | F0-1         | 30-04-2026 |
| F0-3 | Definir roles y permisos basicos: administrador, recepcion, mecanico                                    | Completado | Alta      | F0-1         | 30-04-2026 |
| F0-4 | Modelar entidades principales: usuarios, clientes, vehiculos, diagnosticos, ordenes, avances, repuestos | Completado | Alta      | F0-1         | 30-04-2026 |
| F0-5 | Definir flujo de invitacion de mecanicos por correo reutilizando la otra app                            | Completado | Alta      | F0-2, F0-3   | 21-05-2026 |
| F0-6 | Integrar Firestore y helper reutilizable para IDs consecutivos por coleccion                            | Completado | Alta      | F0-2         | 30-04-2026 |
| F0-7 | Definir politica de registro y aprobacion de cuentas                                                    | Completado | Alta      | F0-2, F0-3   | 30-04-2026 |
| F0-8 | Definir regla de identidad tecnica de usuarios y codigo consecutivo visible                             | Completado | Alta      | F0-2, F0-4   | 30-04-2026 |

## Fase 1. Acceso y cuentas

| ID   | Aspecto                                                  | Estado     | Prioridad | Dependencias     | Completado |
| ---- | -------------------------------------------------------- | ---------- | --------- | ---------------- | ---------- |
| F1-1 | Login de usuarios                                        | Completado | Alta      | F0-2, F0-3       | 30-04-2026 |
| F1-2 | Registro de usuarios autorizados                         | Completado | Alta      | F0-2, F0-3       | 21-05-2026 |
| F1-3 | Recuperacion de contrasena                               | Completado | Alta      | F0-2             | 30-04-2026 |
| F1-4 | Persistencia de sesion y cierre de sesion                | Completado | Alta      | F1-1             | 30-04-2026 |
| F1-5 | Validaciones, mensajes de error y estados vacios de auth | Completado | Media     | F1-1, F1-2, F1-3 | 30-04-2026 |

## Fase 2. Clientes y vehiculos

| ID   | Aspecto                                                                                  | Estado     | Prioridad | Dependencias     | Completado |
| ---- | ---------------------------------------------------------------------------------------- | ---------- | --------- | ---------------- | ---------- |
| F2-1 | CRUD de clientes con identificacion, nombre, direccion, telefono y correo                | Completado | Alta      | F0-4             | 22-05-2026 |
| F2-2 | Busqueda de clientes por identificacion o nombre y lectura rapida de vehiculos asociados | Completado | Media     | F2-1             | 22-05-2026 |
| F2-3 | Asociar uno o varios vehiculos a cada cliente                                            | Completado | Alta      | F2-1, F0-4       | 21-05-2026 |
| F2-4 | CRUD de vehiculos con datos operativos basicos                                           | Completado | Alta      | F2-3             | 21-05-2026 |
| F2-5 | Vista de detalle del cliente con sus vehiculos y acceso directo a diagnostico            | Completado | Alta      | F2-1, F2-3, F2-4 | 22-05-2026 |

## Fase 3. Mecanicos y equipo

| ID   | Aspecto                                           | Estado     | Prioridad | Dependencias | Completado |
| ---- | ------------------------------------------------- | ---------- | --------- | ------------ | ---------- |
| F3-1 | CRUD de mecanicos y personal tecnico              | Completado | Alta      | F0-4         | 21-05-2026 |
| F3-2 | Flujo de invitacion en app para mecanicos         | Completado | Alta      | F0-5         | 21-05-2026 |
| F3-3 | Aceptacion de invitacion y activacion de cuenta   | Completado | Alta      | F3-2, F1-1   | 21-05-2026 |
| F3-4 | Asignacion de mecanicos a diagnosticos y trabajos | Completado | Alta      | F3-1, F4-1   | 21-05-2026 |

## Fase 4. Diagnostico y plan de trabajo

| ID   | Aspecto                                                   | Estado     | Prioridad | Dependencias | Completado |
| ---- | --------------------------------------------------------- | ---------- | --------- | ------------ | ---------- |
| F4-1 | Crear diagnosticos por vehiculo                           | Completado | Alta      | F2-4         | 21-05-2026 |
| F4-2 | Registrar lista de partes para reparacion o mantenimiento | Completado | Alta      | F4-1         | 21-05-2026 |
| F4-3 | Registrar lista de repuestos requeridos                   | Completado | Alta      | F4-1         | 21-05-2026 |
| F4-4 | Asociar fotos, notas y observaciones al diagnostico       | Pendiente  | Media     | F4-1         | -          |
| F4-5 | Definir aprobacion del cliente sobre trabajos y repuestos | Pendiente  | Media     | F4-2, F4-3   | -          |

## Fase 5. Ejecucion y seguimiento

| ID   | Aspecto                                                                                      | Estado     | Prioridad | Dependencias | Completado |
| ---- | -------------------------------------------------------------------------------------------- | ---------- | --------- | ------------ | ---------- |
| F5-1 | Crear orden de trabajo basada en un diagnostico existente                                    | Completado | Alta      | F4-1         | 21-05-2026 |
| F5-2 | Registrar avances de mantenimiento o reparacion                                              | Completado | Alta      | F5-1         | 21-05-2026 |
| F5-3 | Manejar estados del trabajo: recibido, diagnosticado, aprobado, en proceso, listo, entregado | Pendiente  | Alta      | F5-1         | -          |
| F5-4 | Historial cronologico de avances por vehiculo y por orden                                    | Completado | Alta      | F5-2         | 21-05-2026 |
| F5-5 | Registro de observaciones finales y entrega                                                  | Pendiente  | Media     | F5-3         | -          |

## Fase 6. Operacion necesaria para completar la app

| ID   | Aspecto                                                            | Estado    | Prioridad | Dependencias     | Completado |
| ---- | ------------------------------------------------------------------ | --------- | --------- | ---------------- | ---------- |
| F6-1 | Inventario basico de repuestos vinculable a diagnosticos y ordenes | Pendiente | Media     | F4-3, F5-1       | -          |
| F6-2 | Presupuestos y costos estimados por trabajo                        | Pendiente | Media     | F4-2, F4-3       | -          |
| F6-3 | Registro de pagos, saldo pendiente y cierre administrativo         | Pendiente | Media     | F6-2, F5-5       | -          |
| F6-4 | Notificaciones internas o por correo para cambios de estado        | Pendiente | Media     | F5-3, F0-2       | -          |
| F6-5 | Adjuntos y evidencias: fotos, documentos, facturas                 | Pendiente | Media     | F4-1             | -          |
| F6-6 | Auditoria minima de cambios importantes                            | Pendiente | Media     | F0-4             | -          |
| F6-7 | Dashboard operativo del taller con indicadores clave               | Pendiente | Media     | F2-1, F4-1, F5-3 | -          |

## Fase 7. Diseno y consistencia de producto

| ID   | Aspecto                                                                        | Estado      | Prioridad | Dependencias   | Completado |
| ---- | ------------------------------------------------------------------------------ | ----------- | --------- | -------------- | ---------- |
| F7-1 | Mantener el lenguaje visual de Auto-Guardian en todas las pantallas            | En progreso | Alta      | Base UI creada | -          |
| F7-2 | Reutilizar el skill y las reglas de UI en cada nueva pantalla o componente     | En progreso | Alta      | Base UI creada | -          |
| F7-3 | Crear componentes compartidos para cards, formularios, listas y estados vacios | Pendiente   | Alta      | F7-1           | -          |
| F7-4 | Validar experiencia movil para Expo Go en telefonos y tablets                  | Pendiente   | Media     | F7-1           | -          |

## Hitos sugeridos

| Hito | Objetivo                                                        | Estado      |
| ---- | --------------------------------------------------------------- | ----------- |
| H1   | Acceso completo con login, registro y recuperacion              | Completado  |
| H2   | Gestion completa de clientes y vehiculos                        | Completado  |
| H3   | Equipo tecnico con invitaciones operativas en app               | Completado  |
| H4   | Diagnostico con partes, repuestos y aprobacion                  | En progreso |
| H5   | Seguimiento de trabajos y avances                               | En progreso |
| H6   | Operacion extendida: costos, pagos, inventario y notificaciones | Pendiente   |

## Historial de avances

- 30-04-2026: se crea el roadmap inicial del producto con fases, dependencias y estados base.
- 30-04-2026: proyecto base Expo publicado en GitHub con lineamiento visual heredado de Auto-Guardian.
- 30-04-2026: se adopta Firebase Firestore como base de datos inicial y se deja lista la estrategia de IDs consecutivos por coleccion.
- 30-04-2026: se cierra la definicion de roles, permisos, politica de registro, modelo de entidades y regla de identidad de usuarios con Firebase Auth.
- 30-04-2026: se implementan login, recuperacion, persistencia de sesion y lectura del perfil userProfiles por uid autenticado.
- 30-04-2026: se implementa la activacion de cuenta por invitacion con estado de aprobacion pendiente; falta el lado administrativo para emitir y aprobar altas.
- 01-05-2026: se agregan archivos de seguridad de Firebase con reglas base para Firestore y Storage, mas la guia de despliegue y bootstrap del primer administrador.
- 21-05-2026: se completan la asociacion y CRUD base de vehiculos por cliente; ademas, el modulo de equipo gana directorio editable de personal tecnico con cambios de rol y estado.
- 21-05-2026: se agrega un panel administrativo basico en la pantalla principal para emitir invitaciones, revisar invitaciones pendientes y aprobar perfiles en revision interna.
- 21-05-2026: el panel de equipo se separa a una pantalla propia, las invitaciones pasan a emitirse y activarse dentro de la app por correo invitado, y Trigger Email queda como canal opcional bloqueado por Blaze.
- 21-05-2026: el flujo de invitaciones pasa a resolverse por correo invitado con codigo consecutivo solo como referencia visible; la pantalla de auth acepta por correo y el modulo de clientes se divide en lista operativa mas detalle real por cliente.
- 21-05-2026: el alta y edicion de clientes pasan a una pantalla dedicada; la lista principal gana busqueda y filtros rapidos, y los perfiles registrados directamente se promocionan como administradores para evitar bloqueos en accesos e invitaciones.
- 21-05-2026: las colaboraciones se alinean al modelo de tienda-app, detectando invitaciones pendientes despues del login en estado de acceso; ademas se abren las secciones iniciales de diagnosticos, ordenes y repuestos con lista operativa, formulario dedicado y regreso a la lista.
- 21-05-2026: diagnosticos y ordenes pasan a asignar mecanicos reales desde userProfiles, y las ordenes ganan detalle operativo con registro de avances y cronologia visible por orden.
- 22-05-2026: clientes agrega campo de identificacion, la busqueda se limita a identificacion o nombre, la lista principal expone vehiculos asociados y la ficha del cliente abre diagnosticos por vehiculo sin volver a seleccionar cliente ni unidad.

## Decisiones base cerradas

- Autenticacion: Firebase Auth.
- Base de datos operativa: Firestore.
- Registro: mixto; se permite alta directa y tambien activacion por invitacion.
- Identidad tecnica de usuario: `uid` de Firebase Auth.
- Identidad visible interna de usuario: `userCode` consecutivo almacenado en Firestore.
- Perfil tecnico del mecanico: se modela como usuario con rol `mechanic`, no como identidad separada de autenticacion.
