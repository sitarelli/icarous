"""VITTO LEVELS 05 — "La Galleria dei Guardiani" (difficoltà 6, due timer, porte A -> B).

Uso (Mac):  python3 tools/livelli/vitto05_galleria_dei_guardiani.py
Versione "estesa" della scheda: 136 × 44 invece di 100 × 40, galleria lunga 90 tile.
Tre fasce:
  alta   = stanze della ragazza (N1 sopra l'atrio, N2 accanto); il resto è roccia sigillata
  media  = atrio (partenza) – GALLERIA – sala est (checkpoint). La galleria è l'unica strada fra i due capi.
  bassa  = sotto la sala est: K1 (ponte A sulla lava, fuoco fatuo) e K2 (chiave, OPEN B); il resto è sigillato
La galleria si attraversa due volte: all'andata senza aiuti (è la parte difficile), al ritorno c'è l'unico timer,
appeso sopra la botola A: risalendo dalla chiave lo si prende per forza e si torna veloci dalla ragazza.
"""
from icarous_lib import *

L = Level(cols=136, rows=44, tile=9)

# --- cornice e pavimenti delle fasce (muri spessi 1 tile) ---
# fascia alta = righe 1..13 · fascia media = 15..29 (alta 15) · fascia bassa = 31..39 (+ vasche sotto la riga 40)
L.frame()
L.hline(14, 0, 135)
L.hline(30, 0, 135)

# --- confini della fascia media: varchi da 7 a terra fra atrio, galleria e sala est ---
L.vline(22, 15, 29); L.clear(22, 23, 1, 7)
L.vline(113, 15, 29); L.clear(113, 23, 1, 7)

# ================= FASCIA ALTA: N1 e N2, la ragazza =================
L.door(8, 14, 7, 1, 'B')                 # botola B nel soffitto dell'atrio
L.vline(31, 1, 13); L.clear(31, 7, 1, 7)  # N1 -> N2, varco a terra
L.vline(57, 1, 13)                        # oltre: roccia sigillata fino alla sala est
# --- N1: lampadina (solo luce, a fine livello) ---
L.put(20, 3, 3, 3, BULB)
# --- N2: X in alto (alla sua quota a sinistra c'è muro pieno), ragazza in fondo a terra ---
L.put(44, 2, 2, 2, ENX)
L.put(52, 11, 3, 3, WOMAN)

# ================= FASCIA MEDIA: atrio =================
L.put(3, 27, 3, 3, THES)

# ================= FASCIA MEDIA: la GALLERIA (x 23..112) =================
# rialzi a terra: U rovesciata 4×3 (righe 27..29), sopra restano 12 tile liberi
def rialzo(x): L.hline(27, x, x + 3); L.vline(x, 27, 29); L.vline(x + 3, 27, 29)
# pilastri appesi: U 3×8 (righe 15..22), sotto restano 7 tile liberi
def pilastro(x): L.vline(x, 15, 22); L.vline(x + 2, 15, 22); L.hline(22, x, x + 2)

for x in (27, 41, 60, 74, 100): rialzo(x)
for x in (50, 66, 82, 96): pilastro(x)
# buca di lava nel pavimento sotto il primo pilastro (la vasca pende nella roccia sigillata di sotto)
L.clear(48, 30, 8, 1)
L.tub(48, 55, 31, 32)
L.put(51, 24, 2, 2, STAR)                # la stella rischiosa: fra il pilastro e la lava

