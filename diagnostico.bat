@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  DIAGNOSTICO - El Protocolo de Austeridad
echo ============================================

echo.
echo [1/5] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no encontrado.
    echo Instalalo en https://nodejs.org
    pause
    exit /b
)
echo OK: Node.js encontrado.

echo [2/5] Verificando dependencias (ws)...
if not exist node_modules\node_modules\ws (
    echo Instalando dependencias...
    npm install ws
)
echo OK: Dependencias listas.

echo [3/5] Verificando archivos...
if not exist index.html (
    echo ERROR: index.html no encontrado.
    pause
    exit /b
)
if not exist admin.html (
    echo ERROR: admin.html no encontrado.
    pause
    exit /b
)
if not exist server.js (
    echo ERROR: server.js no encontrado.
    pause
    exit /b
)
echo OK: Archivos presentes.

echo [4/5] Iniciando servidor en segundo plano...
cd /d "%~dp0"
start /min cmd /c "node server.js"
timeout /t 3 /nobreak > nul

echo [5/5] Verificando puerto 3000...
netstat -an | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo OK: Puerto 3000 escuchando.
) else (
    echo ERROR: Puerto 3000 no responde.
    echo.
    echo Abre una terminal y ejecuta:
    echo   node server.js
    echo.
    pause
    exit /b
)

echo.
echo ============================================
echo  TODO OK - Servidor corriendo
echo ============================================
echo.
echo  Abre en tu navegador:
echo    http://localhost:3000/admin.html
echo.
echo  Para los estudiantes:
echo    http://192.168.137.1:3000/
echo.
echo ============================================