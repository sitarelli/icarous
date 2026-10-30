# Theseus (stile MSX) — Documentazione del motore e regole per creare livelli

> Documento di riferimento ricavato leggendo il motore reale (`game.js` / versione
> modulare `config.js`, `player.js`, `input.js`, `renderer.js`, `main.js`).
> Serve a te per rifinire il gioco e, in futuro, a un'AI per generare livelli
> validi. Le regole contrassegnate con **[VINCOLO]** sono obbligatorie: se violate,
> il livello si rompe o diventa impossibile.

---

## 1. Cos'è il gioco

È un **cave-flyer** con gravità: controlli **Theseus**, che cade di continuo e
sale solo dando *spinta*. Devi raccogliere la **Chiave** e poi raggiungere la
**Donna** per liberarla (sprite `unchained`) e passare al livello successivo.
Lungo la strada perdi **energia** (barra Power) per il tempo, la lava e i nemici;
alcuni oggetti la ricaricano.

**Comandi:** `←`/`→` = movimento orizzontale · `Spazio` (o tasto FLY) = spinta
verso l'alto. Nient'altro.

---

## 2. Formato del file livello

Ogni livello è un file `levelN.js` che chiama una funzione globale:

```js
loadLevelData({
    tileSize: 10,   // px logici per tile (scala interna; vedi §7 sullo zoom)
    cols: 50,       // numero di colonne (larghezza della matrice)
    rows: 32,       // numero di righe (altezza della matrice)
    map: [ [ ...riga0... ], [ ...riga1... ], ... ]  // rows × cols
});
```

- `map` è una matrice `rows × cols`. **[VINCOLO]** Ogni riga deve avere
  **esattamente `cols`** elementi, e ci devono essere **esattamente `rows`** righe.
- Ogni cella è **un intero** (tile semplice) **oppure un oggetto**
  `{type:N, group:'X'}` usato per porte e interruttori raggruppati.
- `tileSize` non cambia quante tile si vedono a schermo (vedi §7): influenza la
  risoluzione interna. Valori usati nei livelli reali: 7–10.

---

## 3. Legenda dei tile e comportamento esatto

| Valore | Nome | Entità creata | Comportamento |
|-------:|------|---------------|---------------|
| `0` | Vuoto | — | Aria calpestabile/volabile. |
| `1` | Muro | (resta nella mappa) | **Unico tile SOLIDO.** Collide col player, coi nemici e blocca i sensori. |
| `2` | Lava | `lavas[]` (rettangolo) | **NON è solida:** ci voli/cadi dentro. Danno continuo `-0.5 power/sec`. **[VINCOLO] va in una vasca di muri** (vedi §5). |
| `3` | Woman | `decorations` | Obiettivo. Toccandola **con la chiave** → vittoria. Senza chiave non fa nulla. |
| `4` | Interruttore OPEN | `triggers{type:'open',group}` | Al contatto **apre** tutte le porte `6` dello **stesso gruppo**. |
| `5` | Interruttore CLOSE | `triggers{type:'close',group}` | Al contatto **chiude** tutte le porte `6` dello **stesso gruppo**. |
| `6` | Porta | `triggers{type:'door',group,open:false}` | **Parte CHIUSA** ed è **solida da chiusa**. Si apre/chiude SOLO con gli interruttori del suo gruppo. |
| `7` | Flag (cagnolino) | `items{flag}` | **Checkpoint**: toccandolo si salva la posizione; dopo il game over si può ripartire da lì (−500 punti). `flags++`. Non obbligatoria; mettine **una a metà percorso**. |
| `8` | Bulb (lampadina) | `items{bulb}` | Ricarica **+0.5** power, `bulbs++`. |
| `9` | Thes (player) | `player` | **Punto di partenza** e dimensione del player. **Deve essercene esattamente 1.** |
| `10` | Key (chiave) | `items{key}` | Setta `hasKey=true`. **Prerequisito per salvare la Donna.** |
| `11` | Nemico **H** | `enemies{type:'H'}` | Si muove **orizzontalmente**, rimbalza sui muri. |
| `12` | Star (stella) | `items{star}` | Ricarica **+0.25** power, `stars++`. |
| `13` | Nemico **V** | `enemies{type:'V'}` | Si muove **verticalmente**, rimbalza su pavimento/soffitto. |
| `14` | Nemico **S** | `enemies{type:'S'}` | **Statico** (fermo), danno solo al contatto. |
| `15` | Nemico **X** | `enemies{type:'X'}` | Si muove **orizzontalmente** (sprite diverso), rimbalza sui muri. |
| `16` | Timer | `items{timer}` | Ricarica **+0.1** power. |
| `17` | Nemico **W** (Fuoco fatuo) | `enemies{type:'W'}` | Spirito di lava luminoso (rosso/arancio). Dorme invisibile sul blocco 17 finché Theseus non arriva **entro 14 tile**, poi **si materializza con un'animazione e una risata malefica** (1,4 s, intanto non fa danno) e **vaga a caso**: contro muri e porte chiuse **rimbalza e cambia direzione** (non li attraversa). **Tende verso Theseus** ovunque sia: va a caso ma scivola sempre dalla sua parte, seguendo la **strada vera** attraverso varchi e porte aperte (mappa delle distanze ricalcolata ogni 0,5 s), non la linea d'aria; dopo ogni rimbalzo vaga libero 0,6 s. Fa luce da solo, si congela col timer; ripartendo dal checkpoint torna a dormire sul suo punto. |
| `18` | Nemico **W blu** (Fuoco fatuo blu) | `enemies{type:'W', blue:true}` | Come il 17 ma blu; resta addormentato finché il fuoco fatuo rosso del livello non è comparso almeno una volta, poi si sveglia con la solita regola dei 14 tile. Da Vitto Levels 06 in poi. |

