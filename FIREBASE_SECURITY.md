# Firebase Security Auto-Guardian-Taller

Ultima actualizacion: 21-05-2026

## Que cubren estas reglas

- Login y recuperacion de contrasena: no dependen de reglas de Firestore, sino de Firebase Auth.
- Registro publico: el usuario autenticado puede crear su propio documento en userProfiles con su uid de Auth.
- Activacion por invitacion: se permite consultar una invitacion pendiente por correo invitado y aceptarla durante el alta; el codigo consecutivo queda como referencia visible opcional.
- Envio de invitaciones por correo: el administrador puede encolar correos en la coleccion mail para que Firebase Trigger Email los procese.
- Roles operativos: administrator, reception y mechanic.
- Colecciones operativas protegidas: userProfiles, staffInvitations, clients, vehicles, diagnostics, workOrders, progressEntries, spareParts, mail y \_counters.
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
- El envio real de correos de invitacion requiere instalar la extension Firebase Trigger Email o una integracion equivalente que consuma la coleccion mail.
- La extension Firebase Trigger Email no puede instalarse mientras el proyecto siga fuera del plan Blaze, porque necesita habilitar Secret Manager.

## Bootstrap inicial recomendado

1. Crea manualmente el primer usuario en Firebase Authentication.
2. Crea manualmente su documento en userProfiles con el mismo uid y role administrator.
3. Publica estas reglas.
4. Prueba registro, login y recuperacion.
5. Instala la extension Firebase Trigger Email y apunta la coleccion de salida a mail.
6. Desde la app o consola crea invitaciones para nuevos usuarios.
7. Durante el alta por invitacion usa el mismo correo invitado; si se compartio un codigo INV-xxxxxx, sirve como referencia adicional.

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

## Requisito para correos reales de invitacion

1. En la consola de Firebase abre Extensions.
2. Instala Trigger Email.
3. Configura la coleccion monitoreada como `mail`.
4. Conecta tu proveedor SMTP durante la instalacion.
5. Vuelve a publicar reglas con `firebase deploy --only firestore:rules,firestore:indexes`.

La app ya escribe documentos en `mail` con asunto, texto y HTML. Si esa extension no esta instalada, la invitacion se crea pero el envio quedara marcado como fallido.

## Estado actual del proyecto

- Verificado el 21-05-2026: el proyecto `auto-guardian-t` no tiene extensiones instaladas todavia.
- Resultado: la app puede encolar el correo en `mail`, pero no existe un consumidor activo que lo envie.
- Bloqueo actual: `firebase ext:install firebase/firestore-send-email@latest` falla porque el proyecto debe subir a Blaze para habilitar Secret Manager.
- Siguiente paso operativo: cambiar el proyecto a Blaze, instalar Trigger Email y luego probar una invitacion nueva desde la pantalla de equipo.

## Siguiente ajuste recomendado

- Mover la numeracion consecutiva y la emision de invitaciones a backend propio o Cloud Functions para endurecer seguridad y trazabilidad.
