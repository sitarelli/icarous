"""VITTO LEVELS 08 — "Il Ritorno" (difficoltà 8, ferro di cavallo, catena di porte A -> B -> C -> D -> E).

Uso (Mac):  python3 tools/livelli/vitto08_il_ritorno.py
Griglia di 4 colonne (pareti a x = 27, 55, 82) per 4 fasce (pavimenti a y = 14, 28, 42).
Si scende a sinistra (L1 partenza -> L2 -> L3), si attraversa il fondo (B1 -> B2) e si risale a destra (R3 -> R2 -> R1).
La ragazza è nella stanza accanto a L2, chiusa dalla porta E; lo stesso OPEN E (in R1) apre anche la porta del
corridoio T in alto, la scorciatoia sorvegliata che riporta di colpo a L1.
Tre sacche da cui tornare indietro: SB (OPEN B, oltre la lava), K (chiave e OPEN C, solo dal basso), SD (OPEN D).
CLOSE: A = ponte sulla vaschetta davanti a SB; B, C, D, E = trappole davanti alla porta che si sta per passare.
Fuochi fatui: il rosso compare scendendo da L3 a B1 (prima metà), il blu salendo dalla botola C in R2 (seconda metà).
Correzione rispetto alla scheda: con la colonna destra "dritta" (buchi e botole tutti sullo stesso lato) e l'OPEN E
in fondo a R1, la scorciatoia era il 61% del giro lungo, non meno della metà come chiede la scheda.
Così invece la colonna destra va a zig-zag (buco di R3 a est, botola C a ovest, botola D a est), l'OPEN E sta verso
la porta del corridoio e la ragazza vicino alla sua porta: scorciatoia 95 tile contro 207 del giro lungo (46%).
"""
from icarous_lib import *

L = Level(cols=110, rows=58, tile=9)

# --- cornice, pavimenti fra le fasce e pareti fra le colonne (muri spessi 1 tile) ---
# fascia 1 = righe 1..13 · fascia 2 = 15..27 · fascia 3 = 29..41 · fascia 4 (il fondo) = 43..56
L.frame()
L.hline(14, 0, 109); L.hline(28, 0, 109); L.hline(42, 0, 109)
L.vline(27, 1, 41); L.clear(27, 8, 1, 6)     # L1 <-> corridoio T: varco a terra alto 6 (gli X stanno più in alto)
L.vline(82, 1, 41); L.clear(82, 21, 1, 7)    # SD <-> R2: varco a terra alto 7
L.vline(55, 15, 27)                          # stanza della ragazza | roccia sigillata
L.vline(69, 15, 27)                          # roccia sigillata | sacca SD
L.clear(20, 14, 7, 1)                        # L1 -> L2: buco nel pavimento, subito dopo il varco del corridoio
L.clear(20, 42, 7, 1)                        # L3 -> B1: buco nel pavimento
L.clear(60, 42, 7, 1)                        # B2 -> K: buco nel soffitto di B2
L.clear(100, 42, 7, 1)                       # B2 -> R3: buco nel soffitto di B2, tutto a est

# --- le porte della catena (a destra a zig-zag: si attraversa ogni stanza) ---
L.door(6, 28, 7, 1, 'A')                     # botola A: L2 -> L3
L.door(41, 50, 1, 7, 'B'); L.vline(41, 43, 49)   # porta B a terra: B1 -> B2
L.door(84, 28, 7, 1, 'C')                    # botola C: R3 -> R2, a ovest
L.door(100, 14, 7, 1, 'D')                   # botola D: R2 -> R1, a est
L.door(82, 8, 1, 6, 'E')                     # porta E: R1 -> corridoio T ...
L.door(27, 21, 1, 7, 'E')                    # ... e la sua gemella: L2 -> stanza della ragazza

# ================= L1: partenza =================
L.put(3, 11, 3, 3, ICAROUS)

# ================= CORRIDOIO T: la scorciatoia (subito raggiungibile, ma finisce contro la porta E) =================
L.tub(31, 40, 12, 13)                        # tre vasche sul pavimento: si attraversa in volo basso,
L.tub(48, 58, 12, 13)                        # proprio sotto la corsia degli X
L.tub(67, 77, 12, 13)
L.put(36, 6, 2, 2, ENX)                      # X sopra le porte (a quota 8..13): restano nel corridoio
L.put(72, 5, 2, 2, ENX)
L.put(62, 3, 2, 2, ENV)                      # V sull'unica isola di mezzo fra le vasche

# ================= L2: OPEN A, botola A, porta E della ragazza =================
L.put(1, 26, 2, 2, OPEN, 'A')                # in fondo a sinistra, oltre la botola
L.put(12, 17, 2, 2, ENH)                     # quota sopra la porta E: non esce
L.put(3, 20, 2, 2, STAR)