> Nota: la Donna `3` è una *decorazione* (non blocca il movimento). I nemici e
> gli oggetti **non sono solidi**: solo `1` e i **portoni chiusi** fermano il player.

### Danni ed energia
- Contatto nemico: **-0.25** power una volta, poi **2 s di invulnerabilità**.
- Lava: **-0.5 power/sec** finché la tocchi.
- Erosione naturale: **-0.007 power/sec** (circa 140 s di autonomia senza ricariche).
- A `power <= 0` → morte → game over: si riparte dal checkpoint (se preso) o da capo.

---

## 4. La regola più importante del parser: fusione dei rettangoli

Quando carica la mappa, il motore scandisce le celle e, per ogni tile non
`0`/`1`, **espande un rettangolo massimo di celle identiche** (stesso `type` **e**
stesso `group`), prima in larghezza poi in altezza, e crea **una sola entità**
grande `w×h` tile. Poi azzera quelle celle.

Conseguenze pratiche:

- **La dimensione dello sprite = dimensione del blocco.** Un blocco `3×3` di `9`
  crea un Theseus 3×3 tile; un blocco `2×2` di `10` crea una chiave 2×2.
- **[VINCOLO] Non mettere mai due entità dello stesso tipo attaccate** (adiacenti
  in orizzontale/verticale) se le vuoi separate: verrebbero fuse in un unico
  oggetto gigante. Lascia almeno **una cella diversa** (`0` o muro) tra loro.
- Un blocco deve essere **rettangolare pieno**: forme a L vengono spezzate in più
  entità in modo imprevedibile.

**Taglie consigliate (coerenti con i livelli esistenti):**
Theseus `9` = 3×3 · Woman `3` = 3×3 · Bulb `8` = 3×3 · Timer `16` = 3×3 ·
Key `10` = 2×2 · Flag `7` = 2×2 · Star `12` = 2×2 · Interruttori `4`/`5` = 2×2 ·
Nemici = 2×2 (o 3×3) · Porta `6` = 1 tile di spessore per l'altezza/larghezza del varco.

---

## 5. Fisica del volo e conseguenze sul level design

Costanti (in `config.js` / `game.js`): `baseGravity 0.45`, `baseThrust -0.80`,
`maxFallSpeed 4.6`, `maxFlySpeed -0.36`, `baseSpeed 15.0` (orizzontale).

- Il player **cade sempre**; `Spazio` aggiunge spinta verso l'alto.
- **Quirk del soffitto:** sbattere la testa sul soffitto mette `canFly=false` →
  **non puoi più spingere** finché non **atterri** su un pavimento
  (`canFly=true`). Quindi i soffitti bassi sono trappole.
- Collisione: sensori multipli lungo i lati del player; **solido solo `1` e le
  porte chiuse**.

**[VINCOLO] Larghezza dei varchi.** Il player è largo/alto ~3 tile. Un varco di
esattamente 3 tile non lascia margine e in pratica è impraticabile in volo.
**Usa varchi ≥ 5 tile** (orizzontali e verticali). Le porte devono avere
un'apertura **alta ≥ 5 tile**.

