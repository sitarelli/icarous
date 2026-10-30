# Come si crea UN livello di Vitto Levels (una chat per livello)

## Per Vitto: come usarlo
1. Apri una **chat nuova** in questa cartella (consigliato: **Sonnet 5.5, ragionamento medio**;
   per i livelli più complessi, dall'07 in su, **Sonnet 5.5 alto** oppure **Opus 5.5 medio**).
2. Incolla: **"Crea il livello Vitto NN seguendo docs/COME_CREARE_UN_LIVELLO.md e la scheda NN di docs/VITTO_LEVELS_PIANO.md."**
3. Quando Claude ha finito, apri http://localhost:8000/test.html (server acceso con `tools/avvia-server-Mac.command`),
   scegli il livello nell'elenco e giocalo. Nel laboratorio il tasto **G** ti rende invincibile per esplorare.
4. Scrivi in chat cosa non va, nel modo più concreto possibile: "nella stanza in alto a destra sbatto sempre la testa",
   "troppo facile", "il nemico V copre l'OPEN B". Se serve, incolla uno screenshot.
5. Quando ti piace, scrivi **"approvato, promuovilo"**: diventa il livello ufficiale NN di Vitto Levels.
6. Chiudi la chat. Livello successivo = chat nuova (così la conversazione resta corta e consuma meno).

## Per Claude: la procedura
1. Leggi `docs/THESEUS_LEVEL_DESIGN.md` (vincoli), la **scheda NN** in `docs/VITTO_LEVELS_PIANO.md` e, come esempio,
   `tools/livelli/vitto01_nove_stanze.py` e `tools/livelli/icarous_lib.py`.
2. Scrivi `tools/livelli/vittoNN_<nome>.py` usando la libreria (`Level`, `frame`, `hline`, `vline`, `clear`, `door`,
   `tub`, `put`, `check`, `save`). **Non scrivere la matrice a mano.** Commenta le stanze come nel livello 01.
   Modello consigliato (dal documento di design): parti dal vuoto, disegna **linee di muro spesse 1 tile**,
   stanze ampie, varchi da 6, vasche con `tub()`.
3. Lancia `python3 tools/livelli/vittoNN_<nome>.py`. Correggi finché il report dice **CONTROLLO OK** e non ci sono
   righe **ATTENZIONE** (o sono volute: spiegalo a Vitto).
4. Controlla che l'**ordine porte** stampato dal report corrisponda alla soluzione della scheda: se il validatore trova
   una scorciatoia che salta parte del rebus, il livello è sbagliato anche se "risolvibile".
5. Salva con `L.save('vitto-NN-<nome>.js', name=..., intro=..., background=..., comment=..., note=...)`:
   finisce in `levels/test/` e compare da solo nell'elenco di `test.html`.
6. Verifica fisica (se hai il browser): apri `test.html`, avvia il livello e prova i passaggi critici
   (salite nei varchi, botole, CLOSE-ponte). Il validatore garantisce lo spazio, non la "sensazione" del volo.
7. Riassumi a Vitto: idea, soluzione, dove si torna indietro, cosa provare per primo.
8. Sulle sue correzioni modifica lo **script** (non il .js) e rilancialo.
9. Solo quando Vitto approva: `python3 tools/livelli/promuovi.py vitto-NN-<nome>.js NN`
   (copia in `levels/vitto/levelNN.js` e aggiorna `CAMPAIGNS` in `config.js`).

## I nemici a disposizione
| Tile | Costante | Nemico | Comportamento |
|---|---|---|---|
| 11 | `ENH` | H | avanti e indietro in orizzontale, rimbalza sui muri |
| 15 | `ENX` | X | come H, sprite diverso |
| 13 | `ENV` | V | su e giù in verticale, rimbalza su pavimento e soffitto |
| 14 | `ENS` | S | fermo, fa male solo se lo tocchi |
| 17 | `WISP` | **Fuoco fatuo** | spirito di lava luminoso: dorme invisibile sul suo blocco, **compare con animazione e risata** quando Theseus arriva entro 14 tile, poi **vaga a caso** e **rimbalza su muri e porte chiuse** (non li attraversa). **Tende sempre verso Theseus** seguendo la strada vera attraverso varchi e porte aperte (insegue "a zig-zag", non in linea d'aria). Se Theseus è dietro porte chiuse, punta in linea d'aria e sbatte. Si congela col timer. |

Tutti fanno lo stesso danno al contatto (−0,25 di energia, poi 2 s di invulnerabilità).

## Regola fissa (da Vitto Levels 03 in poi)
- **Ogni livello ha UN fuoco fatuo** (`WISP`, blocco 2×2), oltre ai nemici della scheda: Vitto l'ha voluto come
  presenza costante della campagna. Il blocco è il punto dove **si materializza**: mettilo dove vuoi il colpo di scena
  (di solito a metà livello, vicino al checkpoint), ad almeno 15 tile dalla partenza e in un punto che non si "sfiora"
  prima del momento voluto. Siccome **rimbalza sui muri**, resta nella zona collegata da varchi aperti a dove compare:
  mettilo in una stanza con varchi verso il percorso, non in una stanza chiusa da porte (altrimenti resta lì dentro).
  Lascia attorno al blocco almeno 3 tile liberi. Il validatore segnala ATTENZIONE se manca.

## Regola fissa: un CLOSE per ogni gruppo di porte
Vitto vuole che **ogni gruppo di porte abbia anche il suo CLOSE** (il validatore dà ATTENZIONE se manca). Due usi:
- **Trappola (handicap):** il CLOSE sta sul percorso, di solito proprio davanti alla porta che si sta per attraversare.
  Chi ci cammina sopra la richiude e deve tornare all'OPEN; chi è attento lo scavalca in volo. Più è lontano l'OPEN,
  più la trappola è cattiva: dosala con la difficoltà del livello.
- **Ponte (necessità):** una porta orizzontale dello stesso gruppo messa **sopra una vasca di lava**, a filo con le
  sponde (es. `L.door(x0, riga_sopra_la_lava, larghezza, 1, 'C')`). Aprendo il gruppo il ponte sparisce; il CLOSE lo
  rimette e si passa a piedi senza scottarsi (poi, se serve, si riapre con l'OPEN). Esempi: livello 01 (ponte B in R01),
  livello 02 (ponte C sotto la botola B).
- **Anti-blocco:** il validatore prova tutte le combinazioni di OPEN e CLOSE e dà **ERRORE "TRAPPOLA SENZA USCITA"**
  se un CLOSE può chiudere il giocatore dove l'OPEN non è più raggiungibile. Mai un CLOSE dentro una stanza che ha
  come uscita solo la porta che chiude, a meno di mettere lì dentro anche un OPEN dello stesso gruppo.

## Errori tipici da evitare (già successi)
- Nemico orizzontale alla stessa altezza di una porta: quando la porta si apre scappa nelle altre stanze
  (il validatore lo segnala come ATTENZIONE).
- Buco nel pavimento sul percorso a piedi (un varco verso la stanza di sotto): se non è voluto, il giocatore ci cade
  dentro camminando. Se è voluto, mettilo dove ha senso volare.
- Mensola proprio sopra un varco verticale: chi sale sbatte la testa e perde il volo.
- Entità uguali attaccate (si fondono in un blocco gigante).
- Troppe ricariche: il livello diventa banale. Indicativo: una ricarica ogni 2–3 stanze.
