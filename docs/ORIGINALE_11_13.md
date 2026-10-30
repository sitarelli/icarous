# Originale: livelli 11, 12, 13 (una chat per livello)

Versione **Originale** = remake fedele del gioco MSX. Qui non si inventa: si ricopia la mappa.
I livelli 1-10 sono a posto. L'11 va solo controllato, il 12 va completato, il 13 va creato da zero.

## Per Vitto: cosa incollare nella chat nuova
Apri una chat nuova in questa cartella (consigliato **Sonnet 5.5 medio**; per il 13 **Sonnet 5.5 alto** o **Opus 5.5 medio**) e incolla:

- **"Controlla il livello originale 11 seguendo la scheda 11 di docs/ORIGINALE_11_13.md."**
- **"Completa il livello originale 12 seguendo la scheda 12 di docs/ORIGINALE_11_13.md."**
- **"Crea il livello originale 13 seguendo la scheda 13 di docs/ORIGINALE_11_13.md."**

Poi si prova in `test.html` come per Vitto Levels (tasto **G** = invincibile) e, quando ti piace,
scrivi **"approvato, promuovilo"**.

---

## Per Claude: materiale e regole comuni

### Da leggere
- `docs/ICAROUS_LEVEL_DESIGN.md` (vincoli del motore) e `docs/COME_CREARE_UN_LIVELLO.md` (procedura, libreria).
- **Ritaglio della mappa** del livello: `docs/mappe/originale/livelloNN.png` (alta risoluzione, guardalo con Read).
  Mappa intera ad alta risoluzione: `docs/mappa_msx.png` · vista d'insieme dei 13 livelli: `docs/mappe/mappa_msx_mp83.png`.

### Lo strumento che legge la mappa: `tools/livelli/msx_mappa.py`
Nella mappa `docs/mappa_msx.png` ogni tile MSX è un quadretto di 8×8 pixel, livello = **121×57 tile MSX**.
I livelli di Icarous sono **193×90** (`tileSize: 8`): scala ~1,6, la stessa usata da Vitto per i livelli 1-12
(verificato: i muri dei suoi livelli 11 e 12 coincidono con quelli estratti, a meno di 1 tile di arrotondamento).

```
python3 tools/livelli/msx_mappa.py 13 --scala      # griglia MSX (# muro ~ lava . vuoto ? icona) + icone in coordinate 193×90
python3 tools/livelli/msx_mappa.py 12 --confronta  # per ogni icona MSX: cosa c'è nello stesso punto di levels/level12.js
```
Nello script del livello:
```python
from icarous_lib import *
from msx_mappa import disegna_msx, msx_a_icarous
L = Level(cols=193, rows=90, tile=8)
L.frame()
disegna_msx(L, 13)              # muri, lava e zone "fuori mappa" (riempite di muro) già scalati
x, y = msx_a_icarous(51, 10)    # coordinata MSX -> Icarous, per piazzare entità e porte
```
**Non riscrivere i muri a mano**: parti da `disegna_msx` e correggi solo dove il controllo lo chiede
(es. una vasca da rifare con `tub()`, uno spazio di volo troppo stretto dopo la scala).
Attenzione: un `?` dentro una linea di muro è un'icona sopra il muro, quasi sempre **una porta**: lì il muro resta
aperto e va messa la porta con `L.door(...)`.

### Legenda icone MSX → tile (ricavata dai livelli 10 e 11 di Vitto)
| Icona sulla mappa | Tile |
|---|---|
| frecce azzurre con scritta OPEN (a volte scritta grigia) | `OPEN` (4) |
| frecce bianche con scritta CLOSE | `CLOSE` (5) |
| frecce verdi ⇕ / ⇔ o pallini blu sopra un muro o in un varco | `DOOR` (6) |
| omino azzurro accanto al riquadro "LEVEL NN" | `ICAROUS` (9) partenza |
| ragazza gialla | `WOMAN` (3) |
| chiave gialla | `KEY` (10) |
| quadratino vuoto (giallo, rosso, blu...) | nemico `ENH` (11) |
| rombo (bianco, rosso, blu...) | nemico `ENV` (13) |
| "palma" verde | nemico `ENX` (15) |
| stella a sei punte (bianca, azzurra, magenta...) | `STAR` (12) |
| sole a raggi con cerchietto | `BULB` (8) |
| clessidra / cassetta | `TIMER` (16) |
| bandierina gialla | `FLAG` (7) checkpoint |

Il colore dell'icona MSX è solo estetico. I **gruppi** delle porte non sono scritti sulla mappa:
si deducono dalla logica (quale OPEN sta vicino a quale porta, quale percorso serve). Lettere libere (A, B, C...).

### Regole speciali per l'Originale
- **Fedeltà prima di tutto**: muri, vasche, oggetti e nemici dove sono nella mappa. Niente fuoco fatuo
  (`WISP`/`WISP2` sono solo di Vitto Levels) e niente CLOSE aggiunti per regola: le righe ATTENZIONE del validatore
  su fuoco fatuo e "CLOSE per ogni porta" qui si ignorano (dillo a Vitto).
- Gli ERRORI del validatore invece vanno risolti tutti (livello impossibile, trappola senza uscita...): se la mappa
  MSX, scalata, crea un passaggio impossibile nel nostro motore, correggi il minimo e spiegalo.