**[VINCOLO] Altezza delle stanze.** Dai **≥ 6–8 tile** di altezza libera nelle
camere, così si può volare senza sbattere di continuo il soffitto.

---

## 6. La lava sta SEMPRE in una vasca (regola d'oro)

**[VINCOLO]** La lava non "galleggia" nell'aria: ogni pozza è un **bacino
chiuso di muri**. In concreto, per ogni cella di lava:

1. la cella **sotto** deve essere muro `1` (o altra lava che a sua volta poggia su muro) → la lava **poggia** su un fondo solido;
2. la lava è **delimitata a sinistra e a destra** da muro `1` (le "sponde" della vasca);
3. il **sopra** è aperto (`0`), così il player ci vola sopra.

Metodo semplice e infallibile: **parti da una mappa tutta muri e "scava"** le
stanze (`0`); poi scava le pozze di lava nel pavimento pieno. Così ogni lava è
automaticamente circondata dal solido su fondo e sponde.

---

## 7. Camera, zoom e dimensioni consigliate

- `config.zoom = viewportHeight / (23 * tileSize)` → a schermo si vedono sempre
  **~23 tile in verticale**; la camera **segue** il player con smoothing.
- Un livello "una schermata" ha **~23 righe** (es. `level1` = 24). Livelli più
  alti/larghi scrollano (es. `level3` 59×71, `level4` 67×71).
- Il **bordo esterno** della mappa è **sempre muro** (cornice chiusa di `1`).

---

## 8. Meccaniche di gioco (riepilogo logico)

- **Chiave → Donna:** raccogli `10` (`hasKey=true`), poi tocca `3` per vincere.
  La chiave **non apre porte**.
- **Porte a gruppo:** una porta `{type:6,group:'A'}` è chiusa all'inizio.
  L'interruttore `{type:4,group:'A'}` (OPEN) la apre; `{type:5,group:'A'}` (CLOSE)
  la richiude. I gruppi sono lettere (`'A'`, `'B'`, …). Un interruttore agisce su
  **tutte** le porte del suo gruppo. Se ometti il `group`, il motore usa `'A'`.
- **Gating dei percorsi:** per obbligare il giocatore a un ordine, chiudi un
  corridoio con una porta di gruppo e metti l'interruttore OPEN **prima** della
  porta lungo il percorso.
- **CLOSE come trappola (opzionale):** un `5` sul cammino può richiudere una porta
  già aperta; usalo solo se resta comunque un modo per riaprirla, altrimenti rendi
  il livello impossibile.
- **Economia dell'energia:** in livelli lunghi o con molta lava, semina `8`/`12`/`16`
  per non far scendere il power a zero.

---

## 9. Checklist di validazione (prima di dichiarare "pronto")

1. **Griglia:** ogni riga ha `cols` elementi; ci sono `rows` righe; bordo tutto `1`.
2. **Player:** esattamente **un** blocco `9`.
3. **Obiettivo:** esiste **una** Chiave `10` e **una** Donna `3`; la chiave è
   raggiungibile **prima** (o comunque senza dover già aver toccato la donna).
4. **Porte/gruppi:** ogni porta `6` di gruppo *G* ha almeno un interruttore OPEN
   `4` di gruppo *G* **raggiungibile prima** della porta. Nessuna porta blocca
   l'unica via senza switch corrispondente accessibile.
5. **Raggiungibilità (flood-fill):** dal punto di partenza, simulando
   apertura porte via switch, la **Donna è raggiungibile**. Esiste inoltre un
   percorso **senza attraversare lava** (la lava si sorvola, non si guada).
6. **Varchi:** tutti ≥ 5 tile; stanze alte ≥ 6 tile; nessun soffitto-trappola sul
   percorso obbligato.
7. **Lava in vasca:** ogni cella di lava ha muro sotto e sponde di muro ai lati.
8. **Nessuna fusione involontaria:** due entità dello stesso tipo non sono adiacenti.
9. **Nemici con spazio:** gli `11`/`13`/`15` hanno spazio per pattugliare (muri
   contro cui rimbalzare); i `14` fanno da ostacolo fisso.

---

## 10. Errori tipici delle AI (da evitare)

