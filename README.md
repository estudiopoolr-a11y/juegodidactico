# El Protocolo de Austeridad

Juego cognitivo para 30 jugadores. Desplegado con GitHub Pages y Firebase Firestore.

## 🚀 Configuración y Despliegue

Sigue estos pasos para poner el juego en línea:

1.  **Crea un proyecto en Firebase:**
    - Ve a [Firebase Console](https://console.firebase.google.com/)
    - Haz clic en "Añadir proyecto".
    - Sigue los pasos para crear un nuevo proyecto. 

2.  **Habilita Firestore Database:**
    - Una vez en tu proyecto de Firebase, ve a "Cloud Firestore" en el menú de la izquierda.
    - Haz clic en "Crear base de datos".
    - Selecciona "Iniciar en modo de prueba" (esto permite el acceso abierto por 30 días, suficiente para la clase. Luego, puedes ajustar las reglas de seguridad).
    - Elige la ubicación de tu base de datos.

3.  **Obtén la configuración de tu aplicación web de Firebase:**
    - En el menú de la izquierda, haz clic en "Configuración del proyecto" (el icono de engranaje).
    - En la sección "Tus apps", haz clic en el icono `</>` (Aplicación web).
    - Registra tu aplicación (dale un nombre, ej: `juego-aula`).
    - Copia el objeto `firebaseConfig`. Se verá algo así:
      ```javascript
      const firebaseConfig = {
        apiKey: "AIzaSyB...",
        authDomain: "tu-proyecto-id.firebaseapp.com",
        projectId: "tu-proyecto-id",
        storageBucket: "tu-proyecto-id.appspot.com",
        messagingSenderId: "12345...",
        appId: "1:12345..."
      };
      ```

4.  **Actualiza `firebase.js`:**
    - Abre el archivo `firebase.js` en tu proyecto.
    - Reemplaza el objeto `firebaseConfig` existente con el que acabas de copiar de Firebase.
    - Guarda el archivo `firebase.js`.

5.  **Sube los archivos a GitHub:**
    - Crea un nuevo repositorio en GitHub (público o privado, da igual para GitHub Pages).
    - Sube todos los archivos de tu proyecto (`index.html`, `player.html`, `admin.html`, `firebase.js`, `REGLAS_JUGADORES.md`, `GUIA_INSTRUCTOR.md`) a este repositorio.

6.  **Habilita GitHub Pages:**
    - En tu repositorio de GitHub, ve a `Settings` (Configuración).
    - En el menú lateral, haz clic en `Pages`.
    - En la sección "Source", selecciona `Deploy from a branch`.
    - Selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
    - Haz clic en "Save" (Guardar).
    - GitHub Pages tomará unos minutos en desplegarse. Verás una URL como `https://<tu-usuario>.github.io/<tu-repositorio>/`.

## 🎮 Cómo jugar

1.  **El instructor abre `admin.html`:**
    - Abre la URL de GitHub Pages y añade `/admin.html` al final. Ej:
      `https://<tu-usuario>.github.io/<tu-repositorio>/admin.html`
    - Crea un código de juego (ej: `JUEGO-PROYECTO`).
    - El instructor verá el panel de control y el progreso de los jugadores.

2.  **Los estudiantes abren `player.html`:**
    - El instructor comparte la URL de GitHub Pages y añade `/player.html` al final. Ej:
      `https://<tu-usuario>.github.io/<tu-repositorio>/player.html`
    - Los estudiantes ingresan el código del juego que les proporcionó el instructor, su código de jugador (01-30) y su nombre.
    - Una vez conectados, verán la interfaz de juego.

## 📝 Estructura del proyecto

-   `index.html`: Página de inicio para elegir rol (Estudiante/Admin).
-   `player.html`: Vista del estudiante (juego interactivo).
-   `admin.html`: Vista del instructor (panel de control en tiempo real).
-   `firebase.js`: Configuración y lógica de interacción con Firebase Firestore.
-   `REGLAS_JUGADORES.md`: Reglas del juego para los estudiantes.
-   `GUIA_INSTRUCTOR.md`: Guía detallada para el instructor.

## ⚠️ Consideraciones de Firebase

-   **Reglas de seguridad:** En modo de prueba, cualquiera puede leer y escribir. Para un uso más allá de la clase, configura reglas de seguridad más estrictas en Firestore para proteger tus datos.
-   **Costo:** Firebase ofrece un nivel gratuito generoso (Spark Plan), que debería ser más que suficiente para una clase de 30 estudiantes. Si superas los límites, podrías incurrir en costos (poco probable para este uso).
