# Roadmap Auto-Guardian-Taller

Ultima actualizacion: 30-04-2026

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
- Pendiente: funcionalidad de negocio, autenticacion, datos y flujos operativos del taller.

## Fase 0. Fundacion tecnica

| ID   | Aspecto                                                                                                 | Estado      | Prioridad | Dependencias | Completado |
| ---- | ------------------------------------------------------------------------------------------------------- | ----------- | --------- | ------------ | ---------- |
| F0-1 | Definir arquitectura de datos y modulos principales de la app                                           | Pendiente   | Alta      | Ninguna      | -          |
| F0-2 | Definir backend o proveedor de servicios para auth, base de datos y correo                              | En progreso | Alta      | F0-1         | -          |
| F0-3 | Definir roles y permisos basicos: administrador, recepcion, mecanico                                    | Pendiente   | Alta      | F0-1         | -          |
| F0-4 | Modelar entidades principales: usuarios, clientes, vehiculos, diagnosticos, ordenes, avances, repuestos | Pendiente   | Alta      | F0-1         | -          |
| F0-5 | Definir flujo de invitacion de mecanicos por correo reutilizando la otra app                            | Pendiente   | Alta      | F0-2, F0-3   | -          |
| F0-6 | Integrar Firestore y helper reutilizable para IDs consecutivos por coleccion                            | Completado  | Alta      | F0-2         | 30-04-2026 |

## Fase 1. Acceso y cuentas

| ID   | Aspecto                                                  | Estado    | Prioridad | Dependencias     | Completado |
| ---- | -------------------------------------------------------- | --------- | --------- | ---------------- | ---------- |
| F1-1 | Login de usuarios                                        | Pendiente | Alta      | F0-2, F0-3       | -          |
| F1-2 | Registro de usuarios autorizados                         | Pendiente | Alta      | F0-2, F0-3       | -          |
| F1-3 | Recuperacion de contrasena                               | Pendiente | Alta      | F0-2             | -          |
| F1-4 | Persistencia de sesion y cierre de sesion                | Pendiente | Alta      | F1-1             | -          |
| F1-5 | Validaciones, mensajes de error y estados vacios de auth | Pendiente | Media     | F1-1, F1-2, F1-3 | -          |

## Fase 2. Clientes y vehiculos

| ID   | Aspecto                                                   | Estado    | Prioridad | Dependencias     | Completado |
| ---- | --------------------------------------------------------- | --------- | --------- | ---------------- | ---------- |
| F2-1 | CRUD de clientes con nombre, direccion, telefono y correo | Pendiente | Alta      | F0-4             | -          |
| F2-2 | Busqueda y filtrado de clientes                           | Pendiente | Media     | F2-1             | -          |
| F2-3 | Asociar uno o varios vehiculos a cada cliente             | Pendiente | Alta      | F2-1, F0-4       | -          |
| F2-4 | CRUD de vehiculos con datos operativos basicos            | Pendiente | Alta      | F2-3             | -          |
| F2-5 | Vista de detalle del cliente con sus vehiculos            | Pendiente | Alta      | F2-1, F2-3, F2-4 | -          |

## Fase 3. Mecanicos y equipo

| ID   | Aspecto                                           | Estado    | Prioridad | Dependencias | Completado |
| ---- | ------------------------------------------------- | --------- | --------- | ------------ | ---------- |
| F3-1 | CRUD de mecanicos y personal tecnico              | Pendiente | Alta      | F0-4         | -          |
| F3-2 | Flujo de invitacion por correo para mecanicos     | Pendiente | Alta      | F0-5         | -          |
| F3-3 | Aceptacion de invitacion y activacion de cuenta   | Pendiente | Alta      | F3-2, F1-1   | -          |
| F3-4 | Asignacion de mecanicos a diagnosticos y trabajos | Pendiente | Alta      | F3-1, F4-1   | -          |

## Fase 4. Diagnostico y plan de trabajo

| ID   | Aspecto                                                   | Estado    | Prioridad | Dependencias | Completado |
| ---- | --------------------------------------------------------- | --------- | --------- | ------------ | ---------- |
| F4-1 | Crear diagnosticos por vehiculo                           | Pendiente | Alta      | F2-4         | -          |
| F4-2 | Registrar lista de partes para reparacion o mantenimiento | Pendiente | Alta      | F4-1         | -          |
| F4-3 | Registrar lista de repuestos requeridos                   | Pendiente | Alta      | F4-1         | -          |
| F4-4 | Asociar fotos, notas y observaciones al diagnostico       | Pendiente | Media     | F4-1         | -          |
| F4-5 | Definir aprobacion del cliente sobre trabajos y repuestos | Pendiente | Media     | F4-2, F4-3   | -          |

## Fase 5. Ejecucion y seguimiento

| ID   | Aspecto                                                                                      | Estado    | Prioridad | Dependencias | Completado |
| ---- | -------------------------------------------------------------------------------------------- | --------- | --------- | ------------ | ---------- |
| F5-1 | Crear orden de trabajo basada en un diagnostico existente                                    | Pendiente | Alta      | F4-1         | -          |
| F5-2 | Registrar avances de mantenimiento o reparacion                                              | Pendiente | Alta      | F5-1         | -          |
| F5-3 | Manejar estados del trabajo: recibido, diagnosticado, aprobado, en proceso, listo, entregado | Pendiente | Alta      | F5-1         | -          |
| F5-4 | Historial cronologico de avances por vehiculo y por orden                                    | Pendiente | Alta      | F5-2         | -          |
| F5-5 | Registro de observaciones finales y entrega                                                  | Pendiente | Media     | F5-3         | -          |

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

| Hito | Objetivo                                                        | Estado    |
| ---- | --------------------------------------------------------------- | --------- |
| H1   | Acceso completo con login, registro y recuperacion              | Pendiente |
| H2   | Gestion completa de clientes y vehiculos                        | Pendiente |
| H3   | Equipo tecnico con invitaciones por correo                      | Pendiente |
| H4   | Diagnostico con partes, repuestos y aprobacion                  | Pendiente |
| H5   | Seguimiento de trabajos y avances                               | Pendiente |
| H6   | Operacion extendida: costos, pagos, inventario y notificaciones | Pendiente |

## Historial de avances

- 30-04-2026: se crea el roadmap inicial del producto con fases, dependencias y estados base.
- 30-04-2026: proyecto base Expo publicado en GitHub con lineamiento visual heredado de Auto-Guardian.
- 30-04-2026: se adopta Firebase Firestore como base de datos inicial y se deja lista la estrategia de IDs consecutivos por coleccion.
