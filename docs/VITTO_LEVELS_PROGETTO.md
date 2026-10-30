# Brief per la chat di PROGETTO — campagna "Vitto Levels"

> Da usare in una chat nuova (consigliato: **Opus 5.5, ragionamento medio**).
> Messaggio da incollare: **"Leggi docs/VITTO_LEVELS_PROGETTO.md e segui le istruzioni."**

## Il tuo compito
Sei il game designer della campagna **Vitto Levels** di Icarous (remake di un classico MSX).
Devi progettare **10 livelli** con una mini-trama, un'idea forte per ogni livello e una difficoltà che cresce,
e scrivere il risultato in **`docs/VITTO_LEVELS_PIANO.md`**. NON costruisci i livelli: ogni livello verrà
costruito dopo, in una chat separata, partendo dalla tua scheda. Quindi le schede devono essere
**abbastanza precise da poter essere costruite senza di te**.

Prima di scrivere leggi:
1. `docs/ICAROUS_LEVEL_DESIGN.md` — regole del motore e vincoli **obbligatori** (varchi ≥ 6, vasche a regola, ecc.).
2. `tools/livelli/vitto01_nove_stanze.py` — com'è fatto il livello 01, che **esiste già** e va inserito nella trama
   così com'è (difficoltà media, griglia 3×3 di stanze, rebus A → C → B).
3. `README.md` — struttura del progetto.

Lavora in italiano. Prima di scrivere il file proponi a Vitto in chat la trama e i 10 titoli con l'idea di
ciascuno (una riga l'uno), aspetta il suo ok o le correzioni, poi scrivi il documento completo.

## Cosa sa fare il motore (usa solo questo)
- **Icarous** cade sempre e vola dando spinta. Se sbatte la testa sul soffitto **perde il volo finché non atterra**:
  soffitti bassi = trappole e ritmo.
- **Obiettivo**: prendere la **chiave** e toccare la **ragazza**. Una chiave e una ragazza per livello.
  Il radar indica prima la chiave e poi la ragazza, in linea d'aria: si può "ingannare" il giocatore con
  obiettivi vicini sul radar ma raggiungibili solo con un giro lungo.
- **Porte a gruppi** (lettere A–Z): OPEN apre tutte le porte del gruppo, CLOSE le richiude. Le porte possono essere
  verticali o orizzontali (botole). **Una porta chiusa è solida**: fa da pavimento o da soffitto. Gruppi condivisi:
  un interruttore apre più porte insieme. CLOSE-ponte: porta orizzontale sopra la lava da richiudere per passarci sopra.
- **Nemici**: H e X pattugliano in orizzontale, V in verticale, S fermo. Rimbalzano sui muri e sulle porte chiuse
  (se la porta si apre ci passano attraverso: usalo solo se è voluto).
- **Timer**: congela tutti i nemici per 10 secondi (finestra per attraversare un passaggio affollato).
- **Lava**: solo in vasche; brucia l'energia in fretta (−0.5 al secondo), si sorvola.
- **Energia**: cala da sola (circa 140 s di autonomia). Lampadina +0.5 (e allarga la luce), stella +0.25, timer +0.1.
  Nemico −0.25.
- **Luce dinamica**: la grotta è buia e l'alone di luce si stringe quando l'energia cala. Le lampadine sono anche luce.
- **Checkpoint**: il cagnolino (uno per livello, a metà percorso); ripartire costa 500 punti.
- **Punteggio**: tempo, stelle, lampadine, cagnolino, energia residua, ripartenze.
- Campi del livello: `name` (titolo), `intro` (UNA riga di trama, max ~90 caratteri, compare a inizio livello),
  `background` (sfondo da 1 a 10: `jpg/sfondo1.jpg` … `sfondo10.jpg`).

Se ti viene un'idea che richiede codice nuovo (es. piattaforme che crollano, correnti d'aria, interruttori a tempo,
più chiavi), mettila **solo** nella sezione finale "Idee che richiedono codice" (massimo 3). Ogni livello deve
essere costruibile e giocabile **con il motore attuale**.

## Curva di difficoltà
- La difficoltà cresce come nell'Originale: percorsi sempre meno lineari, più backtracking
  (vado a prendere un interruttore, torno indietro, la porta è aperta, riparto avanti…).
- 01 = media (esiste già). Poi alterna: ogni 2–3 livelli uno un po' più "respiro" e uno con un trucco nuovo.
- Ogni livello introduce o rielabora **un'idea principale** (il "trucco") che lo rende memorabile.
- Dimensioni: 02–04 circa 60–75 colonne × 35–46 righe; 05–10 possono crescere fino a ~120 × 70.
  Più grande non vuol dire più difficile: conta il rebus.

## Formato di `docs/VITTO_LEVELS_PIANO.md`
1. **La trama** (10–15 righe): chi è Icarous, chi è la ragazza, perché la grotta, come finisce al livello 10.
2. **Tabella riassuntiva**: n°, titolo, trucco principale, difficoltà 1–10, dimensioni, sfondo.
3. **Una scheda per livello** (01 compresa, descritta così com'è), sempre con queste voci:
   - **Titolo** e **intro** (la riga che compare a schermo).
   - **Dimensioni** (cols × rows), **tileSize** 9, **sfondo**.
   - **Idea / trucco** in 2–4 righe: cosa deve capire il giocatore.
   - **Pianta**: elenco delle stanze con posizione indicativa (es. "griglia 4×3", "torre verticale",
     "corridoio a serpentina") e uno **schema ASCII** semplice delle stanze e dei collegamenti
     (stanze come riquadri, porte con la lettera, partenza P, chiave K, ragazza W, checkpoint F).
   - **Soluzione passo-passo** (ordine di porte e interruttori) e **dove si torna indietro**.
   - **Nemici**: tipo, quanti, dove e a cosa servono.
   - **Energia**: quante lampadine, stelle, timer e dove (pochi: la gestione dell'energia è parte della sfida).
   - **Checkpoint**: dove e perché lì.
   - **Criteri di accettazione**: 3–5 frasi verificabili (es. "la chiave è visibile dalla partenza ma si raggiunge
     solo dopo la porta C").
4. **Idee che richiedono codice** (facoltativo, max 3).
5. **Messaggio da incollare** nelle chat dei singoli livelli (vedi `docs/COME_CREARE_UN_LIVELLO.md`).
