# Vitto Levels — piano della campagna (10 livelli)

> Scritto dalla chat di progetto il 2026-10-30, partendo da `docs/VITTO_LEVELS_PROGETTO.md`.
> Ogni livello si costruisce in una chat separata seguendo `docs/COME_CREARE_UN_LIVELLO.md` e la sua scheda qui sotto.
> Le schede usano **solo il motore attuale**: le idee che richiedono codice nuovo sono nella sezione 4.

---

## 1. La trama

Theseus si è legato alla schiena le **ali di cera di Dedalo**. Con quelle vola (la spinta), e la cera che si
consuma è la sua **energia**: più vola e più si scalda, più la cera cede.
**Arianna** è stata trascinata nel Labirinto, che sotto Creta è sprofondato in una grotta vulcanica,
buia e piena di lava. A tenerla prigioniera ci sono i **Guardiani del Minotauro**: sono i nemici.
Il **radar** è il filo di Arianna: indica prima la chiave della sua catena, poi lei. Ma il filo segue la linea
d'aria, non la strada, e il Labirinto ama ingannare chi lo segue alla cieca.

A ogni livello Theseus trova la chiave e libera Arianna, ma la grotta si muove e i Guardiani la trascinano
**più giù**. Per nove livelli si scende: più lava, più buio, più porte, fino al **Cuore del Vulcano** (09),
dove Arianna è incatenata su un lago di lava.
Al **livello 10** il Labirinto comincia a crollare e per la prima volta si **risale**: un camino verticale verso
la luce. Arianna aspetta all'uscita e insieme volano fuori, verso il sole.
È la rivincita di Icaro (e il senso del nome del gioco): stavolta la cera regge.

---

## 2. Tabella riassuntiva

| N° | Titolo | Trucco principale | Diff. | Dimensioni | Sfondo |
|---|---|---|---|---|---|
| 01 | Le Nove Stanze | Griglia 3×3, rebus A → C → B con sacca cieca (esiste già) | 4 | 72 × 46 | 4 |
| 02 | Il Pozzo di Dedalo | *Respiro*: discesa a botole, la porta chiusa è pavimento; poi risalita | 3 | 60 × 46 | 2 |
| 03 | Il Filo Bugiardo | La chiave è sopra la partenza, dietro il muro: ci si arriva solo facendo tutto l'anello | 5 | 72 × 43 | 3 |
| 04 | Ponti di Porta | CLOSE-ponte: ogni porta che apri fa crollare un ponte sulla lava | 5 | 75 × 40 | 5 |
| 05 | La Galleria dei Guardiani | Galleria affollata da attraversare due volte; i due timer sono il rebus | 6 | 100 × 40 | 6 |
| 06 | Il Buio di Minosse | *Respiro teso*: labirinto 5×4 al buio, le lampadine sono le briciole della strada giusta | 6 | 110 × 60 | 7 |
| 07 | Porte Gemelle | Gruppi condivisi: ogni OPEN apre anche una gabbia di Guardiani. Conta l'ordine | 7 | 96 × 46 | 8 |
| 08 | Il Ritorno | Ferro di cavallo, catena A → E; la ragazza è vicino alla partenza, si torna per la scorciatoia | 8 | 110 × 58 | 9 |
| 09 | Il Cuore del Vulcano | Tutto insieme: due ponti CLOSE, timer, pozzi coi V, lago di lava | 9 | 120 × 70 | 10 |
| 10 | Verso il Sole | Finale in salita: camino a 6 piani, soffitti bassi che ti rimandano giù | 9 | 64 × 70 | 1 |

Gli sfondi sono assegnati in sequenza: Vitto può cambiarli dopo averli visti in gioco (basta il numero in `save()`).

---

## 3. Le schede

### Convenzioni per chi costruisce
- Coordinate come in `icarous_lib.py`: `x` = colonna (0 a sinistra), `y` = riga (0 in alto). Le posizioni nelle schede
  sono **indicative**: contano le stanze, i collegamenti e l'ordine, non il tile esatto.
- Negli schemi ASCII: riquadri = stanze; un buco nel muro (`==` in orizzontale, spazio nel `----`) = **varco aperto**;
  `[A]` = **porta** del gruppo A (verticale o botola); `OA` = OPEN A; `CA` = CLOSE A; `P` partenza; `K` chiave;
  `W` ragazza; `F` cagnolino; `T` timer; `L` lampadina; `*` stella; `~~` lava; `H V X S` nemici.
- **Il validatore non conosce i CLOSE, la gravità e la lava**: tratta tutto come "volo libero". Quindi garantisce lo
  spazio e l'ordine delle porte, non che un ponte serva davvero. I punti CLOSE-ponte e i soffitti bassi vanno
  **provati giocando** (nel laboratorio, tasto G = invincibile).
- Ogni scheda indica l'**ordine porte atteso** nel report del validatore: se ne esce uno più corto, c'è una
  scorciatoia che salta il rebus e il livello va corretto.
- Ricariche: poche. Riferimento: una ogni 2–3 stanze.
- **Fuoco fatuo** (tile 17, `WISP`, negli schemi `FF`): da 03 in poi c'è sempre, uno per livello, in aggiunta ai nemici
  della scheda. Compare con animazione e risata quando Theseus si avvicina, poi vaga e rimbalza sui muri
  (vedi `docs/COME_CREARE_UN_LIVELLO.md`).

---

### 01 — Le Nove Stanze *(esiste già, non modificare la pianta)*

- **Intro**: *"Arianna è prigioniera nel Labirinto: segui il filo e trova la chiave della catena."*
  (aggiunta e promossa il 2026-10-30)
