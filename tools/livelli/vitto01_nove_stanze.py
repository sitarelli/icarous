"""VITTO LEVELS 01 — "Le Nove Stanze" (difficoltà media, rebus A -> C -> B).

Uso (Mac):  python3 tools/livelli/vitto01_nove_stanze.py
Griglia 3×3 di stanze (R = riga, C = colonna: R20 = in basso a sinistra).
"""
from icarous_lib import *

L = Level(cols=72, rows=46, tile=9)

# --- cornice e griglia 3x3 di stanze (muri spessi 1 tile) ---
L.frame()
L.vline(24, 0, 45); L.vline(48, 0, 45)
L.hline(15, 0, 71); L.hline(30, 0, 71)

# --- varchi aperti (6 tile) ---
L.clear(24, 39, 1, 6)   # R20 -> R21 (a terra)
L.clear(26, 30, 6, 1)   # R21 -> R11 (in su)
L.clear(63, 30, 6, 1)   # R22 -> R12 (in su)
L.clear(48, 9, 1, 6)    # R02 -> R01 (a terra)
L.clear(24, 9, 1, 6)    # R01 -> R00 (a terra)

# --- porte ---
L.door(48, 39, 1, 6, 'A')   # R21 -> R22
L.door(50, 15, 6, 1, 'B')   # R12 -> R02 (botola nel soffitto)
L.door(48, 24, 1, 6, 'C')   # R12 <-> R11 (scorciatoia)
L.door(24, 24, 1, 6, 'C')   # R11 -> R10 (sacca cieca)
L.door(30, 12, 13, 1, 'B')  # R01: ponte sopra la lava (stesso gruppo della botola B: aprendo B il ponte sparisce)

# --- vasche di lava ---
L.tub(30, 40, 43, 44)    # R21, sul pavimento esterno
L.tub(53, 60, 28, 29)    # R12, sotto la mensola dell'OPEN C
L.tub(30, 42, 13, 14)    # R01, da sorvolare prima della ragazza

# --- mensole ---
L.hline(39, 14, 19)   # R20: prima mensola per imparare a volare
L.hline(22, 38, 45)   # R11: mensola con OPEN A
L.hline(21, 52, 58)   # R12: mensola con OPEN C sopra la lava
L.hline(7, 60, 66)    # R02: mensola con la chiave
L.hline(8, 4, 10)     # R00: mensola della ragazza

# --- R20 (partenza) ---
L.put(3, 42, 3, 3, THES)
L.put(16, 37, 2, 2, STAR)
# --- R21 ---
L.put(34, 38, 2, 2, STAR)        # stella rischiosa sopra la lava
L.put(27, 35, 2, 2, ENH)
# --- R11 (sacca con OPEN A) ---
L.put(41, 20, 2, 2, OPEN, 'A')
L.put(33, 17, 2, 2, ENV)
L.put(28, 18, 2, 2, STAR)
# --- R10 (sacca dietro le porte C, con OPEN B) ---
L.put(3, 28, 2, 2, OPEN, 'B')
L.put(11, 28, 2, 2, ENS)
L.put(18, 27, 3, 3, BULB)
L.put(4, 17, 2, 2, ENH)
# --- R22 (checkpoint) ---
L.put(51, 43, 2, 2, FLAG)
L.put(56, 32, 2, 2, ENV)
L.put(60, 38, 2, 2, ENV)
L.put(67, 42, 3, 3, BULB)
# --- R12 (OPEN C) ---
L.put(54, 19, 2, 2, OPEN, 'C')
L.put(66, 22, 2, 2, ENX)         # righe 22-23: sopra le porte C, non scappa nelle altre stanze
L.put(67, 18, 2, 2, STAR)
# --- R02 (chiave) ---
L.put(62, 5, 2, 2, KEY)
L.put(56, 9, 2, 2, ENS)
L.put(68, 3, 2, 2, ENV)
L.put(51, 3, 3, 3, BULB)
# --- R01 (lava + timer) ---
L.put(44, 12, 3, 3, TIMER)
L.put(31, 6, 2, 2, ENX)
# --- CLOSE: uno per gruppo ---
L.put(42, 43, 2, 2, CLOSE, 'A')   # R21, attaccato alla sponda destra della vasca: non si calpesta più scendendo davanti alla porta A
L.put(33, 28, 2, 2, CLOSE, 'C')   # R11, sul pavimento fra le due porte C: se lo calpesti torni a prendere l'OPEN C
L.put(58, 13, 2, 2, CLOSE, 'B')   # R02: richiude la botola e rimette il ponte sulla lava di R01 (comodo per tornare)
# --- R00 (ragazza) ---
L.put(6, 5, 3, 3, WOMAN)
L.put(15, 3, 2, 2, STAR)

L.check()
L.save('vitto-01-nove-stanze.js',
       name='Le Nove Stanze',
       intro='Arianna è prigioniera nel Labirinto: segui il filo e trova la chiave della catena.',
       background=4,
       comment='VITTO LEVELS 01 "Le Nove Stanze" - generato da tools/livelli/vitto01_nove_stanze.py\n'
               'Soluzione: OPEN A -> porta A -> checkpoint -> OPEN C -> scorciatoia C -> OPEN B (sacca) -> porta B -> chiave -> lava + timer -> ragazza.\n'
               'CLOSE: A e C sono trappole da saltare; CLOSE B in R02 rimette il ponte (gruppo B) sopra la lava di R01.',
       note='Difficoltà media, rebus A → C → B, checkpoint a metà.')
