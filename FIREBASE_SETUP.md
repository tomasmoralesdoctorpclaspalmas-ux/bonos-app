# 🔥 Configuración de Firebase y Primeros Pasos

Sigue estos pasos para conectar tu aplicación con Firebase y generar el usuario administrador.

## 1. Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/) e inicia sesión.
2. Haz clic en **"Agregar proyecto"**.
3. Ponle un nombre (ej: `bonos-app`) y continúa (puedes desactivar Analytics por ahora).

## 2. Configurar Servicios

Necesitas habilitar **Authentication** y **Firestore Database**.

### A. Authentication (Usuarios)
1. En el menú izquierdo, ve a **Compilación > Authentication**.
2. Haz clic en **"Comenzar"**.
3. En la pestaña **"Sign-in method"**, selecciona **"Correo electrónico/contraseña"**.
4. Habilita **"Correo electrónico/contraseña"** (la primera opción) y guarda.

### B. Firestore Database (Base de Datos)
1. En el menú izquierdo, ve a **Compilación > Firestore Database**.
2. Haz clic en **"Crear base de datos"**.
3. Selecciona la ubicación (ej: `eur3` para Europa o `nam5` para US).
4. **Importante**: Elige comenzar en **modo de prueba** (test mode).
   * *Nota: Esto permite leer/escribir durante 30 días. Para producción deberás configurar las reglas de seguridad.*
5. Haz clic en **"Crear"**.

## 3. Obtener Credenciales

1. En la vista general del proyecto (General > Configuración del proyecto / icono de engranaje).
2. Baja hasta la sección **"Tus apps"**.
3. Haz clic en el icono de web `</>`.
4. Registra la app con un nombre (ej: `Bonos Web`).
5. Copia el objeto `firebaseConfig` o simplemente los valores invididuales.

## 4. Configurar Variables de Entorno

1. En tu proyecto local, crea un archivo llamado `.env` (duplicando `.env.example`).
2. Pega los valores de tu configuración de Firebase:

```bash
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

## 5. Crear Usuario Administrador

El sistema está diseñado para crear el administrador automáticamente.

1. Asegúrate de tener el servidor corriendo: `npm run dev`.
2. Abre la aplicación en tu navegador (ej: `http://localhost:5173`).
3. **¡Listo!** El código en `src/initAdmin.js` se ejecutará automáticamente.
4. Abre la consola del navegador (F12 > Console) para ver los logs de confirmación:
   > ✅ Administrador creado exitosamente!

### Acceder como Admin
Usa las credenciales por defecto (definidas en `ADMIN_CREDENTIALS.md`):

* **Contraseña**: `Bonos@Admin2026!Secure`

## 6. Solución de Problemas

### ⚠️ Error: "Missing or insufficient permissions"

Si ves este error, significa que las **Reglas de Seguridad** de Firestore están bloqueando el acceso. Esto ocurre si no seleccionaste el "Modo de Prueba" al crear la base de datos o si las reglas caducaron.

**Cómo solucionarlo:**

1. Ve a [Firebase Console](https://console.firebase.google.com/) > Firestore Database.
2. Haz clic en la pestaña **"Reglas"**.
3. Reemplaza TODO el código por este (permite todo por ahora):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Haz clic en **"Publicar"**.
5. Espera unos segundos y vuelve a probar la app.
