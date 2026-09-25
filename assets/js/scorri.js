/*
 * Scorrimento delle slide da tastiera (solo in locale, caricato con i post-it).
 * ↓ ↑, PagGiù PagSu, spazio: una slide alla volta. Premuto a ripetizione, si va
 * veloci (ogni pressione conta, anche a scorrimento in corso); tenuto premuto,
 * le slide scorrono da sole a passo regolare. Senza questo script resta lo
 * scroll-snap del CSS.
 */
(function () {
  'use strict';

  var PASSO_TENUTO = 160;   // ms tra una slide e l'altra con il tasto tenuto premuto
  var AVANTI = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };
  var slides = [];
  var bersaglio = -1;       // slide verso cui si sta andando (accumula le pressioni rapide)
  var ultimo = 0;           // istante dell'ultimo passo
  var inCorso = null;       // timer di fine scorrimento

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
    clearTimeout(inCorso);
    inCorso = setTimeout(function () { bersaglio = -1; }, 450);
  }

  function scrivendo(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  document.addEventListener('keydown', function (evt) {
    var dir = AVANTI[evt.key];
    if (!dir || evt.altKey || evt.ctrlKey || evt.metaKey || scrivendo(evt.target)) return;
    if (evt.key === ' ' && evt.shiftKey) dir = -1;
    evt.preventDefault();
    var ora = Date.now();
    if (evt.repeat) {
      // tasto tenuto: passo regolare, senza animazione
      if (ora - ultimo < PASSO_TENUTO) return;
      ultimo = ora;
      vai((bersaglio >= 0 ? bersaglio : attuale()) + dir, true);
      return;
    }
    // pressioni rapide: se uno scorrimento è in corso si parte dal suo arrivo, e si salta l'animazione
    var rapido = bersaglio >= 0;
    ultimo = ora;
    vai((rapido ? bersaglio : attuale()) + dir, rapido);
  });

  function avvia() { slides = Array.prototype.slice.call(document.querySelectorAll('.slide')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
