#!/usr/bin/env python3
"""
Pubblica una giornata: copia bozze/gN.html in giorni/gN.html sostituendo le righe
"SOLO BOZZE" (post-it + scorrimento da tastiera) con il caricatore "SOLO LOCALE",
che non si attiva su *.github.io.
Poi rigenera giorni/gN.pdf con Chrome headless dalla pagina servita da MAMP.

Uso: python3 strumenti/pubblica.py g1 [g2 ...]   (aggiungere --senza-pdf per saltare il PDF)
"""
import re
import subprocess
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
HOST = "https://formazione-ia-base.localhost:8890"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CARICATORE = """  <!-- SOLO LOCALE: post-it di revisione (note condivise con bozze/{g}.html). Su GitHub Pages non si carica. -->
  <script>
    if (!/github\\.io$/.test(location.hostname)) {{
      document.write('<link rel="stylesheet" href="../strumenti/note.css?v={v}"><script src="../strumenti/note.js?v={v}" defer><\\/script><script src="../assets/js/scorri.js?v=1" defer><\\/script><script src="../strumenti/modifica.js?v=2" defer><\\/script>');
    }}
  </script>
"""


def pubblica(g, pdf=True):
    bozza = (RADICE / "bozze" / f"{g}.html").read_text(encoding="utf-8")
    blocco = re.search(r'  <!-- SOLO BOZZE:.*?-->\n(?:  <(?:link|script)[^\n]*(?:note\.(?:css|js)|scorri\.js|modifica\.js)[^\n]*\n)+', bozza)
    if not blocco:
        sys.exit(f"{g}: righe SOLO BOZZE non trovate")
    v = re.search(r'note\.js\?v=([\d.]+)', blocco.group(0)).group(1)
    uscita = RADICE / "giorni" / f"{g}.html"
    uscita.write_text(bozza.replace(blocco.group(0), CARICATORE.format(g=g, v=v)), encoding="utf-8")
    print(f"{g}: {uscita.relative_to(RADICE)} aggiornato")
    if pdf:
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--virtual-time-budget=15000", f"--print-to-pdf={RADICE / 'giorni' / f'{g}.pdf'}",
                        f"{HOST}/giorni/{g}.html"], check=True, capture_output=True)
        print(f"{g}: giorni/{g}.pdf rigenerato")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for g in args or ["g1"]:
        pubblica(g, pdf="--senza-pdf" not in sys.argv)
