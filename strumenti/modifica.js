/*
 * Modifica diretta del testo delle slide — solo in locale (bozze/gN.html e giorni/gN.html da MAMP).
 * Pulsante ✎ sopra quello dei commenti: i testi diventano modificabili; «Salva» manda le slide
 * toccate a strumenti/modifica-api.php, che scrive in bozze/gN.html (con copia di sicurezza)
 * e riallinea scaletta, giorni/gN.html e indice. Invio = a capo; incolla = solo testo.
 */
(function () {
  'use strict';

  var tag = document.currentScript;
  var API = new URL('modifica-api.php', tag ? tag.src : location.href).href;
  var m = location.pathname.match(/\/(g[1-4])\.html$/);
  if (!m) return;
  var GIORNO = m[1];
  var TESTI = 'h1, h2, h3, p, li, blockquote, td, th, dt, dd';

  var attivo = false;
  var toccate = {};

  var stile = document.createElement('style');
  stile.textContent =
    '.modifica-pulsanti{position:fixed;right:1.25rem;bottom:calc(1.25rem + 64px);z-index:2147483002;display:flex;flex-direction:column;align-items:flex-end;gap:8px}' +
    '.modifica-pulsanti button{height:44px;min-width:44px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;' +
    'font:500 14px/1 var(--f-testo,system-ui);background:#fff;color:#000;box-shadow:0 6px 18px rgba(0,0,0,.2)}' +
    '.modifica-pulsanti .salva{background:rgb(46,139,123);color:#fff}' +
    'body.modifica-attiva .slide [contenteditable]{outline:1px dashed rgba(105,143,255,.6);outline-offset:2px;cursor:text}' +
    'body.modifica-attiva .slide [contenteditable]:focus{outline:2px solid rgb(105,143,255);background:rgba(105,143,255,.06)}' +
    '@media print{.modifica-pulsanti{display:none!important}}';
  document.head.appendChild(stile);

  var box = document.createElement('div');
  box.className = 'modifica-pulsanti';
  var bModifica = pulsante('✎ Modifica testo', 'modifica');
  var bSalva = pulsante('Salva', 'salva');
  var bAnnulla = pulsante('Annulla', 'annulla');
  bSalva.hidden = bAnnulla.hidden = true;
  box.appendChild(bAnnulla);
  box.appendChild(bSalva);
  box.appendChild(bModifica);

  function pulsante(testo, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = testo;
    return b;
  }

  function modificabili() {
    return Array.prototype.filter.call(document.querySelectorAll('.slide ' + TESTI.split(', ').join(', .slide ')), function (el) {
      return !el.closest('svg, figure, .annotate-card') && !el.querySelector(TESTI) && el.textContent.trim() !== '';
    });
  }

  function attiva(si) {
    attivo = si;
    document.body.classList.toggle('modifica-attiva', si);
    modificabili().forEach(function (el) {
      if (si) { el.setAttribute('contenteditable', 'true'); el.setAttribute('spellcheck', 'true'); }
      else { el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); }
    });
    bModifica.hidden = si;
    bSalva.hidden = bAnnulla.hidden = !si;
  }

  // contenuto pulito di una slide, come va scritto nel file
  function pulito(section) {
    var copia = section.cloneNode(true);
    Array.prototype.forEach.call(copia.querySelectorAll('[contenteditable], [spellcheck]'), function (el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });
    // pulizia: niente <br> in coda (li lascia il browser) e niente voci o paragrafi rimasti vuoti
    Array.prototype.forEach.call(copia.querySelectorAll(TESTI), function (el) {
      while (el.lastChild && (el.lastChild.nodeName === 'BR' || (el.lastChild.nodeType === 3 && !el.lastChild.nodeValue.trim()))) {
        el.removeChild(el.lastChild);
      }
      if (!el.textContent.trim() && !el.querySelector('img, svg')) el.remove();
    });
    return copia.innerHTML;
  }

  function salva() {
    var ids = Object.keys(toccate);
    if (!ids.length) { attiva(false); return; }
    var slide = {};
    ids.forEach(function (id) { slide[id] = pulito(document.getElementById(id)); });
    bSalva.textContent = 'Salvataggio…';
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ giorno: GIORNO, slide: slide }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
      .then(function (j) {
        toccate = {};
        attiva(false);
        bSalva.textContent = 'Salva';
        window.alert('Salvate ' + j.slide.length + ' slide in bozze/' + GIORNO + '.html (copia: ' + j.copia + ').\n' +
          'Scaletta e giorni/' + GIORNO + '.html aggiornati; il PDF no: python3 strumenti/pubblica.py ' + GIORNO);
      })
      .catch(function (e) {
        bSalva.textContent = 'Salva';
        window.alert('Modifiche non salvate: ' + e.message);
      });
  }

  function avvia() {
    document.body.appendChild(box);
    bModifica.addEventListener('click', function () { attiva(true); });
    bAnnulla.addEventListener('click', function () {
      if (Object.keys(toccate).length && !window.confirm('Scartare le modifiche non salvate?')) return;
      location.reload();
    });
    bSalva.addEventListener('click', salva);

    document.addEventListener('input', function (e) {
      var s = attivo && e.target.closest && e.target.closest('.slide[id]');
      if (s) toccate[s.id] = true;
    });
    // Invio = a capo dentro lo stesso elemento; incolla = testo semplice
    document.addEventListener('keydown', function (e) {
      if (!attivo || !e.target.isContentEditable) return;
      if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); salva(); }
    });
    document.addEventListener('paste', function (e) {
      if (!attivo || !e.target.isContentEditable) return;
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });
    window.addEventListener('beforeunload', function (e) {
      if (attivo && Object.keys(toccate).length) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
