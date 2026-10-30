# Theseus II (versione "plus"): i 6 piani — da fare più avanti

Stato: **solo divisione in piani**. Nessun livello costruito. Quando Vitto vorrà partire, si decide prima come
inserirla nel gioco (terza campagna in `CAMPAIGNS` di `config.js`, es. `theseus2`, cartella `levels/theseus2/`).

## Materiale
- Mappa intera: `docs/mappe/mappa_theseus2_mp83.png` (843×579, bassa risoluzione).
- Un ritaglio per piano, ingrandito 3×: `docs/mappe/theseus2/piano01.png` … `piano06.png`.

**Limite importante:** a questa risoluzione un tile MSX è circa 2,8 pixel, troppo poco per estrarre i muri in
automatico come fa `tools/livelli/msx_mappa.py` con l'Originale (lì 8 pixel per tile). Due strade:
1. **Meglio:** trovare una versione grande della mappa. Quella dell'Originale (`docs/mappetheseus.png`) viene da
   MSX Solutions; se esiste anche per Theseus II, basta aggiungere i pannelli in `PANNELLI` dello strumento
   (adattandolo a un secondo file) e i muri escono da soli.
2. Altrimenti: ricostruzione a occhio dal ritaglio, sfruttando che nell'MSX i muri stanno su una griglia regolare
   (righe/colonne multiple di 4 tile MSX, corridoi da 3).

## Elementi nuovi rispetto al primo Theseus (da capire prima di costruire)
- **Porte con la lettera del gruppo** (riquadri blu con A, B, C...): qui i gruppi sono scritti sulla mappa.
- **Anelli colorati** (gialli, azzurri, verdi, bianchi): oggetto nuovo, funzione da scoprire (ricarica? teletrasporto?).
- **Più bandierine** per piano: forse più checkpoint.
- **Vasche di colore diverso** per piano (blu nei piani 02 e 06, verdi nel 04, rosa nel 03): quasi certamente è la
  lava ricolorata col colore del piano, ma va confermato da Vitto (se fosse acqua servirebbe una regola nuova nel motore).
- **Muri colorati per piano** (grigio, azzurro, rosso, verde, sabbia, bianco): oggi il motore ha `background` per livello;
  il colore dei muri per piano sarebbe una piccola aggiunta al renderer.

## Schede dei piani (bozza)
| Piano | Ritaglio | Colore muri | Caratteristiche visibili |
|---|---|---|---|
| 01 | `piano01.png` | grigio | Nella metà sinistra i muri formano lettere (si legge **LOGIN** e altre lettere sopra): è un easter egg, da rispettare. Vasche rosse, porte con lettera in colonna al centro, anelli azzurri nel pozzo centrale. |
| 02 | `piano02.png` | azzurro | Labirinto lungo e basso, 3-4 vasche blu, molti interruttori a sinistra. |
| 03 | `piano03.png` | rosso scuro | Vasche rosa sparse sul lato sinistro e a destra, pochi interruttori, labirinto a pettine. |
| 04 | `piano04.png` | verde | Vasche verdi, tante porte con lettera nella parte centrale, anelli gialli. |
| 05 | `piano05.png` | sabbia | Fila di vasche rosse lungo tutto il fondo, labirinto a spirale in alto a sinistra. |
| 06 | `piano06.png` | bianco | Ultimo piano: la ragazza è al centro, in una stanza a croce piena di interruttori; vasche blu, molti anelli. |

Quando si comincia: una chat per piano, come per l'Originale (vedi `docs/ORIGINALE_11_13.md` per la procedura e la
legenda delle icone, che per gli elementi comuni vale anche qui).
