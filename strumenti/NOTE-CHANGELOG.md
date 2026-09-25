# Post-it — changelog

Dal 2026-09-25 il changelog del plugin sta in **`strumenti/postit/CHANGELOG.md`**, dentro il subtree di
[github.com/frazac/postit-js](https://github.com/frazac/postit-js), insieme alla tabella delle installazioni.

In questo progetto restano solo i file di installazione:

- `note.js` — configurazione (`window.AnnotateConfig`), poi carica `postit/annotate.js`
- `note.css` — `@import` di `postit/annotate.css` + colori dai token del progetto
- `note-api.php` — percorsi delle note (`bozze/note.json`, `bozze/note-archivio.md`), poi `postit/api/annotate-api.php`
- `note-server.py` — lo stesso per il server Python di sviluppo

Aggiornare il plugin: `git subtree pull --prefix=strumenti/postit postit-js main --squash`
Rimandare una modifica: `git subtree push --prefix=strumenti/postit postit-js main`
