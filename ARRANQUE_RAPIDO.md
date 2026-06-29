# Arranque rapido: Auto-Guardian-Taller

Ultima actualizacion: 2026-06-29

## Requisitos

- Node.js compatible con Expo SDK 54.
- npm.
- Firebase CLI si vas a desplegar reglas.
- Credenciales Firebase del proyecto.

## Variables de entorno y configuracion sensible

La app no expone un .env de cliente formal en el repo, pero el script de migracion multi-taller si depende de variables de entorno.

Variables detectadas:

- FIREBASE_SERVICE_ACCOUNT_PATH
- FIREBASE_PROJECT_ID
- PRIMARY_WORKSHOP_NAME
- PRIMARY_WORKSHOP_OWNER_UID

Archivos sensibles a revisar:

- google-services.json
- firebase.json
- firestore.rules
- firestore.indexes.json
- storage.rules
- eas.json

## Instalacion

```bash
npm install
```

## Desarrollo local

```bash
npm run start
```

Atajo comun:

```bash
npm run android
```

## Smoke test recomendado

Chequeo tecnico util despues de cambios UI o branding:

```bash
npx expo export --platform android
```

Chequeo adicional si tocaste seguridad o acceso a datos:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Migraciones

Dry run:

```bash
npm run migrate:multi-workshop:dry
```

Ejecucion real:

```bash
npm run migrate:multi-workshop
```

## Despliegue

Pasos sugeridos:

1. validar UI con npx expo export --platform android
2. si cambiaste reglas o storage, desplegar con Firebase CLI
3. si cambiaste app nativa o release, preparar build con EAS segun eas.json

## Archivos que conviene leer primero

- CONTEXTO_PROYECTO.md
- ARQUITECTURA_BASE.md
- ROADMAP.md
- FIREBASE_SECURITY.md
