@echo off
setlocal EnableDelayedExpansion
title REDHUE - deploy til Netlify
cd /d "%~dp0"
set "NL=npx -y netlify-cli"

echo.
echo [1/5] Tjekker Node.js
where node >nul 2>nul || (echo Node.js mangler. Installer fra https://nodejs.org og proev igen. & pause & exit /b 1)
echo   OK

echo.
echo [2/5] Logger ind paa Netlify
call %NL% status >nul 2>nul || call %NL% login
call %NL% status >nul 2>nul || (echo   Ikke logget ind. Stopper. & pause & exit /b 1)
echo   OK

echo.
echo [3/5] Vaelger site
if not exist ".netlify\state.json" (
  echo   Vaelg dit eksisterende REDHUE-site i listen - eller opret et nyt.
  call %NL% link || call %NL% sites:create
)
if not exist ".netlify\state.json" (echo   Intet site valgt. Stopper. & pause & exit /b 1)
echo   OK

echo.
echo [4/5] Noegler
echo   ANTHROPIC_API_KEY  : console.anthropic.com - Settings - API Keys - Create Key
echo   GUMROAD_PRODUCT_ID : gumroad.com - dit REDHUE Pro-produkt - Content
echo                        (slaa "Generate a unique license key per sale" til)
echo   Tryk Enter ved en noegle, der allerede er sat i Netlify.
set "AK="
set "GP="
set /p "AK=  ANTHROPIC_API_KEY: "
set /p "GP=  GUMROAD_PRODUCT_ID: "
set "DEV=redhue-%RANDOM%%RANDOM%%RANDOM%"
if defined AK call %NL% env:set ANTHROPIC_API_KEY "!AK!" >nul
if defined GP call %NL% env:set GUMROAD_PRODUCT_ID "!GP!" >nul
call %NL% env:set ANTHROPIC_MODEL "claude-sonnet-5" >nul
call %NL% env:set REDHUE_DEV_KEY "!DEV!" >nul
cls
echo   Variabler sat i Netlify.

echo.
echo [5/5] Deployer
call %NL% deploy --prod --dir . --functions netlify/functions || (pause & exit /b 1)

echo.
echo  ============================================
echo   REDHUE er live - se adressen ovenfor.
echo.
echo   DIN TESTNOEGLE (Pro-adgang uden koeb):
echo     !DEV!
echo   Indsaet den under Indstillinger - REDHUE Pro.
echo   Gem den sikkert, og del den ikke.
echo  ============================================
pause
