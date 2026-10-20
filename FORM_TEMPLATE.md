# 📝 PLANTILLA Y FORMULARIOS — El Protocolo de Austeridad

**Estructura del Formulario Digital y Hojas de Cálculo (Google Forms / Sheets / Mentimeter)**

---

## 1. Google Forms — Configuración recomendada

Para capturar los votos de los 30 aprendices de forma secreta, cree un único **Google Form** con la siguiente estructura:

### Configuración del Formulario:
- **Título:** `El Protocolo de Austeridad — Declaración de Postura`
- **Descripción:** `Registro oficial de postura por período de evaluación. Cumplimiento obligatorio.`
- **Configuración de respuestas:**
  - Desactivar *"Recopilar direcciones de correo electrónico"* (para garantizar anonimato).
  - Activar *"Limitar a 1 respuesta"* (si los usuarios inician sesión) o controlar por ID de jugador.
  - Activar *"Permitir modificar la respuesta"* = NO.

---

## 2. Preguntas del Formulario (sección por ronda)

### Campo 1: Identificación del Jugador (Obligatorio)
- **Tipo:** Lista desplegable
- **Título:** `Identificador de Jugador (ID)`
- **Opciones:** `J01`, `J02`, `J03`, `J04`, `J05`, `J06`, `J07`, `J08`, `J09`, `J10`, `J11`, `J12`, `J13`, `J14`, `J15`, `J16`, `J17`, `J18`, `J19`, `J20`, `J21`, `J22`, `J23`, `J24`, `J25`, `J26`, `J27`, `J28`, `J29`, `J30`

### Campo 2: Período de Evaluación (Obligatorio)
- **Tipo:** Varias opciones (Radio buttons)
- **Título:** `Período de Evaluación Activo`
- **Opciones:**
  - `Ronda 1 — Evaluación Estándar`
  - `Ronda 2 — Evaluación Estándar`
  - `Ronda 3 — Evaluación con Impuesto Administrative (15%)`
  - `Ronda 4 — Evaluación con Cláusula de Disciplina`
  - `Ronda 5 — Evaluación Final con Multiplicador Oculto`

### Campo 3: Declaración de Postura (Obligatorio)
- **Tipo:** Varias opciones (Radio buttons)
- **Título:** `Declaración de Postura Secreta`
- **Descripción:** `Seleccione su postura para este período. Esta decisión es definitiva e irreversible.`
- **Opciones:**
  - `COOPERAR — Contribución a la estabilidad colectiva (+10 si ambos cooperan)`
  - `DESERTAR — Priorización del interés individual (+25 si el otro coopera, -10 para la pareja)`

### Campo 4: Código de Confirmación 27-B (Opcional / Control)
- **Tipo:** Respuesta corta
- **Título:** `Código de Referencia de Auditoría`
- **Descripción:** `Copie el código de 8 dígitos que aparece en la pantalla principal durante la fase de auditoría.`

---

## 3. Google Sheets — Fórmula para cálculo automático de puntos

Si prefiere procesar los datos vinculando Google Forms a una Google Sheet compartida, utilice la siguiente estructura de formulas:

### Estructura de Columnas en la Hoja "Respuestas":

| Columna | Nombre | Contenido |
|---|---|---|
| A | Marca temporal | Automática |
| B | ID Jugador | `J01` a `J30` |
| C | Ronda | `Ronda 1`, `Ronda 2`, etc. |
| D | Voto | `COOPERAR` o `DESERTAR` |
| E | ID Pareja | Asignado aleatoriamente |
| F | Voto Pareja | Obtenido vía `BUSCARV` |
| G | Puntos Base | Fórmula del dilema |
| H | Puntos Netos | Aplicando reglas de la ronda |

### Fórmulas clave para la celda de Puntos Base (Columna G):

```excel
=SI(Y(D2="COOPERAR"; F2="COOPERAR"); 10;
 SI(Y(D2="DESERTAR"; F2="COOPERAR"); 25;
 SI(Y(D2="COOPERAR"; F2="DESERTAR"); -10;
 SI(Y(D2="DESERTAR"; F2="DESERTAR"); 2; 0))))
```

### Fórmulas clave para Puntos Netos según Ronda (Columna H):

```excel
=SI(C2="Ronda 1"; G2;
 SI(C2="Ronda 2"; G2;
 SI(C2="Ronda 3"; ENTERO(G2 * 0.85);
 SI(C2="Ronda 4"; ENTERO(G2 * 0.85) - SI(D2="DESERTAR"; 5; 0);
 SI(C2="Ronda 5"; ENTERO(G2 * 0.5) - SI(D2="DESERTAR"; 2; 0); 0)))))
```

---

## 4. Alternativa con Mentimeter (Opción más rápida)

Si desea simplificar la logística sin configurar Google Forms, cree una presentación en **Mentimeter** con 5 diapositivas tipo **"Multiple Choice"**:

- **Título de cada diapositiva:** `Ronda X — Ingrese su ID y Voto`
- **Opciones:**
  - `COOPERAR`
  - `DESERTAR`
- **Resultados:** Ocultos durante la votación, revelados al cerrar el tiempo.

---

## 5. Modo sin conexión (Offline) — Usando la Simulación Automática

Si no hay buena conectividad a Internet en el aula, la aplicación `index.html` incluye el modo **"Simulación Automática"**:

1. En la pestaña superior, seleccione **"Simulación Automática"**.
2. Haga clic en **"Iniciar Simulación"**.
3. El sistema creará 30 jugadores virtuales con estrategias diversas (10 Cooperadores, 10 Desertores, 10 Mixtos).
4. El juego ejecutará las 5 rondas automáticamente con los tiempos reales (o acelerados).
5. Los aprendices observan el comportamiento del sistema desde el proyector y participan en el debate final.
