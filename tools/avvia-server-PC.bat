@echo off
title Server Gioco ES6 - Desktop
echo Sto entrando nella cartella del gioco...

:: Spostamento forzato nella cartella specifica
cd /d "C:\Users\vitto\Desktop\thes-main\"

echo Cartella attuale: %cd%
echo.
echo Avvio di npx serve... 
echo (Una volta avviato, apri il browser su http://localhost:3000)
echo.

npx serve

pause