- **Dimensioni**: 72 × 46 · tileSize 9 · sfondo 4 · difficoltà 4
- **Idea / trucco**: il livello che insegna il rebus. Tre porte, tre interruttori in tre stanze diverse: il giocatore
  capisce che una porta si apre con un interruttore lontano, che due porte possono avere la stessa lettera (C) e che
  a volte bisogna entrare in una stanza cieca solo per premere un tasto e poi tornare indietro.
- **Pianta**: griglia 3×3 di stanze 24 × 15 (R = riga dall'alto, C = colonna da sinistra).
  ```
  +----------+----------+----------+
  | R00      | R01      | R02      |
  |  W  *    ==  ~~ T X ==   K  L  |
  +----------+----------+---[B]----+
  | R10     [C] R11    [C] R12     |
  |  OB L S  |  OA V *  |  OC ~~ X |
  +----------+---    ---+---    ---+
  | R20      | R21      [A] R22    |
  |  P  *    ==  ~~ * H |  F V V L |
  +----------+----------+----------+
  ```
- **Soluzione**: R20 → R21 → su in R11, **OPEN A** → torna giù in R21 → porta A → R22 (checkpoint) → su in R12,
  **OPEN C** → porta C verso R11 → porta C verso R10 (sacca cieca), **OPEN B** → **torna indietro** R11 → R12 →
  botola B nel soffitto → R02 **chiave** → R01 sorvolando la lava (timer) → R00 **ragazza**.
  Ritorni: R11 → R21 dopo OPEN A; R10 → R12 dopo OPEN B.
- **Nemici**: H in R21 e in R10, V in R11, R22 (2), R02; X in R12 (sopra la quota delle porte C) e in R01; S in R10
  e R02. Servono a "sporcare" gli interruttori e la chiave senza bloccarli.
- **Energia**: 3 lampadine (R10, R22, R02), 5 stelle (R20, R21 sopra la lava, R11, R12, R00), 1 timer (R01).
- **Checkpoint**: R22, appena passata la porta A: è esattamente la metà del rebus.
- **Criteri di accettazione** (già verificati):
  - Il report stampa l'ordine porte **A → C → B**.
  - L'OPEN B sta in una stanza cieca raggiungibile solo dalle porte C.
  - La chiave si raggiunge solo passando dalla botola B.

---

### 02 — Il Pozzo di Dedalo *(respiro)*

- **Intro**: *"Arianna è sprofondata nel pozzo. Scendi: le botole reggono finché restano chiuse."*
- **Dimensioni**: 60 × 46 · tileSize 9 · sfondo 2 · difficoltà 3
- **Idea / trucco**: una torre di 4 piani, uno sopra l'altro, separati da pavimenti con **botole** (porte orizzontali).
  Il giocatore cammina sopra una botola chiusa per andare a premere il suo OPEN, torna indietro e... il pavimento
  non c'è più: si scende. Impara che **una porta chiusa è un pavimento**. Alla fine si **risale** dalle botole aperte
  (volando in un varco da 6–7 con la testa che rischia lo spigolo) fino alla ragazza, al piano 2.
  Al piano 2 c'è anche una nicchia dal **soffitto basso** con una stella: chi ci entra volando sbatte e perde il volo.
  È facoltativa: serve a far scoprire il "quirk" senza punire.
- **Pianta**: torre verticale a 4 piani alti ~10 tile, pavimenti a y ≈ 11, 22, 33. Stanza della ragazza chiusa
  a sinistra del piano 2.
  ```
  +----------------------------------------------------+
  | piano 1   P  *            ====             OA      |
  +--------------------------[ A ]---------------------+
  | W stanza  |                                        |
  |  ragazza [D]   nicchia bassa *  S         OB       |
  +-----------+---------------------------[ B ]--------+
  | piano 3        L        V          OC        F     |
  +-------[ C ]----------------------------------------+
  | piano 4    ~~~~~~~~     H      OD     K            |
  +----------------------------------------------------+
  ```
  - Botola A (piano 1→2) circa al centro; OPEN A in fondo a destra: per prenderlo si cammina **sopra** la botola.
  - Botola B (2→3) a destra, OPEN B poco prima; botola C (3→4) a sinistra, OPEN C a destra: si attraversa il piano.
  - Stanza della ragazza: a sinistra del piano 2, chiusa da muro sopra e sotto (il soffitto è il pavimento pieno del
    piano 1), unica entrata la **porta D** verticale.
  - Nicchia bassa: un tratto del piano 2 con una mensola-soffitto che lascia **5** tile liberi (si cammina, non si vola).
- **Soluzione**: OPEN A (passando sopra la botola) → si torna e si cade per la botola A → OPEN B → botola B →
  attraversa il piano 3 (checkpoint) → OPEN C → botola C → piano 4: chiave e **OPEN D** →
  **risalita**: botola C → piano 3 → botola B → piano 2 → porta D → ragazza.
  Ritorno: tutta la risalita dal piano 4 al piano 2 (il radar indica la ragazza dritta sopra di sé).
- **Nemici** (pochi, è un respiro): 1 S vicino alla nicchia bassa (piano 2); 1 V al piano 3 lontano dalle colonne
  della botola C (altrimenti quando si apre ci scende dentro); 1 H al piano 4 tra la vasca e l'OPEN D.
  Nessun H/X al piano 2 all'altezza della porta D.
- **Energia**: 1 lampadina (piano 3), 2 stelle (piano 1, nicchia bassa). Nessun timer.
- **Checkpoint**: piano 3, dopo la botola B: metà discesa, e da lì si riparte anche per la risalita.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B → C → D**.
  - Per raggiungere l'OPEN A si deve camminare sopra la botola A chiusa (l'OPEN è dall'altra parte del piano).
  - Le botole sono larghe almeno 7 tile e nessuna mensola sta proprio sopra una botola.
  - La stanza della ragazza ha come unico accesso la porta D; l'OPEN D è al piano 4, accanto alla chiave.
  - La nicchia bassa non è sul percorso obbligato.

---

### 03 — Il Filo Bugiardo

- **Intro**: *"Il filo dice che la chiave è lì, dietro il muro. Non dice da dove si passa."*
- **Dimensioni**: 72 × 43 · tileSize 9 · sfondo 3 · difficoltà 5
- **Idea / trucco**: la chiave è nella stanza **centrale**, proprio sopra la partenza: il radar punta dritto in su,
  a pochi tile. Ma la stanza centrale ha un solo ingresso (porta B, sul lato destro) e per arrivarci bisogna fare
  **tutto l'anello** delle 8 stanze intorno, in senso orario. La ragazza è in un'alcova chiusa nella stanza in alto al
  centro: il giocatore la **vede** passando, ma ci entra solo alla fine.
- **Pianta**: griglia 3×3 (stanze ~24 × 14), la centrale R11 sigillata salvo la porta B.
  ```
  +-----------+-----------+-----------+
  | R00       | R01       | R02       |
  | OA *     ==  X  [C]W  [A]   F L   |
  +----   ----+-----------+----   ----+
  | R10       | R11       | R12       |
  |   V       |  K   OC  [B]  OB S    |
  +----   ----+-----------+---[A]-----+
  | R20       | R21       | R22       |
  |    *     ==    P     ==   H  *    |
  +-----------+-----------+-----------+
  ```
  - Varchi aperti: R21↔R20, R21↔R22, R20↔R10, R10↔R00, R00↔R01.
  - Porte **A** (gruppo condiviso, 2 porte): R01↔R02 (verticale) e R22↔R12 (botola nel soffitto di R22).
  - Porta **B**: R12↔R11 (verticale). Porta **C**: alcova della ragazza dentro R01 (alcova ~9 × 8 su mensola,
    chiusa da una porta verticale C).
- **Soluzione**: P (R21). A destra R22 è un vicolo cieco (la botola A è chiusa: esca con stella e H) →
  a sinistra R20 → su R10 → su R00: **OPEN A** → R01 (si vede la ragazza dietro la porta C) → porta A → R02
  (checkpoint) → giù in R12: **OPEN B** → porta B → R11: **chiave** e **OPEN C** → **ritorno** R12 → R02 → R01 →
  porta C → ragazza.
  (Dopo OPEN A si apre anche la botola R22↔R12: è una scorciatoia di ritorno verso la partenza, non serve ma
  rassicura.)
- **Nemici**: V in R10 lontano dal varco verso R00 (colonne diverse); X in R01 nella metà alta, sopra la quota della
  porta A; S in R12 vicino all'OPEN B; H in R22 a guardia della stella-esca.
- **Energia**: 1 lampadina (R02, accanto al checkpoint), 3 stelle (R00, R20, R22 esca).
- **Checkpoint**: R02, appena dopo la porta A: da lì manca la metà "giusta" dell'anello.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B → C**.
  - La chiave dista meno di 12 tile in verticale dalla partenza, ma R11 è raggiungibile solo dalla porta B.
  - La ragazza è visibile entrando in R01 prima di avere la chiave (alcova chiusa da porta, non da muro).
  - R22 è un vicolo cieco finché non si apre il gruppo A.

---

### 04 — Ponti di Porta

- **Intro**: *"Fiumi di lava tagliano le gallerie. Ogni porta che apri fa crollare un ponte."*
- **Dimensioni**: 75 × 40 · tileSize 9 · sfondo 5 · difficoltà 5
- **Idea / trucco**: il **CLOSE-ponte**. Ogni canale di lava ha come pavimento una **botola** dello stesso gruppo
  della porta d'ingresso. Aprire la porta per entrare **apre anche il ponte** (cioè lo fa sparire: sotto c'è la lava).
  Appena dentro bisogna trovare il **CLOSE** per richiudere il ponte (si richiude anche la porta alle spalle, ma non
  serve più). Il canale ha il soffitto basso (6 tile liberi sopra il ponte): sorvolarlo senza ponte è possibile ma
  rischioso, perché sbattere la testa vuol dire cadere nella lava.
  Tre canali, uno per fascia, di difficoltà crescente.
