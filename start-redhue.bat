@echo off
title REDHUE - localhost:8888
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js mangler. Installer fra https://nodejs.org og proev igen. & pause & exit /b 1)
if not exist ".env" (
  >".env" echo ANTHROPIC_API_KEY=
  >>".env" echo GUMROAD_PRODUCT_ID=
  >>".env" echo REDHUE_DEV_KEY=redhue-dev-8888
  echo Oprettede .env - indsaet din ANTHROPIC_API_KEY i den for at bruge agenterne.
)
echo Starter REDHUE paa http://localhost:8888 ...
call npx -y netlify-cli dev
pause
