# Auto-Guardian-Taller — Agent Instructions

## Stack

- Expo SDK 54, React 19, React Native 0.81, no TypeScript (plain JS with JSX).
- Firebase Auth + Firestore; no SQLite or other local DB.
- Entrypoint: `App.js` → `index.js` calls `registerRootComponent(App)`.

## Project structure

```
App.js                          # Root: AuthProvider → ThemeProvider → routing + tab bar
src/
  constants/accessControl.js    # Roles, permissions, helpers
  constants/domainModels.js     # Firestore collection schemas
  context/AuthContext.js        # Auth, memberships, active workshop, switchWorkshop
  context/ThemeContext.js        # Light/dark theme
  screens/                      # One file per screen (flat, no subdirs)
  services/                     # Firestore CRUD per domain (firestore/repository.js is generic)
  components/common/            # Reusable UI: WorkshopTabBar, WorkshopScreenHeader, MetricCard
  utils/responsive.js           # rf(), spacing, borderRadius helpers
```

## Key patterns

- **Role resolution**: The app is multi-workshop. The user's role comes from `activeMembership?.role` (the membership for the currently active workshop), **never** from `userProfile?.role` which is a global fallback only. `currentRole` is computed once in `App.js` line 218 and passed as a prop to all screens that need it.
- **Workshop context**: `AuthContext` exposes `activeWorkshopId`, `activeWorkshop`, `memberships`, `requiresWorkshopSetup`, `switchWorkshop(workshopId)`. The singleton `workshopSession.js` mirrors the active session in memory for service-layer use.
- **Services get workshop from `workshopSession.js`**: `requireActiveWorkshopId()` throws if no active workshop. All `list*` services filter by `workshopId` from this singleton.
- **Sequential IDs**: `repository.js` uses `sequentialIds.js` with Firestore transactions per collection (`_counters/{collection}`). Collection config is in `collections.js`.
- **Mecánico filter**: When `currentRole === "mechanic"`, diagnostics are filtered by `assignedMechanicUid` and workOrders by `assignedMechanicUids[]` array membership. The filter happens in `useMemo` on the frontend.
- **WorkshopSetupScreen**: Shown when `requiresWorkshopSetup` is true (user has no OWNER membership). Creates workshop + OWNER membership directly in Firestore, then calls `refreshWorkshopContext()`.

## Roles (`accessControl.js`)

```js
USER_ROLES = { OWNER: "owner", ADMINISTRATOR: "administrator", RECEPTION: "reception", MECHANIC: "mechanic" }
```

`defaultPublicRole` is `RECEPTION`. Registration without invitation creates a user with role RECEPTION (PENDING_APPROVAL if `requiresInternalApproval` is true).

## Commands

```bash
npm install
npm run start          # expo start
npm run android        # expo start --android
npx expo export --platform android   # smoke test / bundle check
npm run migrate:multi-workshop:dry   # dry-run data migration
npm run migrate:multi-workshop       # real data migration
firebase deploy --only firestore:rules,firestore:indexes,storage
```

No linter, no type checker, no test suite configured.

## Multi-workshop architecture

- Every user can own a workshop (OWNER) and be a collaborator in others (MECHANIC, RECEPTION, etc.).
- `WorkshopManagementScreen` lists all memberships and allows switching active workshop.
- `WorkshopSetupScreen` is the post-onboarding form for first-time workshop creation.
- `switchWorkshop()` in AuthContext updates `userProfile.role` in Firestore and calls `refreshWorkshopContext()`.

## UI conventions

- Use `src/utils/responsive.js` for spacing, radius, font scaling (`rf()`).
- Use `src/context/ThemeContext.js` for colors (light/dark).
- All text is in Spanish. Empty states must explain the next action.
- Color is semantic: status, urgency, progress — never decorative.
- Prefer grouped cards, summary blocks, timeline rows over flat layouts.

## .md documentation files (read-only references)

- `CONTEXTO_PROYECTO.md` — functional and technical context
- `ARQUITECTURA_BASE.md` — foundational architecture decisions
- `ARQUITECTURA_MULTI_TALLER.md` — multi-workshop design
- `GUIA_MIGRACION_MULTI_TALLER.md` — data migration guide
- `ROADMAP.md` — feature status and history
- `FIREBASE_SECURITY.md` — Firestore rules guide
- `ARRANQUE_RAPIDO.md` — setup and deploy steps