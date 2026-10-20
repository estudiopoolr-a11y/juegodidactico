# 📋 Cómo Funciona — Guía Paso a Paso

## ✅ Primero: Verifica que todo esté listo

Abre el archivo `diagnostico.bat` que acabo de crear. Haz **doble clic** en él. Verá:

1. ✅ Node.js está instalado
2. ✅ Dependencias (`ws`) instaladas
3. ✅ Archivos presentes (`index.html`, `admin.html`, `server.js`)
4. ✅ Puerto 3000 escuchando

Si todo sale **OK**, el servidor está corriendo. Si sale **ERROR**, lee el mensaje para solucionarlo.

---

## 🌐 Segundo: Activa el hotspot manualmente

### Opción A — Panel de Windows (más fácil)

1. Haz clic en el icono de **Wi‑Fi** (abajo a la derecha).
2. Haz clic en **"Mobile hotspot"** (el icono de la antena).
3. En la pantalla que se abre, busca:
   ```
   Network name (SSID): acuerdo-colectivo
   Password: ...
   ```
4. **Activa el hotspot** (el botón de encender/apagar).

### Opción B — Comando (más rápido)

Abre **PowerShell** (Menú Inicio → escribe `powershell` → Abre) y pega:

```powershell
netsh wlan set hostednetwork mode=allow ssid=acuerdo-colectivo key=12345678
netsh wlan start hostednetwork
```

---

## 🔍 Tercero: Encuentra la IP

Abre **PowerShell** y escribe `ipconfig`. Busca:

```
Adaptador de Ethernet de Conexión de área local

IPv4. . . . . . . . . . . . . . . : 192.168.137.1
```

**Esa dirección (192.168.137.1) es la que compartes.**

---

## 🎯 Cuarto: Comparte la IP con los estudiantes

Diles:

> *"Conéctense a la red Wi‑Fi **acuerdo-colectivo**. Abren su navegador y escriben:*
>
> **`http://192.168.137.1:3000/`**
>
> *Ingresan su número (01‑30) y listo."*

---

## 🧪 Quinto: Prueba que funciona

En tu propio navegador, escribe:

```
http://192.168.137.1:3000/admin.html
```

Si la página carga, **está funcionando**. Si no, el hotspot no está activo o el puerto 3000 no está escuchando.

---

## 🚀 Sexto: ¡Juega!

1. Los estudiantes se conectan.
2. Tú abres `admin.html`.
3. Haz clic en **"Iniciar Juego"**.
4. ¡Listo!

---

## ❌ Si sigue sin funcionando

### Problema 1: "No se puede acceder a este sitio web"

- Asegúrate de que el hotspot esté **activado**.
- Verifica la IP con `ipconfig`. Puede ser `192.168.137.1` u otra.
- Prueba con `http://localhost:3000/admin.html` en tu propio navegador.

### Problema 2: "El puerto 3000 no está escuchando"

- Abre una terminal y ejecuta manualmente:
  ```bash
  cd C:\Users\DEEL\OneDrive\Desktop\juegodidactico
  node server.js
  ```
- Si ves un error, comparte el mensaje para ayudarte.

### Problema 3: "El hotspot no se crea"

- Algunos portátiles no permiten hotspot por `netsh`. Usa la **Opción A** (panel de Windows).
- Si tu portátil no tiene Wi‑Fi, necesitarás un **adaptador USB Wi‑Fi**.

---

## 📞 Ayuda

Si después de seguir estos pasos el juego sigue sin funcionar, comparte:
- El mensaje de error exacto
- La salida de `ipconfig`
- La salida de `node server.js`

¡Te ayudo a solucionarlo!