- **Costruzione del ponte**: vasca con `tub()` profonda 2 nel pavimento della fascia; la riga subito sopra la lava
  (quella delle sponde rialzate) diventa una **porta orizzontale** larga esattamente come la lava, così ponte e
  sponde formano un pavimento continuo. Soffitto del canale: una `hline` 7 righe sopra il ponte (6 libere).
- **Pianta**: tre fasce orizzontali a serpentina (alte ~12 tile), collegate da varchi nei pavimenti.
  ```
  +------------------------------------------------------------------------+
  | 1a  P  OA *   [A] CA  ===ponte A===  ~~   | 1b   H        L            |
  +------------------------------------------------------------   ---------+
  | 2b   K  *   ===ponte B===  V  CB (nicchia in alto)  [B]  | 2a  F  OB  L |
  +----   -----------------------------------------------------------------+
  | 3a  OC  X  [C] CC ===ponte C=== OC2 [C]  3b  S   W                     |
  +------------------------------------------------------------------------+
  ```
  - **Fascia 1** (da sinistra a destra) — canale 1, l'insegnamento: OPEN A sulla mensola di 1a; porta A apre
    l'ingresso e il ponte A; **CLOSE A sul pavimento subito dopo la porta**, impossibile non toccarlo.
  - **Fascia 2** (da destra a sinistra) — canale 2: OPEN B in 2a vicino al checkpoint; porta B apre ingresso e ponte B;
    il **CLOSE B è in una nicchia in alto** sopra l'inizio del canale (un pozzetto largo 7, alto ~8, sopra il tratto
    ancora su pavimento pieno): bisogna volarci apposta prima di affrontare la lava. In fondo, 2b: **chiave**.
  - **Fascia 3** (da sinistra a destra) — canale 3, il trucco cattivo: la porta C è **sia l'ingresso sia l'uscita**
    del canale (gruppo condiviso). OPEN C (fuori) apre ingresso, ponte e uscita; il CLOSE C appena dentro richiude
    il ponte **ma anche l'uscita**; in fondo al ponte c'è un secondo **OPEN C** (OC2) per riaprire l'uscita
    (il ponte alle spalle crolla, ma ormai si è passati). Dopo l'uscita, 3b: ragazza.
