@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-selftest.ps1" %*
if errorlevel 1 (
  echo.
  echo Le self-test local a detecte au moins une anomalie.
  echo Consultez local-selftest-report.txt et les logs affiches ci-dessus.
  exit /b 1
)
echo.
echo Tous les controles locaux critiques sont passes.
endlocal
