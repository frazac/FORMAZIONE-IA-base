/*
 * Post-it — motore di commenti a segnaposto, v2.3.0
 * (vedi CHANGELOG.md di postit-js)
 *
 * Widget post-it condiviso (landing IT/FR + pannello admin).
 *
 * Stati di una nota: open (lasciata dall'utente) → resolved (Claude/dev
 * dichiara di averla sistemata) → closed (l'utente conferma) oppure di nuovo
 * open (l'utente riapre). Le note "closed" non vengono più disegnate.
 * Ogni nota ha un filo di risposte (`replies`).
 *
 * Aggancio (2.2), dal più preciso al meno preciso:
 *   1. pagina   `page` (di default il pathname dell'URL)
 *   2. elemento `anchor`: l'elemento DOM sotto il puntatore (selettore CSS
 *      fino al primo antenato con id, più tag/testo come impronta per
 *      ritrovarlo se la pagina cambia), posizione in % dell'elemento
 *   3. sezione  `context`: l'antenato intermedio (sezione, slide…) scelto con
 *      il selettore `context` della configurazione, con etichetta e posizione
 *   4. pagina   `x_percent`/`y_percent` in % del documento (come la 1.x),
 *      più viewport/doc/ua/url salvati in silenzio per il debug (mobile).
 * Se l'elemento non si trova si scende al livello successivo e il segnaposto
 * diventa tratteggiato ("posizione approssimativa").
 *
 * Uso: in modalità inserimento l'elemento sotto il puntatore si evidenzia;
 * clic → nota su quell'elemento (↑ nel riquadro per passare al genitore).
 * Con del testo selezionato, il pulsante crea subito una nota su quel testo.
 * I segnaposto si trascinano per spostarli: l'aggancio si ricalcola.
 * Numeri e contatore contano solo le note aperte; le risolte mostrano ✓ (2.3).
 * Accanto alle frecce: «Risolvi tutto» e «Archivia tutto» per la pagina (2.3).
 *
 * Configurazione per installazione: window.AnnotateConfig = {...} prima dello
 * script, oppure attributi data-annotate-* sul tag <script>:
 *   api        endpoint (data-annotate-api, default /annotate-api.php)
 *   itemUrl    function (api, id) → URL per PATCH/DELETE (default api?id=)
 *   replyUrl   function (api, id) → URL per le risposte (default api?action=risposta&id=)
 *   actionUrl  function (api, nome) → URL delle azioni sulla pagina (default api?action=nome)
 *   bulk       false (o data-annotate-bulk="0") nasconde «Risolvi tutto»/«Archivia tutto»
 *   page       function () → chiave della pagina (default location.pathname)
 *   context    selettore dell'elemento intermedio (data-annotate-context)
 *   exclude    selettore di elementi da non agganciare (data-annotate-exclude)
 *   author     autore delle risposte (data-annotate-author, default FZ)
 *   lang       it|fr (default da <html lang>), labels: {chiave: testo}
 *   drift      scarto di larghezza oltre cui una nota solo-coordinate è
 *              "approssimativa" (default 0.1 = 10%)
 */