- ❌ Pensare che la **chiave apra la porta** (no: la porta è solo interruttori).
- ❌ Lava **a mezz'aria** senza vasca.
- ❌ Varchi da **3 tile** (troppo stretti per un player 3×3 in volo).
- ❌ Attaccare due oggetti **dello stesso tipo** (si fondono in uno).
- ❌ Porta di gruppo **senza** interruttore OPEN raggiungibile → livello bloccato.
- ❌ Soffitti bassi sul percorso obbligato (per il quirk `canFly`).
- ❌ Righe di **lunghezza diversa** da `cols`.

---

## 11. Come conviene generare i livelli (metodo consigliato)

Non "disegnare a mano" la matrice, ma **costruirla via programma**:

1. Inizializza tutto a muro `1`.
2. **Scava** le stanze (`0`) e i corridoi con varchi ≥ 5.
3. Scava le **pozze di lava** dentro il pavimento pieno (vasche automatiche).
4. Aggiungi i **muri interni** e le **porte** nei varchi da gating.
5. Posiziona le entità come **blocchi rettangolari**, ben distanziati.
6. **Valida** con la checklist §9 (in particolare il flood-fill di solvibilità).
7. Serializza in `loadLevelData({...})`.

Questo elimina di colpo gli errori di allineamento muri/varchi e garantisce che
il livello sia effettivamente completabile.

---

## 12. Compatibilità con l'Editor (Editor_Livelli_Thes_V15.html)

- **Import (CARICA):** l'editor rimuove i commenti `/* */`, prende tutto tra la
  prima `(` e l'ultima `)` e fa `eval`. Quindi un file `loadLevelData({...})` con
  la riga di legenda in cima si carica senza problemi. Ogni cella intera diventa
  `{type:N}`, gli oggetti `{type,group}` restano.
- **Export (GENERA):** l'editor **ritaglia al bounding box** delle celle con
  `type != 0`. Con il **bordo di muri `1`** (come in questi livelli) non ritaglia
  nulla e `cols`/`rows` restano identici. Se invece il bordo fosse vuoto verrebbe
  tagliato: **tieni sempre la cornice di muri**.
- L'editor scrive `{type:N,group:'X'}` solo se la cella ha un `group`; altrimenti
  scrive l'intero. I gruppi accettati sono un singolo carattere `A–Z`/`0–9`.
- Griglia di default 25×25, tile 20, ma è ridimensionabile/zoomabile: i livelli
  grandi (es. 112×66 o più) si disegnano e si importano senza problemi.
- **Round-trip sicuro:** un file generato da noi → CARICA nell'editor → GENERA
  riproduce lo stesso livello (perché la cornice di muri preserva le dimensioni).

---

## 13. Progettare livelli NON-lineari (il "rebus" con backtracking)

Un livello lineare (stanza → OPEN → porta → avanti → donna) è banale. Il bello
nasce da una **rete di dipendenze lock-and-key** che obbliga a **tornare sui
propri passi**.

### 13.1 Grafo delle dipendenze (aciclico)
Modella le porte come un grafo: per aprire la porta del gruppo *X* serve premere
un interruttore che sta in una **regione raggiungibile solo dopo** aver aperto
altre porte. Regola d'oro: **l'interruttore OPEN di una porta non deve stare
dietro la porta stessa** (né dietro una catena che richiede quella porta),
altrimenti il livello è irrisolvibile. In pratica deve esistere un **ordine
topologico** di apertura.

### 13.2 Pattern "sacca-detour" per forzare il backtracking
Il modo più affidabile di creare ritorni:
1. Sul percorso principale metti una **porta chiusa** (avanti-bloccato).
2. Il suo **OPEN** è dentro una **sacca cieca** (dead-end) che si apre solo con
   la porta *precedente*.
3. Il giocatore devia nella sacca, preme l'OPEN, **torna indietro** al percorso e
   attraversa la porta ora aperta.
Concatenando più sacche (A→B→C→D→E→F) ottieni un rebus con backtracking a catena.
Nel livello `level_new_v4.js` le sacche sono tre pozzi ciechi (uno in giù, due in
su) su tre corridoi collegati: per ogni porta di avanzamento devi entrare nella
sacca e **ritornare**.

### 13.3 Incastri più cattivi (gruppi condivisi)
Due porte con lo **stesso gruppo** si aprono/chiudono insieme: puoi creare
tensioni ("per aprire questa apri anche quella") e obbligare a scelte/ritorni.

