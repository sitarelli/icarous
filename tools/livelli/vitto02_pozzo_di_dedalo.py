"""VITTO LEVELS 02 — "Il Pozzo di Dedalo" (respiro, difficoltà 3, botole A -> B -> C -> D).

Uso (Mac):  python3 tools/livelli/vitto02_pozzo_di_dedalo.py
Torre di 4 piani uno sopra l'altro (P1 in alto, P4 in fondo), separati da pavimenti con botole.
Si scende aprendo le botole (una porta chiusa è un pavimento), poi si risale fino alla ragazza al piano 2.
"""
from icarous_lib import *

L = Level(cols=60, rows=46, tile=9)

# --- cornice e pavimenti dei piani (muri spessi 1 tile) ---
L.frame()
L.hline(11, 0, 59)   # P1 | P2  (sopra la stanza della ragazza è pieno)
L.hline(22, 0, 59)   # P2 | P3
L.hline(33, 0, 59)   # P3 | P4

# --- botole (porte orizzontali larghe 8) ---
L.door(22, 11, 8, 1, 'A')   # P1 -> P2, al centro
L.door(38, 22, 8, 1, 'B')   # P2 -> P3, a destra
L.door(6, 33, 8, 1, 'C')    # P3 -> P4, a sinistra
L.door(37, 30, 10, 1, 'C')  # P3: ponte sopra la vasca sotto la botola B (gruppo C: aprendo C sparisce)

# --- P2: stanza della ragazza (a sinistra, unico accesso la porta D) ---
L.vline(12, 12, 15)
L.door(12, 16, 1, 6, 'D')

# --- P2: nicchia bassa a destra (soffitto a 5 tile dal pavimento, facoltativa) ---
L.vline(49, 12, 16)
L.hline(16, 49, 58)
# --- P1 -> cantina segreta: sopra la nicchia, ci si cala da una feritoia nel pavimento del piano 1 ---
L.clear(51, 11, 7, 1)   # alta 4 tile: si atterra sulla mensola della nicchia e si riesce volando

# --- vasche sotto le botole: più larghe del buco, chi cade dritto finisce nella lava (bisogna sterzare) ---
L.tub(21, 30, 20, 21)    # P2, sotto la botola A
L.tub(37, 46, 31, 32)    # P3, sotto la botola B
L.tub(5, 13, 43, 44)     # P4, sotto la botola C
# --- P4: altre due vasche con un isolotto in mezzo, da sorvolare all'andata e al ritorno ---
L.tub(21, 27, 43, 44)
L.tub(36, 42, 43, 44)

# --- P1 (partenza): l'OPEN A è dall'altra parte della botola ---
L.put(3, 8, 3, 3, ICAROUS)
L.put(12, 5, 2, 2, STAR)
L.put(45, 9, 2, 2, OPEN, 'A')       # prima della feritoia della cantina
L.put(36, 9, 2, 2, CLOSE, 'A')      # fra la botola e l'OPEN: tornando indietro a piedi la richiudi (innocuo: riprova)
# --- P2: si atterra dalla botola A, OPEN B poco prima della botola B ---
L.put(34, 20, 2, 2, OPEN, 'B')
L.put(36, 20, 2, 2, CLOSE, 'B')    # attaccato alla botola B: va scavalcato in volo e poi ci si lascia cadere
L.put(46, 12, 2, 2, ENS)        # appeso al soffitto, accanto all'ingresso della nicchia
L.put(55, 14, 2, 2, STAR)       # cantina segreta (ci si cala dal piano 1)
L.put(55, 19, 2, 2, STAR)       # nella nicchia bassa
L.put(4, 19, 3, 3, WOMAN)
# --- P3 (checkpoint): si atterra a destra, OPEN C in fondo a destra, poi si attraversa fino alla botola C ---
L.put(49, 31, 2, 2, FLAG)
L.put(55, 31, 2, 2, OPEN, 'C')
L.put(33, 31, 2, 2, CLOSE, 'C')    # andata: trappola (richiude la botola C); ritorno: rimette il ponte sotto la botola B
L.put(28, 30, 3, 3, BULB)
L.put(20, 26, 2, 2, ENV)        # colonne 20-21: lontano dalle botole B e C
# --- P4: chiave e OPEN D oltre la vasca, guardati da un H ---
L.put(31, 41, 2, 2, ENH)        # righe 41-42: fa la guardia sull'isolotto, rimbalza fra le sponde delle due vasche
L.put(47, 43, 2, 2, OPEN, 'D')
L.put(44, 43, 2, 2, CLOSE, 'D')    # P4, appena oltre la vasca: al ritorno con la chiave, se lo calpesti richiudi D
L.put(53, 43, 2, 2, KEY)

L.check()
L.save('vitto-02-pozzo-di-dedalo.js',
       name="Daedalus' Well",
       intro="Ariadne has fallen into the well. Climb down: the trapdoors hold as long as they stay shut.",
       background=2,
       comment='VITTO LEVELS 02 "Il Pozzo di Dedalo" - generato da tools/livelli/vitto02_pozzo_di_dedalo.py\n'
               'Sotto ogni botola c\'è una vasca: scendendo bisogna sterzare.\n'
               'Soluzione: OPEN A (oltre la botola) -> giù da A -> OPEN B -> giù da B (checkpoint) -> OPEN C -> giù da C -> '
               'oltre le due vasche: OPEN D + chiave -> risalita C -> B -> porta D -> ragazza.\n'
               'CLOSE: A, B e D sono trappole da scavalcare; CLOSE C al piano 3 richiude la botola C (andata) '
               'ma al ritorno rimette il ponte sopra la lava per risalire dalla botola B.',
       note='Difficoltà 3: discesa a botole A → B → C (con la lava sotto), poi risalita fino alla porta D.')
