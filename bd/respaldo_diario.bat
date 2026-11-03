@echo off
REM =====================================================================
REM Respaldo diario de la base de datos autogestion_portatiles
REM
REM Qué hace:
REM   1. Saca una copia completa de la base con mysqldump.
REM   2. La comprime en un .zip con la fecha y la hora en el nombre.
REM   3. Borra los respaldos con más de DIAS_A_CONSERVAR días.
REM   4. Anota en respaldo.log si todo salió bien o falló.
REM
REM Antes de usarlo, lee las instrucciones del archivo LEEME_respaldos.txt
REM (crear el usuario de respaldo y el archivo de credenciales).
REM =====================================================================
setlocal

REM ---------------- CONFIGURACIÓN: ajusta estas líneas ----------------
set "CARPETA_RESPALDOS=C:\respaldos_autogestion"
set "RUTA_MYSQLDUMP=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
set "ARCHIVO_CREDENCIALES=C:\respaldos_autogestion\credenciales.cnf"
set "PUERTO=3307"
set "BASE_DE_DATOS=autogestion_portatiles"
set "DIAS_A_CONSERVAR=14"
REM --------------------------------------------------------------------

if not exist "%CARPETA_RESPALDOS%" mkdir "%CARPETA_RESPALDOS%"

REM Fecha y hora para el nombre del archivo (PowerShell evita problemas
REM con el formato de fecha de cada configuración regional de Windows).
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set "SELLO=%%i"

set "ARCHIVO_SQL=%CARPETA_RESPALDOS%\respaldo_%SELLO%.sql"
set "ARCHIVO_ZIP=%CARPETA_RESPALDOS%\respaldo_%SELLO%.zip"
set "REGISTRO=%CARPETA_RESPALDOS%\respaldo.log"

REM --defaults-extra-file debe ser la PRIMERA opción. Así la contraseña
REM no aparece escrita en este script ni en la lista de procesos.
REM --single-transaction: copia consistente sin bloquear la base mientras
REM los estudiantes siguen registrándose.
"%RUTA_MYSQLDUMP%" --defaults-extra-file="%ARCHIVO_CREDENCIALES%" ^
    --host=127.0.0.1 --port=%PUERTO% ^
    --single-transaction --no-tablespaces --routines ^
    --default-character-set=utf8mb4 ^
    --result-file="%ARCHIVO_SQL%" ^
    %BASE_DE_DATOS%

if errorlevel 1 (
    echo [%SELLO%] ERROR: mysqldump fallo. No se creo el respaldo.>> "%REGISTRO%"
    if exist "%ARCHIVO_SQL%" del "%ARCHIVO_SQL%"
    exit /b 1
)

powershell -NoProfile -Command "Compress-Archive -Path '%ARCHIVO_SQL%' -DestinationPath '%ARCHIVO_ZIP%' -Force"
if errorlevel 1 (
    echo [%SELLO%] ERROR: no se pudo comprimir el respaldo.>> "%REGISTRO%"
    exit /b 1
)
del "%ARCHIVO_SQL%"

REM Rotación: borra los respaldos más viejos que DIAS_A_CONSERVAR días.
forfiles /p "%CARPETA_RESPALDOS%" /m "respaldo_*.zip" /d -%DIAS_A_CONSERVAR% /c "cmd /c del @path" >nul 2>&1

echo [%SELLO%] OK: respaldo creado en %ARCHIVO_ZIP%>> "%REGISTRO%"
endlocal
exit /b 0
