/*
 * Barra laterale delle slide (solo a schermo, mai nel PDF).
 * Pulsante tondo in alto a sinistra: apre e chiude la barra; accanto, la casa
 * porta alla homepage del corso su GitHub Pages. All'apertura della
 * pagina la barra si mostra per 2 secondi (sopra le slide) e poi si ritira; se ci
 * si passa sopra resta aperta. Aperta, le slide si stringono per farle posto.
 * Due viste, scelte dall'interruttore in cima alla barra (ricordato dal browser):
 *   Slide:     miniature delle slide, quella attuale al centro con le vicine;
 *   Struttura: capitoli a fisarmonica con i titoli delle slide, «Espandi tutti»
 *              e «Comprimi tutti» in fondo.
 * Clic su una miniatura o su un titolo: si va a quella slide.
 * Le miniature sono copie delle slide dentro un iframe: così post-it, modifica
 * del testo e scorrimento (scorri.js) non le scambiano per slide vere.
 */
(function () {
  'use strict';

  var ANTEPRIMA = 2000;     // ms di barra visibile all'apertura della pagina
  var CHIAVE = 'miniature-vista';
  var HOME = 'https://frazac.github.io/FORMAZIONE-IA-base/';

  var tag = document.currentScript;
  var base = tag ? tag.src : location.href;
  var foglio = document.createElement('link');
  foglio.rel = 'stylesheet';
  foglio.href = new URL('../css/miniature.css' + (new URL(base).search || ''), base).href;
  document.head.appendChild(foglio);

  // icone Lucide: panel-right-close per aprire, panel-right-open per chiudere
  var RETTANGOLO = '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>';
  function icona(freccia) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      RETTANGOLO + '<path d="' + freccia + '"/></svg>';
  }
  var ICONA_APRI = icona('m8 9 3 3-3 3');
  var ICONA_CHIUDI = icona('m10 15-3-3 3-3');

  // stile delle copie dentro l'iframe
  var STILE_FRAME =
    'html { scroll-snap-type: none; background: transparent; scrollbar-width: thin; }' +
    'body { margin: 0; padding: 8px 14px; background: transparent; }' +
    '.slide { width: 100%; margin: 0; cursor: pointer; scroll-snap-align: none;' +
    '  content-visibility: auto; contain-intrinsic-size: auto 135px;' +
    '  outline: 3px solid transparent; outline-offset: 2px; }' +
    '.slide + .slide { margin-top: 13px; }' +
    '.slide * { pointer-events: none; }' +
    '.slide:hover { outline-color: var(--c-bordo); }' +
    '.slide.attuale { outline-color: var(--c-blu); }';

  var slides = [], attuale = -1, aperta = false, vista = 'slide';
  var barra, pulsante, frame, copie = [], voci = [], capitoli = [], timerAnteprima = null;
  var timerStruttura = null, apertoDaSolo = null;

  function leggi() { try { return localStorage.getItem(CHIAVE); } catch (e) { return null; } }
  function scrivi(v) { try { localStorage.setItem(CHIAVE, v); } catch (e) { /* niente */ } }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function indiceAttuale() {
    var meta = window.innerHeight / 2, migliore = 0, dist = Infinity;
    for (var i = 0; i < slides.length; i++) {
      var r = slides[i].getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - meta);
      if (d < dist) { dist = d; migliore = i; }
    }
    return migliore;
  }

  function vai(i) {
    if (slides[i]) slides[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function titolo(s) {
    var h = s.querySelector('h1, h2, h3');
    if (!h) return '';
    var c = h.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('br'), function (br) { br.replaceWith(' '); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  // --- miniature (iframe) --------------------------------------------------

  function copia(s) {
    var c = s.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('script, iframe, audio, video, [class*="annotate"], [class*="modifica"]'), function (el) { el.remove(); });
    Array.prototype.forEach.call(c.querySelectorAll('[contenteditable]'), function (el) { el.removeAttribute('contenteditable'); });
    Array.prototype.forEach.call(c.querySelectorAll('img'), function (img) { img.loading = 'lazy'; });
    return c.outerHTML;
  }

  function documentoFrame() {
    var fogli = Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return (!l.media || l.media === 'all' || l.media === 'screen') && !/note\.css|annotate\.css|miniature\.css/.test(l.href);
    }).map(function (l) { return '<link rel="stylesheet" href="' + esc(l.href) + '">'; }).join('');
    return '<!doctype html><html lang="it"><head><meta charset="utf-8"><base href="' + esc(location.href) + '">' +
      fogli + '<style>' + STILE_FRAME + '</style></head><body>' + slides.map(copia).join('\n') + '</body></html>';
  }

  function centraMiniatura(subito) {
    var fs = copie[attuale];
    if (!fs || !frame.contentWindow) return;
    var alto = fs.offsetTop - (frame.clientHeight - fs.offsetHeight) / 2;
    frame.contentWindow.scrollTo({ top: Math.max(0, alto), behavior: subito ? 'instant' : 'smooth' });
  }

  // --- struttura -----------------------------------------------------------

  function costruisciStruttura(contenitore) {
    var gruppo = null;
    slides.forEach(function (s, i) {
      var nome = s.getAttribute('data-capitolo') || '—';
      if (!gruppo || gruppo.nome !== nome) {
        var d = document.createElement('details');
        d.className = 'mini-capitolo';
        d.innerHTML = '<summary></summary><ol></ol>';
        d.querySelector('summary').textContent = nome;
        contenitore.appendChild(d);
        gruppo = { nome: nome, el: d, lista: d.querySelector('ol'), da: i };
        capitoli.push(gruppo);
      }
      gruppo.a = i;
      var t = titolo(s);
      if (!t) return;
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" data-i="' + i + '"><span class="mini-num">' + (i + 1) + '</span><span></span></button>';
      li.querySelector('span + span').textContent = t;
      gruppo.lista.appendChild(li);
      voci.push({ i: i, el: li.firstChild });
    });
  }

  // --- stato ---------------------------------------------------------------

  function segna(i, subito) {
    if (i === attuale && !subito) return;
    if (copie[attuale]) copie[attuale].classList.remove('attuale');
    attuale = i;
    if (copie[i]) copie[i].classList.add('attuale');
    // voce di struttura: l'ultima con titolo che non supera la slide attuale
    var scelta = null;
    voci.forEach(function (v) {
      v.el.classList.remove('attuale');
      v.el.removeAttribute('aria-current');
      if (v.i <= i) scelta = v;
    });
    if (scelta) { scelta.el.classList.add('attuale'); scelta.el.setAttribute('aria-current', 'true'); }
    if (!aperta) return;
    if (vista === 'slide') centraMiniatura(subito);
    else if (scelta) {
      // a scorrimento finito: i capitoli attraversati per strada non si aprono
      clearTimeout(timerStruttura);
      if (subito) apriCapitoloAttuale(scelta.el, true);
      else timerStruttura = setTimeout(function () { apriCapitoloAttuale(scelta.el); }, 300);
    }
  }

  // apre il capitolo della slide attuale e richiude quello aperto prima in automatico
  // (i capitoli aperti a mano restano come sono)
  function apriCapitoloAttuale(voce, subito) {
    var d = voce.closest('details');
    if (d && !d.open) {
      if (apertoDaSolo && apertoDaSolo !== d) apertoDaSolo.open = false;
      d.open = true;
      apertoDaSolo = d;
    }
    voce.scrollIntoView({ block: 'nearest', behavior: subito ? 'instant' : 'smooth' });
  }

  function mostraVista(v) {
    vista = v === 'struttura' ? 'struttura' : 'slide';
    barra.setAttribute('data-vista', vista);
    Array.prototype.forEach.call(barra.querySelectorAll('[data-vista-scelta]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-vista-scelta') === vista));
    });
    segna(attuale, true);
  }

  // anteprima: barra sopra le slide, senza spostarle
  function apri(si, anteprima) {
    clearTimeout(timerAnteprima);
    var i = indiceAttuale();
    aperta = si;
    barra.classList.toggle('aperta', si);
    document.body.classList.toggle('mini-aperta', si && !anteprima);
    pulsante.innerHTML = si ? ICONA_CHIUDI : ICONA_APRI;
    pulsante.setAttribute('aria-expanded', String(si));
    pulsante.setAttribute('aria-label', si ? 'Chiudi la barra delle slide' : 'Apri la barra delle slide');
    pulsante.title = pulsante.getAttribute('aria-label');
    if (!anteprima && slides[i]) {
      requestAnimationFrame(function () { slides[i].scrollIntoView({ block: 'center', behavior: 'instant' }); });
    }
    if (si) requestAnimationFrame(function () { segna(indiceAttuale(), true); });
  }

  function fermaAnteprima() {
    if (!timerAnteprima) return;
    clearTimeout(timerAnteprima);
    timerAnteprima = null;
    apri(true);     // chi ci passa sopra la vuole aperta davvero
  }

  // --- avvio ---------------------------------------------------------------

  function costruisci() {
    slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    if (!slides.length) return;

    pulsante = document.createElement('button');
    pulsante.type = 'button';
    pulsante.className = 'mini-pulsante';
    pulsante.setAttribute('aria-controls', 'miniature');

    barra = document.createElement('aside');
    barra.className = 'miniature';
    barra.id = 'miniature';
    barra.setAttribute('aria-label', 'Barra delle slide');
    barra.innerHTML =
      '<div class="mini-testa"><div class="mini-switch" role="group" aria-label="Vista">' +
        '<button type="button" data-vista-scelta="slide">Slide</button>' +
        '<button type="button" data-vista-scelta="struttura">Struttura</button>' +
      '</div></div>' +
      '<div class="mini-corpo">' +
        '<iframe class="mini-frame" title="Miniature delle slide" tabindex="-1"></iframe>' +
        '<div class="mini-struttura"><div class="mini-capitoli"></div>' +
          '<div class="mini-piede"><button type="button" data-tutti="1">Espandi tutti</button>' +
          '<button type="button" data-tutti="0">Comprimi tutti</button></div></div>' +
      '</div>';
    frame = barra.querySelector('.mini-frame');
    costruisciStruttura(barra.querySelector('.mini-capitoli'));

    document.body.appendChild(barra);
    document.body.appendChild(pulsante);

    // accanto al tondo: la homepage del corso su GitHub Pages (icona Lucide house)
    var home = document.createElement('a');
    home.className = 'mini-pulsante mini-home';
    home.href = HOME;
    home.title = 'Homepage del corso';
    home.setAttribute('aria-label', 'Homepage del corso');
    home.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>' +
      '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
    document.body.appendChild(home);

    frame.addEventListener('load', function () {
      var fdoc = frame.contentDocument;
      if (!fdoc) return;
      copie = Array.prototype.slice.call(fdoc.querySelectorAll('.slide'));
      fdoc.addEventListener('click', function (evt) {
        var s = evt.target.closest && evt.target.closest('.slide');
        if (!s) return;
        vai(copie.indexOf(s));
        window.focus();     // i tasti tornano a scorri.js
      });
      segna(attuale < 0 ? indiceAttuale() : attuale, true);
    });
    frame.srcdoc = documentoFrame();

    pulsante.addEventListener('click', function () {
      var era = aperta;
      timerAnteprima = null;
      apri(!era);
      pulsante.blur();
    });

    barra.addEventListener('mouseenter', fermaAnteprima);
    barra.addEventListener('click', function (evt) {
      var b = evt.target.closest('button');
      if (!b) return;
      fermaAnteprima();
      if (b.hasAttribute('data-vista-scelta')) {
        scrivi(b.getAttribute('data-vista-scelta'));
        mostraVista(b.getAttribute('data-vista-scelta'));
      } else if (b.hasAttribute('data-tutti')) {
        var tutti = b.getAttribute('data-tutti') === '1';
        apertoDaSolo = null;
        // «Comprimi tutti» lascia aperto il capitolo della slide attuale
        capitoli.forEach(function (c) { c.el.open = tutti || (attuale >= c.da && attuale <= c.a); });
      } else if (b.hasAttribute('data-i')) {
        vai(+b.getAttribute('data-i'));
      }
      b.blur();
    });

    var inAttesa = false;
    function aggiorna() {
      if (inAttesa) return;
      inAttesa = true;
      requestAnimationFrame(function () { inAttesa = false; segna(indiceAttuale()); });
    }
    window.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);

    mostraVista(leggi());
    apri(true, true);
    timerAnteprima = setTimeout(function () { timerAnteprima = null; apri(false, true); }, ANTEPRIMA);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', costruisci);
  else costruisci();
})();
