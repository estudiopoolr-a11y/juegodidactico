@echo off
echo ==========================================
echo   LANZADOR LOCAL - EL PROTOCOLO
echo ==========================================
echo.
echo Iniciando servidor local en el puerto 8000...
echo (Requiere Python instalado)
echo.
echo Una vez iniciado, abre: http://localhost:8000
echo.
start http://localhost:8000
python -m http.server 8000
pause
