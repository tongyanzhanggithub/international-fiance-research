@echo off
cd /d "%~dp0"
title Tong Radar - Finance Radar

rem ============ Config (editable) ============
rem Server port
set "PORT=4173"
rem Admin backend token (login at /admin.html; change before public deploy)
set "ADMIN_TOKEN=tong-radar-admin"
rem ==========================================

rem ---- Locate Node.js ----
set "NODE_EXE="
for %%N in (
  "C:\Program Files\nodejs\node.exe"
  "C:\Program Files (x86)\nodejs\node.exe"
  "%LocalAppData%\Programs\nodejs\node.exe"
) do if not defined NODE_EXE if exist "%%~N" set "NODE_EXE=%%~N"
if not defined NODE_EXE (
  for /f "delims=" %%P in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%P"
)
if not defined NODE_EXE (
  echo [ERROR] Node.js not found. Install Node 24+ or set the path at the top of this file.
  echo.
  pause
  exit /b 1
)

rem ---- If port already in use, just open the browser ----
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
  echo.
  echo Already running on port %PORT%. Opening browser...
  start "" "http://127.0.0.1:%PORT%/index.html"
  echo To restart, close the other running window first.
  echo.
  pause
  exit /b 0
)

echo.
echo ========================================================
echo   Tong Radar - Finance Radar
echo   App   : http://127.0.0.1:%PORT%/index.html
echo   Admin : http://127.0.0.1:%PORT%/admin.html
echo   Token : %ADMIN_TOKEN%
echo ========================================================
echo   Starting... browser opens automatically in 2 seconds.
echo   Close this window or press Ctrl+C to stop the server.
echo ========================================================
echo.

rem ---- Open browser after 2s (server warm-up), in background ----
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%/index.html'"

rem ---- Run server in foreground (logs show here) ----
"%NODE_EXE%" server.js

echo.
echo Server stopped.
pause
