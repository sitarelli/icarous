"""VITTO LEVELS 03 — "Il Filo Bugiardo" (difficoltà 5, anello orario A -> B -> C).

Uso (Mac):  python3 tools/livelli/vitto03_filo_bugiardo.py
Griglia 3×3 di stanze (R = riga, C = colonna: R21 = in basso al centro, la partenza).
La chiave è nella stanza centrale R11, proprio sopra la partenza, ma R11 ha un solo ingresso (porta B, a destra):
per arrivarci si fa tutto l'anello in senso orario R21 -> R20 -> R10 -> R00 -> R01 -> R02 -> R12 -> R11.
La ragazza è in un'alcova chiusa dalla porta C dentro R01: la si vede passando, ci si entra solo alla fine.
Tre vasche di lava sul percorso (R20, R01, R11) e il fuoco fatuo, che compare in R02 al checkpoint.
"""
from icarous_lib import *

L = Level(cols=72, rows=43, tile=9)

# --- cornice e griglia 3x3 (muri spessi 1 tile) ---
# righe: R0 = 1..14 · R1 = 16..29 · R2 = 31..41 (R2 più bassa: così la chiave resta vicina alla partenza)
L.frame()
L.vline(24, 0, 42); L.vline(48, 0, 42)
L.hline(15, 0, 71); L.hline(30, 0, 71)

# --- varchi aperti (6 tile) ---
L.clear(24, 36, 1, 6)   # R21 -> R20 (a terra)
L.clear(48, 32, 1, 6)   # R21 -> R22 (in alto: così l'H di R22 non scappa a terra verso la partenza)
L.clear(4, 30, 6, 1)    # R20 -> R10 (in su)
L.clear(15, 15, 6, 1)   # R10 -> R00 (in su, su colonne diverse dal varco di sotto)
L.clear(24, 9, 1, 6)    # R00 -> R01 (a terra)
L.clear(58, 15, 6, 1)   # R02 -> R12 (si scende)

# --- porte ---
L.door(48, 9, 1, 6, 'A')    # R01 -> R02 (a terra)
L.door(65, 30, 6, 1, 'A')   # R22 -> R12: botola nel soffitto di R22 (stesso gruppo: si apre insieme, scorciatoia di ritorno)
L.door(48, 24, 1, 6, 'B')   # R12 -> R11: unico ingresso della stanza della chiave
L.door(37, 1, 1, 5, 'C')    # alcova della ragazza in R01

# --- vasche di lava (sul pavimento pieno, mai sotto un varco) ---
L.tub(11, 20, 40, 41)    # R20: fra l'ingresso da R21 e il varco in su, sotto la stella
L.tub(26, 33, 13, 14)    # R01: appena entrati da R00, sotto la pattuglia dell'X
L.tub(39, 45, 28, 29)    # R11: fra la porta B e la chiave, si sorvola all'andata e al ritorno

# --- mensole ---
L.hline(6, 34, 47)    # R01: balcone dell'alcova (3 tile fuori dalla porta C per atterrare), sotto restano 8 tile
L.hline(23, 14, 21)   # R10: appoggio a metà salita, sotto il varco verso R00 (non sopra il varco da R20)
L.hline(23, 55, 57)   # R12: mensola dell'OPEN B, corta: non copre il CLOSE B (scendendo a sinistra si atterra accanto)

# --- R21 (partenza): la chiave è 10 tile più su, dietro il soffitto ---
L.put(34, 39, 3, 3, ICAROUS)
# --- R22 (vicolo cieco finché A è chiusa): stella-esca a terra, H di guardia ---
L.put(66, 40, 2, 2, STAR)
L.put(56, 38, 2, 2, ENH)         # righe 38-39: il muro a sinistra è pieno, il varco verso R21 è più in alto
# --- R20 ---
L.put(15, 34, 2, 2, STAR)
# --- R10 ---
L.put(10, 20, 2, 2, ENV)         # colonne 10-11: fra i due varchi (4-9 sotto, 15-20 sopra), non ci finisce dentro
# --- R00 (OPEN A in fondo a sinistra) ---
L.put(3, 13, 2, 2, OPEN, 'A')
L.put(10, 5, 2, 2, STAR)
# --- R01: si vede la ragazza dietro la porta C ---
L.put(43, 3, 3, 3, WOMAN)
L.put(27, 7, 2, 2, ENX)          # righe 7-8: sopra la quota della porta A e del varco da R00, sotto il balcone
# --- R02 (checkpoint subito dopo la porta A) ---
L.put(51, 13, 2, 2, FLAG)
L.put(54, 12, 3, 3, BULB)
# --- R12 (OPEN B) ---
L.put(55, 21, 2, 2, OPEN, 'B')
L.put(55, 17, 2, 2, ENS)         # sopra l'OPEN B: per prenderlo si arriva di lato, dal varco
# --- R11 (stanza della chiave, sigillata salvo la porta B) ---
L.put(35, 28, 2, 2, KEY)         # sopra la partenza
L.put(28, 28, 2, 2, OPEN, 'C')

# --- CLOSE: uno per gruppo ---
L.put(44, 13, 2, 2, CLOSE, 'A')   # R01, davanti alla porta A: calpestato la richiude (si torna fino a R00!)
L.put(55, 28, 2, 2, CLOSE, 'B')   # R12, a terra sotto la mensola dell'OPEN: chi si lascia cadere dritto richiude la porta B
L.put(66, 13, 2, 2, CLOSE, 'C')   # R02, oltre il buco verso R12: al ritorno, se atterri lì richiudi l'alcova

# --- fuoco fatuo: si materializza in R02 quando Icarous arriva al checkpoint (entro 14 tile),
#     poi ti insegue rimbalzando sui muri lungo la seconda metà dell'anello ---
L.put(62, 4, 2, 2, WISP)

L.check()
L.save('vitto-03-filo-bugiardo.js',
       name="The Lying Thread",
       intro="The thread says the key is right there, behind the wall. It doesn't say how to get through.",
       background=3,
       comment='VITTO LEVELS 03 "Il Filo Bugiardo" - generato da tools/livelli/vitto03_filo_bugiardo.py\n'
               'La chiave è sopra la partenza ma si raggiunge solo facendo tutto l\'anello in senso orario.\n'
               'Soluzione: R20 -> R10 -> R00: OPEN A -> R01 (ragazza dietro la porta C) -> porta A -> R02 (checkpoint) -> '
               'R12: OPEN B -> porta B -> R11: chiave + OPEN C -> ritorno R12 -> R02 -> R01 -> porta C -> ragazza.\n'
               'Tre vasche di lava (R20, R01, R11) e un fuoco fatuo che compare in R02 e poi vaga rimbalzando sui muri.\n'
               'CLOSE A, B e C sono trappole da scavalcare: richiudono la porta che si sta per attraversare.',
       note='Difficoltà 5: il radar inganna, anello orario A → B → C, 3 vasche di lava e il fuoco fatuo.')
