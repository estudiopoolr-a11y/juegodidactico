# 📋 Guía del Instructor — El Protocolo de Austeridad v9.0

**SENA CBI Palmira – Dirección de Capacitación**

---

## 1. Preparación del aula

### 1.1 Red local (Hotspot del instructor)

1. La idea es *evitar el uso de la red pública de la institución* y garantizar que 30 dispositivos conecten sin saturación.
2. En tu laptop/PC, crea un **Hotspot Wi‑Fi** (en Windows: *Configuración → Red → Compartir conexión → Wi‑Fi*; macOS: *Preferencias → Compartir → Wi‑Fi*).
3. Ponle un nombre sencillo, por ejemplo **acuerdo-colectivo** y una contraseña de cinco caracteres (por ejemplo **12345**).
4. Anota la dirección IP que se muestra (si no aparece, suele ser **192.168.137.1** en Windows, “192.168.1.1” en macOS).  **Ese será el host del servidor**.

### 1.2 Instalar Node.js

Si tu instructor no tiene Node.js instalado, descárgalo e instálalo desde <https://nodejs.org>.  Un *versión LTS* es suficiente.

### 1.3 Instalar dependencias del proyecto

En la carpeta del proyecto ejecuta:

```
cd C:\Users\DEEL\OneDrive\Desktop\juegodidactico
npm init -y
npm install ws
```

### 1.4 Levantar el servidor WebSocket

```
node server.js
```

Verás en la consola una línea como la siguiente:

```
Servidor WebSocket corriendo en http://localhost:3000
```

Despliega la URL que aparece a los estudiantes (*es la dirección del hotspot + puerto 3000*).

### 1.5 Proyección al proyector

1. Abre el navegador de la máquina que mirará el proyector (se puede usar la misma con la que ejecutas el servidor).
2. Ingresa en la barra de direcciones:
   ```
   http://192.168.137.1:3000/admin.html
   ```
3. Aparecerá la **página de control del juego**. A la izquierda verás la HUD que muestra la fase, la pool y la tabla de resultados.

---

## 2. Tabla de control del juego

| Botón | Acción | Qué sucede | Observación |
|-------|--------|------------|--------------|
| **Iniciar Juego** | Cambia el estado de *idle* a *running*. Crea pares aleatorios y muestra la fase de *negociación* a los jugadores. | Se envía una notificación a todos. | Necesitas que los juegan estén en el estado *conectado* antes de usarlo. |
| **Siguiente Fase** | Avanza la fase actual (p. ej., de *negociación* a *votación*). | Se muestra la actualización en todas las pantallas en tiempo real. | Activa también un *timer* que corre en segundos. |
| **Siguiente Ronda** | (Opción opcional) Avanza a la siguiente ronda. | Se vuelve a generar pares y reinicia los tiempos. | No hay botón en la vista actual; basta con dejar que la fase 4 concluya para que la lógica avance a la siguiente ronda. |
| **Consolida Votos** | Opcional: no se necesita, pues el servidor consolida automáticamente cuando la fase 4 comienza. | Se hace una retrollamada a todos para informar la finalización de la ronda. | En la vista de *ADMIN* no aparece. |

---

## 3. Estructura de la HUD del instructor

1. **Información del juego**: ronda activa, fase actual y tiempo restante.
2. **Pool acumulado**: en la barra lateral se muestra un gráfico de progreso del **puntos·colectados** vs. el objetivo de 1.000.
3. **Tabla de jugadores**: { ID, nombre, puntos, última acción }.
4. **Chat**: se recoge cada mensaje enviado por los jugadores para que puedas realizar seguimientos o mediciones de tono.
5. **Grabación**: todas las notificaciones de chat y votaciones se guardan en la consola interna; no es necesario guardar manualmente.

---

## 4. Protocolo de inicio de sesión

1. **Conecta a la red hotspot** en todos los dispositivos.
2. **Abre la URL** `http://192.168.137.1:3000/` en cada uno.
3. **Confirma el código** (01‑30) y pulsa *Conectar*.
4. Cuando aparezca la pantalla de **“Esperando inicio del instructor…”**, no muevas los dispositivos.
5. Una vez listo, en el controlador pulsa *Iniciar Juego*.

---

## 5. Reglas de transcripción

| Acción | Mensaje a la consola | Comentarios |
|--------|----------------------|-------------|
| **Puntuación** | `Pooled:` = `puntos_totales` | Se actualiza en cada ronda. |
| **Final** | Muestra el resultado final (puntos, ganador, margen de 50) | Se descarga automáticamente una tabla CSV si se introduce el botón. |
| **Chat** | `Jugador X → Y: mensaje` | Se registra para auditoría de dinámica de grupo |

---

## 6. Clausura y debriefing

1. Cuando el juego termine (sin alcanzar la meta o con éxito), se mostrará una **página de resultados final**.
2. Descarga el PDF de la demostración matemática desde el botón **Exportar CSV** disponible en la consola (no incluido en este proyecto en particular, pero puedes añadirlo con una simple función JavaScript).  Si esto no es crítico, simplemente imprime la pantalla.
3. Guía a los estudiantes a través de las **preguntas de reflexión**:
   - *¿Cómo se sintió al amanecer la pool cercana al objetivo pero no alcanzarla?*
   - *¿Qué efecto tuvo la interacción con los pares?*
   - *¿Qué aprendes sobre diseñar sistemas donde la cooperación puede ser subvalorada?*

---

## 7. Guardar el resultado

El juego crea un historial JSON en tiempo real. Si el instructor prefiere guardar algo de análisis, basta con copiar el contenido de la consola del navegador del dashboard y pegarlo en un archivo de texto.

---

**¡Listo!**  El juego está configurado para operar en cualquier aula con acceso a Wi‑Fi, sin requerir licencias ni herramientas externas y con un flujo completamente modular. Disfruta de la fase de debate y del análisis post‑juego.
