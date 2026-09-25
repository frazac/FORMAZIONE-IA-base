#!/usr/bin/env python3
"""
Riallinea la scaletta (bozze/index.html) ai titoli reali delle slide di una giornata.
I blocchi della giornata si ricavano dai commenti <!-- N — Titolo --> nel file delle slide;
i minuti e gli id dei blocchi restano quelli della scaletta.

Uso: python3 strumenti/scaletta-da-slide.py g1
"""
import html
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
TIPI = {
    "s-copertina": "C", "s-sezione": "S", "s-focus": "F", "s-immagine": "I",
    "s-enunciato": "N", "s-testo": "T", "s-citazione": "Q", "s-esercizio": "E",
    "s-link": "L", "s-fonti": "B",
}


def testo(frammento):
    t = re.sub(r"<br\s*/?>", " ", frammento)
    # la traduzione contiene uno span annidato: toglierla per intero, parentesi comprese
    t = re.sub(r'\s*<span class="trad">\(<span class="en">.*?</span>\)</span>', "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "", t)
    return html.unescape(re.sub(r"\s+", " ", t)).strip()


def titolo(classe, corpo):
    if classe == "s-immagine":
        alt = re.search(r'(?:alt|aria-label)="([^"]*)"', corpo)
        da = re.search(r"<p>Immagine da scegliere — (.*?)</p>", corpo)
        return testo(da.group(1)) if da else (alt.group(1).split(":")[0] if alt else "Immagine")
    if classe == "s-citazione":
        return testo(re.search(r"<blockquote>(.*?)</blockquote>", corpo, re.S).group(1))
    if classe in ("s-link", "s-fonti"):
        return testo(re.search(r'<p class="etichetta">(.*?)</p>', corpo).group(1)) + (
            ": " + testo(re.findall(r"<p>(.*?)</p>", corpo)[0]) if classe == "s-link" else "")
    for tag in ("h1", "h2"):
        m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", corpo, re.S)
        if m:
            return testo(m.group(1))
    m = re.search(r"<p>(.*?)</p>", corpo, re.S)
    return testo(m.group(1)) if m else "?"


def main():
    g = (sys.argv[1:] or ["g1"])[0]
    slide = (RADICE / "bozze" / f"{g}.html").read_text(encoding="utf-8")
    p = RADICE / "bozze" / "index.html"
    indice = p.read_text(encoding="utf-8")

    # blocchi dalle slide
    parti = re.split(r"<!-- (\d+) — (.*?) -->", slide)
    blocchi = []  # (numero, titolo, [(tipo, titolo, id)])
    for i in range(1, len(parti), 3):
        voci = []
        for classe, sid, corpo in re.findall(r'<section class="slide (s-[\w-]+)[^"]*" id="([^"]+)"[^>]*>(.*?)</section>', parti[i + 2], re.S):
            voci.append((TIPI.get(classe, "T"), titolo(classe, corpo), sid))
        blocchi.append((parti[i], parti[i + 1], voci))

    sezione = re.search(rf'(<section class="giornata" id="{g}".*?</p>\n)(.*?)(\n  </section>)', indice, re.S)
    vecchio = sezione.group(2)
    minuti = dict(re.findall(r'<h3>(\d+) — .*? <span class="meta">(\d+′)</span>', vecchio))
    pausa = re.search(r'\n    <div id="' + g + r'-p".*?</div>\n', vecchio, re.S)

    righe = []
    for num, tit, voci in blocchi:
        # la pausa è una slide F "Pausa" in coda al blocco 3: diventa un blocco a sé
        dentro = [v for v in voci if not v[1].startswith("Pausa")]
        fuori = len(dentro) != len(voci)
        righe.append(f'\n    <div id="{g}-{num}" data-nota="{g.upper()} — {num} {tit}">')
        righe.append(f'      <h3>{num} — {tit} <span class="meta">{minuti.get(num, "?′")}</span></h3>')
        righe.append('      <ol class="slide-titoli">')
        for t, x, sid in dentro:
            # data-id: l'id della slide, serve al riordino con il trascinamento (strumenti/ordina.js)
            righe.append(f'        <li data-t="{t}" data-id="{sid}"><b>{t}</b>{html.escape(x, quote=False)}</li>')
        righe.append("      </ol>\n    </div>")
        if fuori and pausa:
            # intestazione (id, minuti) dalla scaletta, voci dalle slide: così anche la pausa ha il suo data-id
            testa_p = re.search(r'\n    <div id="[^"]+-p".*?</h3>', pausa.group(0), re.S).group(0)
            righe.append(testa_p + '\n      <ol class="slide-titoli">')
            for t, x, sid in (v for v in voci if v[1].startswith("Pausa")):
                righe.append(f'        <li data-t="{t}" data-id="{sid}"><b>{t}</b>{html.escape(x, quote=False)}</li>')
            righe.append("      </ol>\n    </div>")
    n = sum(len([v for v in b[2]]) for b in blocchi)
    nuovo = "\n".join(righe) + "\n"
    testa = re.sub(r"— \d+ slide</p>", f"— {n} slide</p>", sezione.group(1))
    indice = indice.replace(sezione.group(0), testa + nuovo.lstrip("\n") + sezione.group(3))
    p.write_text(indice, encoding="utf-8")
    print(f"{g}: {n} slide in {len(blocchi)} blocchi")


if __name__ == "__main__":
    main()
