# Auto-Guardian-Taller

App Expo/React Native para operacion de taller dentro del ecosistema Auto-Guardian.

## Lectura recomendada

- Contexto funcional y tecnico: CONTEXTO_PROYECTO.md
- Arranque operativo: ARRANQUE_RAPIDO.md
- Arquitectura base: ARQUITECTURA_BASE.md
- Roadmap vivo: ROADMAP.md

## Stack

- Expo SDK 54
- React 19
- React Native 0.81
- Firebase Auth
- Firestore

## Flujo base

La app resuelve onboarding, sesion, perfiles y acceso por rol antes de habilitar modulos operativos como clientes, vehiculos, diagnosticos, ordenes y stock.

Puntos de entrada principales:

- App.js
- src/screens/WorkshopHomeScreen.js
- src/screens/WorkshopMoreScreen.js
- src/services

## Comandos rapidos

```bash
npm install
npm run start
npm run android
npm run migrate:multi-workshop:dry
npm run migrate:multi-workshop
```

## Estado de la documentacion

El contexto vivo del proyecto esta en CONTEXTO_PROYECTO.md. La guia operativa de arranque y despliegue esta en ARRANQUE_RAPIDO.md.