### 13.4 CLOSE: innocui vs "necessari" — e un'avvertenza chiave
- **Innocui:** un `5` calpestato per sbaglio richiude una porta; basta ritornare
  sull'OPEN. Fastidio, non blocco.
- **"Necessari" (ponte):** una porta **chiusa è solida** → funge da **pavimento**.
  Un canale con **lava sotto** e per pavimento una porta: se la porta è aperta
  caschi nella lava, quindi devi premere il **CLOSE** per richiuderla e passarci
  sopra.
- **AVVERTENZA (importante per un'AI):** siccome il player **vola**, chiudere una
  porta **non apre mai nuove strade** (una porta chiusa è solo un ostacolo/
  piattaforma). Quindi un CLOSE **non può essere un vincolo topologico**: la sua
  "necessità" è sempre di **sopravvivenza** (non cadere nella lava / avere un
  appoggio per il quirk del soffitto). Progetta i CLOSE-ponte in tratti **stretti
  sopra la lava**, dove restare in volo alto non basta.

### 13.5 Canali per un gioco di volo
- Larghezza/altezza utile dei canali: **4 tile** come standard, **3** solo in
  tratti brevi (il player 3×3 in un canale di 3 ha margine ~0: rischioso).
  **Pozzi verticali** attraversati in volo: **≥4** (la collisione orizzontale usa
  tutta la larghezza).
- **Quirk del soffitto:** sbattere la testa disattiva la spinta finché non
  atterri. Un pavimento (anche una porta chiusa!) diventa un punto per "ripartire".

### 13.6 Come validare un rebus (obbligatorio)
La flood-fill semplice **non basta** con OPEN/CLOSE. Serve una **ricerca sugli
stati**:
- Stato = `(insieme dei gruppi aperti, hasKey)`.
- Da uno stato, calcola la regione raggiungibile (flood con quelle porte aperte;
  muri e **porte chiuse** bloccano; la lava è *attraversabile* in volo).
- Ogni **OPEN** raggiungibile → stato con quel gruppo aggiunto.
  Ogni **CLOSE** raggiungibile → stato con quel gruppo tolto, **solo se** dopo la
  chiusura l'interruttore resta connesso alla partenza (**anti-intrappolamento**).
- `hasKey` diventa vero quando la cella chiave è raggiungibile.
- **Obiettivo:** esiste uno stato con la Donna raggiungibile **e** `hasKey`.
- **Controllo sicurezza (lava):** verifica che esista uno stato finale (tipico:
  tutte le porte utili aperte e i **ponti CLOSE chiusi**) con un percorso alla
  Donna **senza attraversare lava**. Se non esiste, il livello obbliga a bruciarsi.

### 13.7 Checklist aggiuntiva per i livelli non-lineari
- Grafo dipendenze **aciclico** (ordine topologico esistente).
- Ogni sacca-detour è un **vero dead-end** (unica uscita = la sua porta).
- La **chiave** è raggiungibile **prima** della Donna nell'ordine di soluzione.
- Almeno un tratto obbliga a **ritornare** (sacca + porta a valle).
- Ogni **ponte CLOSE** ha: OPEN che lo apre sul percorso forzato, CLOSE
  raggiungibile prima del tratto pericoloso, e percorso sicuro con ponte chiuso.
- Nessun CLOSE può **intrappolare** il giocatore lontano dall'obiettivo.

---

## 14. I MURI SONO LINEE — modello strutturale corretto (IMPORTANTE)

Verifica sui livelli reali (`level9`): i muri `1` sono solo **~10%** delle celle e
i blocchi 2×2 pieni sono **quasi zero**. Cioè **i muri sono LINEE spesse 1 tile**
(pavimenti, soffitti, bordi, divisori, mensole). Il resto è **spazio vuoto** su
cui si vede lo **sfondo** del gioco. Un livello "pieno di muro con corridoi
scavati" è **sbagliato**: si perde il concetto di **stanze**.

> **Questo supera il metodo "parti da tutto-muro e scava" dei §6/§11.** Il metodo
> corretto è l'opposto: **parti da tutto VUOTO e disegna solo LINEE.**

### 14.1 Come si costruisce
1. Mappa tutta a `0`.
2. Disegna il **bordo** esterno come cornice **1 tile**.
3. Disegna i **divisori interni** come **linee 1 tile** (verticali/orizzontali) che
   suddividono lo spazio in **stanze ampie** (es. 20–26 tile larghe, 14–18 alte).
4. Apri i **varchi** (buchi nelle linee, larghi **5–7**) dove le stanze comunicano;
   metti una **porta** solo in alcuni varchi (gating del rebus).
5. Aggiungi **mensole/piattaforme**: brevi linee orizzontali 1 tile sospese nelle
   stanze (per posare la Donna/oggetti e per varietà di volo).
6. Aggiungi la **lava in VASCHE a U**: una linea di fondo + due **sponde** verticali
   1 tile, con la lava dentro; la vasca poggia su un pavimento (linea/bordo). Mai
   lava a mezz'aria, mai lava che tocca il soffitto. **IMPORTANTE:** le sponde
   sinistra/destra devono salire **1 tile SOPRA** il livello della lava (vedi §16).
7. Posiziona le entità (blocchi rettangolari).

### 14.2 Metriche da rispettare (validare!)
- **Densità muro ≈ 8–15%** del totale (se sfori il 20% stai "riempiendo": rifai).
- **Blocchi 2×2 completamente di muro ≈ 0** (indicano muri spessi: sbagliato).
- Stanze **grandi e vuote**, collegate da **varchi** (non lunghi corridoi pieni).

### 14.3 Le "stanze"
Una stanza = area di vuoto delimitata da linee, con uno o più varchi. Le stanze
cieche (un solo varco) sono perfette per nascondere gli **OPEN** del rebus e
forzare il **backtracking**. Alcune stanze possono restare **sigillate** (nessun
varco): fanno da sfondo, come nel livello 9 originale.

### 14.4 Note grafiche
- Il muro usa lo sprite `brick` (mattone); i tratti sottili diventano piattaforme/
  cornici, esattamente come nel rendering del gioco.
- La **Flag `7`** è mostrata come un **cane/barboncino** nell'HUD/rendering (non è
  una bandiera classica): tienilo presente come "oggetto bonus" a fine percorso.