# ================= STANZA DELLA RAGAZZA (accanto a L2, unico ingresso la porta E) =================
L.put(36, 25, 3, 3, WOMAN)

# ================= L3: si scende dalla botola A e si va al buco verso B1 =================
L.hline(35, 13, 17)                          # mensolina a metà: varietà di volo

# ================= B1: vaschetta col ponte A, sacca SB con l'OPEN B, porta B =================
L.vline(12, 43, 48)                          # parete della sacca SB, varco a terra alto 8
L.tub(14, 18, 55, 56)                        # vaschetta davanti alla sacca
L.door(14, 54, 5, 1, 'A')                    # ponte A a filo delle sponde: c'era, ma OPEN A l'ha fatto sparire...
L.put(25, 55, 2, 2, CLOSE, 'A')              # ... e il CLOSE A lo rimette (richiude anche la botola A, che non serve più)
L.put(2, 55, 2, 2, OPEN, 'B')
L.put(6, 47, 2, 2, STAR)
L.put(30, 55, 2, 2, ENS)                     # Guardiano fermo sulla strada della porta B
L.put(36, 55, 2, 2, CLOSE, 'B')              # trappola: davanti alla porta B (l'OPEN B è di là dalla lava); 3 tile di
                                             # margine dalla porta, così chi è attento la scavalca e poi si abbassa
L.put(33, 46, 2, 2, WISP)                    # fuoco fatuo ROSSO: compare mentre si scende da L3

# ================= B2: il fondo del ferro di cavallo, checkpoint =================
L.put(45, 55, 2, 2, FLAG)
L.put(49, 54, 3, 3, BULB)
L.tub(72, 80, 55, 56)                        # vasca fra il buco di K e quello di R3

# ================= K: chiave e OPEN C (solo dal basso, da B2) =================
L.hline(35, 29, 36)                          # mensola della chiave
L.put(31, 33, 2, 2, KEY)
L.put(50, 33, 2, 2, ENH)                     # a quota piena: passa davanti alla chiave
L.put(78, 40, 2, 2, OPEN, 'C')               # dalla parte opposta: si gira tutta la stanza

# ================= R3: si sale dal buco a est, la botola C è a ovest =================
L.put(94, 31, 2, 2, ENV)                     # fra le colonne del buco e della botola
L.put(86, 40, 2, 2, CLOSE, 'C')              # trappola: proprio sotto la botola C (l'OPEN C è in K)

# ================= R2: si arriva a ovest, sacca SD a ovest, botola D a est =================
L.put(91, 18, 2, 2, WISP2)                   # fuoco fatuo BLU: compare uscendo dalla botola C
L.put(96, 17, 2, 2, ENV)                     # sulla strada verso la botola D, lontano dalle colonne delle botole
L.put(102, 26, 2, 2, CLOSE, 'D')             # trappola: proprio sotto la botola D (l'OPEN D è nella sacca)
L.put(71, 26, 2, 2, OPEN, 'D')               # in fondo alla sacca SD
L.put(76, 19, 2, 2, STAR)

# ================= R1: si arriva a est, OPEN E, timer, poi la porta del corridoio =================
L.put(102, 3, 3, 3, BULB)                    # sospesa sopra la botola D: si prende salendo
L.put(95, 12, 2, 2, OPEN, 'E')
L.put(90, 11, 3, 3, TIMER)                   # da prendere subito prima del corridoio: congela X e V
L.put(86, 12, 2, 2, CLOSE, 'E')              # trappola: davanti alla porta E (richiude anche quella della ragazza); staccata
                                             # dalla porta, alta solo 6: attaccata si passava solo in una fascia di 2 righe

L.check()
L.save('vitto-08-il-ritorno.js',
       name="The Return",
       intro="Ariadne is one step away, beyond the wall. To reach her you must go all the way around.",
       background=9,
       comment='VITTO LEVELS 08 "Il Ritorno" - generato da tools/livelli/vitto08_il_ritorno.py\n'
               'Ferro di cavallo con catena A -> B -> C -> D -> E e tre sacche (SB, K, SD) da cui tornare indietro.\n'
               'Soluzione: L1 -> L2: OPEN A -> botola A -> L3 -> B1 (fuoco fatuo rosso) -> sacca SB oltre la lava (ponte A col CLOSE A): '
               'OPEN B -> porta B -> B2 (checkpoint) -> su in K: chiave e OPEN C -> B2 -> R3 -> botola C -> R2 (fuoco fatuo blu) -> '
               'sacca SD: OPEN D -> botola D -> R1: OPEN E + timer -> corridoio T -> L1 -> L2 -> porta E -> ragazza.',
       note='Difficoltà 8: catena A-E con tre sacche, si torna dalla scorciatoia in alto. CLOSE B, C, D, E trappole davanti alle porte, CLOSE A ponte. Due fuochi fatui.')
