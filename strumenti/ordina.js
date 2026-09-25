/*
 * Riordino delle slide trascinando i titoli nella scaletta (bozze/index.html) — solo in locale.
 * Si trascina una voce dove si vuole, anche in un altro capitolo; al rilascio
 * strumenti/ordina-api.php riordina bozze/gN.html (con copia di sicurezza) e rigenera
 * la scaletta. «Annulla» ripristina l'ordine precedente. I capitoli restano fermi.
 * Dopo un riordino, per aggiornare giorni/: python3 strumenti/pubblica.py gN
 */
(function () {
  'use strict';

  var tag = document.currentScript;
  var API = new URL('ordina-api.php', tag ? tag.src : location.href).href;
  var trascinata = null;
  var giornata = null;

  var stile = document.createElement('style');
  stile.textContent =
    '.giornata li[data-id]{cursor:grab}' +
    '.giornata li[data-id]:hover{background:rgba(105,143,255,.06)}' +
    '.giornata li.in-volo{opacity:.35}' +
    '.giornata ol.slide-titoli{min-height:1.6rem}' +
    '.ordina-avviso{position:fixed;left:50%;bottom:1.25rem;transform:translateX(-50%);z-index:9999;' +
    'display:flex;gap:1rem;align-items:center;padding:.6rem 1rem;border-radius:9999px;background:#000;color:#fff;' +
    'font:500 14px/1.2 var(--f-testo,system-ui);box-shadow:0 8px 24px rgba(0,0,0,.22)}' +
    '.ordina-avviso button{font:inherit;color:rgb(105,143,255);background:none;border:0;cursor:pointer;padding:0}';
  document.head.appendChild(stile);

  // capitoli nell'ordine della pagina; il blocco della pausa (gN-p) appartiene al capitolo precedente
  function capitoli(sezione) {
    var elenco = [];
    Array.prototype.forEach.call(sezione.querySelectorAll(':scope > div[id]'), function (div) {
      var m = div.id.match(/^g\d-(\d+|p)$/);
      if (!m) return;
      var ids = Array.prototype.map.call(div.querySelectorAll('li[data-id]'), function (li) { return li.getAttribute('data-id'); });
      if (m[1] === 'p' && elenco.length) elenco[elenco.length - 1].ids = elenco[elenco.length - 1].ids.concat(ids);
      else elenco.push({ num: m[1], ids: ids });
    });
    return elenco;
  }

  var avviso = null;
  function mostra(testo, annulla) {
    if (avviso) avviso.remove();
    avviso = document.createElement('div');
    avviso.className = 'ordina-avviso';
    avviso.appendChild(document.createTextNode(testo));
    if (annulla) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Annulla';
      b.addEventListener('click', annulla);
      avviso.appendChild(b);
    }
    document.body.appendChild(avviso);
    clearTimeout(mostra.t);
    mostra.t = setTimeout(function () { if (avviso) { avviso.remove(); avviso = null; } }, 10000);
  }

  function invia(url, corpo) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
  }

  function salva(sezione) {
    var g = sezione.id;
    mostra('Salvataggio…');
    invia(API, { giorno: g, capitoli: capitoli(sezione) })
      .then(function (j) {
        if (j.invariato) { mostra('Ordine invariato'); return; }
        mostra('Ordine salvato in bozze/' + g + '.html', function () {
          mostra('Ripristino…');
          invia(API + '?action=annulla', { giorno: g })
            .then(function () { location.reload(); })
            .catch(function (e) { window.alert('Annulla non riuscito: ' + e.message); });
        });
      })
      .catch(function (e) {
        window.alert('Riordino non salvato: ' + e.message + '\nLa pagina viene ricaricata.');
        location.reload();
      });
  }

  function avvia() {
    Array.prototype.forEach.call(document.querySelectorAll('section.giornata[id^="g"] li[data-id]'), function (li) {
      li.draggable = true;
    });

    document.addEventListener('dragstart', function (e) {
      var li = e.target.closest && e.target.closest('li[data-id]');
      if (!li) return;
      trascinata = li;
      giornata = li.closest('section.giornata');
      li.classList.add('in-volo');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.getAttribute('data-id'));
    });

    document.addEventListener('dragover', function (e) {
      if (!trascinata) return;
      var ol = e.target.closest && e.target.closest('ol.slide-titoli');
      if (!ol || ol.closest('section.giornata') !== giornata) return; // solo dentro la stessa giornata
      e.preventDefault();
      var sotto = e.target.closest('li[data-id]');
      if (sotto && sotto !== trascinata) {
        var r = sotto.getBoundingClientRect();
        sotto.parentNode.insertBefore(trascinata, e.clientY < r.top + r.height / 2 ? sotto : sotto.nextSibling);
      } else if (!sotto && ol !== trascinata.parentNode) {
        ol.appendChild(trascinata); // capitolo vuoto o spazio in fondo all'elenco
      }
    });

    document.addEventListener('drop', function (e) { if (trascinata) e.preventDefault(); });

    document.addEventListener('dragend', function () {
      if (!trascinata) return;
      trascinata.classList.remove('in-volo');
      var sez = giornata;
      trascinata = null;
      giornata = null;
      // si salva sempre: anche lo stesso ordine con una slide in un altro capitolo è un cambiamento,
      // e se non è cambiato nulla il server risponde «invariato» senza toccare il file
      salva(sez);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