- **Soluzione**: OPEN A → porta A → CLOSE A → ponte A → 1b → giù in 2a (checkpoint) → OPEN B → porta B →
  CLOSE B (nicchia in alto) → ponte B → 2b chiave → giù in 3a → OPEN C → porta C → CLOSE C → ponte C →
  OPEN C (OC2) → porta C d'uscita → ragazza.
  Ritorno: breve, la nicchia del CLOSE B (si sale e si riscende). Questo livello è tutto "tecnica", non backtracking.
- **Nemici**: H in 1b (stanza senza porte alla sua quota); 1 V nel canale 2 a metà ponte, che va su e giù tra
  soffitto e ponte (quando il ponte è aperto scende nella vasca: è voluto e fa scena); X in 3a nella metà alta;
  S in 3b vicino alla ragazza. Nessun H/X alla quota delle porte A, B, C.
- **Energia**: 2 lampadine (1b, 2a), 2 stelle (1a, 2b), 1 timer prima del canale 2 (per il V).
- **Checkpoint**: 2a, inizio della seconda fascia.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B → C** (il secondo OPEN C non cambia l'ordine).
  - Ogni ponte è una porta orizzontale larga quanto la lava della sua vasca, sulla riga delle sponde rialzate.
  - Ogni CLOSE si raggiunge dopo la porta d'ingresso e **prima** del primo tile di lava.
  - Sopra ogni ponte ci sono esattamente 6 tile liberi (si cammina, il volo è a rischio di testata).
  - Provato in gioco: senza CLOSE il canale 1 si passa in volo con un po' di attenzione, il canale 3 è molto difficile.

---

### 05 — La Galleria dei Guardiani

- **Intro**: *"I Guardiani del Minotauro sorvegliano la galleria. Fermali, anche solo per un attimo."*
- **Dimensioni**: 100 × 40 · tileSize 9 · sfondo 6 · difficoltà 6
- **Idea / trucco**: una **galleria** lunga ~60 tile e piena di Guardiani da attraversare **due volte** (andata e
  ritorno). Ci sono **due timer**, uno a ogni capo: il primo serve all'andata, il secondo al ritorno. Chi spreca il
  timer (lo prende troppo presto, o ci si ferma a raccogliere stelle) attraversa la galleria "a caldo" e paga in
  energia. La galleria non è un tubo: ha rialzi sul pavimento e pilastri appesi al soffitto (sempre ≥ 6 tile liberi)
  che fanno rimbalzare i nemici e costringono a cambiare quota.
- **Pianta**: tre fasce. In alto a sinistra la stanza della ragazza; al centro atrio – galleria – sala est;
  in basso a destra la stanza della chiave. Il resto della fascia alta è roccia sigillata (sfondo).
  ```
  +-------------+--------------------------------------------+-------------+
  | W ragazza   |        (sigillata)                         |  (sigillata)|
  |      L      |                                            |             |
  +----[B]------+--------------------------------------------+-------------+
  | atrio       |  G A L L E R I A                           | sala est    |
  | P  T1      ==   H  ▲  X  ▼  V  ▲  H  ▼  X  ▲  S  V      ==  F  OA  T2 |
  +-------------+--------------------------------------------+----[A]------+
                                                             | K   OB   L  |
                                                             +-------------+
  ```
  (`▲` = rialzo di muro alto 2 sul pavimento, `▼` = pilastro appeso al soffitto)
- **Soluzione**: P nell'atrio → prendi **T1** (sulla soglia della galleria, non prima) → attraversa → sala est
  (checkpoint) → **OPEN A** → botola A → stanza della chiave: **chiave** e **OPEN B** → risali → prendi **T2** →
  **ritorno** per la galleria → atrio → botola B nel soffitto → ragazza.
- **Nemici** (9, tutti in galleria tranne uno): 3 H a terra tra un rialzo e l'altro; 2 X a mezza altezza tra i
  pilastri; 2 V tra pavimento e soffitto; 2 S su un rialzo e sotto un pilastro (passaggi stretti ma ≥ 6).
  1 S nella stanza della chiave. Nessun nemico orizzontale alla quota delle porte A e B (sono botole: ok) né dei varchi
  della galleria verso atrio e sala est (i rialzi alle estremità li tengono dentro).
- **Energia**: 2 timer (T1, T2), 1 lampadina nella stanza della chiave, 1 lampadina con la ragazza (solo luce, a fine
  livello), 1 stella in galleria in posizione rischiosa.
- **Checkpoint**: sala est, a metà esatta (dopo l'andata, prima del ritorno).
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B**.
  - La galleria è l'unica strada tra atrio e sala est (la fascia alta è sigillata).
  - T1 è all'ingresso ovest della galleria e T2 all'ingresso est, a meno di 6 tile dalla soglia.
  - In tutta la galleria ci sono sempre almeno 6 tile liberi in altezza (validatore senza errori).
  - Provato in gioco: con il timer preso sulla soglia la galleria si attraversa in meno di 10 secondi.

---

### 06 — Il Buio di Minosse *(respiro teso)*

- **Intro**: *"Qui la luce non arriva. Segui le lampadine: sono le uniche amiche nel buio."*
- **Dimensioni**: 110 × 60 · tileSize 9 · sfondo 7 · difficoltà 6
- **Idea / trucco**: un **labirinto di 20 stanze** (5 × 4) con pochi nemici e solo due porte. Il nemico è il **buio**:
  la luce si stringe con l'energia e il livello è grande. Le **3 lampadine** stanno solo sulla strada giusta, come
  briciole: chi impara a seguirle va dritto. Le stanze sbagliate hanno stelle (esche: poca energia, tanto tempo perso)
  e un Guardiano fermo nel buio. Il radar non aiuta: indica in linea d'aria attraverso i muri del labirinto.
- **Pianta**: griglia 5 colonne (c0–c4) × 4 righe (r0 in alto – r3 in basso), stanze ~22 × 15.
  ```
        c0         c1         c2         c3         c4
     +---------+---------+---------+---------+---------+
  r0 |  OA     ==        ==   * S  |  X?     [A]  K OB  |
     |         |         |  esca   |         |    L    |
     +---------+---- ----+---------+---- ----+---------+
  r1 |   L     ==        |         ==        | sigill. |
     |  V      |         |         |         |         |
     +---- ----+---------+---------+---- ----+---------+
  r2 |   V     |   *  S  ==   F    ==  L  H  == * S    |
     |         |  esca   |         |         |  esca   |
     +---- ----+---------+---- ----+---- ----+---------+
  r3 |   P     ==        ==   H    |        [B]  W     |
     +---------+---------+---------+---------+---------+
  ```
  Collegamenti (varchi aperti da 6–7): r3: c0–c1, c1–c2; r2: c1–c2, c2–c3, c3–c4; r1: c0–c1, c2–c3;
  r0: c0–c1, c1–c2. Verticali: c0 r3–r2 e r2–r1; c1 r1–r0; c2 r3–r2; c3 r3–r2, r2–r1, r1–r0.
  Porte: **A** tra r0c3 e r0c4; **B** tra r3c3 e r3c4. La stanza r1c4 è sigillata (sfondo).
- **Soluzione**: P (r3c0) → su r2c0 → r1c0 (lampadina 1) → r1c1 → su r0c1 → r0c0: **OPEN A** →
  **ritorno** fino a P → r3c1 → r3c2 → su r2c2 (checkpoint) → r2c3 (lampadina 2) → su r1c3 → su r0c3 → porta A →
  r0c4: **chiave**, **OPEN B**, lampadina 3 → **ritorno** giù r1c3 → r2c3 → r3c3 → porta B → ragazza.
  Vicoli ciechi-esca: r0c2, r2c1, r2c4.
- **Nemici**: 1 S in ciascun vicolo cieco (r0c2, r2c1, r2c4); 1 V nel pozzo c0 (r2c0–r1c0), sfasato rispetto al
  varco così da non salire in r0; 1 H a terra in r3c2; 1 H in r2c3 sotto la quota dei varchi laterali (su una mensola
  con sponde, così non scappa). In r0c4 nessun X alla quota della porta A.
- **Energia**: 3 lampadine (r1c0, r2c3, r0c4 – solo sulla strada giusta), 3 stelle (solo nei vicoli ciechi).
  Nessun timer.
- **Checkpoint**: r2c2, l'incrocio dove passano sia l'andata verso la chiave sia il ritorno.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B**.
  - Tutte e 3 le lampadine stanno su stanze della soluzione; nessuna stella sta su una stanza della soluzione.
  - Da P, la chiave è in linea d'aria verso l'alto a destra, ma la strada passa prima tutta a sinistra (OPEN A).
  - La ragazza (r3c4) è sulla stessa fila della partenza ma si raggiunge solo dall'alto (r3c3) dopo la chiave.
  - Densità muri sotto il 15% nonostante le 20 stanze (muri spessi 1).

---

### 07 — Porte Gemelle

- **Intro**: *"Ogni porta ha una gemella: quando ne apri una, guarda cosa esce dall'altra."*
- **Dimensioni**: 96 × 46 · tileSize 9 · sfondo 8 · difficoltà 7
- **Idea / trucco**: **gruppi condivisi** usati come tensione. Ogni OPEN apre la porta che serve **e** una "gemella":
  l'OPEN A, nell'ala est, apre anche la **gabbia** dei Guardiani nell'ala ovest; da quel momento l'ala ovest è infestata.
  Visto che nell'ala ovest c'è anche l'OPEN B, l'ordine giusto è **prima ovest (OPEN B), poi est (OPEN A)**: così l'ala
  ovest si attraversa infestata una volta sola invece di due. Accanto alla gabbia c'è un **CLOSE A** ben visibile:
  richiude la gabbia, ma anche la porta della chiave (e l'OPEN A è dall'altra parte del livello). Tentazione.
  Nota per chi costruisce: il validatore **segnalerà** gli X che sbattono contro la porta della gabbia: è voluto.
- **Pianta**: sala centrale con due ali; sotto, stanza della chiave a ovest e della ragazza a est.
  ```
  +----------------------+----------------------+----------------------+
  | ALA OVEST            |  SALA                |  ALA EST             |
  |  OB   [gabbia A]X X  ==  P     T     F     ==   OA      S          |
  |        CA            |                      |                      |
  +-----[A]--------------+----------------------+-------[B]------------+
  | CHIAVE               |  (sigillata)         | RAGAZZA              |
  |  K    L    S         |                      |   W       V          |
  +----------------------+----------------------+----------------------+
  ```
  - Gruppo **A** (2 porte): botola A nel pavimento dell'ala ovest (verso la chiave) + porta della **gabbia** (stanzetta
    ~10 × 8 dentro l'ala ovest, con 2 X che pattugliano alla quota della sua porta verticale).
  - Gruppo **B** (2 porte): botola B nel pavimento dell'ala est (verso la ragazza) + porta di una seconda gabbietta
    nell'ala est con 1 V (gemella "piccola": un Guardiano in più vicino all'uscita).
  - L'OPEN B è in fondo all'ala ovest, sulla parete opposta alla gabbia; l'OPEN A in fondo all'ala est.
  - Il CLOSE A sta nell'ala ovest, accanto alla gabbia, **fuori** dal percorso obbligato.
- **Soluzione consigliata**: P (sala) → ala ovest: **OPEN B** (calma) → sala → ala est: **OPEN A** (si aprono la botola A
  e la gabbia; si apre anche la botola B, ma senza chiave la ragazza non serve) → **ritorno** in sala (checkpoint) →
  ala ovest **infestata** → botola A → **chiave** → risali, riattraversa l'ala ovest → sala → ala est → botola B →
  ragazza.
  Ordine sbagliato (prima est): l'ala ovest va attraversata infestata per andare all'OPEN B **e** per tornare.
  Errore punito: toccare il CLOSE A prima della chiave = richiudere la botola A, e tornare all'OPEN A in fondo all'est.
- **Nemici**: 2 X nella gabbia A (liberati da OPEN A, voluto); 1 V nella gabbietta B; 1 S nell'ala est vicino all'OPEN A;
  1 S nella stanza della chiave; 1 V nella stanza della ragazza. La sala centrale è libera (zona di respiro).
- **Energia**: 1 timer in sala (per riattraversare l'ala ovest), 1 lampadina nella stanza della chiave, 2 stelle
  (ala ovest prima della gabbia, ala est).
- **Checkpoint**: sala centrale, vicino al timer: tutti i viaggi ci passano.
- **Criteri di accettazione**:
  - Il report trova la soluzione con **A e B** (in qualsiasi ordine) e segnala come ATTENZIONE solo i nemici delle gabbie.
  - Prima di OPEN A gli X sono chiusi nella gabbia; dopo OPEN A escono nell'ala ovest e non possono entrare in sala
    (il varco ala ovest → sala ha una soglia rialzata o è a una quota diversa da quella della gabbia).
  - Il CLOSE A non è sul percorso obbligato e non è sopra la botola A.
  - Provato in gioco: facendo prima l'ala ovest si prende al massimo 1 colpo in più rispetto all'ordine sbagliato che
    ne fa prendere 2–3.

---

### 08 — Il Ritorno

- **Intro**: *"Arianna è a un passo, oltre il muro. Per arrivarci dovrai fare tutto il giro."*
- **Dimensioni**: 110 × 58 · tileSize 9 · sfondo 9 · difficoltà 8
- **Idea / trucco**: il livello del **backtracking**. Pianta a **ferro di cavallo** (si scende a sinistra, si attraversa
  il fondo, si risale a destra) con una catena di 5 porte **A → B → C → D → E** e tre sacche in cui entrare e da cui
  tornare. La ragazza è nella stanza **accanto alla partenza**, ma la sua porta E si apre solo dall'ultima stanza.
  Lo stesso OPEN E apre anche la **scorciatoia**: un corridoio in alto che riporta di colpo alla partenza, sorvegliato
  da Guardiani (e c'è un timer apposta).
- **Pianta**: griglia di 4 colonne (~27 tile) × 4 righe (~14 tile).
  ```
  +------------+------------------------------------------+------------+
  | L1   P    ==  T: corridoio scorciatoia  X   V   X    [E]  R1  OE T |
  |            |                                          |      L     |
  +----    ----+--------------+---------------------------+----[D]-----+
  | L2  OA H  [E] W ragazza   |       (sigillata)         | R2    | SD |
  |   *        |              |                           |  V   == OD |
  +----[A]-----+--------------+---------------------------+----[C]-----+
  | L3         |   K chiave   OC        H                 | R3   V     |
  |            |                                          |            |
  +----    ----+---------------------       --------------+----    ----+
  | SB OB ~~ |  B1     S     [B]    B2      F    L                     |
  +--------------------------------------------------------------------+
  ```
  - Varchi aperti: L1→L2 (nel pavimento), L1↔T (a sinistra del corridoio), L3→B1, B2→K (nel soffitto di B2),
    B2→R3, R2↔SD (sacca), e la sacca SB nel fondo di B1 (oltre una vaschetta di lava).
  - Porte: **A** botola L2→L3; **B** verticale B1→B2; **C** botola R3→R2; **D** botola R2→R1;
    **E** (gruppo condiviso, 2 porte): verticale tra T e R1 + verticale tra L2 e la stanza della ragazza W.
- **Soluzione**: P (L1) → il corridoio T verso destra è un vicolo cieco (porta E chiusa: esca) → giù L2: **OPEN A** →
  botola A → L3 → B1 → sacca SB oltre la lava: **OPEN B** → **ritorno** in B1 → porta B → B2 (checkpoint) → su in K:
  **chiave** e **OPEN C** → **ritorno** in B2 → R3 → botola C → R2 → sacca SD: **OPEN D** → **ritorno** in R2 →
  botola D → R1: **OPEN E** + timer → porta E → **corridoio T** a tutta velocità verso ovest → L1 → L2 → porta E →
  ragazza.
- **Nemici**: nel corridoio T 2 X e 1 V (il pezzo forte, da passare col timer); H in L2 (quota sopra le porte A ed E);
  S in B1; H in K a quota piena; V in R3 e in R2 lontano dalle colonne delle botole C e D.
  Attenzione: gli X del corridoio non devono stare alla quota della porta E (stanno a metà altezza, la porta E
  verticale è alta 7 e parte dal pavimento: il corridoio è alto almeno 12).
- **Energia**: 2 lampadine (B2 accanto al checkpoint, R1), 3 stelle (L2, SB, SD), 1 timer (R1, per il corridoio T).
- **Checkpoint**: B2, il fondo del ferro di cavallo.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B → C → D → E**.
  - La stanza della ragazza confina con L2 (la stanza sotto la partenza) e ha come unico ingresso la porta E.
  - SB e SD sono vicoli ciechi veri (un solo varco); K si raggiunge solo dal basso, da B2.
  - Il corridoio T è raggiungibile da L1 fin dall'inizio, ma porta solo alla porta E chiusa.
  - Dopo OPEN E il ritorno per il corridoio è molto più corto (meno della metà) del giro completo.

---

### 09 — Il Cuore del Vulcano

- **Intro**: *"Il cuore del vulcano. Arianna è sul lago di lava: la cera non reggerà a lungo."*
- **Dimensioni**: 120 × 70 · tileSize 9 · sfondo 10 · difficoltà 9
- **Idea / trucco**: l'esame finale della discesa. Quattro zone, ognuna col trucco di un livello precedente, e due
  **ponti CLOSE** in serie. La ragazza è **proprio sotto la partenza** (il radar punta in giù), ma il giro è in senso
  orario per tutta la mappa. La lava è dappertutto e l'energia è contata.
- **Pianta**: 4 zone a quadranti (~60 × 35 ciascuna).
  ```
  +--------------------------------+-------------------------------------+
  | Z1 ATRIO                       | Z2 FUMAROLE                         |
  |  P   L   ~~   OA   ~~    *    [A]  |V|   |V|   |V|  sacca: OB  *    |
  |                                |   pozzi verticali larghi 7         |
  +--------------------------------+--------------[B]------------------+
  | Z4 LAGO DI LAVA                | Z3 PONTE DI MAGMA                   |
  |  W (piattaforma)  ~~~~~~~~~~   |  isola: K OD  ===ponte C=== CC [C]  |
  |  ===ponte D===  X  X  T  CD   [D]                 F OC  T  L        |
  +--------------------------------+-------------------------------------+
  ```
  - **Z1 Atrio** (respiro): vasche piccole, OPEN A libero, porta A verso Z2. Nessun passaggio diretto verso Z4.
  - **Z2 Fumarole**: 3 pozzi verticali (larghi 7, profondi ~20) con un V ciascuno. Il terzo pozzo è una **sacca**:
    in fondo c'è l'OPEN B, poi si risale. La botola B nel pavimento di Z2 porta in Z3.
  - **Z3 Ponte di Magma** (da est a ovest): si arriva a est (checkpoint, OPEN C, timer). La porta C è l'ingresso del
    canale e il **ponte C** è dello stesso gruppo: OPEN C apre entrambi → lava scoperta. Subito dentro, **CLOSE C**
    (richiude ponte e ingresso). Canale lungo ~30 con soffitto a 6 tile. In fondo, l'**isola**: **chiave** e **OPEN D**.
  - **Z4 Lago di Lava**: la porta D è l'uscita di Z3 **e** il ponte D del lago è dello stesso gruppo. OPEN D apre
    l'uscita e fa crollare il ponte D; sulla riva, appena passata la porta, **CLOSE D** lo richiude. Il ponte D porta
    alla piattaforma della ragazza, sopra un lago largo ~40 tile, sorvolato da 2 X a mezza quota. Timer sulla riva.
- **Soluzione**: OPEN A → Z2 → giù nel 3° pozzo: **OPEN B** → **risali** → botola B → Z3 est (checkpoint) → **OPEN C** →
  porta C → **CLOSE C** → ponte C → isola: **chiave**, **OPEN D** → porta D → **CLOSE D** → timer → ponte D →
  ragazza.
- **Nemici**: Z1: 1 H. Z2: 3 V (uno per pozzo, nel pozzo-sacca è a guardia dell'OPEN B), 1 S tra i pozzi.
  Z3: 1 V a metà del canale (come nel 04), 1 S sull'isola. Z4: 2 X sopra il lago (sopra la quota della porta D e del
  ponte, bloccati dalle pareti del lago), 1 S vicino alla ragazza.
- **Energia**: 3 lampadine (Z1, Z3 est, isola), 3 stelle (Z1, Z2 sacca, sul lago in posizione rischiosa),
  2 timer (Z3 est per il V del canale, riva del lago per gli X).
- **Checkpoint**: Z3 est, appena scesi dalla botola B: metà mappa e prima dei due ponti.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B → C → D**.
  - La ragazza è entro 15 colonne dalla partenza in orizzontale, ma Z1 e Z4 non comunicano.
  - I due ponti seguono la regola del 04 (porta orizzontale larga quanto la lava, sulla riga delle sponde rialzate,
    CLOSE dopo l'ingresso e prima della lava, 6 tile liberi sopra).
  - Il lago è un'unica vasca chiusa (fondo e sponde rialzate) e la piattaforma della ragazza è una mensola sopra il lago
    raggiungibile a piedi dal ponte D.
  - Densità muri sotto il 15%; i pozzi di Z2 larghi almeno 7.

---

### 10 — Verso il Sole

- **Intro**: *"Il Labirinto crolla: risali il camino fino alla luce. Arianna ti aspetta all'uscita."*
- **Dimensioni**: 64 × 70 · tileSize 9 · sfondo 1 · difficoltà 9
- **Idea / trucco**: per la prima volta **si sale**. Un camino di 6 piani; i varchi tra un piano e l'altro sono
  **sfalsati** (uno a sinistra, il successivo a destra), quindi si vola in diagonale e chi sbatte la testa sul
  soffitto mentre è sopra il varco da cui è salito **ricade al piano di sotto**. I soffitti bassi diventano ritmo:
  salire, atterrare, ripartire. In mezzo c'è un ritorno all'ingiù (la chiave) e il finale riprende il ponte del 04:
  l'ultimo OPEN fa crollare il pavimento sotto di te e apre la botola sopra la lava.
- **Pianta**: torre verticale, 6 piani alti ~10–11 tile (il piano 2 più basso: 8).
  ```
  +--------------------------------------------------------------+
  | 6   W  uscita (luce)      X        X          T        L     |
  +-----------------------------[ D ]----------------------------+
  | 5   OD  |~~~~~~~~ ponte D ~~~~~~~~|          OC      *         |
  +----------------------------------------------------   -------+
  | 4   [C] K stanza chiave    |   H                             |
  +----   -------------------------------------------------------+   <- botola B nel varco a sinistra
  | 3   SB: OB  |    F    V               L                      |
  +-------------------------------------------------   ----------+
  | 2   soffitto basso (8)          S                            |
  +----[ A ]-----------------------------------------------------+
  | 1   P    ~~~~~        OA         ~~~~~         *             |
  +--------------------------------------------------------------+
  ```
  - Piano 1 → 2: **botola A** a sinistra (OPEN A al centro del piano 1, tra due vasche).
  - Piano 2 → 3: varco aperto a destra. Il piano 2 è basso (8): volando in diagonale dal varco A al varco destro si
    rischia la testata.
  - Piano 3 → 4: **botola B** a sinistra; l'OPEN B è in una sacca a sinistra del piano 3 (vicolo cieco, un varco).
  - Piano 4 → 5: varco aperto a destra. Al piano 4, a sinistra, la stanza della **chiave** chiusa dalla porta **C**.
  - Piano 5: OPEN C a destra (bisogna **riscendere** al 4 per la chiave e risalire). A sinistra una vasca larga ~24
    con il **ponte D** (porta orizzontale, chiusa all'inizio: si cammina sopra) e oltre il ponte l'**OPEN D**.
    La **botola D** (5 → 6) è nel soffitto **sopra il ponte**: premendo OPEN D si aprono insieme, il pavimento
    sparisce e si deve volare dall'estremità sinistra, sopra la lava, su per la botola.
  - Piano 6: sala finale con 2 X, timer all'ingresso, ragazza all'"uscita" in alto a sinistra (su una mensola, con una
    lampadina accanto come "luce del sole").
- **Soluzione**: OPEN A → botola A → piano 2 (attenzione al soffitto) → varco destro → piano 3 (checkpoint) → sacca:
  **OPEN B** → **ritorno** → botola B → piano 4 → varco destro → piano 5: **OPEN C** → **riscendi** al piano 4 →
  porta C → **chiave** → **risali** al 5 → cammina sul ponte D → **OPEN D** → vola sopra la lava su per la botola D →
  piano 6: timer → ragazza.
- **Nemici**: piano 2: 1 S sotto il punto dove si rischia la testata; piano 3: 1 V lontano dalle colonne del varco;
  piano 4: 1 H nella parte destra (quota sopra la porta C, oppure la porta C sta a una quota dove il muro è pieno);
  piano 6: 2 X sopra la quota della botola D. Piano 5 libero: la lava basta.
- **Energia**: 2 lampadine (piano 3, piano 6 – quest'ultima accanto alla ragazza), 3 stelle (piano 1, piano 5, piano 4
  nella stanza della chiave), 1 timer (piano 6).
- **Checkpoint**: piano 3, appena saliti dal piano basso: metà torre.
- **Criteri di accettazione**:
  - Il report stampa l'ordine porte **A → B → C → D**.
  - Nessun varco tra due piani è sulla stessa colonna del varco successivo (sono sfalsati sinistra/destra).
  - Nessuna mensola sta proprio sopra un varco o una botola (a parte il soffitto del piano, che è voluto).
  - La botola D è sopra il ponte D e larga almeno 8; tra la riga del ponte e la botola ci sono almeno 8 tile.
  - Provato in gioco: dal piano 5 si sale al 6 dalla sponda sinistra della vasca senza toccare la lava.

---

## 4. Idee che richiedono codice (per il futuro)

1. **Arianna che ti segue** — nel livello 10, una volta liberata, la ragazza vola dietro a Theseus fino all'uscita
   (come un secondo sprite che ripete il suo percorso con mezzo secondo di ritardo). Il finale diventerebbe davvero
   "volare via insieme". Serve: stato "liberata" senza fine livello + tile "uscita".
2. **Correnti d'aria calda** — colonne sopra le fumarole che spingono verso l'alto senza consumare spinta
   (perfette per la Z2 del 09 e per il camino del 10). Serve: nuovo tile "corrente" con forza verticale.
3. **Lava che sale** — nel livello 10 la lava del piano 1 si alza lentamente: il camino diventa una corsa.
   Serve: vasche con livello variabile nel tempo.

---

## 5. Messaggio da incollare nelle chat dei singoli livelli

Una chat nuova per livello, in questa cartella (modelli consigliati in `docs/COME_CREARE_UN_LIVELLO.md`:
Sonnet 5.5 medio per 02–06, Sonnet 5.5 alto oppure Opus 5.5 medio per 07–10):

> **Crea il livello Vitto NN seguendo docs/COME_CREARE_UN_LIVELLO.md e la scheda NN di docs/VITTO_LEVELS_PIANO.md.**

(sostituisci NN con 02, 03, … 10).
