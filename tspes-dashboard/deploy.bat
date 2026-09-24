@echo off
setlocal
cd /d "%~dp0"

rem ===== TSPES one-click deploy (Docker / Podman) =====
rem Usage: deploy.bat [up^|down^|restart^|rebuild^|logs^|status]
rem Env overrides: APP_PORT (default 3000), NOCODB_PORT (default 8080)

set "ACTION=%~1"
if not defined ACTION set "ACTION=up"

if not defined APP_PORT set "APP_PORT=3000"
if not defined NOCODB_PORT set "NOCODB_PORT=8080"

rem ---- pick engine: docker when its daemon is up, otherwise podman ----
set "ENGINE="
set "COMPOSE="

docker info >nul 2>&1
if not errorlevel 1 goto use_docker

podman --version >nul 2>&1
if not errorlevel 1 goto use_podman

echo [ERROR] neither docker nor podman is available on PATH.
exit /b 1

:use_docker
set "ENGINE=docker"
set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"
goto engine_ok

:use_podman
set "ENGINE=podman"
podman-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] podman is installed but podman-compose is missing.
    exit /b 1
)
set "COMPOSE=podman-compose"

:engine_ok
echo [deploy] engine : %ENGINE%
echo [deploy] compose: %COMPOSE%

if /i "%ACTION%"=="up" goto up
if /i "%ACTION%"=="down" goto down
if /i "%ACTION%"=="restart" goto restart
if /i "%ACTION%"=="rebuild" goto rebuild
if /i "%ACTION%"=="logs" goto logs
if /i "%ACTION%"=="status" goto status
echo Usage: deploy.bat [up^|down^|restart^|rebuild^|logs^|status]
exit /b 1

:up
call :ensure_machine
call :compose_up || exit /b 1
call :wait_for "http://localhost:%NOCODB_PORT%" "NocoDB" || exit /b 1
call :wait_for "http://localhost:%APP_PORT%" "app" || exit /b 1
goto report

:rebuild
call :ensure_machine
%ENGINE% rm -f nocodb >nul 2>&1
%COMPOSE% build --no-cache app
if errorlevel 1 exit /b 1
%COMPOSE% up -d
if errorlevel 1 exit /b 1
call :wait_for "http://localhost:%APP_PORT%" "app" || exit /b 1
goto report

:restart
call :ensure_machine
%COMPOSE% down >nul 2>&1
call :compose_up || exit /b 1
call :wait_for "http://localhost:%APP_PORT%" "app" || exit /b 1
goto report

:down
%COMPOSE% down
goto end

:logs
%COMPOSE% logs -f app
goto end

:status
%COMPOSE% ps
goto end

:report
echo.
echo ===============================================
echo   TSPES deployed!
echo   App    : http://localhost:%APP_PORT%
echo   NocoDB : http://localhost:%NOCODB_PORT%
echo   Login  : admin / admin123
echo ===============================================
start http://localhost:%APP_PORT%
goto end

rem ---- helpers ----

:ensure_machine
rem On Windows podman runs inside a WSL VM that may have shut down while idle
rem (state "stopped"); start it so the deploy does not fail with a socket error.
if /i not "%ENGINE%"=="podman" exit /b 0
set "MSTATE="
for /f %%s in ('podman machine inspect --format "{{.State}}" 2^>nul') do set "MSTATE=%%s"
if /i "%MSTATE%"=="running" exit /b 0
echo [deploy] podman machine is %MSTATE% - starting it ...
podman machine start
exit /b 0

:compose_up
rem A nocodb container from the legacy nocodb-server compose project may hold
rem the name/port; remove it (data survives in ./nocodb-server/nocodb_data).
%ENGINE% rm -f nocodb >nul 2>&1
%COMPOSE% up -d --build
exit /b %errorlevel%

:wait_for
rem %1 = url, %2 = label
set "WF_URL=%~1"
set "WF_LABEL=%~2"
set /a WF_TRIES=0
echo [deploy] waiting for %WF_LABEL% (%WF_URL%) ...
:wait_loop
curl -s -f -o nul -m 3 "%WF_URL%"
if not errorlevel 1 (
    echo [deploy] %WF_LABEL% is up.
    exit /b 0
)
set /a WF_TRIES+=1
if %WF_TRIES% GEQ 45 (
    echo [ERROR] %WF_LABEL% did not become reachable on %WF_URL%
    if /i "%ENGINE%"=="podman" (
        echo         hint: if the port stays dead, run:
        echo           wsl --shutdown
        echo           podman machine start
        echo           then re-run deploy.bat
    )
    exit /b 1
)
ping -n 3 127.0.0.1 >nul
goto wait_loop

:end
endlocal
