"""VITTO LEVELS 07 — "Porte Gemelle" (difficoltà 7, gruppi condivisi, porte A e B in qualsiasi ordine).

Uso (Mac):  python3 tools/livelli/vitto07_porte_gemelle.py
Fascia alta = ala ovest – SALA (partenza) – ala est; fascia bassa = stanza della chiave (sotto ovest e sala) –
roccia sigillata – stanza della ragazza (sotto est).
Ogni OPEN apre la porta che serve e una "gemella": l'OPEN A (in fondo all'est) apre la botola della chiave
e la gabbia dei due X nell'ala ovest; l'OPEN B (in fondo all'ovest) apre la botola della ragazza e la gabbietta del V.
Correzione rispetto alla scheda: la botola A sta nel pavimento della SALA, non dell'ala ovest. Con OPEN B e botola A
nella stessa ala, l'ordine "sbagliato" (prima est) sarebbe il più corto: si farebbe tutto l'ovest in un viaggio solo.
Così invece l'ala ovest serve solo per l'OPEN B: chi ci va per primo la trova calma, chi apre prima A la trova infestata.
Fuochi fatui: il rosso compare nell'ala est (andata all'OPEN A), il blu nella stanza della chiave.
"""
from icarous_lib import *

L = Level(cols=96, rows=46, tile=9)

# --- cornice, pavimento fra le fasce (riga 23) e divisori (muri spessi 1 tile) ---
# fascia alta = righe 1..22 · fascia bassa = righe 24..44
L.frame()
L.hline(23, 0, 95)
L.vline(32, 1, 22); L.clear(32, 16, 1, 7)    # ala ovest <-> sala, varco a terra alto 7
L.vline(64, 1, 22); L.clear(64, 16, 1, 7)    # sala <-> ala est, varco a terra alto 7
L.vline(45, 24, 44)                          # stanza della chiave | roccia sigillata
L.vline(64, 24, 44)                          # roccia sigillata | stanza della ragazza

# ================= ALA OVEST: OPEN B in fondo, la gabbia dei Guardiani =================
# gabbia A appoggiata al pavimento: porta sul lato ovest, lato est muro pieno (gli X non arrivano al varco della sala)
L.hline(14, 12, 23)                          # tetto della gabbia
L.vline(12, 14, 22); L.door(12, 16, 1, 7, 'A')
L.vline(23, 14, 22)
L.put(15, 17, 2, 2, ENX)                     # i due X pattugliano alla quota della porta: aperta, invadono il fondo dell'ala
L.put(19, 20, 2, 2, ENX)
L.put(1, 21, 2, 2, OPEN, 'B')                # in fondo, a terra, proprio nella corsia degli X
L.put(17, 12, 2, 2, CLOSE, 'A')              # sul tetto della gabbia, ben visibile: richiude la gabbia... e la botola A
L.put(27, 6, 2, 2, STAR)                     # in alto sopra il corridoio prima della gabbia

# ================= SALA: partenza, checkpoint, timer, botola A =================
L.put(57, 20, 3, 3, THES)
L.door(36, 23, 7, 1, 'A')                    # botola A nel pavimento: giù verso la chiave
L.hline(12, 46, 54)                          # mensola centrale
L.put(49, 9, 3, 3, TIMER)                    # sulla mensola: da tenere per chi deve passare l'ala ovest infestata
L.put(49, 21, 2, 2, FLAG)                    # sotto la mensola: tutti i viaggi passano di qui

# ================= ALA EST: gabbietta del V, OPEN A sulla mensola, botola B =================
L.hline(9, 65, 73); L.vline(73, 1, 9)        # gabbietta appesa al soffitto, davanti al varco della sala
L.door(66, 9, 7, 1, 'B')                     # il suo fondo è una porta B: aperta, il V scende fino a terra
L.put(68, 3, 2, 2, ENV)
L.door(77, 23, 7, 1, 'B')                    # botola B nel pavimento: giù verso la ragazza
L.put(77, 15, 2, 2, STAR)                    # sopra la botola
L.hline(12, 84, 94)                          # mensola dell'OPEN A
L.put(85, 10, 2, 2, ENS)                     # Guardiano fermo sulla mensola, vicino all'OPEN A
L.put(92, 10, 2, 2, OPEN, 'A')
L.put(91, 21, 2, 2, CLOSE, 'B')              # sotto la mensola: chi scende a piombo dall'OPEN A richiude la botola B
L.put(82, 4, 2, 2, WISP)                     # fuoco fatuo ROSSO: compare quando si sale alla mensola dell'OPEN A

# ================= STANZA DELLA CHIAVE (sotto ala ovest e sala) =================
L.hline(33, 26, 34)                          # mensola della lampadina (fuori dalla caduta della botola)
L.put(29, 30, 3, 3, BULB)
L.tub(15, 22, 44, 44)                        # striscia di lava a terra da sorvolare
L.put(19, 37, 2, 2, WISP2)                   # fuoco fatuo BLU: sopra la lava, si sveglia andando verso la chiave
L.put(10, 43, 2, 2, ENS)                     # Guardiano fermo davanti alla chiave
L.put(3, 43, 2, 2, KEY)

# ================= STANZA DELLA RAGAZZA (sotto ala est) =================
L.put(85, 30, 2, 2, ENV)                     # su e giù fra la caduta della botola e la ragazza
L.put(90, 42, 3, 3, WOMAN)

L.check()
L.save('vitto-07-porte-gemelle.js',
       name="Twin Doors",
       intro="Every door has a twin: when you open one, watch what comes out of the other.",
       background=8,
       comment='VITTO LEVELS 07 "Porte Gemelle" - generato da tools/livelli/vitto07_porte_gemelle.py\n'
               'Gruppi condivisi: OPEN A (ala est) apre la botola della chiave e la gabbia dei due X nell ala ovest; '
               'OPEN B (ala ovest) apre la botola della ragazza e la gabbietta del V nell ala est.\n'
               'Soluzione: sala -> ala ovest calma: OPEN B -> sala -> ala est: OPEN A (fuoco fatuo rosso) -> sala (checkpoint) -> '
               'botola A -> chiave (fuoco fatuo blu) -> sala -> ala est -> botola B -> ragazza. '
               'Prima l est = ala ovest infestata dagli X.',
       note='Difficoltà 7: porte gemelle, conta l\'ordine (prima ovest). CLOSE A tentazione sulla gabbia, CLOSE B sotto l\'OPEN A. Due fuochi fatui.')
