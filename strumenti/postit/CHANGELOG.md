# Post-it — motore di commenti a segnaposto

Widget di revisione per lasciare note puntuali su una pagina (FZ ↔ Claude/dev).
Versionamento [semver](https://semver.org/lang/it/): MAGGIORE.MINORE.CORREZIONE.
La versione è scritta in testa a `note.js`, `note.css` e `note-server.py`, nell'attributo
`data-versione` del widget e nell'intestazione HTTP `X-Postit-Versione`.

## Installazioni

| Progetto | File | Backend | Versione |
| :--- | :--- | :--- | :--- |
| masterismi.dev | subtree `public/assets/postit` + `public/annotate-api.php` (configurazione + require) | PHP, `panel/data/landing-notes.json` (archivio: `landing-notes-archivio.md`, fuori da git), accesso `AdminAuth` (401 senza login) | **2.3.0** (online) |
| masterismi.it | `public/js/postit.js`, `postit-api.php` + login | PHP, `postit-data/notes.json`, account per lingua | 1.x (variante con login) |
| formazione-ia-base (FORMAZIONE-IA-base) | `strumenti/note.js`, `note.css`, `note-api.php` (MAMP) o `note-server.py` | PHP su MAMP PRO (o Python), `bozze/note.json` (archivio: `bozze/note-archivio.md`) | **2.3.0** (anche sulle pagine del sito in locale: indice, materiali, bibliografia) |

## 2.3.0 — 2026-09-25 (masterismi.dev, da formazione-ia-base)

Le aggiunte locali di formazione-ia-base del 2026-09-25 entrano nel plugin. Compatibile con i dati 2.x: nessuna migrazione.

- **Numeri solo per le note aperte**: segnaposto numerati 1, 2, 3… e contatore sul pulsante contano solo le `open`; le `resolved` mostrano ✓.
- **«Risolvi tutto» / «Archivia tutto»** accanto alle frecce (modalità inserimento), con conferma; etichette IT/FR (`resolveAll`, `archiveAll`, `confirmResolveAll`, `confirmArchiveAll`, `actionFailed`). Dopo l'azione le note si ricaricano senza ricaricare la pagina. Si nascondono con `bulk: false` o `data-annotate-bulk="0"`.
- Configurazione nuova: `actionUrl(api, nome)` (default `api?action=nome`), `bulk`.
- CSS: `.annotate-nav__btn--text` (pulsanti con testo).
- **API**: `POST ?action=risolvi-tutto` con `{page}` → tutte le `open` della pagina diventano `resolved` (`{ok, risolte}`); `POST ?action=archivia` con `{page}` → tutte le note della pagina, in ordine di creazione e con citazione e risposte, in coda a un archivio Markdown, poi tolte dal JSON (`{ok, archiviate}`).
- Il pulsante «✎ Modifica testo» di formazione-ia-base resta fuori dal plugin (è specifico delle slide).

### 2.3.0 su formazione-ia-base — 2026-09-25

- `note.js` = blocco di configurazione + `annotate.js` 2.3.0 **di nuovo copiato senza modifiche** (tolte la modifica locale ai numeri e i pulsanti nel blocco di configurazione). Resta solo `labels.confirmArchiveAll`, che nomina `bozze/note-archivio.md`.
- `note.css` = `annotate.css` 2.3.0 + le variabili `--annotate-*` sui token (la regola di stampa e i pulsanti con testo ora sono nel plugin).
- `note-api.php` e `note-server.py`: solo il numero di versione (le azioni c'erano già).
- Copie della 2.2.0: `note.js.bak-2.2`, `note.css.bak-2.2`.

## 2.2.0 — 2026-09-24 (masterismi.dev)

Aggancio a più livelli, pensato per qualunque sito (non solo slide). Compatibile con i dati 1.x e 2.x.

**Modello della nota** (in ordine di precisione; se un livello non si trova si passa al successivo)
1. `page`: chiave della pagina (di default il pathname dell'URL).
2. `anchor` `{selector, tag, id, text, x, y}`: l'elemento DOM più vicino al punto. `selector` è il percorso CSS fino al primo antenato con `id` univoco, quindi contiene già i genitori; `tag` + `text` (prime 80 lettere) servono da impronta per ritrovarlo se la pagina cambia (riordini, testi ritoccati). `x`/`y` in % dell'elemento.
3. `context` `{selector, label, x, y}`: l'elemento intermedio (sezione, slide…), scelto con un selettore configurabile; `label` = `data-nota`, primo titolo h1–h4, `id` o classe.
4. `x_percent`/`y_percent`: coordinate in % della pagina intera, come la 1.x. Si salvano sempre, in silenzio, come ripiego.
5. Dati di debug, anch'essi silenziosi: `viewport {w, h, dpr}`, `doc {w, h}`, `ua`, `url`; più `quote` se la nota nasce da un testo selezionato.

Valutazione "salvare i genitori": non serve una lista a parte. Il selettore contiene già la catena dei genitori, e il `context` è il genitore che conta per ritrovare la nota (anche con il solo titolo).

**Uso**
- In modalità inserimento l'elemento sotto il puntatore si evidenzia, con un'etichetta "Sezione › elemento". Al clic resta selezionato; con ↑ nel riquadro si passa all'elemento contenitore.
- Con del testo selezionato, il pulsante (arancione) crea subito una nota su quel testo, con la citazione.
- I segnaposto, sia quello nuovo sia quelli salvati, si **trascinano**: al rilascio l'aggancio si ricalcola e si salva (`PATCH ?id=` con `{position}`).
- Segnaposto **tratteggiato** = posizione approssimativa: elemento non trovato (ripiego su sezione o pagina), nota solo a coordinate con finestra diversa da quella originale (scarto oltre `drift`, 10%), o nota 1.x senza dimensioni della finestra. Il motivo è scritto nella scheda.
- La scheda mostra la sezione e l'elemento, la citazione e, in piccolo, la finestra usata ("390×844 @3x · mobile"). Si apre sopra o sotto il segnaposto a seconda dello spazio.
- I segnaposto seguono i cambi di impaginazione: ridimensionamento, contenuti che cambiano (ResizeObserver + MutationObserver).

**Configurazione per installazione**: `window.AnnotateConfig = {…}` prima dello script, oppure `data-annotate-*` sul tag `<script>`. Chiavi: `api`, `itemUrl(api, id)`, `replyUrl(api, id)`, `page()`, `context`, `exclude`, `author`, `lang`, `labels`, `drift`. Colori con le variabili CSS `--annotate-accent`, `--annotate-ok`, `--annotate-danger`, `--annotate-mark`, `--annotate-font`.

**API** (tutte le 1.x/2.x restano valide): in più `PATCH ?id=` con `{position: {anchor, context, x_percent, y_percent, viewport, doc, ua, url}}` per lo spostamento, che aggiunge `moved_at`. Endpoint risposta `POST ?action=risposta&id=` come la 2.1.0.

**Compatibilità dati**
- 1.x: nessun `anchor`, coordinate di pagina: si disegnano come prima, tratteggiate. Su masterismi.dev le 26 note esistenti sono state migrate con `anchor: null`, `context: null`, `viewport: null`, `doc: null`, `legacy: "1.x"`, `replies: []`; coordinate, testi e stati invariati. Trascinandone una si aggancia a un elemento e perde `legacy`.
- 2.0 (formazione-ia-base): `slide` + x/y relativi all'elemento vengono letti come `anchor` con selettore `#slide`.

**Non ancora portato**: il plugin Grav dei siti cliente (1.x), masterismi.it (1.x).

### 2.2.0 su formazione-ia-base — 2026-09-24

- `note.js` = blocco di configurazione (`window.AnnotateConfig`: API come la 2.1.0, `page` = nome del file in `bozze/`, `context: '.slide, [data-nota]'`, `author: 'FZ'`) + `annotate.js` di masterismi.dev **copiato senza modifiche**. Per aggiornarlo: ricopiare `annotate.js` sotto il blocco.
- `note.css` = `annotate.css` senza modifiche + in fondo le variabili `--annotate-*` mappate sui token (`--c-blu`, `--c-salmone`, `--f-testo`).
- `note-api.php` e `note-server.py`: campi di posizione 2.2 e `PATCH ?id=` con `{position}`; lo spostamento toglie `slide`, `slide_n` e `legacy`.
- `bozze/note.json` migrato (35 note): `slide` → `anchor {selector: "#<slide>", id, x, y}`, `context: null`, `legacy: "2.0"`; `x_percent`/`y_percent` restano quelli relativi alla slide (se la slide non c'è più il segnaposto è tratteggiato). Copia prima della migrazione: `bozze/note.pre-2.2.json`.
- Pagine del sito (`index.html`, `materiali.html`, `bibliografia.html`): caricano i post-it solo fuori da `*.github.io`.

### Aggiunte locali (2026-09-25, formazione-ia-base) — confluite nella 2.3.0
- Numeri dei segnaposto e contatore solo per le note aperte; le risolte mostrano ✓ (unica modifica al corpo di `annotate.js`, segnata nel file).
- Pulsanti «Risolvi tutto» e «Archivia tutto» accanto alle frecce (nel blocco di configurazione, non nel corpo). API: `POST ?action=risolvi-tutto` e `POST ?action=archivia` con `{page}`, in PHP e Python. L'archivio è `bozze/note-archivio.md` (in Markdown, con le risposte).
- Chiave di pagina condivisa tra `bozze/gN.html` e `giorni/gN.html`.

## Per portare la 2.2.0 su un'altra installazione

1. Backend: accettare e restituire i campi di posizione (`anchor`, `context`, `viewport`, `doc`, `ua`, `url`, `quote`) e `PATCH ?id=` con `{position}`. Riferimento: `masterismi.dev/public/annotate-api.php`, funzioni `anchor()`, `context()`, `position()`.
2. Frontend: copiare `annotate.js`/`annotate.css` e configurarli con `AnnotateConfig`, senza modificarli. Per formazione-ia-base, ad esempio: `api` come oggi, `page` = nome del file in `bozze/`, `context: '.slide, [data-nota]'`, `author: 'FZ'`.
3. Nessuna marcatura obbligatoria nell'HTML; `data-nota="Etichetta"` sui blocchi dà solo etichette più leggibili.

## 2.1.0 — 2026-09-24 (formazione-ia-base)

- **Backend PHP per MAMP PRO**: `note-api.php`, stesse API e stesso file dati del server Python; risponde solo a richieste da 127.0.0.1/::1.
- Endpoint risposta unificato: `POST …?action=risposta&id=…` (PHP e Python; il Python accetta anche `/note/risposta`).
- Scelta automatica dell'indirizzo: pagina servita da http(s) → API sullo stesso host (`../strumenti/note-api.php`); pagina aperta da `file://` → host MAMP `https://formazione-ia-base.localhost:8890`. Si può forzare con `data-api` sul tag `<script>`.
- Messaggio "non raggiungibile" riferito a MAMP.

## 2.0.0 — 2026-09-24 (ai-base)

Prima versione numerata. Deriva da masterismi.dev `annotate.js` (1.x).

**Cambiamenti incompatibili con la 1.x**
- Le note si agganciano a un **elemento** (`.slide` o qualunque `[data-nota]`) e non più alla pagina intera: posizione in % dell'elemento, campi nuovi `slide` (id dell'ancora) e `slide_n` (etichetta). Restano al loro posto a qualunque larghezza della finestra.
- Chiave di pagina: il nome del file dentro `bozze/` (funziona sia da `file://` sia da `http://`).
- Endpoint: `http://127.0.0.1:8765/note` (server Python, CORS aperto anche per `file://`).

**Novità**
- **Filo di risposte**: ogni nota ha `replies: [{author, text, created_at}]`. Endpoint `POST /note/risposta?id=…` con `{"text", "author", "status"?}`: si può rispondere e cambiare stato in un colpo solo (es. riaprire con un commento).
- **Navigazione**: in modalità inserimento compaiono ← → accanto alla matita per scorrere le note nell'ordine della pagina, con contatore (2/7) e ripartenza dall'inizio; anche con i tasti freccia.
- **Stato del server**: pulsante grigio e messaggio se il server è spento.
- **Suggerimento** a schermo in modalità inserimento ("Clicca il punto da commentare — Esc per annullare").
- Pallino sul segnaposto quando la nota ha risposte; conferma prima di eliminare.
- Stile con i token del progetto (`--c-blu`, `--c-salmone`, `--f-testo`); nascosto in stampa.

**Invariato dalla 1.x**
- Stati `open` → `resolved` → `closed` (o di nuovo `open`); le note `closed` non si disegnano.
- API REST: `GET /note`, `POST /note`, `PATCH /note?id=` (`status`), `DELETE /note?id=`.

## 2.0.0 su masterismi.dev — 2026-09-24

Portate filo di risposte, navigazione ← → con contatore e tasti freccia, suggerimento in modalità inserimento, pallino sulle note con risposte, conferma prima di eliminare; etichette IT/FR invariate (da `<html lang>`).
- Endpoint risposta in PHP: `POST /annotate-api.php?action=risposta&id=…` (accettato anche `/annotate-api.php/risposta?id=…` via PATH_INFO), stesso corpo `{text, author, status?}`. Intestazione `X-Postit-Versione`, scrittura atomica del JSON.
- **Aggancio non migrato**: le note restano in coordinate % della pagina intera (1.x), niente `[data-nota]`; ordine di navigazione = dall'alto in basso. Dati esistenti intatti (`replies` assente = nessuna risposta).
- Nessun indicatore "server spento": il backend è lo stesso sito PHP.
- Il plugin Grav dei siti cliente (`panel/templates/grav-plugins/annotate/`) resta 1.x.

## Per portare la 2.0.0 su un'altra installazione (storico)

1. Backend: aggiungere `replies` al modello e l'endpoint `risposta` (in PHP: stesso schema di `PATCH`, con append a `replies`).
2. Frontend: sostituire `annotate.js`/`postit.js` con `note.js`, impostando `API` e la chiave di pagina (`page`).
3. Ancore: marcare con `data-nota="Etichetta"` (e un `id` stabile) i blocchi commentabili; senza ancore, mettere `data-nota` sul `main` per commentare la pagina intera.
4. Migrazione dati 1.x: le vecchie note (x/y sulla pagina) si possono agganciare al `main` con `slide` = id del `main`.
5. Per masterismi.it: mantenere login e permessi per lingua (sono nel backend), e il campo `author` può venire dalla sessione.
