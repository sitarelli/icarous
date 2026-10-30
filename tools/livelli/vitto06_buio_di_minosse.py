"""VITTO LEVELS 06 — "Il Buio di Minosse" (difficoltà 6, respiro teso, porte A -> B).

Uso (Mac):  python3 tools/livelli/vitto06_buio_di_minosse.py
Labirinto 5 × 4 di stanze (colonne c0..c4, righe r0 in alto .. r3 in basso), muri spessi 1.
Le 3 lampadine stanno solo sulla strada giusta (briciole), le stelle solo nei vicoli ciechi (esche).
Primo livello con DUE fuochi fatui: il rosso compare all'andata verso l'OPEN A,
il blu (tile 18) si sveglia solo dopo il rosso, quando si risale il pozzo verso la chiave.
"""
from icarous_lib import *

L = Level(cols=110, rows=60, tile=9)

CX = [0, 22, 44, 66, 88, 109]     # muri verticali: la colonna c va da CX[c]+1 a CX[c+1]-1
RY = [0, 15, 30, 45, 59]          # pavimenti: la riga r va da RY[r]+1 a RY[r+1]-1

L.frame()
for x in CX[1:-1]: L.vline(x, 0, 59)
for y in RY[1:-1]: L.hline(y, 0, 109)

def varco_lato(c, r):
    """Varco a terra alto 7 fra la stanza (c, r) e quella a destra (c+1, r)."""
    L.clear(CX[c + 1], RY[r + 1] - 7, 1, 7)

def varco_su(r, x0, w=7):
    """Buco largo w nel soffitto della riga r (= pavimento della riga r-1), a partire dalla colonna x0."""
    L.clear(x0, RY[r], w, 1)

# --- collegamenti orizzontali (scheda): r3 c0-c1 c1-c2 · r2 c1-c2 c2-c3 c3-c4 · r1 c0-c1 c2-c3 · r0 c0-c1 c1-c2 ---
for c, r in ((0, 3), (1, 3), (1, 2), (2, 2), (3, 2), (0, 1), (2, 1), (0, 0), (1, 0)):
    varco_lato(c, r)

# --- collegamenti verticali ---
varco_su(3, 14, 6)    # c0: r3 -> r2 (a destra, così il V del pozzo c0 batte sul pavimento e non scende in r3)
varco_su(2, 3)        # c0: r2 -> r1 (a sinistra: il pozzo del V)
varco_su(1, 30)       # c1: r1 -> r0
varco_su(3, 52)       # c2: r3 -> r2
varco_su(3, 80)       # c3: r3 -> r2 (a destra: in fondo si scende alla porta B)
varco_su(2, 70)       # c3: r2 -> r1  \  pozzo dritto verso la chiave
varco_su(1, 70)       # c3: r1 -> r0  /

# --- porte: A fra r0c3 e r0c4, B fra r3c3 e r3c4 (stesse misure dei varchi) ---
L.door(88, 8, 1, 7, 'A')
L.door(88, 52, 1, 7, 'B')
# r1c4 resta sigillata (vuota, tutta muri attorno)

# ================= r3c0: partenza =================
L.put(3, 56, 3, 3, ICAROUS)

# ================= pozzo c0 (r2c0 - r1c0): il V e la lampadina 1 =================
L.put(5, 20, 2, 2, ENV)       # su e giù fra il soffitto di r1c0 e il pavimento di r2c0, attraverso il varco (3..9)
L.put(14, 20, 3, 3, BULB)     # lampadina 1 (r1c0)

# ================= r1c1: il fuoco fatuo ROSSO =================
L.put(38, 20, 2, 2, WISP)     # si sveglia mentre si sale al varco 30..36 verso r0c1: poi insegue

# ================= r0c0: OPEN A in fondo a sinistra =================
L.put(3, 13, 2, 2, OPEN, 'A')

# ================= r0c2: vicolo cieco (esca) =================
L.put(56, 5, 2, 2, STAR)
L.put(60, 13, 2, 2, ENS)

# ================= r3c2: H a terra sotto il varco verso r2c2 =================
L.vline(47, 56, 58)           # sponda: l'H non scappa verso r3c1 e la partenza (si scavalca con un salto)
L.put(56, 57, 2, 2, ENH)

# ================= r2c2: checkpoint (l'incrocio) =================
L.put(61, 43, 2, 2, FLAG)

# ================= r2c1: vicolo cieco (esca) =================
L.put(30, 37, 2, 2, STAR)
L.put(36, 43, 2, 2, ENS)

# ================= r2c3: lampadina 2, X alto, CLOSE B trappola =================
L.put(71, 36, 3, 3, BULB)     # lampadina 2, sotto il pozzo
L.put(78, 32, 2, 2, ENX)      # X alto (righe 32-33: lì i lati sono muro pieno), passa sotto il pozzo
L.put(77, 43, 2, 2, CLOSE, 'B')   # tornando dalla chiave, fra l'atterraggio e il buco verso r3c3: va scavalcato

# ================= r2c4: vicolo cieco (esca) =================
L.put(100, 37, 2, 2, STAR)
L.put(96, 43, 2, 2, ENS)

# ================= r1c2: il fuoco fatuo BLU =================
L.put(59, 21, 2, 2, WISP2)    # si sveglia (dopo il rosso) quando si sale il pozzo c3, ed esce dal varco verso r1c3

# ================= r0c3: CLOSE A sospeso =================
L.put(80, 10, 2, 2, CLOSE, 'A')   # a piedi ci si passa sotto; chi esce dal pozzo volando alto ci sbatte dentro

# ================= r0c4: chiave, OPEN B, lampadina 3 =================
L.put(96, 4, 3, 3, BULB)
L.put(104, 13, 2, 2, KEY)
L.put(94, 13, 2, 2, OPEN, 'B')

# ================= r3c4: la ragazza =================
L.put(102, 56, 3, 3, WOMAN)

L.check()
L.save('vitto-06-buio-di-minosse.js',
       name="The Darkness of Minos",
       intro="No light ever reaches this place. Follow the bulbs: they're your only friends in the dark.",
       background=7,
       comment='VITTO LEVELS 06 "Il Buio di Minosse" - generato da tools/livelli/vitto06_buio_di_minosse.py\n'
               'Labirinto 5x4 al buio: le lampadine segnano la strada giusta, le stelle sono esche nei vicoli ciechi.\n'
               'Due fuochi fatui: il rosso (r1c1) compare all andata, il blu (r1c2) solo dopo il rosso.\n'
               'Soluzione: P -> pozzo c0 -> r1c0 -> r1c1 -> r0c1 -> r0c0 OPEN A -> ritorno a P -> r3c1 -> r3c2 -> '
               'r2c2 (checkpoint) -> r2c3 -> pozzo c3 -> porta A -> r0c4 chiave, OPEN B -> giu dal pozzo -> r3c3 -> porta B -> ragazza.',
       note='Difficoltà 6: labirinto al buio, due fuochi fatui (rosso, poi blu), CLOSE A sospeso sopra il pozzo, CLOSE B da scavalcare al ritorno.')
