#!/bin/bash
# Doppio clic dal Finder: avvia un server locale e apre il gioco nel browser.
cd "$(dirname "$0")/.."
echo "Icarous in esecuzione su http://localhost:8000  (chiudi questa finestra per fermarlo)"
open "http://localhost:8000" &
python3 -m http.server 8000
