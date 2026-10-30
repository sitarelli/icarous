@echo off
title Server Gioco ES6 - Desktop
echo Sto entrando nella cartella del gioco...

:: Si sposta nella cartella del gioco (quella sopra tools)
cd /d "%~dp0.."

echo Cartella attuale: %cd%
echo.
echo Avvio di npx serve... 
echo (Una volta avviato, apri il browser su http://localhost:3000)
echo.

npx serve

pause