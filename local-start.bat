@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local.ps1" up %*
if errorlevel 1 (
  echo.
  echo Le demarrage local a echoue. Consultez les erreurs ci-dessus.
  exit /b 1
)
endlocal