- La Donna e il player stanno bene **su una mensola** (breve linea sotto di loro).

### 14.5 Esempio di riferimento
`level_new_v5.js` è costruito con questo modello: griglia di stanze delimitate da
linee 1 tile (muro ~12%), varchi larghi, 4 vasche di lava a U, rebus a catena
A–E con OPEN nelle stanze cieche (backtracking) e Donna su mensola.

---

## 15. Zoom, ingombro del player ed economia (correzioni fini)

### 15.1 Lo ZOOM non dipende dal tileSize
Nel motore: `config.zoom = viewportHeight / (23 * tileSize)`. Il `tileSize` **si
semplifica**: a schermo si vedono **sempre ~23 tile in verticale** e ogni tile
occupa `viewportHeight/23` px, **qualunque sia il tileSize**. Quindi cambiare
`tileSize` **non** cambia lo "zoom".
Ciò che rende un livello "troppo zoomato" è:
- **Sprite del player troppo grande in tile.** `level2` usa un player **3×3**;
  un player 4×4 riempie più schermo e sembra più zoomato. **Usa 3×3.**
- **Livello troppo alto.** Con 23 righe sempre visibili, un livello da 40 righe
  ne mostra ~57% (come `level2`, 35 righe), uno da 70 righe solo ~33% (sembra più
  zoomato perché vedi meno struttura). **Tieni le righe ~35–45** salvo che tu
  voglia un livello volutamente esteso.

### 15.2 Clearance per l'ingombro (passare sopra/sotto)
Il player occupa **3×3 tile** e per muoversi ha bisogno che **tutto l'ingombro**
entri nello spazio libero:
- **Varchi ≥ 5** (usane 6): un varco di 3 non lascia margine.
- **Sopra e sotto ogni piattaforma** lascia **≥ 5 tile** liberi, altrimenti il
  player non ci passa (è l'errore da evitare: piattaforme troppo vicine che
  "strozzano" il passaggio).
- **Validazione corretta:** non basta la flood-fill a celle singole; usa una
  flood-fill **con ingombro** (una posizione è valida solo se **tutte le 9 celle**
  del 3×3 sono libere: non muro, non porta chiusa). Così scopri subito i passaggi
  troppo stretti. In `level_new_v6.js` la solvibilità è verificata proprio così.
