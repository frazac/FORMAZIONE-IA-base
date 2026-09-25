# postit-js

Post-it di revisione: segnaposto da lasciare direttamente sulla pagina, con un filo di risposte, per rivedere un sito o delle slide in due (chi rivede ↔ chi corregge, anche un agente IA).

JavaScript senza dipendenze, un file CSS, un backend minimo in PHP o in Python. Le note vivono in un file JSON **dell'installazione**, non in questo repository.

## Cosa fa

- **Aggancio a più livelli**: elemento DOM (selettore + impronta di testo), poi sezione (`context`), poi coordinate di pagina come ripiego. Se la pagina cambia, il segnaposto si ritrova o diventa tratteggiato («posizione approssimativa»).
- **Filo di risposte** e stati: `open` → `resolved` → `closed` (o di nuovo `open`).
- Segnaposto **trascinabili**, nota istantanea sul **testo selezionato**, navigazione ← → tra le note.
- **Numeri solo per le note aperte**; le risolte mostrano ✓.
- **«Risolvi tutto» / «Archivia tutto»**: l'archivio è un file Markdown, sempre dell'installazione.
- Etichette in italiano e francese.

## Installazione (git subtree)

```bash
git remote add postit-js https://github.com/frazac/postit-js.git
git subtree add --prefix=<cartella>/postit postit-js main --squash
# aggiornare:
git subtree pull --prefix=<cartella>/postit postit-js main --squash
# rimandare qui una modifica fatta nell'installazione:
git subtree push --prefix=<cartella>/postit postit-js main
```

## Configurazione

Frontend: prima di `annotate.js`, `window.AnnotateConfig = {…}` (oppure attributi `data-annotate-*` sul tag):
`api`, `itemUrl`, `replyUrl`, `actionUrl`, `page()`, `context`, `exclude`, `author`, `lang`, `labels`, `drift`, `bulk`.
Colori: variabili CSS `--annotate-accent`, `--annotate-ok`, `--annotate-danger`, `--annotate-mark`, `--annotate-font`.

Backend PHP: un file dell'installazione imposta le variabili e include l'API.

```php
<?php
$POSTIT_DATA = __DIR__ . '/../dati/note.json';          // dove stanno le note
$POSTIT_ARCHIVIO = __DIR__ . '/../dati/archivio.md';     // facoltativo
$POSTIT_CONSENTITO = fn() => true;                        // facoltativo: di default solo 127.0.0.1 / ::1
require __DIR__ . '/postit/api/annotate-api.php';
```

Backend Python (sviluppo): `POSTIT_DATA=/percorso/note.json POSTIT_PORT=8765 python3 api/annotate-server.py`.

## API

| Metodo | URL | Corpo |
| :--- | :--- | :--- |
| GET | `annotate-api.php` | — (tutte le note) |
| POST | `annotate-api.php` | `{page, text, quote?, anchor, context, x_percent, y_percent, viewport, doc, ua, url}` |
| POST | `?action=risposta&id=…` | `{text, author, status?}` |
| PATCH | `?id=…` | `{status}` oppure `{position: {…}}` |
| DELETE | `?id=…` | — |
| POST | `?action=risolvi-tutto` | `{page}` |
| POST | `?action=archivia` | `{page}` |

## Installazioni

Vedi la tabella in `CHANGELOG.md`. Idea per il futuro: un modulo Drupal che usi lo stesso frontend.

## Riservatezza

Il codice è pubblico; **le note no**: stanno nei file dati delle installazioni, che non vanno messi sotto versione in un repository pubblico.
