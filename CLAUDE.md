# Icarous — note per Claude (lette in automatico a ogni nuova chat in questa cartella)

Remake HTML5/JS (moduli ES6, nessuna build) di un classico MSX (cave-flyer). Leggi `README.md` per la struttura.

## Due versioni, stesso motore
- **Originale**: `levels/level1..12.js`, ricostruiti a mano da Vitto. NON modificarli senza richiesta esplicita.
- **Vitto Levels**: `levels/vitto/levelN.js`, campagna nuova progettata da Vitto e Claude.
  Quanti livelli ha ciascuna versione: `CAMPAIGNS` in `config.js`.

## Originale 11-13 e Icarous II
- Livelli originali 11 (controllo), 12 (da completare), 13 (da creare): `docs/ORIGINALE_11_13.md` (una scheda per chat).
  I muri si estraggono in automatico dalla mappa MSX con `tools/livelli/msx_mappa.py`; ritagli in `docs/mappe/originale/`.
- Icarous II (6 piani, da fare più avanti): `docs/ICAROUS2_PIANO.md`, ritagli in `docs/mappe/icarous2/`.

## Creare livelli
- Regole del motore e del level design: `docs/ICAROUS_LEVEL_DESIGN.md` (vincoli obbligatori).
- Piano della campagna Vitto Levels: `docs/VITTO_LEVELS_PIANO.md` (se esiste) — brief per scriverlo: `docs/VITTO_LEVELS_PROGETTO.md`.
- Procedura per costruire UN livello: `docs/COME_CREARE_UN_LIVELLO.md`.
- I livelli si costruiscono con script Python in `tools/livelli/` che usano `tools/livelli/icarous_lib.py`
  (disegno, controllo automatico, salvataggio in `levels/test/` + elenco del laboratorio). Mai scrivere la matrice a mano.
- Si provano in `test.html` (laboratorio). Solo dopo l'ok di Vitto: `python3 tools/livelli/promuovi.py <file> <N>`.

## Avvio locale
`python3 -m http.server 8000` dalla cartella, poi http://localhost:8000 (gioco) e http://localhost:8000/test.html (laboratorio).