- **Attenzione alle vasche di lava:** il **fondo/le sponde della vasca non devono
  mai cadere su un varco** (lo sigillerebbero). Metti le vasche su un bordo o su
  un tratto di divisore **pieno**, mai dove c'è un'apertura.

### 15.3 Economia dell'energia (difficoltà)
Il power cala lentamente da solo e molto per lava/nemici. **Non seminare troppe
ricariche**, altrimenti il livello diventa banale: indicativamente **~1 ricarica
ogni 2–3 stanze** (bulb +0.5, star +0.25, timer +0.1). Preferisci poche ricariche
ben posizionate lungo il percorso obbligato, così l'energia resta una risorsa da
gestire.

### 15.4 Riepilogo scala consigliata (default)
Player **3×3**, `tileSize` 9, **cols ~55–70, rows ~35–45**, stanze ~12–16 tile,
varchi **6**, ≥5 tile sopra/sotto le piattaforme, ricariche poche. Questa scala
riproduce il "feel" dei livelli originali (es. `level2`).

---

## 16. Vasche di lava: le sponde salgono 1 tile SOPRA la lava (fix testato)

Le due sponde (muro sinistro e destro) della vasca **NON devono finire pari con la
superficie della lava**: devono essere **più alte di 1 tile**. Altrimenti, quando
il player appoggia i piedi sul bordo della vasca, il suo ingombro tocca comunque la
lava adiacente (stessa quota) e **si scotta**. Con la sponda 1 tile più alta si crea
un **bordo sicuro** su cui posarsi. È così nei livelli reali (es. `level2`).

### SBAGLIATO (sponde pari alla lava → ci si brucia sul bordo)
```
#~~~~~~#
#~~~~~~#
########
```

### CORRETTO (sponde 1 tile sopra la lava → bordo sicuro)
```
#      #     <- le sponde salgono 1 tile sopra la lava
#~~~~~~#
#~~~~~~#
########
```

### Regola costruttiva
Se la lava occupa le righe `rL0..rL1` nelle colonne `c0..c1`:
- **fondo:** riga `rL1+1`, colonne `c0-1 .. c1+1` = muro;
- **sponde:** colonne `c0-1` e `c1+1` = muro dalle righe `rL0-1` fino a `rL1`
  (cioè **una riga più in alto** della lava);
- la lava resta aperta solo verso l'alto (dalla riga `rL0-1` in su è vuoto tra le
  due sponde).

Pseudocodice del generatore (`tub`):
```
def tub(bottom_row, c0, w, depth):
    top = bottom_row - depth          # prima riga di lava
    for r in range(top, bottom_row):  # lava
        for c in range(c0, c0+w): grid[r][c] = LAVA
    # sponde: da top-1 (una riga SOPRA la lava) fino a bottom_row-1
    for r in range(top-1, bottom_row):
        grid[r][c0-1] = WALL
        grid[r][c0+w] = WALL
    # fondo
    for c in range(c0-1, c0+w+1): grid[bottom_row][c] = WALL
```

### Validazione
Per ogni tratto di lava, controlla che sulla **riga sopra la cima della lava**
esistano i muri delle sponde a `c0-1` e `c1+1` (il "bordo rialzato"), oltre al
fondo sotto e alle sponde ai lati della lava stessa.

> Nota: applicare questa correzione anche alle vasche di `level_new_v6.js` (che ha
> le sponde pari): basta rigenerare con la `tub` aggiornata qui sopra.

---

## 17. Laboratorio e campi extra (aggiornamento 2026-10-30)

- `test.html` gioca i livelli di `levels/test/` (elencati in `levels/test/elenco.js`), oppure un livello
  incollato dall'editor o scelto da file, e mostra un **controllo automatico** (griglia, cornice, pezzi
  obbligatori, vasche, porte senza OPEN, risolvibilità con ingombro 3×3).
- Campi facoltativi in `loadLevelData`: `name` (titolo mostrato a inizio livello) e `background`
  (numero dello sfondo `jpg/sfondoN.jpg` usato nel laboratorio).
- Esempio completo: `tools/livelli/vitto01_nove_stanze.py` (usa la libreria `tools/livelli/icarous_lib.py`).
- Campo facoltativo `intro`: una riga di trama mostrata sotto il titolo a inizio livello.
- Attenzione ai **nemici orizzontali alla stessa altezza di una porta**: quando la porta si apre,
  il nemico ci passa attraverso e vaga nelle altre stanze. Mettili su righe dove il muro è pieno.
