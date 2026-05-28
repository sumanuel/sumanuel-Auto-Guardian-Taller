# Guia de migracion multi-taller

Ultima actualizacion: 28-05-2026

## Objetivo

- Crear un taller base por usuario existente.
- Crear o reactivar una membresia por usuario.
- Backfillear `workshopId` en clientes, vehiculos, diagnosticos, ordenes, avances y repuestos.

## Archivos preparados

- scripts/migrate-multi-workshop.mjs

## Requisitos

1. Tener una service account con acceso de administrador a Firestore.
2. Definir `FIREBASE_SERVICE_ACCOUNT_PATH` apuntando al JSON.
3. Opcionalmente definir `FIREBASE_PROJECT_ID`.

## Ejecucion recomendada

1. Probar primero en seco:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\ruta\service-account.json"
node .\scripts\migrate-multi-workshop.mjs --dry-run
```

2. Revisar los warnings de documentos que no pudieron inferir `workshopId`.
   El script tambien imprime un resumen por coleccion con documentos preparados, ya segmentados, sin resolver y cantidad de escrituras agrupadas.

3. Ejecutar la migracion real:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\ruta\service-account.json"
node .\scripts\migrate-multi-workshop.mjs
```

## Limitaciones actuales

- La inferencia de `workshopId` usa estos campos cuando existen:
  - `createdByUid`
  - `openedByUid`
  - `authorUid`
  - `invitedByUid`
- Cada documento que el script toca deja un marcador en `migrationMeta.multiWorkshop` para poder auditar el backfill y reintentos posteriores.
- Si un documento no tiene ninguno de esos campos o no se puede relacionar con un usuario existente, el script lo reporta para revision manual.
- El script crea talleres sin consecutivo visible porque esta pensado para backfill seguro, no para replicar la estrategia transaccional del cliente movil.

## Recomendacion operativa

- Ejecutar primero sobre un respaldo o un proyecto espejo.
- Exportar Firestore antes de la migracion.
- Corregir manualmente los documentos reportados sin `workshopId` inferible.

## Siguiente paso despues de migrar

- Publicar reglas que exijan `workshopId` en las entidades operativas.
- Backfillear tambien invitaciones antiguas con `workshopId` cuando se conozca su taller origen.
