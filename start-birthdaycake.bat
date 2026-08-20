@echo off
setlocal

cd /d "%~dp0"
set "PORT=5173"
set "URL=http://localhost:%PORT%/"

where py >nul 2>nul
if %errorlevel%==0 (
  start "Birthday Cake Server" /min py -m http.server %PORT%
  timeout /t 2 /nobreak >nul
  start "" "%URL%"
  exit /b 0
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "Birthday Cake Server" /min python -m http.server %PORT%
  timeout /t 2 /nobreak >nul
  start "" "%URL%"
  exit /b 0
)

start "" "%~dp0index.html"
exit /b 0