- Salva come `L.save('originale-NN.js', name='LIVELLO NN', ...)` (finisce in `levels/test/`).
  Script in `tools/livelli/originaleNN.py`.
- Promozione, solo dopo l'ok di Vitto: `python3 tools/livelli/promuovi.py originale-NN.js NN originale`
  (scrive `levels/levelNN.js` e alza `count` di `originale` in `config.js`).

---

## Scheda 11 — controllare (Vitto non è sicuro)
**Situazione:** `levels/level11.js` esiste. I **muri sono giusti** (confronto automatico fatto: coincidono con la mappa,
a parte spostamenti di 1 tile dovuti alla scala, da non toccare).
**Da fare:**
1. `python3 tools/livelli/msx_mappa.py 11 --confronta` e guarda `docs/mappe/originale/livello11.png`.
2. Ogni riga `--- NIENTE ---` è un'icona MSX che nel livello manca. Ad oggi ce n'è una sola sicura:
   **MSX (103,31) → Icarous ~(165,49)**: frecce **blu** ⇕ = probabilmente una porta mancante (o di un gruppo diverso).
   Controlla anche che le porte e i gruppi abbiano senso (OPEN vicino alla porta giusta).
3. Se trovi solo piccole mancanze, correggi **direttamente `levels/level11.js`** (Vitto ha chiesto di non toccare i
   livelli originali senza richiesta: questa scheda È la richiesta, ma limita le modifiche a quanto serve e
   elenca a Vitto ogni cambiamento). Se il livello non regge, rifallo con uno script `tools/livelli/originale11.py`.
4. Verifica che sia risolvibile (gioca da `test.html` o rifai il controllo con la libreria).

## Scheda 12 — completare
**Situazione:** `levels/level12.js` ha **muri e lava giusti**, partenza, chiave, ragazza e alcuni oggetti a sinistra,
ma manca quasi tutta la **logica centrale**. Dal confronto (`msx_mappa.py 12 --confronta`) mancano:
- **Colonna centrale** (le stanze con le due vasche affiancate): 4 OPEN azzurri a MSX (56,14) (64,14) (56,30) (64,30),
  2 OPEN grigi + 1 CLOSE a MSX (57,46) (65,46), 2 OPEN in fondo a MSX (61,54) e dintorni, rombi gialli (nemici V)
  a MSX (55,36) (64,36), quadratini rosso/giallo/blu (nemici H) a MSX (57,49) (57,53) (63,51).
- In basso a sinistra: 2 rombi bianchi (nemici V) a MSX (10,45) (14,45).
- In basso a destra: 2 quadratini blu (nemici H) a MSX (102,49) (110,49).
- Un'icona rossa piccola a MSX (33,13): guardala nel ritaglio e decidi.
**Il rebus:** nella mappa MSX del 12 **non si vedono porte**, ma ci sono molti OPEN e un CLOSE. Prima di piazzare,
ragiona su dove devono stare le porte (probabilmente nei varchi della colonna centrale, o come pavimenti sopra le
vasche) perché il percorso partenza → chiave → ragazza abbia senso. Proponi l'ipotesi a Vitto **prima** di costruire.
**Come:** script `tools/livelli/originale12.py` che parte da `disegna_msx(L, 12)` e rimette tutte le entità
(anche quelle già presenti, prendendole dal file attuale o dal `--confronta`), così il livello diventa rigenerabile.

## Scheda 13 — creare (ultimo livello, finale del gioco)
**Situazione:** non esiste. Mappa: `docs/mappe/originale/livello13.png`. Forma **non rettangolare**: in alto al centro
e in basso a sinistra ci sono zone fuori mappa (`disegna_msx` le riempie di muro).
**Punti fissi (coordinate MSX → Icarous):**
- Partenza Icarous: in alto al centro, accanto al riquadro "LEVEL 13", MSX ~(51,10) → ~(82,16).
  Il riquadro "LEVEL 13" è solo un'etichetta (nel `--scala` esce come icona 8×3 bianca: non è un oggetto).
- Chiave: in alto a sinistra, MSX (4,3) → (6,5).
- Ragazza: in basso a sinistra, MSX (4,53) → (6,84). Sotto la mappa c'è il cuore e la frase finale
  *"I was sure you would come to me"*: dopo l'ultimo livello il gioco mostra già la schermata finale (`main.js`).
- Molte vasche: 4 in fila in basso a sinistra, altre al centro e a destra.
**Icone da piazzare:** lancia `msx_mappa.py 13 --scala` e usa la legenda. Al momento risultano: OPEN azzurri a MSX
(12,6) (12,14) (99,17) (99,21) (12,37) (28,37) (20,38) e OPEN con scritta grigia (escono come icone "grigio",
1×2 o 2×2) a MSX (82,18) (77,33) (37,38) (3,43), un CLOSE bianco a MSX (100,6), stelle bianche (44,21) (64,21)
(66,53), stella rosa (108,6), "palma" verde (78,30), quadratini gialli (23,15) (6,18) (2,28), rombi bianchi (56,30)
(56,33), lampadina a sinistra (circa MSX (4,13)). Ricontrolla tutto sul ritaglio: alcune icone vicine si fondono.
**Porte:** come nel 12, deducile dagli OPEN e dai `?` dentro le linee di muro; proponi lo schema a Vitto prima.
**Alla promozione** aggiorna anche la descrizione in `config.js` (`'I 12 livelli...'` → 13) e il `README.md`.
