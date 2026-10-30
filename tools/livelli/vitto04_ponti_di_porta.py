"""VITTO LEVELS 04 — "Ponti di Porta" (difficoltà 5, CLOSE-ponte, porte A -> B -> C).

Uso (Mac):  python3 tools/livelli/vitto04_ponti_di_porta.py
Tre fasce orizzontali a serpentina (1 in alto, 3 in fondo), collegate da varchi nei pavimenti.
In ogni fascia c'è un canale di lava col soffitto basso: il suo pavimento è un PONTE, cioè una porta orizzontale
dello stesso gruppo della porta d'ingresso. Aprendo la porta per entrare si apre (sparisce) anche il ponte:
appena dentro bisogna premere il CLOSE per rimetterlo e passare a piedi.
  Fascia 1 (sinistra -> destra): CLOSE A subito dopo la porta, impossibile non toccarlo (insegnamento).
  Fascia 2 (destra -> sinistra): CLOSE B in una nicchia in alto, bisogna volarci apposta. In fondo la chiave.
  Fascia 3 (sinistra -> destra): la porta C è sia ingresso sia uscita; il CLOSE C richiude ponte e uscita,
                                 in fondo al ponte un secondo OPEN C riapre l'uscita.
Ogni vasca pende nella fascia di sotto, chiusa in un vano sigillato sopra il canale successivo.
"""
from icarous_lib import *

L = Level(cols=75, rows=40, tile=9)

# --- cornice e pavimenti delle fasce (muri spessi 1 tile) ---
# fascia 1 = righe 1..11 · fascia 2 = 13..23 · fascia 3 = 25..35 · righe 37..38 = intercapedine sotto la fascia 3
L.frame()
L.hline(12, 0, 74)
L.hline(24, 0, 74)
L.hline(36, 0, 74)

# --- varchi aperti fra le fasce (6 tile) ---
L.clear(60, 12, 6, 1)   # 1b -> 2a (si cade sul cagnolino)
L.clear(3, 24, 6, 1)    # 2b -> 3a

# ================= FASCIA 1: canale A, l'insegnamento =================
# porta A (x=20) e soffitto del canale a 6 tile sopra il ponte; il vano sopra il soffitto è sigillato
L.vline(20, 0, 5); L.door(20, 6, 1, 6, 'A')
L.hline(5, 20, 46); L.vline(46, 1, 5)
# ponte A: lava 27..36 nel pavimento, la porta orizzontale è sulla riga delle sponde (pavimento continuo)
L.tub(27, 36, 13, 14)
L.door(27, 12, 10, 1, 'A')
# --- 1a (partenza): OPEN A sulla mensola ---
L.hline(6, 9, 14)
L.put(2, 9, 3, 3, THES)
L.put(11, 4, 2, 2, OPEN, 'A')
L.put(16, 10, 2, 2, STAR)
# --- canale A: CLOSE A a terra appena oltre la porta (staccato di 2 tile: la porta non si chiude addosso) ---
L.put(23, 10, 2, 2, CLOSE, 'A')
# --- 1b: H in alto (alla sua quota a sinistra c'è il muro del vano sigillato), lampadina oltre il varco ---
L.put(56, 2, 2, 2, ENH)
L.put(69, 9, 3, 3, BULB)

# ================= FASCIA 2: canale B, il CLOSE in alto =================
L.vline(52, 12, 17); L.door(52, 18, 1, 6, 'B')
L.hline(17, 21, 52); L.vline(21, 12, 17)
# nicchia del CLOSE B: pozzetto largo 7 nel soffitto, sopra il pavimento pieno subito dopo la porta
L.vline(44, 13, 17)
L.clear(45, 17, 7, 1)
# ponte B: lava 26..41
L.tub(26, 41, 25, 26)
L.door(26, 24, 16, 1, 'B')
# --- 2a (checkpoint): si cade dal varco sul cagnolino ---
L.put(62, 22, 2, 2, FLAG)
L.put(70, 22, 2, 2, OPEN, 'B')
L.put(69, 14, 3, 3, BULB)
L.put(56, 21, 3, 3, TIMER)      # prima della porta B: serve per il V del ponte
# --- canale B ---
L.put(49, 13, 2, 2, CLOSE, 'B')  # in cima alla nicchia: bisogna salirci apposta prima della lava
L.put(33, 19, 2, 2, ENV)         # a metà ponte: su e giù fra soffitto e ponte (a ponte aperto scende nella lava)
# --- 2b: chiave ---
L.put(14, 22, 2, 2, KEY)
L.put(10, 15, 2, 2, STAR)

# ================= FASCIA 3: canale C, il trucco cattivo =================
L.vline(19, 24, 29); L.door(19, 30, 1, 6, 'C')    # ingresso
L.hline(29, 19, 50)
L.vline(50, 24, 29); L.door(50, 30, 1, 6, 'C')    # uscita, stesso gruppo
# ponte C: lava 25..44, la più lunga (sotto c'è l'intercapedine, la vasca poggia sulla cornice)
L.tub(25, 44, 37, 38)
L.door(25, 36, 20, 1, 'C')
# --- 3a: X nella metà alta (alla sua quota a destra c'è muro pieno), OPEN C a terra ---
L.put(10, 26, 2, 2, ENX)
L.put(14, 34, 2, 2, OPEN, 'C')
# --- canale C ---
L.put(23, 34, 2, 2, CLOSE, 'C')     # appena dentro: rimette il ponte ma richiude anche l'uscita
L.put(47, 34, 2, 2, OPEN, 'C')      # in fondo al ponte: riapre l'uscita (il ponte alle spalle crolla)
# --- 3b: ragazza col suo guardiano ---
L.put(69, 33, 3, 3, WOMAN)
L.put(64, 30, 2, 2, ENS)

# --- fuoco fatuo: si materializza in 2a mentre Theseus scende dal varco verso il checkpoint,
#     poi lo insegue nel canale B finché la porta B è aperta ---
L.put(56, 15, 2, 2, WISP)

L.check()
L.save('vitto-04-ponti-di-porta.js',
       name='Ponti di Porta',
       intro='Fiumi di lava tagliano le gallerie. Ogni porta che apri fa crollare un ponte.',
       background=5,
       comment='VITTO LEVELS 04 "Ponti di Porta" - generato da tools/livelli/vitto04_ponti_di_porta.py\n'
               'Tre fasce a serpentina, ognuna con un canale di lava il cui pavimento è un ponte-porta dello stesso gruppo '
               'della porta d\'ingresso: aprendo la porta il ponte sparisce, il CLOSE lo rimette.\n'
               'Soluzione: OPEN A -> porta A -> CLOSE A -> ponte A -> 1b -> 2a (checkpoint) -> OPEN B -> porta B -> '
               'CLOSE B (nicchia in alto) -> ponte B -> 2b chiave -> 3a: OPEN C -> porta C -> CLOSE C -> ponte C -> '
               'OPEN C in fondo -> porta C d\'uscita -> ragazza.',
       note='Difficoltà 5: CLOSE-ponte, tre canali di lava col soffitto basso, il terzo con la porta C doppia.')
