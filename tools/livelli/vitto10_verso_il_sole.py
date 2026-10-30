"""VITTO LEVELS 10 — "Verso il Sole" (difficoltà 9, finale in salita, porte A -> B -> C -> D).

Uso (Mac):  python3 tools/livelli/vitto10_verso_il_sole.py
Torre verticale di 6 piani (il piano 1 in fondo, il 6 in cima). I passaggi fra un piano e l'altro sono sfalsati:
botola A a sinistra, varco a destra, botola B a sinistra, varco a destra, botola D a sinistra-centro.
Chi sbatte la testa sul soffitto mentre è sopra il passaggio da cui è salito ricade al piano di sotto.
Rispetto alla scheda: la stanza della chiave sta all'estremo sinistro del piano 4 e la botola B si apre ACCANTO
(non dentro, altrimenti la porta C si salterebbe); la ragazza è in alto a DESTRA del piano 6, perché la botola D
(sopra il ponte, a sinistra) l'avrebbe messa a 10 tile dall'ingresso.
CLOSE: A = "tappo" per la botola A dal piano 2 (facoltativo, aiuta), B = trappola all'uscita della sacca,
C = trappola davanti alla porta C, D = rimette il ponte (e richiude la botola) per chi ha premuto OPEN D troppo presto.
Fuochi fatui: il rosso al piano 3 (si sveglia mentre attraversi il piano 2), il blu sopra il ponte D (al ritorno con la chiave).
"""
from icarous_lib import *

L = Level(cols=64, rows=70, tile=9)

# --- cornice e pavimenti fra i piani (muri spessi 1 tile) ---
# piano 6 = righe 1..11 · piano 5 = 13..24 · piano 4 = 26..36 · piano 3 = 38..48 · piano 2 = 50..57 (basso) · piano 1 = 59..68
L.frame()
L.hline(12, 0, 63); L.hline(25, 0, 63); L.hline(37, 0, 63); L.hline(49, 0, 63); L.hline(58, 0, 63)

# --- passaggi fra i piani (sfalsati sinistra/destra) ---
L.door(7, 58, 7, 1, 'A')                     # botola A: piano 1 -> 2 (a sinistra)
L.clear(50, 49, 7, 1)                        # varco aperto: piano 2 -> 3 (a destra)
L.door(20, 37, 7, 1, 'B')                    # botola B: piano 3 -> 4 (a sinistra, accanto alla stanza della chiave)
L.clear(46, 25, 7, 1)                        # varco aperto: piano 4 -> 5 (a destra)
L.door(17, 12, 9, 1, 'D')                    # botola D: piano 5 -> 6, sopra il ponte D

# ================= PIANO 1: partenza, due vasche, OPEN A in mezzo =================
L.put(2, 66, 3, 3, ICAROUS)                  # sotto-a-fianco della botola A (chiusa)
L.tub(17, 24, 67, 68)                        # prima vasca: si sorvola per andare all'OPEN A e per tornare
L.put(29, 67, 2, 2, OPEN, 'A')
L.tub(35, 44, 67, 68)                        # seconda vasca: solo per la stella
L.put(55, 67, 2, 2, STAR)

# ================= PIANO 2: soffitto basso (8), dalla botola A al varco destro =================
L.put(2, 56, 2, 2, CLOSE, 'A')               # a sinistra della botola: chi lo preme la chiude e non può più ricaderci
L.put(44, 56, 2, 2, ENS)                     # sotto il punto dove, salendo verso il varco, si sbatte il bordo

# ================= PIANO 3: checkpoint, sacca SB con l'OPEN B, botola B =================
L.put(59, 47, 2, 2, FLAG)                    # appena saliti dal varco: metà torre
L.vline(12, 38, 41)                          # parete della sacca SB, varco a terra alto 7
L.put(2, 47, 2, 2, OPEN, 'B')                # in fondo alla sacca
L.put(14, 47, 2, 2, CLOSE, 'B')              # sulla soglia: uscendo bisogna scavalcarlo
L.put(44, 38, 2, 2, ENV)                     # su e giù lontano dal varco (50..56) e dalla botola B (20..26)
L.put(36, 46, 3, 3, BULB)
L.put(30, 42, 2, 2, WISP)                    # fuoco fatuo ROSSO: compare mentre si attraversa il piano 2 sotto di lui

# ================= PIANO 4: stanza della chiave a sinistra (porta C), H a destra =================
L.vline(12, 26, 29); L.door(12, 30, 1, 7, 'C')   # porta C a terra, alta 7; sopra muro pieno (corsia dell'H)
L.put(3, 35, 2, 2, KEY)
L.put(7, 28, 2, 2, STAR)
L.put(15, 35, 2, 2, CLOSE, 'C')              # davanti alla porta C (staccato 2 tile): chi arriva a piedi la richiude
L.put(40, 27, 2, 2, ENH)                     # quota del muro pieno sopra la porta C: non entra nella stanza

# ================= PIANO 5: OPEN C a destra, ponte D sulla lava a sinistra =================
L.hline(19, 56, 62)                          # mensola dell'OPEN C (a destra del varco 46..52, non sopra)
L.put(58, 17, 2, 2, OPEN, 'C')
L.put(40, 23, 2, 2, STAR)
L.tub(10, 33, 23, 24)                        # vasca larga 24 sul pavimento
L.door(10, 22, 24, 1, 'D')                   # ponte D a filo con le sponde: chiuso all'inizio, ci si cammina
L.put(5, 23, 2, 2, OPEN, 'D')                # oltre il ponte: apre la botola e fa sparire il ponte
L.put(1, 23, 2, 2, CLOSE, 'D')               # contro la parete: rimette il ponte (e chiude la botola)
L.put(26, 16, 2, 2, WISP2)                   # fuoco fatuo BLU: sopra il ponte, si sveglia quando ci si cammina

# ================= PIANO 6: sala finale, timer all'ingresso, 2 X, ragazza in alto a destra =================
L.put(28, 9, 3, 3, TIMER)                    # appena usciti dalla botola D
L.put(10, 7, 2, 2, ENX)                      # corsia bassa
L.put(40, 2, 2, 2, ENX)                      # corsia alta, passa davanti alla ragazza
L.hline(5, 51, 62)                           # mensola dell'uscita ("la luce")
L.put(52, 2, 3, 3, BULB)
L.put(58, 2, 3, 3, WOMAN)

L.check()
L.save('vitto-10-verso-il-sole.js',
       name="Towards the Sun",
       intro="The Labyrinth is collapsing: climb the chimney up to the light. Ariadne is waiting at the exit.",
       background=1,
       comment='VITTO LEVELS 10 "Verso il Sole" - generato da tools/livelli/vitto10_verso_il_sole.py\n'
               'Torre di 6 piani da risalire, passaggi sfalsati sinistra/destra; chi sbatte la testa ricade giù.\n'
               'Soluzione: OPEN A -> botola A -> piano 2 (soffitto basso) -> varco destro -> piano 3 (checkpoint) -> '
               'sacca: OPEN B -> botola B -> piano 4 -> varco destro -> piano 5: OPEN C -> riscendi al 4 -> porta C -> '
               'chiave -> risali al 5 -> ponte D -> OPEN D -> volo sopra la lava su per la botola D -> piano 6: timer -> ragazza.',
       note='Difficoltà 9: finale in salita, 6 piani sfalsati, ponte D che sparisce sotto la botola. CLOSE A tappo, B e C trappole, D rimette il ponte. Due fuochi fatui.')