(function () {
  'use strict';

  var VERSIONE = '2.3.0';

  var LABELS = {
    it: {
      fab: 'Lascia un feedback', placing: 'Clicca un elemento della pagina',
      fabSelection: 'Commenta il testo selezionato',
      hint: 'Clicca l\'elemento da commentare — ← → per scorrere le note, Esc per annullare',
      placeholder: 'Scrivi la tua nota...', cancel: 'Annulla', save: 'Salva',
      del: 'Elimina', resolve: 'Risolvi', reopen: 'Riapri', confirm: 'Conferma',
      pending: 'Risolta — da confermare',
      reply: 'Rispondi', replyPlaceholder: 'Aggiungi un commento…',
      confirmDel: 'Eliminare la nota e le sue risposte?',
      prev: 'Nota precedente', next: 'Nota successiva',
      resolveAll: 'Risolvi tutto', archiveAll: 'Archivia tutto',
      confirmResolveAll: 'Segnare come risolte tutte le note aperte di questa pagina?',
      confirmArchiveAll: 'Archiviare TUTTE le note di questa pagina? I segnaposto spariranno (restano nell\'archivio sul server).',
      actionFailed: 'Operazione non riuscita',
      parent: 'Aggancia all\'elemento contenitore', page: 'Pagina intera',
      drag: 'Trascina il segnaposto per spostarlo',
      approxContext: 'Elemento non trovato: posizione nella sezione, approssimativa.',
      approxPage: 'Elemento non trovato: posizione sulla pagina, approssimativa.',
      approxLegacy: 'Nota senza aggancio (versione 1.x, finestra originale sconosciuta): posizione approssimativa.',
      approxViewport: 'Nota senza aggancio, lasciata con finestra {w}×{h}: posizione approssimativa.',
      offline: 'Server delle note non raggiungibile', locale: 'it-IT'
    },
    fr: {
      fab: 'Laisser un commentaire', placing: 'Cliquez sur un élément de la page',
      fabSelection: 'Commenter le texte sélectionné',
      hint: 'Cliquez sur l\'élément à commenter — ← → pour parcourir les notes, Échap pour annuler',
      placeholder: 'Écrivez votre note...', cancel: 'Annuler', save: 'Enregistrer',
      del: 'Supprimer', resolve: 'Résoudre', reopen: 'Réouvrir', confirm: 'Confirmer',
      pending: 'Résolue — à confirmer',
      reply: 'Répondre', replyPlaceholder: 'Ajouter un commentaire…',
      confirmDel: 'Supprimer la note et ses réponses ?',
      prev: 'Note précédente', next: 'Note suivante',
      resolveAll: 'Tout résoudre', archiveAll: 'Tout archiver',
      confirmResolveAll: 'Marquer comme résolues toutes les notes ouvertes de cette page ?',
      confirmArchiveAll: 'Archiver TOUTES les notes de cette page ? Les repères disparaîtront (elles restent dans l\'archive sur le serveur).',
      actionFailed: 'Opération échouée',
      parent: 'Accrocher à l\'élément parent', page: 'Page entière',
      drag: 'Faites glisser le repère pour le déplacer',
      approxContext: 'Élément introuvable : position dans la section, approximative.',
      approxPage: 'Élément introuvable : position sur la page, approximative.',
      approxLegacy: 'Note sans ancrage (version 1.x, fenêtre d\'origine inconnue) : position approximative.',
      approxViewport: 'Note sans ancrage, laissée avec une fenêtre de {w}×{h} : position approximative.',
      offline: 'Serveur des notes injoignable', locale: 'fr-FR'
    }
  };

  // ---- configurazione per installazione ------------------------------------
  var scriptTag = document.currentScript;
  var user = window.AnnotateConfig || {};
  function attr(name) { return scriptTag ? scriptTag.getAttribute('data-annotate-' + name) : null; }
  function sep(url) { return url.indexOf('?') < 0 ? '?' : '&'; }

  var C = {
    api: user.api || attr('api') || '/annotate-api.php',
    itemUrl: user.itemUrl || function (api, id) { return api + sep(api) + 'id=' + encodeURIComponent(id); },
    replyUrl: user.replyUrl || function (api, id) { return api + sep(api) + 'action=risposta&id=' + encodeURIComponent(id); },
    actionUrl: user.actionUrl || function (api, name) { return api + sep(api) + 'action=' + encodeURIComponent(name); },
    page: user.page || function () { return window.location.pathname; },
    context: user.context || attr('context') || '[data-nota], section, article, header, footer, main > *, body > *',
    exclude: user.exclude || attr('exclude') || '',
    author: user.author || attr('author') || 'FZ',
    lang: user.lang || attr('lang') || (document.documentElement.lang || 'it').slice(0, 2),
    drift: user.drift || 0.1,
    bulk: user.bulk !== undefined ? !!user.bulk : attr('bulk') !== '0'
  };
  var L = Object.assign({}, LABELS[C.lang] || LABELS.it, user.labels || {});
  var API = C.api;
  var page = C.page();

  var placing = false;
  var pending = null;   // nota in composizione: {el, x, y, quote} (x/y in coordinate documento)
  var notes = [];
  var openCard = null;
  var online = true;

  var widget = document.createElement('div');
  widget.id = 'annotate-widget';
  widget.setAttribute('data-versione', VERSIONE);
  widget.innerHTML =
    '<div class="annotate-box" id="annotate-hover" hidden><span class="annotate-box__label"></span></div>' +
    '<div class="annotate-box annotate-box--target" id="annotate-target" hidden><span class="annotate-box__label"></span></div>' +
    '<div class="annotate-nav" id="annotate-nav" hidden>' +
      '<button type="button" class="annotate-nav__btn" data-annotate-prev>←</button>' +
      '<span class="annotate-nav__pos" id="annotate-nav-pos"></span>' +
      '<button type="button" class="annotate-nav__btn" data-annotate-next>→</button>' +
      '<button type="button" class="annotate-nav__btn annotate-nav__btn--text" data-annotate-bulk="risolvi-tutto"></button>' +
      '<button type="button" class="annotate-nav__btn annotate-nav__btn--text" data-annotate-bulk="archivia"></button>' +
    '</div>' +
    '<button type="button" id="annotate-fab" class="annotate-fab">' +
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3097 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>' +
      '<span class="annotate-fab__count" id="annotate-count" hidden>0</span>' +
    '</button>' +
    '<div class="annotate-hint" id="annotate-hint" hidden></div>' +
    '<div id="annotate-pins"></div>' +
    '<div id="annotate-composer" class="annotate-composer" hidden>' +
      '<div class="annotate-composer__where">' +
        '<span class="annotate-card__meta" id="annotate-composer-where"></span>' +
        '<button type="button" class="annotate-mini-btn" data-annotate-parent>↑</button>' +
      '</div>' +
      '<blockquote class="annotate-quote" id="annotate-composer-quote" hidden></blockquote>' +
      '<textarea id="annotate-composer-text" rows="3"></textarea>' +
      '<div class="annotate-card__debug" id="annotate-composer-drag"></div>' +
      '<div class="annotate-composer__actions">' +
        '<button type="button" class="annotate-btn annotate-btn--ghost" data-annotate-cancel></button>' +
        '<button type="button" class="annotate-btn annotate-btn--solid" data-annotate-save></button>' +
      '</div>' +
    '</div>';

  // ---- DOM: scelta, descrizione e ritrovamento degli elementi ----------------

  function isWidget(el) {
    return !!(el && el.closest && el.closest('#annotate-widget, .annotate-card'));
  }

  // elemento agganciabile a partire da un nodo qualunque (null = pagina intera)
  function pickTarget(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || isWidget(el)) return null;
    var svg = el.closest('svg');
    if (svg) el = svg;
    if (el === document.body || el === document.documentElement) return null;
    if (C.exclude && el.closest(C.exclude)) return null;
    return el;
  }

  function elementAt(cx, cy) {
    var list = document.elementsFromPoint ? document.elementsFromPoint(cx, cy) : [document.elementFromPoint(cx, cy)];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && !isWidget(list[i])) return pickTarget(list[i]);
    }
    return null;
  }

  // selettore CSS dall'elemento fino al primo antenato con id univoco (o body)
  function cssPath(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
        parts.unshift('#' + CSS.escape(el.id));
        return parts.join(' > ');
      }
      var i = 1, sib = el;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) i++;
      parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    parts.unshift('body');
    return parts.join(' > ');
  }

  function query(sel) {
    try { return document.querySelector(sel); } catch (e) { return null; }
  }

  function fingerprint(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function shown(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  function contextOf(el) {
    var c = el && el.closest(C.context);
    return c && c !== document.body && c !== document.documentElement && !isWidget(c) ? c : null;
  }

  function short(s, n) { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function contextLabel(c) {
    if (c.getAttribute('data-nota')) return c.getAttribute('data-nota');
    var h = c.matches('h1, h2, h3, h4') ? c : c.querySelector('h1, h2, h3, h4');
    if (h && h.textContent.trim()) return short(h.textContent, 60);
    if (c.id) return '#' + c.id;
    var cls = (c.getAttribute('class') || '').trim().split(/\s+/)[0];
    return c.tagName.toLowerCase() + (cls ? '.' + cls : '');
  }

  function describe(el) {
    var cls = (el.getAttribute('class') || '').trim().split(/\s+/)[0];
    var d = el.tagName.toLowerCase() + (el.id ? '#' + el.id : cls ? '.' + cls : '');
    var t = fingerprint(el);
    return t ? d + ' “' + short(t, 28) + '”' : d;
  }

  function where(el) {
    if (!el) return L.page;
    var c = contextOf(el);
    return c && c !== el ? contextLabel(c) + ' › ' + describe(el) : describe(el);
  }

  function findContext(c) {
    var el = query(c.selector);
    if (el && !isWidget(el) && (!c.label || contextLabel(el) === c.label)) return el;
    if (c.label) {
      var all = document.querySelectorAll(C.context);
      for (var i = 0; i < all.length; i++) {
        if (!isWidget(all[i]) && contextLabel(all[i]) === c.label) return all[i];
      }
    }
    return el && !isWidget(el) ? el : null; // stessa posizione, titolo cambiato
  }

  function findAnchor(a, ctxEl, quote) {
    var el = query(a.selector);
    var tagOk = el && (!a.tag || el.tagName.toLowerCase() === a.tag);
    if (el && !isWidget(el) && tagOk && (!a.text || fingerprint(el) === a.text)) return el;
    if (a.id) {
      var byId = document.getElementById(a.id);
      if (byId) return byId;
    }
    var scope = ctxEl || document.body;
    if (a.tag && a.text) {
      var cands = scope.querySelectorAll(a.tag);
      var i, partial = null;
      for (i = 0; i < cands.length; i++) {
        if (isWidget(cands[i])) continue;
        var fp = fingerprint(cands[i]);
        if (fp === a.text) return cands[i];
        // testo ritoccato: uno contiene l'inizio dell'altro
        if (!partial && fp.length >= 4 && a.text.length >= 4 &&
            (fp.indexOf(a.text.slice(0, 24)) === 0 || a.text.indexOf(fp.slice(0, 24)) === 0)) partial = cands[i];
      }
      if (partial) return partial;
    }
    if (quote) {
      var needle = quote.replace(/\s+/g, ' ').trim().slice(0, 40);
      var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.replace(/\s+/g, ' ').indexOf(needle) >= 0 && !isWidget(node.parentElement)) return pickTarget(node);
      }
    }
    return el && !isWidget(el) && tagOk ? el : null; // stessa posizione, testo cambiato
  }

  function docSize() {
    var el = document.documentElement;
    return { w: Math.max(el.scrollWidth, window.innerWidth), h: Math.max(el.scrollHeight, window.innerHeight) };
  }

  function unit(v) { return Math.max(0, Math.min(1, v)); }

  // tutti i livelli di aggancio per un punto (coordinate documento) su un elemento
  function capture(el, x, y) {
    var s = docSize();
    var cx = x - window.scrollX, cy = y - window.scrollY;
    var pos = {
      anchor: null, context: null,
      x_percent: unit(x / s.w), y_percent: unit(y / s.h),
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      doc: { w: s.w, h: s.h },
      ua: navigator.userAgent, url: window.location.href
    };
    if (el) {
      var b = el.getBoundingClientRect();
      pos.anchor = {
        selector: cssPath(el), tag: el.tagName.toLowerCase(), id: el.id || '', text: fingerprint(el),
        x: unit((cx - b.left) / (b.width || 1)), y: unit((cy - b.top) / (b.height || 1))
      };
      var c = contextOf(el);
      if (c) {
        var cb = c.getBoundingClientRect();
        pos.context = {
          selector: cssPath(c), label: contextLabel(c),
          x: unit((cx - cb.left) / (cb.width || 1)), y: unit((cy - cb.top) / (cb.height || 1))
        };
      }
    }
    return pos;
  }

  // note della 2.0 (formazione-ia-base): `slide` = id dell'elemento, x/y in % dell'elemento
  function normalize(n) {
    if (!n.anchor && n.slide) {
      n.anchor = { selector: '#' + CSS.escape(String(n.slide)), tag: '', id: String(n.slide), text: '', x: n.x_percent, y: n.y_percent };
      n._elementOnly = true;
    }
    return n;
  }

  // posizione attuale di una nota: {x, y (documento), el, mode, warn}
  function locate(note) {
    var a = note.anchor, c = note.context;
    var ctxEl = c ? findContext(c) : null;
    if (ctxEl && !shown(ctxEl)) ctxEl = null;
    var el = a ? findAnchor(a, ctxEl, note.quote) : null;
    if (el && !shown(el)) el = null;
    var target = el || ctxEl;
    if (target) {
      var b = target.getBoundingClientRect();
      var px = el ? a.x : c.x, py = el ? a.y : c.y;
      return {
        x: b.left + window.scrollX + px * b.width, y: b.top + window.scrollY + py * b.height,
        el: target, mode: el ? 'anchor' : 'context', warn: el ? '' : L.approxContext
      };
    }
    if (note._elementOnly) return null;
    var s = docSize(), warn = '';
    if (a || c) warn = L.approxPage;
    else if (!note.viewport) warn = L.approxLegacy;
    else if (Math.abs(window.innerWidth - note.viewport.w) / note.viewport.w > C.drift) {
      warn = L.approxViewport.replace('{w}', note.viewport.w).replace('{h}', note.viewport.h);
    }
    return { x: note.x_percent * s.w, y: note.y_percent * s.h, el: null, mode: 'page', warn: warn };
  }

  function mount() {
    document.body.appendChild(widget);

    var fab = document.getElementById('annotate-fab');
    var countBadge = document.getElementById('annotate-count');
    var pinsLayer = document.getElementById('annotate-pins');
    var composer = document.getElementById('annotate-composer');
    var composerText = document.getElementById('annotate-composer-text');
    var composerWhere = document.getElementById('annotate-composer-where');
    var composerQuote = document.getElementById('annotate-composer-quote');
    var parentBtn = composer.querySelector('[data-annotate-parent]');
    var nav = document.getElementById('annotate-nav');
    var navPos = document.getElementById('annotate-nav-pos');
    var hint = document.getElementById('annotate-hint');
    var hoverBox = document.getElementById('annotate-hover');
    var targetBox = document.getElementById('annotate-target');
    var cursor = -1;
    var selSnap = null;
    var pendingPin = null;
    var targetEl = null;

    fab.setAttribute('aria-label', L.fab);
    fab.title = L.fab;
    hint.textContent = L.hint;
    composerText.placeholder = L.placeholder;
    parentBtn.title = L.parent;
    parentBtn.setAttribute('aria-label', L.parent);
    document.getElementById('annotate-composer-drag').textContent = L.drag;
    composer.querySelector('[data-annotate-cancel]').textContent = L.cancel;
    composer.querySelector('[data-annotate-save]').textContent = L.save;
    nav.querySelector('[data-annotate-prev]').setAttribute('aria-label', L.prev);
    nav.querySelector('[data-annotate-next]').setAttribute('aria-label', L.next);

    // ---- riquadri di evidenziazione (hover e elemento scelto) ----
    function frame(box, el, label) {
      if (!el) { box.hidden = true; return; }
      var r = el.getBoundingClientRect();
      box.style.left = r.left + 'px';
      box.style.top = r.top + 'px';
      box.style.width = r.width + 'px';
      box.style.height = r.height + 'px';
      box.firstChild.textContent = label || '';
      box.classList.toggle('annotate-box--label-inside', r.top < 26);
      box.hidden = false;
    }

    function setTarget(el) {
      targetEl = el;
      frame(targetBox, el, el ? where(el) : '');
    }

    // ---- stato ----
    function setOnline(on) {
      online = on;
      fab.classList.toggle('is-offline', !on);
      if (!on) fab.title = L.offline;
    }

    function closeCard() {
      if (openCard) { openCard.remove(); openCard = null; }
      if (!pending) setTarget(null);
    }

    function closeComposer() {
      composer.hidden = true;
      composerText.value = '';
      pending = null;
      if (pendingPin) { pendingPin.remove(); pendingPin = null; }
      setTarget(null);
    }

    function setPlacing(on) {
      placing = on;
      nav.hidden = !on || visibleNotes().length === 0;
      hint.hidden = !on;
      if (!on) { cursor = -1; navPos.textContent = ''; hoverBox.hidden = true; }
      document.body.classList.toggle('annotate-placing', on);
      fab.classList.toggle('is-active', on);
      fab.title = on ? L.placing : L.fab;
    }

    function visibleNotes() {
      return notes.filter(function (n) { return n.status === 'open' || n.status === 'resolved'; });
    }

    // numerazione dei segnaposto: ordine di creazione
    function byCreation() {
      return visibleNotes().sort(function (a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); });
    }

    // contatore e numeri: solo le note aperte (le risolte aspettano una conferma, non lavoro)
    function renderCount() {
      var n = visibleNotes().filter(function (x) { return x.status === 'open'; }).length;
      countBadge.hidden = n === 0;
      countBadge.textContent = String(n);
    }

    function layerOrigin() {
      var r = pinsLayer.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY };
    }

    function placePin(pin, x, y) {
      var o = layerOrigin();
      pin.style.left = (x - o.x) + 'px';
      pin.style.top = (y - o.y) + 'px';
    }

    // centro del segnaposto in coordinate documento
    function pinPoint(pin) {
      var r = pin.getBoundingClientRect();
      return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY };
    }

    // trascinamento (mouse e touch); onDrop riceve il punto in coordinate documento
    function draggable(pin, onDrop) {
      var start = null;
      pin.addEventListener('pointerdown', function (evt) {
        if (evt.button !== 0) return;
        evt.stopPropagation();
        start = { x: evt.clientX, y: evt.clientY, left: parseFloat(pin.style.left), top: parseFloat(pin.style.top), moved: false };
        pin.setPointerCapture(evt.pointerId);
      });
      pin.addEventListener('pointermove', function (evt) {
        if (!start) return;
        var dx = evt.clientX - start.x, dy = evt.clientY - start.y;
        if (!start.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
        start.moved = true;
        pin.classList.add('is-dragging');
        pin.style.left = (start.left + dx) + 'px';
        pin.style.top = (start.top + dy) + 'px';
        var el = elementAt(evt.clientX, evt.clientY);
        frame(hoverBox, el, where(el));
      });
      function end() {
        if (!start) return;
        var moved = start.moved;
        start = null;
        pin.classList.remove('is-dragging');
        hoverBox.hidden = true;
        if (!moved) return;
        pin._dragged = true; // il clic che segue il rilascio non apre la scheda
        setTimeout(function () { pin._dragged = false; }, 0);
        var p = pinPoint(pin);
        onDrop(p, elementAt(p.x - window.scrollX, p.y - window.scrollY));
      }
      pin.addEventListener('pointerup', end);
      pin.addEventListener('pointercancel', end);
    }

    function renderPin(note, index) {
      var pin = document.createElement('div');
      pin.className = 'annotate-pin' + (note.status === 'resolved' ? ' annotate-pin--resolved' : '');
      if ((note.replies || []).length) pin.classList.add('annotate-pin--thread');
      pin.setAttribute('data-id', note.id);
      pin.title = L.drag;
      var label = document.createElement('span');
      label.className = 'annotate-pin__label';
      label.textContent = index < 0 ? '✓' : String(index + 1);
      pin.appendChild(label);
      pin.addEventListener('click', function (evt) {
        evt.stopPropagation();
        if (!pin._dragged) openNoteCard(note, pin);
      });
      draggable(pin, function (p, el) { moveNote(note.id, capture(el, p.x, p.y)); });
      pinsLayer.appendChild(pin);
    }

    // ricalcola la posizione dei segnaposto (senza ricostruirli né chiudere schede)
    function layout() {
      Array.prototype.forEach.call(pinsLayer.querySelectorAll('.annotate-pin[data-id]'), function (pin) {
        var note = noteById(pin.getAttribute('data-id'));
        var loc = note && locate(note);
        pin.hidden = !loc;
        if (!loc) return;
        pin._loc = loc;
        pin.classList.toggle('annotate-pin--approx', !!loc.warn);
        placePin(pin, loc.x, loc.y);
      });
      if (pending && pendingPin && !pendingPin.classList.contains('is-dragging')) placePin(pendingPin, pending.x, pending.y);
      if (targetEl) frame(targetBox, targetEl, where(targetEl));
    }

    function renderPins() {
      Array.prototype.forEach.call(pinsLayer.querySelectorAll('.annotate-pin[data-id]'), function (p) { p.remove(); });
      closeCard();
      var open = 0;
      byCreation().forEach(function (note) { renderPin(note, note.status === 'open' ? open++ : -1); });
      layout();
      renderCount();
      if (placing) nav.hidden = visibleNotes().length === 0;
    }

    var queued = false;
    function relayout() {
      if (queued) return;
      queued = true;
      setTimeout(function () { queued = false; layout(); }, 30); // non rAF: si ferma a scheda nascosta
    }

    function noteById(id) { return notes.filter(function (n) { return n.id === id; })[0]; }
    function pinOf(id) { return pinsLayer.querySelector('.annotate-pin[data-id="' + id + '"]'); }

    function reopenCard(id) {
      var pin = pinOf(id), note = noteById(id);
      if (pin && note && !pin.hidden) openNoteCard(note, pin);
    }

    // navigazione: ordine della pagina (posizione attuale dei segnaposto)
    function inPageOrder() {
      return visibleNotes().map(function (n) { return { note: n, pin: pinOf(n.id) }; })
        .filter(function (o) { return o.pin && !o.pin.hidden; })
        .sort(function (a, b) {
          var ta = parseFloat(a.pin.style.top), tb = parseFloat(b.pin.style.top);
          return ta !== tb ? ta - tb : parseFloat(a.pin.style.left) - parseFloat(b.pin.style.left);
        });
    }

    function go(step) {
      var list = inPageOrder();
      if (!list.length) return;
      cursor = (cursor + step + list.length) % list.length; // alla fine ricomincia
      var o = list[cursor];
      closeCard();
      o.pin.scrollIntoView({ block: 'center', behavior: 'instant' });
      navPos.textContent = (cursor + 1) + '/' + list.length;
      setTimeout(function () { openNoteCard(o.note, o.pin); }, 30);
    }

    nav.querySelector('[data-annotate-prev]').addEventListener('click', function (evt) { evt.stopPropagation(); go(-1); });
    nav.querySelector('[data-annotate-next]').addEventListener('click', function (evt) { evt.stopPropagation(); go(1); });

    // azioni su tutte le note della pagina: POST api?action=risolvi-tutto|archivia con {page}
    var BULK = { 'risolvi-tutto': [L.resolveAll, L.confirmResolveAll], archivia: [L.archiveAll, L.confirmArchiveAll] };
    Array.prototype.forEach.call(nav.querySelectorAll('[data-annotate-bulk]'), function (b) {
      var name = b.getAttribute('data-annotate-bulk');
      if (!C.bulk) { b.remove(); return; }
      b.textContent = BULK[name][0];
      b.addEventListener('click', function (evt) {
        evt.stopPropagation();
        if (!window.confirm(BULK[name][1])) return;
        send(C.actionUrl(API, name), 'POST', { page: page })
          .then(function () { cursor = -1; navPos.textContent = ''; loadNotes(); })
          .catch(function (e) { failed(); window.alert(L.actionFailed + ': ' + e.message); });
      });
    });

    function button(cls, text, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'annotate-btn ' + cls;
      b.textContent = text;
      b.addEventListener('click', function (evt) { evt.stopPropagation(); onClick(); });
      return b;
    }

    function div(cls, text) {
      var d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      return d;
    }

    // posiziona una scheda vicino a un punto (coordinate finestra): sotto, o sopra se non c'è spazio
    function fit(box, x, y) {
      var w = box.offsetWidth, h = box.offsetHeight, gap = 18;
      var top = y + gap + h <= window.innerHeight - 8 ? y + gap : y - gap - h;
      box.style.left = Math.max(8, Math.min(x - 13, window.innerWidth - w - 8)) + 'px';
      box.style.top = Math.max(8, Math.min(top, window.innerHeight - h - 8)) + 'px';
    }

    function when(iso) {
      return new Date(iso).toLocaleString(L.locale, { dateStyle: 'short', timeStyle: 'short' });
    }

    function noteWhere(note, loc) {
      if (loc && loc.el) return where(loc.el);
      if (note.context && note.context.label) return note.context.label;
      return L.page;
    }

    function debugLine(note) {
      if (!note.viewport) return '';
      var v = note.viewport;
      var dev = /iPhone|iPad|Android|Mobile/i.test(note.ua || '') ? ' · mobile' : '';
      return v.w + '×' + v.h + (v.dpr && v.dpr !== 1 ? ' @' + v.dpr + 'x' : '') + dev;
    }

    function openNoteCard(note, pinEl) {
      closeCard();
      var loc = pinEl._loc || locate(note);
      setTarget(loc && loc.el);
      var rect = pinEl.getBoundingClientRect();
      var card = document.createElement('div');
      card.className = 'annotate-card';
      card.addEventListener('click', function (evt) { evt.stopPropagation(); });

      card.appendChild(div('annotate-card__meta', when(note.created_at) + ' · ' + noteWhere(note, loc)));
      if (note.status === 'resolved') card.appendChild(div('annotate-card__state', L.pending));
      if (loc && loc.warn) card.appendChild(div('annotate-card__warn', loc.warn));
      if (note.quote) {
        var q = document.createElement('blockquote');
        q.className = 'annotate-quote';
        q.textContent = note.quote;
        card.appendChild(q);
      }

      var text = document.createElement('p');
      text.className = 'annotate-card__text';
      text.textContent = note.text;
      card.appendChild(text);

      // filo delle risposte
      (note.replies || []).forEach(function (r) {
        var box = div('annotate-reply' + (r.author === 'Claude' ? ' annotate-reply--claude' : ''), '');
        box.appendChild(div('annotate-card__meta', r.author + ' — ' + when(r.created_at)));
        var txt = document.createElement('p');
        txt.className = 'annotate-card__text';
        txt.textContent = r.text;
        box.appendChild(txt);
        card.appendChild(box);
      });

      var area = document.createElement('textarea');
      area.rows = 2;
      area.placeholder = L.replyPlaceholder;
      card.appendChild(area);

      // con testo: risposta (+ eventuale cambio di stato); senza testo: solo cambio di stato
      function act(status) {
        var t = area.value.trim();
        if (t) replyTo(note.id, t, status);
        else if (status) setStatus(note.id, status);
      }

      var actions = document.createElement('div');
      actions.className = 'annotate-card__actions';
      actions.appendChild(button('annotate-btn--danger', L.del, function () {
        if (window.confirm(L.confirmDel)) deleteNote(note.id);
      }));
      actions.appendChild(button('annotate-btn--ghost', L.reply, function () { act(null); }));
      if (note.status === 'resolved') {
        actions.appendChild(button('annotate-btn--ghost', L.reopen, function () { act('open'); }));
        actions.appendChild(button('annotate-btn--ok', L.confirm, function () { act('closed'); }));
      } else {
        actions.appendChild(button('annotate-btn--solid', L.resolve, function () { act('resolved'); }));
      }
      area.addEventListener('keydown', function (evt) {
        if (evt.key === 'Enter' && (evt.metaKey || evt.ctrlKey)) act(null);
      });
      card.appendChild(actions);

      var dbg = debugLine(note);
      if (dbg) card.appendChild(div('annotate-card__debug', dbg));

      document.body.appendChild(card);
      fit(card, rect.left + rect.width / 2, rect.top + rect.height / 2);
      openCard = card;
    }

    // ---- composizione di una nota nuova ----
    function updateComposerWhere() {
      composerWhere.textContent = where(pending.el);
      parentBtn.disabled = !pending.el;
      setTarget(pending.el);
    }

    function startPending(p) {
      closeCard();
      closeComposer();
      pending = p;
      pendingPin = document.createElement('div');
      pendingPin.className = 'annotate-pin annotate-pin--pending';
      pendingPin.title = L.drag;
      pendingPin.innerHTML = '<span class="annotate-pin__label">+</span>';
      pendingPin.addEventListener('click', function (evt) { evt.stopPropagation(); });
      draggable(pendingPin, function (pt, el) {
        pending.x = pt.x;
        pending.y = pt.y;
        pending.el = el;
        updateComposerWhere();
      });
      pinsLayer.appendChild(pendingPin);
      placePin(pendingPin, p.x, p.y);

      composerQuote.hidden = !p.quote;
      composerQuote.textContent = p.quote || '';
      updateComposerWhere();
      composer.hidden = false;
      fit(composer, p.x - window.scrollX, p.y - window.scrollY);
      composerText.value = '';
      composerText.focus({ preventScroll: true });
    }

    parentBtn.addEventListener('click', function (evt) {
      evt.stopPropagation();
      if (pending && pending.el) {
        pending.el = pickTarget(pending.el.parentElement);
        updateComposerWhere();
      }
    });

    // testo selezionato: fotografato prima che il clic sul pulsante lo annulli
    function snapshotSelection() {
      var s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) return null;
      var text = s.toString().trim();
      if (!text) return null;
      var range = s.getRangeAt(0);
      if (isWidget(range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)) return null;
      var rects = range.getClientRects();
      var last = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
      return {
        el: pickTarget(range.commonAncestorContainer),
        x: last.right + window.scrollX, y: last.top + last.height / 2 + window.scrollY,
        quote: text.slice(0, 1000)
      };
    }

    document.addEventListener('selectionchange', function () {
      var has = !!snapshotSelection();
      fab.classList.toggle('has-selection', has && !placing);
      if (!placing && online) fab.title = has ? L.fabSelection : L.fab;
    });

    // ---- API ----
    function replace(updated) {
      notes = notes.map(function (n) { return n.id === updated.id ? normalize(updated) : n; });
    }

    function send(url, method, body) {
      return fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setOnline(true);
        return res.json();
      });
    }

    function failed() { setOnline(false); }

    function loadNotes() {
      fetch(API, { headers: { 'Accept': 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
        .then(function (all) {
          setOnline(true);
          notes = (all || []).filter(function (n) { return n.page === page; }).map(normalize);
          renderPins();
        })
        .catch(failed);
    }

    function saveNote(text) {
      if (!pending) return;
      var body = Object.assign({ page: page, text: text, quote: pending.quote || '' }, capture(pending.el, pending.x, pending.y));
      send(API, 'POST', body)
        .then(function (note) { notes.push(normalize(note)); closeComposer(); renderPins(); })
        .catch(failed);
    }

    function setStatus(id, status) {
      send(C.itemUrl(API, id), 'PATCH', { status: status })
        .then(function (updated) { replace(updated); renderPins(); })
        .catch(failed);
    }

    function moveNote(id, position) {
      send(C.itemUrl(API, id), 'PATCH', { position: position })
        .then(function (updated) { replace(updated); renderPins(); reopenCard(id); })
        .catch(function () { failed(); layout(); });
    }

    function replyTo(id, text, status) {
      var body = { text: text, author: C.author };
      if (status) body.status = status;
      send(C.replyUrl(API, id), 'POST', body)
        .then(function (updated) { replace(updated); renderPins(); reopenCard(id); })
        .catch(failed);
    }

    function deleteNote(id) {
      send(C.itemUrl(API, id), 'DELETE')
        .then(function () {
          notes = notes.filter(function (n) { return n.id !== id; });
          renderPins();
        })
        .catch(failed);
    }

    // ---- eventi ----
    fab.addEventListener('pointerdown', function () { selSnap = snapshotSelection(); });

    fab.addEventListener('click', function (evt) {
      evt.stopPropagation();
      closeCard();
      if (!online) { loadNotes(); window.alert(L.offline); return; }
      var snap = selSnap || snapshotSelection();
      selSnap = null;
      if (snap) {
        setPlacing(false);
        fab.classList.remove('has-selection');
        window.getSelection().removeAllRanges();
        startPending(snap);
        return;
      }
      setPlacing(!placing);
    });

    // hover in modalità inserimento: evidenzia l'elemento che verrà agganciato
    document.addEventListener('pointermove', function (evt) {
      if (!placing || evt.pointerType === 'touch') return;
      var el = isWidget(evt.target) ? null : elementAt(evt.clientX, evt.clientY);
      frame(hoverBox, el, where(el));
    });

    // clic in modalità inserimento: in cattura, così link e form della pagina non scattano
    document.addEventListener('click', function (evt) {
      if (!placing || isWidget(evt.target)) return;
      evt.preventDefault();
      evt.stopPropagation();
      if (openCard) { closeCard(); return; } // primo clic fuori chiude la scheda aperta dalla navigazione
      var el = pickTarget(evt.target);
      setPlacing(false);
      startPending({ el: el, x: evt.clientX + window.scrollX, y: evt.clientY + window.scrollY, quote: '' });
    }, true);

    document.addEventListener('click', function (evt) {
      if (!placing && openCard && !openCard.contains(evt.target)) closeCard();
    });

    composer.querySelector('[data-annotate-cancel]').addEventListener('click', function (evt) {
      evt.stopPropagation();
      closeComposer();
    });
    composer.querySelector('[data-annotate-save]').addEventListener('click', function (evt) {
      evt.stopPropagation();
      var text = composerText.value.trim();
      if (text !== '') saveNote(text);
    });
    composer.addEventListener('click', function (evt) { evt.stopPropagation(); });
    composerText.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter' && (evt.metaKey || evt.ctrlKey)) {
        var text = composerText.value.trim();
        if (text !== '') saveNote(text);
      }
    });

    document.addEventListener('keydown', function (evt) {
      var tag = evt.target.tagName;
      if (placing && tag !== 'TEXTAREA' && tag !== 'INPUT' && (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight')) {
        evt.preventDefault();
        go(evt.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (evt.key !== 'Escape') return;
      if (!composer.hidden) closeComposer();
      if (placing) setPlacing(false);
      closeCard();
    });

    window.addEventListener('resize', relayout);
    window.addEventListener('scroll', function () {
      if (targetEl) frame(targetBox, targetEl, where(targetEl));
      hoverBox.hidden = true;
    }, { passive: true });
    window.addEventListener('load', relayout);
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.body);
    // anche i cambi di contenuto che non cambiano l'altezza (riordini, testi, classi)
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target.nodeType === 1 ? list[i].target : list[i].target.parentElement;
        if (t && !isWidget(t)) { relayout(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] });

    loadNotes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
