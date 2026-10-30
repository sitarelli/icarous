# ICAROUS — remake di un classico MSX

Gioco HTML5/JavaScript (moduli ES6, nessuna build). Si apre servendo la cartella con un server locale.

## Avvio
- **Mac**: doppio clic su `tools/avvia-server-Mac.command` (oppure `python3 -m http.server 8000` dalla cartella).
- **PC**: `tools/avvia-server-PC.bat` (usa `npx serve`, porta 3000).
- **Gioco**: `index.html` · **Laboratorio livelli**: `test.html` (su Vercel: `/test.html`).

## Comandi
Frecce o WASD per muoversi · Spazio, W o Freccia su per volare · P / Esc pausa · joypad supportato (stick/croce, A per volare, Start pausa).
Nel laboratorio: G = invincibile.

## Struttura
| Percorso | Cosa contiene |
|---|---|
| `index.html`, `style.css` | Pagina, menu con scelta della versione, pausa, game over, HUD e cornice neon (stile originale), controlli touch |
| `main.js` | Entry point: caricamento sprite/audio, menu, parsing livelli, game loop a passo fisso (60 Hz), vittoria/punteggio, modalità laboratorio |
| `config.js` | Costanti fisiche, `CAMPAIGNS` (le due versioni del gioco e quanti livelli hanno) e stato condiviso |
| `player.js` | Fisica, collisioni, nemici, lava, oggetti, porte, checkpoint, particelle |
| `renderer.js` | Disegno: sfondo, muri con bordi/ombre, luce dinamica, radar, effetti, cartellino punteggio |
| `input.js` | Tastiera, joypad, joystick touch, fullscreen, orientamento |
| `save.js` | Salvataggio progressi e record nel browser (localStorage), separati per versione |
| `levels/levelN.js` | Versione **Originale**: i 13 livelli ricostruiti dall'MSX |
| `levels/vitto/levelN.js` | Versione **Vitto Levels**: livelli nuovi (il 1 è "Le Nove Stanze") |
| `levels/test/` | Livelli di prova + `elenco.js` (lista mostrata in `test.html`) |
| `test.html` | Laboratorio: prova livelli dall'elenco, incollati dall'editor o da file, con controllo automatico |
| `png/`, `jpg/`, `audio/` | Sprite, sfondi (sfondoN.jpg = livello N), effetti sonori mp3/ogg |
| `tools/` | Editor livelli, generatore, avviatori server |
| `tools/livelli/` | Libreria Python per costruire e controllare i livelli, uno script per livello, `promuovi.py` |
| `CLAUDE.md`, `docs/VITTO_LEVELS_PROGETTO.md`, `docs/COME_CREARE_UN_LIVELLO.md` | Istruzioni per le chat che progettano e costruiscono i Vitto Levels |
| `docs/` | Regole di level design, mappe di riferimento |
| `_archivio/` | Vecchie versioni e backup (non usati dal gioco, esclusi dall'APK) |

## Due versioni, stesso motore
Nel menu si sceglie **CLASSIC** (livelli 1-13 dell'MSX) oppure **NEW LEVELS** (livelli nuovi, aperta di default al primo avvio). Tutte le scritte del gioco sono in inglese.
Tutte le novità (checkpoint, radar, luce, punteggio) valgono per entrambe; progressi e record sono separati.

## Aggiungere un livello
1. Provalo prima in `test.html` (incolla il codice dall'editor).
2. Salvalo come `levels/vitto/level2.js` (Vitto Levels) oppure `levels/level14.js` (Originale).
3. In `config.js`, dentro `CAMPAIGNS`, alza il `count` della versione giusta.
4. (Facoltativo) nel file aggiungi `name: "Titolo"` (compare a inizio livello) e `background: 4` (usa `jpg/sfondo4.jpg`).

## Punteggio
Bonus tempo (3000 − 5 punti al secondo) + stelle ×100 + lampadine ×50 + cagnolino ×250 + energia residua (fino a 1000) − 500 per ogni ripartenza dal checkpoint.
I record restano nel browser del dispositivo: funziona anche online, ma non è una classifica condivisa.
