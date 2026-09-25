/*
 * Post-it — formazione-ia-base: configurazione, poi il plugin.
 * Il plugin è strumenti/postit/annotate.js (subtree di github.com/frazac/postit-js):
 *   aggiornare:  git subtree pull --prefix=strumenti/postit postit-js main --squash
 *   rimandare:   git subtree push --prefix=strumenti/postit postit-js main
 *
 * Backend: MAMP PRO (strumenti/note-api.php) oppure il server Python (note-server.py).
 * Pagina servita da http(s): API sullo stesso host. Pagina aperta da file://: API su MAMP.
 * Si può forzare l'indirizzo con data-api sul tag <script>.
 * Chiave di pagina: nome del file dentro bozze/ o giorni/ (es. "g1.html", condivisa), pathname altrove.
 */
(function () {
  var tag = document.currentScript;
  var base = tag ? tag.src : location.href;
  var MAMP = 'https://formazione-ia-base.localhost:8890/strumenti/note-api.php';
  var api = (tag && tag.getAttribute('data-api')) ||
    (/^https?:$/.test(location.protocol) ? new URL('../strumenti/note-api.php', base).href : MAMP);
  window.AnnotateConfig = Object.assign({
    api: api,
    // bozze/g1.html e giorni/g1.html condividono le note (stesse slide, stessi id)
    page: function () { return decodeURIComponent(window.location.pathname.split(/\/(?:bozze|giorni)\//).pop()); },
    context: '.slide, [data-nota]',
    author: 'FZ',
    lang: 'it',
    labels: {
      offline: 'Note non raggiungibili: MAMP PRO è acceso? (host formazione-ia-base)',
      confirmArchiveAll: 'Archiviare TUTTE le note di questa pagina in bozze/note-archivio.md? I segnaposto spariranno.'
    }
  }, window.AnnotateConfig || {});

  // il plugin, stessa versione di questo file (?v=…)
  var s = document.createElement('script');
  s.src = new URL('postit/annotate.js' + (new URL(base).search || ''), base).href;
  document.head.appendChild(s);
})();
