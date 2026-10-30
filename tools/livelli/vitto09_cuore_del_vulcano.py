"""VITTO LEVELS 09 — "Il Cuore del Vulcano" (difficoltà 9, quattro zone in senso orario, porte A -> B -> C -> D).

Uso (Mac):  python3 tools/livelli/vitto09_cuore_del_vulcano.py
Quattro quadranti separati dal muro x = 60 e dal pavimento y = 35:
  Z1 Atrio (in alto a sinistra, partenza) -> porta A -> Z2 Fumarole (in alto a destra, 3 pozzi coi V) ->
  botola B in fondo al pozzo centrale -> Z3 Ponte di Magma (in basso a destra: stanza est, canale col ponte C, isola) ->
  porta D -> Z4 Lago di Lava (in basso a sinistra, la ragazza sotto la partenza). Z1 e Z4 non comunicano.
Due ponti CLOSE in serie: ponte C (canale di Z3) e ponte D (lago di Z4), ognuno dello stesso gruppo della sua porta.
Correzione rispetto alla scheda: in Z4 c'è un secondo OPEN D, oltre la ragazza. Chi passa la porta D senza la chiave e
calpesta il CLOSE D resterebbe chiuso nel lago per sempre (il validatore lo segnala come TRAPPOLA SENZA USCITA):
con l'OPEN D di riserva riapre la porta e torna all'isola. Chi ha la chiave tocca prima la ragazza e non lo vede mai.
Fuochi fatui: il rosso compare nel corridoio di Z2 (andata), il blu sopra il lago (finale).
"""
from icarous_lib import *

L = Level(cols=120, rows=70, tile=9)

# --- cornice, i due assi dei quadranti e i pavimenti (muri spessi 1 tile) ---
L.frame()
L.vline(60, 0, 69)                           # Z1|Z2 sopra, Z4|Z3 sotto
L.hline(35, 0, 119)                          # Z1 / Z4 e Z2 / Z3
L.hline(13, 0, 119)                          # Z1: fascia alta / bassa · Z2: corridoio / pozzi
L.hline(66, 0, 119)                          # pavimento di Z3 e Z4 (sotto: vasche e intercapedine)

# --- porte ---
L.door(60, 7, 1, 6, 'A')                     # porta A: Z1 fascia alta -> corridoio di Z2
L.door(102, 35, 6, 1, 'B')                   # botola B: fondo del pozzo centrale -> stanza est di Z3
L.door(100, 60, 1, 6, 'C')                   # porta C: stanza est -> canale
L.door(60, 60, 1, 6, 'D')                    # porta D: isola -> riva del lago

# ================= Z1 ATRIO (respiro): l'OPEN A è sotto, si torna su per il varco =================
L.clear(40, 13, 6, 1)                        # varco fascia alta -> fascia bassa
# --- fascia alta (righe 1..12): partenza, vaschetta, porta A con la trappola davanti ---
L.put(3, 10, 3, 3, ICAROUS)
L.tub(14, 19, 11, 12)
L.put(30, 11, 2, 2, STAR)
L.put(56, 11, 2, 2, CLOSE, 'A')              # davanti alla porta A: chi ci cammina sopra torna giù all'OPEN
# --- fascia bassa (righe 14..34): due vasche fra il varco e l'OPEN A in fondo a ovest ---
L.tub(10, 17, 33, 34)
L.tub(22, 29, 33, 34)
L.put(3, 33, 2, 2, OPEN, 'A')
L.put(34, 32, 3, 3, BULB)
L.put(30, 18, 2, 2, ENH)                     # alla sua quota il muro x = 60 è pieno

# ================= Z2 FUMAROLE: corridoio (righe 1..12) e tre pozzi fino al pavimento y = 35 =================
# pozzo 1 (x 78..84): solo fumarola, il V sale nel corridoio
L.clear(78, 13, 7, 1); L.vline(77, 14, 34); L.vline(85, 14, 34)
L.put(80, 20, 2, 2, ENV)
# pozzo 2 (x 102..110, largo 9): botola B a sinistra, a destra pavimento pieno col CLOSE B e la corsia del V
L.clear(102, 13, 9, 1); L.vline(101, 14, 34); L.vline(111, 14, 34)
L.put(108, 33, 2, 2, CLOSE, 'B')             # accanto alla botola: chi scende storto la richiude
L.put(109, 18, 2, 2, ENV)                    # colonne 109..110: sotto c'è muro, non la botola
# pozzo 3 (x 112..118): la sacca dell'OPEN B, col suo V di guardia
L.clear(112, 13, 7, 1)
L.put(112, 33, 2, 2, OPEN, 'B')
L.put(117, 33, 2, 2, STAR)
L.put(114, 24, 2, 2, ENV)
# corridoio: S fra i pozzi, fuoco fatuo rosso in alto (si sveglia superato il pozzo 1)
L.put(93, 11, 2, 2, ENS)
L.put(95, 4, 2, 2, WISP)

