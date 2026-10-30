"""Originale 13: ricostruito dalla mappa MSX (docs/mappe/originale/livello13.png) e dal video walkthrough
"walkthrough MSX [480p].mp4" (livello 13 da 22:04 a 27:45).

Dal video: partenza a MSX (29,10) e non accanto alla scritta LEVEL 13; porte = tratti interi di muro fra due pilastri;
i 4 OPEN della stanza lunga aprono il pavimento sopra la propria vasca; la riga 24 colonne 105-107 è libera.
Quale OPEN apre le porte A-F è dedotto dai tempi del video (non si vede direttamente).

Uso (Mac), dalla cartella del gioco:  python3 tools/livelli/originale13.py
"""
from icarous_lib import *
from msx_mappa import disegna_msx, msx_a_icarous, _sx, _sy

L = Level(cols=193, rows=90, tile=8)
L.frame()
disegna_msx(L, 13)


def msx_clear(c0, r0, c1, r1):
    """Svuota le celle MSX c0..c1 × r0..r1 (falsi muri: scritte OPEN grigie lette come mattoni)."""
    x0, x1, y0, y1 = _sx(c0), _sx(c1), _sy(r0), _sy(r1)
    L.clear(x0, y0, x1 - x0 + 1, y1 - y0 + 1)


def porta_v(c, r0, r1, grp):
    """Porta verticale nella colonna MSX c, fra i pilastri delle righe r0-1 e r1+1."""
    y0, y1 = _sy(r0 - 1) + 1, _sy(r1 + 1) - 1
    L.door(_sx(c), y0, 1, y1 - y0 + 1, grp)


def porta_h(r, c0, c1, grp):
    """Porta orizzontale nella riga MSX r, fra i pilastri delle colonne c0-1 e c1+1."""
    x0, x1 = _sx(c0 - 1) + 1, _sx(c1 + 1) - 1
    L.door(x0, _sy(r), x1 - x0 + 1, 1, grp)


def ent(c, r, t, w=3, h=3, group=None):
    """Entità sull'icona MSX (c, r): angolo in alto a sinistra."""
    x, y = msx_a_icarous(c, r)
    L.put(x, y, w, h, t, group)


# falsi muri: scritte OPEN grigie su sfondo vuoto (nel video lì non c'è muro)
msx_clear(76, 33, 76, 34)
msx_clear(36, 38, 36, 39)
msx_clear(3, 43, 4, 44)
# riga 24, colonne 105-107: nel video è sempre libera (ingresso della stanza dei due OPEN di destra)
L.clear(_sx(104) + 1, _sy(24), _sx(108) - _sx(104) - 1, 1)

# porte (MSX: tratti di 7 caselle fra due pilastri)
porta_v(8, 1, 7, 'A')            # stanza della chiave
porta_v(8, 9, 15, 'B')           # stanza della lampadina
porta_v(80, 1, 7, 'C')           # due varchi in alto a destra, si aprono insieme: unico accesso alla fascia alta
porta_v(88, 1, 7, 'C')
porta_v(36, 49, 55, 'D')         # zona della ragazza
porta_v(96, 41, 47, 'E')         # stanzette murate a destra
porta_v(96, 49, 55, 'F')
porta_h(40, 9, 15, 'H')          # botole sopra le 4 vasche
porta_h(40, 17, 23, 'I')
porta_h(40, 25, 31, 'J')
porta_h(40, 33, 39, 'K')

# interruttori
ent(99, 17, OPEN, group='A'); ent(99, 21, OPEN, group='A')
ent(100, 6, CLOSE, group='A')    # trappola: richiude la stanza della chiave
ent(77, 33, OPEN, group='C')    # nel video, appena toccato, Teseo va dritto ai varchi C
ent(3, 43, OPEN, group='B')
ent(12, 14, OPEN, group='D')
ent(12, 6, OPEN, group='E')
ent(82, 18, OPEN, group='F')
ent(12, 37, OPEN, group='H'); ent(20, 38, OPEN, group='I')
ent(28, 37, OPEN, group='J'); ent(37, 38, OPEN, group='K')

# Icarous appoggiato sul muro della riga 12, come nel video (MSX 29,10), sotto una nicchia cieca
L.put(_sx(28), _sy(12) - 3, 3, 3, ICAROUS)
ent(4, 3, KEY)
ent(4, 53, WOMAN)
ent(4, 13, BULB)
for c, r in ((44, 21), (64, 21), (66, 53), (108, 6)):
    ent(c, r, STAR)
ent(56, 30, ENV); ent(56, 33, ENV)
ent(78, 30, ENX)
for c, r in ((6, 18), (2, 28)):
    ent(c, r, ENH, 2, 2)
L.put(_sx(23) - 1, _sy(15), 2, 2, ENH)   # MSX (23,15): spostato di 1 tile, sennò copre il muro della colonna 24

L.check()
L.save('originale-13.js', comment='Originale 13 ricostruito da mappa MSX + video walkthrough (tools/livelli/originale13.py)',
       note='Originale 13: porte dedotte dal video MSX')
