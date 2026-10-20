@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ============================================
echo  EL ACUERDO COLECTIVO - INICIANDO
echo ============================================

REM --- Verificar Node.js ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no encontrado.
    pause
    exit /b
)

REM --- Instalar dependencias si no existen ---
if not exist node_modules (
    echo Instalando dependencias...
    npm install ws
)

REM --- Obtener IP local ---
set LOCAL_IP=
for /f "tokens=*" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set line=%%i
    for /f "tokens=2 delims=:" %%a in ("%%i") do (
        set ip=%%a
        set ip=!ip: =!
        echo !ip!| findstr /r "192\.168\." >nul
        if not errorlevel 1 (
            if "!LOCAL_IP!"=="" set LOCAL_IP=!ip!
        )
    )
)
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

REM --- Iniciar servidor en segundo plano ---
start /min cmd /c "node server.js"
timeout /t 3 /nobreak > nul

REM --- Verificar puerto ---
netstat -an | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo ERROR: El puerto 3000 no está escuchando.
    echo Ejecuta manualmente: node server.js
    pause
    exit /b
)

REM --- Mostrar instrucciones ---
echo.
echo ============================================
echo  INSTRUCCIONES PARA LOS ESTUDIANTES
echo ============================================
echo.
echo  Conectate a la red Wi-Fi del aula
echo  Abre tu navegador y pegá esta URL:
echo.
echo    http://%LOCAL_IP%:3000/
echo.
echo  Ingresá tu código (01-30) y hicé clic en "Conectar"
echo.
echo  ADMINISTRADOR (vos):
echo    http://%LOCAL_IP%:3000/admin.html
echo.
echo ============================================

REM --- Abrir admin automáticamente ---
start http://%LOCAL_IP%:3000/admin.html

echo.
echo ¡Todo listo! El juego está corriendo.
echo Presioná Ctrl+C para detener el servidor.
pause