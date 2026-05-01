# Firebase Security Auto-Guardian-Taller

Ultima actualizacion: 01-05-2026

## Que cubren estas reglas

- Login y recuperacion de contrasena: no dependen de reglas de Firestore, sino de Firebase Auth.
- Registro publico: el usuario autenticado puede crear su propio documento en userProfiles con su uid de Auth.
- Activacion por invitacion: se permite consultar una invitacion pendiente por codigo y aceptarla durante el alta.
- Roles operativos: administrator, reception y mechanic.
- Colecciones operativas protegidas: userProfiles, staffInvitations, clients, vehicles, diagnostics, workOrders, progressEntries, spareParts y \_counters.
- Storage base: reglas iniciales para fotos y archivos por perfil, vehiculo, diagnostico, orden y avance.

## Archivos creados

- firestore.rules
- storage.rules
- firebase.json
- .firebaserc
- firestore.indexes.json

## Consideraciones importantes

- El login y la recuperacion se prueban apenas Firebase Auth este habilitado en consola.
- Para crear invitaciones y administrar usuarios hace falta al menos un primer usuario con role administrator en userProfiles.
- Los contadores consecutivos en \_counters se permiten desde cliente para pruebas funcionales. A mediano plazo conviene mover esa numeracion a Cloud Functions o backend propio para endurecer seguridad y evitar abuso.

## Bootstrap inicial recomendado

1. Crea manualmente el primer usuario en Firebase Authentication.
2. Crea manualmente su documento en userProfiles con el mismo uid y role administrator.
3. Publica estas reglas.
4. Prueba registro, login y recuperacion.
5. Desde la app o consola crea invitaciones para nuevos usuarios.

## Ejemplo de userProfiles para el primer administrador

```json
{
  "uid": "UID_DEL_ADMIN",
  "userCode": "USR-000001",
  "fullName": "Administrador Principal",
  "email": "admin@taller.com",
  "phone": "",
  "role": "administrator",
  "status": "active"
}
```

## Comandos para publicar reglas

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Siguiente ajuste recomendado

- Cuando implementemos el panel administrativo de invitaciones, conviene agregar validaciones mas estrictas por campo y mover la generacion de IDs consecutivos a backend.