# --- Guardiani della galleria (10) ---
L.put(35, 28, 2, 2, ENH)                 # H fra rialzo 1 e 2 (il rialzo 1 lo tiene lontano dal varco ovest)
L.put(64, 28, 2, 2, ENH)                 # H fra rialzo 3 e 4
L.put(88, 28, 2, 2, ENH)                 # H fra rialzo 4 e 5
L.put(58, 19, 2, 2, ENX)                 # X a mezza altezza fra pilastro 1 e 2
L.put(90, 19, 2, 2, ENX)                 # X fra pilastro 3 e 4
L.put(45, 16, 2, 2, ENV)                 # V subito prima della buca di lava
L.put(71, 17, 2, 2, ENV)                 # V fra rialzo 3 e 4, incrocia la corsia dell'H
L.put(107, 17, 2, 2, ENV)                # V davanti al varco est
L.put(75, 25, 2, 2, ENS)                 # S seduto sul rialzo 4
L.put(83, 23, 2, 2, ENS)                 # S appeso sotto il pilastro 3

# ================= FASCIA MEDIA: sala est (checkpoint) =================
L.put(124, 21, 3, 3, TIMER)              # timer del ritorno: sopra la botola A, all'andata ci si passa sotto a piedi
L.put(118, 28, 2, 2, FLAG)
L.door(122, 30, 7, 1, 'A')               # botola A nel pavimento
L.put(131, 28, 2, 2, OPEN, 'A')
L.put(127, 17, 2, 2, STAR)

# ================= FASCIA BASSA: K1 e K2 =================
L.hline(40, 65, 135)                     # pavimento della fascia bassa (sotto: vasche e roccia)
L.vline(65, 31, 39)                      # a ovest roccia sigillata
L.vline(95, 31, 39); L.clear(95, 33, 1, 7)  # K1 -> K2, varco a terra
# --- K1: si cade dalla botola A; il ponte A sulla lava sparisce quando A è aperto ---
L.clear(100, 40, 16, 1)
L.tub(100, 115, 41, 42)
L.door(100, 40, 16, 1, 'A')
L.put(131, 38, 2, 2, CLOSE, 'A')         # in fondo a destra, oltre la botola: tornando dal ponte non lo si tocca per sbaglio
L.put(107, 32, 2, 2, ENV)                # sopra il ponte (a ponte aperto scende nella lava)
# --- K2: chiave e OPEN B, con un CLOSE B trappola sulla strada del ritorno ---
L.put(68, 38, 2, 2, OPEN, 'B')           # in fondo a ovest
L.put(77, 38, 2, 2, KEY)
L.put(77, 33, 2, 2, ENS)                 # guardiano fermo sopra la chiave
L.put(83, 38, 2, 2, CLOSE, 'B')          # tornando verso est va scavalcato in volo
L.put(87, 32, 3, 3, BULB)
L.put(92, 32, 2, 2, OPEN, 'A')           # riapre la botola A (e il ponte) per risalire

# --- fuoco fatuo: si materializza a metà ponte (abbastanza lontano dal cagnolino da non svegliarsi prima),
#     poi lo insegue su per la botola e in galleria: il timer del ritorno lo congela insieme agli altri ---
L.put(100, 34, 2, 2, WISP)

L.check()
L.save('vitto-05-galleria-dei-guardiani.js',
       name='La Galleria dei Guardiani',
       intro='I Guardiani del Minotauro sorvegliano la galleria. Fermali, anche solo per un attimo.',
       background=6,
       comment='VITTO LEVELS 05 "La Galleria dei Guardiani" - generato da tools/livelli/vitto05_galleria_dei_guardiani.py\n'
               'Galleria di 90 tile piena di Guardiani da attraversare due volte: andata senza aiuti, al ritorno il timer sopra la botola A.\n'
               'Soluzione: atrio -> galleria -> sala est (checkpoint) -> OPEN A -> '
               'botola A -> K1 (CLOSE A in fondo a destra rimette il ponte) -> K2: chiave, OPEN B (scavalca il CLOSE B), OPEN A -> '
               'risali dalla botola prendendo il timer -> galleria al ritorno -> atrio -> botola B -> N1 -> N2 ragazza.',
       note='Difficoltà 6: galleria lunga, andata a caldo e timer per il ritorno, ponte A sulla lava, CLOSE B trappola nella stanza della chiave.')
