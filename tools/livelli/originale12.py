"""ORIGINALE 12 — ricostruito dalla mappa MSX (muri e lava) + walkthrough del gioco originale (logica delle porte).

Uso (Mac):  python3 tools/livelli/originale12.py

Nella mappa MSX le porte non si vedono perché sono disegnate come mattoni normali. Il video
"walkthrough MSX [480p].mp4" (livello 12 da circa 19:50 a 21:50) mostra cosa succede:
- toccando gli OPEN appoggiati sui tetti delle tre stanze centrali, metà del tetto sparisce (botole);
- la stanza delle vasche (in alto) è solo una trappola: si apre e sotto c'è la lava;
- nella stanza di mezzo (2 V gialli) c'è un CLOSE che richiude il tetto e un OPEN che lo riapre;
- nella stanza in fondo (3 nemici H) l'OPEN sul pavimento apre un varco in basso nel muro del labirinto di destra,
  altrimenti sigillato: dentro ci sono la lampadina e 2 H blu.
Chiave e ragazza (a sinistra) si raggiungono senza porte, come nel gioco originale: il centro e la destra sono
deviazioni facoltative (ricariche e trappole).
"""
from icarous_lib import *
from msx_mappa import disegna_msx

L = Level(cols=193, rows=90, tile=8)
L.frame()
disegna_msx(L, 12)
# le frecce grigie degli OPEN hanno lo stesso colore dei mattoni: msx_mappa le legge come pezzetti di muro (falsi)
L.clear(90, 60, 1, 4)                          # stanza di mezzo, sotto l'OPEN di sinistra
L.clear(90, 73, 1, 3); L.clear(102, 73, 1, 3)  # sopra il tetto della stanza in fondo, sotto i due OPEN grigi
L.clear(96, 86, 1, 3)                          # stanza in fondo, accanto all'OPEN sul pavimento

# Colonna centrale: stanze fra le colonne 83 e 109, muretto/divisorio a 96.
# Tetti: stanza delle vasche riga 25, stanza di mezzo riga 51, stanza in fondo riga 76.

# ================= STANZA DELLE VASCHE (trappola, gruppo A) =================
L.door(84, 25, 12, 1, 'A'); L.door(97, 25, 12, 1, 'A')     # le due metà del tetto
L.put(89, 23, 2, 2, OPEN, 'A'); L.put(102, 23, 2, 2, OPEN, 'A')

# ================= STANZA DI MEZZO (gruppo B, 2 V gialli) =================
L.door(84, 51, 12, 1, 'B'); L.door(97, 51, 12, 1, 'B')
L.put(89, 49, 2, 2, OPEN, 'B'); L.put(102, 49, 2, 2, OPEN, 'B')
L.put(91, 62, 2, 2, OPEN, 'B')                             # dentro, a sinistra del muretto: riapre il tetto
L.put(104, 62, 2, 2, CLOSE, 'B')                           # dentro, a destra: richiude il tetto
L.put(88, 55, 2, 2, ENV); L.put(102, 55, 2, 2, ENV)

# ================= STANZA IN FONDO (gruppo C, 3 nemici H) =================
L.door(84, 76, 12, 1, 'C'); L.door(97, 76, 12, 1, 'C')
L.put(90, 74, 2, 2, OPEN, 'C'); L.put(102, 74, 2, 2, OPEN, 'C')
L.put(91, 78, 2, 2, ENH); L.put(101, 81, 2, 2, ENH); L.put(91, 84, 2, 2, ENH)
L.put(98, 87, 2, 2, OPEN, 'D')                             # sul pavimento: apre il labirinto di destra

# ================= LABIRINTO DI DESTRA (sigillato, si apre con D) =================
L.door(122, 84, 1, 5, 'D')                                 # varco in basso nel muro fra corridoio e labirinto
L.put(147, 17, 3, 3, BULB)
L.put(163, 78, 2, 2, ENH); L.put(176, 78, 2, 2, ENH)

# ================= FASCIA ALTA E LATO SINISTRO (come il file di Vitto) =================
L.put(95, 8, 3, 3, ICAROUS)
L.put(159, 2, 3, 3, ENX)
L.put(184, 15, 3, 3, TIMER)
L.put(18, 10, 3, 3, KEY)
L.put(5, 15, 3, 3, TIMER)
L.put(8, 20, 3, 3, STAR); L.put(21, 26, 3, 3, STAR); L.put(8, 31, 3, 3, STAR); L.put(8, 59, 3, 3, STAR)
L.put(43, 46, 3, 3, WOMAN)
L.put(53, 21, 2, 2, ENV)                                   # rombo rosso: sale e scende sopra la vasca di sinistra
L.put(16, 72, 2, 2, ENV); L.put(22, 72, 2, 2, ENV)         # rombi bianchi in basso a sinistra

L.check()
L.save('originale-12.js',
       comment='ORIGINALE 12 - generato da tools/livelli/originale12.py (muri dalla mappa MSX, porte dal walkthrough)\n'
               'A: tetto della stanza delle vasche (trappola). B: tetto della stanza di mezzo (CLOSE e OPEN dentro). '
               'C: tetto della stanza in fondo. D: varco del labirinto di destra (OPEN sul fondo della stanza C).',
       note='Originale 12 completato: botole sui tetti delle stanze centrali, labirinto di destra con la lampadina.')
