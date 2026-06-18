@echo off
title H. Morgan - Servidor de Impresion
echo.
echo  =========================================
echo   H. Morgan  -  Servidor de Impresion
echo  =========================================
echo.
cd /d "%~dp0"

if not exist node_modules (
    echo Instalando dependencias por primera vez...
    echo Esto puede tardar unos minutos.
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo ERROR: No se pudieron instalar las dependencias.
        echo Asegurate de que Node.js este instalado correctamente.
        echo Durante la instalacion de Node.js debe estar activada la
        echo opcion "Automatically install the necessary tools".
        echo.
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando servidor...
echo.
node server.js
echo.
echo El servidor se detuvo.
pause
