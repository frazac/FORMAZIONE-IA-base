/*
 * Scorrimento delle slide da tastiera e mouse.
 * ↓ ↑, PagGiù PagSu, spazio (Maiusc+spazio indietro): una slide alla volta.
 * Pressioni rapide: ogni pressione conta, anche a scorrimento in corso (si salta
 * l'animazione). Tasto tenuto premuto: dopo un attimo le slide scorrono da sole,
 * sempre più veloci, finché non si rilascia. Il ritmo è deciso qui, non dalla
 * ripetizione dei tasti del sistema operativo (diversa tra Mac e Windows).
 * Clic sinistro su una slide: avanti; clic destro: indietro (Maiusc+clic destro
 * apre il menu del browser). Link, pulsanti, post-it e modifica del testo non
 * sono toccati. Nelle bozze (bozze/) il mouse non fa scorrere: solo tastiera.
 * Senza questo script resta lo scroll-snap del CSS.
 */
(function () {
  'use strict';

  var ATTESA = 300;         // ms prima che il tasto tenuto faccia partire lo scorrimento
  var PASSO_INIZIO = 220;   // ms tra una slide e l'altra all'inizio
  var PASSO_MINIMO = 70;    // ms tra una slide e l'altra a regime
  var ACCELERA = 0.85;      // ogni passo dura questa frazione del precedente
  var TASTI = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };

  var slides = [];
  var bersaglio = -1;       // slide verso cui si sta andando (accumula le pressioni rapide)
  var fineCorsa = null;     // timer di fine scorrimento animato
  var tenuto = null;        // { tasto, dir, timer, passo } mentre un tasto è premuto

  function attuale() {
    var meta = window.innerHeight / 2, migliore = 0, dist = Infinity;
    for (var i = 0; i < slides.length; i++) {
      var r = slides[i].getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - meta);
      if (d < dist) { dist = d; migliore = i; }
    }
    return migliore;
  }

  function vai(i, subito) {
    bersaglio = Math.max(0, Math.min(slides.length - 1, i));
    slides[bersaglio].scrollIntoView({ block: 'center', behavior: subito ? 'instant' : 'smooth' });
    clearTimeout(fineCorsa);
    fineCorsa = setTimeout(function () { bersaglio = -1; }, subito ? 120 : 500);
  }

  // un passo: se uno scorrimento è in corso si parte dal suo arrivo e si salta l'animazione
  function passo(dir) {
    if (!slides.length) return;
    var inCorso = bersaglio >= 0;
    vai((inCorso ? bersaglio : attuale()) + dir, inCorso);
  }

  function ripeti() {
    passo(tenuto.dir);
    tenuto.passo = Math.max(PASSO_MINIMO, tenuto.passo * ACCELERA);
    tenuto.timer = setTimeout(ripeti, tenuto.passo);
  }

  function rilascia() {
    if (!tenuto) return;
    clearTimeout(tenuto.timer);
    tenuto = null;
  }

  function scrivendo(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  document.addEventListener('keydown', function (evt) {
    var dir = TASTI[evt.key];
    if (!dir || evt.altKey || evt.ctrlKey || evt.metaKey || scrivendo(evt.target)) return;
    if (evt.key === ' ' && evt.shiftKey) dir = -1;
    evt.preventDefault();
    if (tenuto && tenuto.tasto === evt.key) return;   // ripetizione del sistema: ci pensa il timer
    rilascia();
    passo(dir);
    tenuto = { tasto: evt.key, dir: dir, passo: PASSO_INIZIO, timer: null };
    tenuto.timer = setTimeout(ripeti, ATTESA);
  });

  document.addEventListener('keyup', function (evt) {
    if (tenuto && (evt.key === tenuto.tasto || !TASTI[evt.key])) rilascia();
    else if (tenuto && evt.key === 'Shift') rilascia();
  });
  window.addEventListener('blur', rilascia);

  // --- mouse ---------------------------------------------------------------

  // nelle bozze il clic serve a post-it e modifica del testo: niente scorrimento col mouse
  var bozza = /\/bozze\//.test(location.pathname);

  var INTERATTIVI ='a, button, input, textarea, select, label, summary, video, audio, iframe, [contenteditable], [role="button"], [class*="annotate"]';

  function cliccabile(evt) {
    var t = evt.target;
    if (bozza) return false;
    if (!(t instanceof Element) || !t.closest('.slide')) return false;
    if (t.closest(INTERATTIVI)) return false;
    if (document.body.classList.contains('modifica-attiva')) return false;
    if (document.querySelector('.annotate-card, #annotate-composer:not([hidden]), body.annotate-placing')) return false;
    var sel = window.getSelection();
    return !(sel && !sel.isCollapsed && String(sel).trim() !== '');   // si stava selezionando del testo
  }

  // lo stato si legge alla pressione: al clic i post-it potrebbero aver già chiuso la scheda
  var clicValido = false;
  document.addEventListener('mousedown', function (evt) {
    clicValido = evt.button === 0 && cliccabile(evt);
  }, true);

  document.addEventListener('click', function (evt) {
    if (evt.button !== 0 || evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;
    if (!clicValido || !cliccabile(evt)) return;
    clicValido = false;
    passo(1);
  });

  document.addEventListener('contextmenu', function (evt) {
    if (evt.shiftKey || evt.altKey || evt.metaKey) return;   // menu del browser
    if (evt.ctrlKey && evt.button === 0) return;             // Ctrl+clic su Mac = menu
    if (!cliccabile(evt)) return;
    evt.preventDefault();
    passo(-1);
  });

  function avvia() { slides = Array.prototype.slice.call(document.querySelectorAll('.slide')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
