@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo === eAdmin Guinee - chargement du jeu de recette multi-roles ===
echo Ce script utilise uniquement la stack locale et ne touche pas a la production.
echo.

call "%~dp0local-start.bat"
if errorlevel 1 (
  echo.
  echo Le demarrage de la stack locale a echoue.
  exit /b 1
)

echo.
echo Chargement idempotent des utilisateurs, institutions, demarches et dossiers de recette...
docker compose --env-file .env.local -f docker-compose.local.yml exec -T backend python -m scripts.seed_recette_data
if errorlevel 1 (
  echo.
  echo Le chargement du jeu de recette a echoue.
  echo Consultez les logs backend avec:
  echo   docker compose --env-file .env.local -f docker-compose.local.yml logs --tail 200 backend
  exit /b 1
)

echo.
echo Jeu de recette charge avec succes.
echo Tous les comptes recette utilisent le meme mot de passe local affiche par local-status.bat.
echo Matrice de recette: docs\RECETTE_TEST_DATA.md
echo Scenarios machine-readable: test-data\role-use-cases.json
echo.
call "%~dp0local-status.bat"

endlocal