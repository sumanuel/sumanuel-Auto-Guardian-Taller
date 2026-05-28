# Guia de migracion multi-taller

Ultima actualizacion: 28-05-2026

## Objetivo

- Crear un taller base por usuario existente o consolidar todo en un taller inicial compartido.
- Crear o reactivar una membresia por usuario.
- Backfillear `workshopId` en clientes, vehiculos, diagnosticos, ordenes, avances y repuestos.

## Archivos preparados

- scripts/migrate-multi-workshop.mjs

## Requisitos

1. Tener una service account con acceso de administrador a Firestore.
2. Definir `FIREBASE_SERVICE_ACCOUNT_PATH` apuntando al JSON.
3. Opcionalmente definir `FIREBASE_PROJECT_ID`.
4. Para el modo de taller unico, definir `PRIMARY_WORKSHOP_NAME` y opcionalmente `PRIMARY_WORKSHOP_OWNER_UID`.

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

## Comando exacto del modo single-workshop

El comando usado para consolidar el proyecto actual en un solo taller fue este, cambiando solo la ruta local del JSON cuando haga falta:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\ruta\service-account.json"
$env:FIREBASE_PROJECT_ID="auto-guardian-t"
$env:PRIMARY_WORKSHOP_NAME="Taller el suma"
node .\scripts\migrate-multi-workshop.mjs --dry-run --single-workshop
```

Luego de validar el dry-run, la ejecucion real usa el mismo contexto sin `--dry-run`:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\ruta\service-account.json"
$env:FIREBASE_PROJECT_ID="auto-guardian-t"
$env:PRIMARY_WORKSHOP_NAME="Taller el suma"
node .\scripts\migrate-multi-workshop.mjs --single-workshop
```

Notas:

- `PRIMARY_WORKSHOP_OWNER_UID` es opcional. Si no se define, el script prioriza un perfil activo con rol `administrator` para convertirlo en `owner`.
- En modo `--single-workshop`, todos los perfiles y documentos operativos convergen al mismo `workshopId`.

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