# ================= Z3 PONTE DI MAGMA =================
# stanza est (x 101..118, righe 36..65): si cade dalla botola B
L.vline(100, 36, 59)
L.hline(52, 112, 118)                        # mensola della lampadina
L.put(114, 49, 3, 3, BULB)
L.put(112, 64, 2, 2, FLAG)
L.put(116, 64, 2, 2, OPEN, 'C')
L.put(105, 63, 3, 3, TIMER)                  # per il V del canale
# canale (x 74..99, righe 60..65, soffitto a 6 tile): ponte C sulla lava, CLOSE C appena dentro
L.hline(59, 73, 100)
L.tub(76, 92, 67, 68)
L.door(76, 66, 17, 1, 'C')
L.put(96, 64, 2, 2, CLOSE, 'C')              # richiude ponte e porta C alle spalle
L.put(84, 61, 2, 2, ENV)                     # a metà ponte: col ponte aperto scende nella lava (voluto, come nel 04)
# isola (x 61..72, righe 46..65): chiave, OPEN D, lampadina sulla mensola, S di guardia
L.hline(45, 61, 73); L.vline(73, 45, 59)
L.hline(53, 66, 72)
L.put(68, 50, 3, 3, BULB)
L.put(70, 64, 2, 2, ENS)
L.put(66, 64, 2, 2, KEY)
L.put(62, 64, 2, 2, OPEN, 'D')

# ================= Z4 LAGO DI LAVA: tunnel basso sopra il lago (righe 60..65) con una cupola al centro =================
# Correzione rispetto alla scheda: "6 tile sopra il ponte" e "X sopra la quota della porta D" non stanno insieme in una
# sala unica. Il tunnel ha il soffitto a 6 tile come il canale C (senza ponte la testata vuol dire lava);
# gli X girano nella cupola (x 20..40, righe 51..58), chiusi dalle sue pareti, e la porta D resta più in basso.
L.hline(59, 0, 19); L.hline(59, 41, 60)      # soffitto del tunnel; sopra roccia sigillata
L.hline(50, 19, 41); L.vline(19, 50, 59); L.vline(41, 50, 59)   # la cupola
L.tub(6, 48, 67, 68)                         # il lago: un'unica vasca da sponda a sponda
L.door(13, 66, 36, 1, 'D')                   # ponte D; x 6..12 resta muro: la piattaforma della ragazza
# riva est (x 50..59): CLOSE D appena passata la porta, timer per gli X
L.put(57, 64, 2, 2, CLOSE, 'D')
L.put(51, 63, 3, 3, TIMER)
# cupola: 2 X su due quote, la stella fra le loro corsie, il fuoco fatuo blu in basso (scende nel tunnel)
L.put(22, 51, 2, 2, ENX)
L.put(36, 55, 2, 2, ENX)
L.put(30, 53, 2, 2, STAR)
L.put(26, 57, 2, 2, WISP2)
# piattaforma: S appeso sopra la ragazza (si passa sotto a piedi, non saltando);
# oltre, sulla sponda ovest, l'OPEN D di riserva (per chi ha scordato la chiave)
L.put(11, 60, 2, 2, ENS)
L.put(6, 63, 3, 3, WOMAN)
L.put(2, 64, 2, 2, OPEN, 'D')

L.check()
L.save('vitto-09-cuore-del-vulcano.js',
       name="The Heart of the Volcano",
       intro="The heart of the volcano. Ariadne is on the lava lake: the wax won't hold for long.",
       background=10,
       comment='VITTO LEVELS 09 "Il Cuore del Vulcano" - generato da tools/livelli/vitto09_cuore_del_vulcano.py\n'
               'Quattro zone in senso orario: Atrio -> Fumarole (3 pozzi coi V) -> Ponte di Magma (ponte C) -> '
               'Lago di Lava (ponte D). La ragazza è sotto la partenza, ma Z1 e Z4 non comunicano.\n'
               'Soluzione: giù nella fascia bassa: OPEN A -> risali -> porta A -> pozzo 3: OPEN B -> risali -> '
               'botola B nel pozzo 2 -> stanza est (checkpoint) -> OPEN C -> porta C -> CLOSE C -> ponte C -> isola: '
               'chiave, OPEN D -> porta D -> CLOSE D -> timer -> ponte D -> ragazza.',
       note='Difficoltà 9: quattro zone, due ponti CLOSE in serie, pozzi coi V, lago di lava con 2 X e il fuoco fatuo blu.')
