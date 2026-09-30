#!/usr/bin/env python3
"""
Pubblica una giornata: copia bozze/gN.html in giorni/gN.html sostituendo le righe
"SOLO BOZZE" (post-it + modifica) con il caricatore "SOLO LOCALE", che non si
attiva su *.github.io; lo scorrimento da tastiera e mouse (scorri.js) e la barra delle
miniature (miniature.js) si caricano ovunque.
Poi rigenera giorni/zaccaria-IA-base-gN.pdf con Chrome headless dalla pagina servita da MAMP
e ricompone giorni/zaccaria-IA-base-unione.pdf con tutte le giornate pubblicate.

Uso: python3 strumenti/pubblica.py g1 [g2 ...]   (aggiungere --senza-pdf per saltare il PDF)
"""
import re
import subprocess
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
HOST = "https://formazione-ia-base.localhost:8890"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PREFISSO = "zaccaria-IA-base-"   # nome dei PDF: zaccaria-IA-base-gN.pdf, zaccaria-IA-base-unione.pdf

CARICATORE = """  <!-- SOLO LOCALE: post-it di revisione (note condivise con bozze/{g}.html). Su GitHub Pages non si carica. -->
  <script>
    if (!/github\\.io$/.test(location.hostname)) {{
      document.write('<link rel="stylesheet" href="../strumenti/note.css?v={v}"><script src="../strumenti/note.js?v={v}" defer><\\/script><script src="../strumenti/modifica.js?v=5" defer><\\/script>');
    }}
  </script>
  <script src="../assets/js/scorri.js?v=2" defer></script>
  <script src="../assets/js/miniature.js?v=5" defer></script>
"""

# link esterni sempre in una nuova scheda (quelli verso MAMP restano nella stessa)
LINK_ESTERNO = re.compile(r'<a (?![^>]*\btarget=)([^>]*\bhref="https?://(?!formazione-ia-base\.localhost)[^"]*"[^>]*)>')
# i promemoria <!-- VERIFICA … --> restano nelle bozze, non nella copia pubblica
VERIFICA = re.compile(r'[ \t]*<!-- VERIFICA\b.*?-->[ \t]*\n?', re.S)
# slide pronte ma trattenute (es. la verifica fino al giorno della prova): tra
# <!-- NON PUBBLICARE: … --> e <!-- /NON PUBBLICARE --> restano solo nelle bozze
TRATTENUTE = re.compile(r'[ \t]*<!-- NON PUBBLICARE\b.*?<!-- /NON PUBBLICARE -->[ \t]*\n?', re.S)
# anche i blocchi commentati (slide sospese, markup in attesa): un commento che contiene tag
COMMENTO = re.compile(r'[ \t]*<!--(.*?)-->[ \t]*\n?', re.S)


def senza_blocchi_commentati(pagina):
    return COMMENTO.sub(lambda m: "" if re.search(r"<[a-zA-Z!/]", m.group(1)) else m.group(0), pagina)


def pubblica(g, pdf=True):
    bozza = (RADICE / "bozze" / f"{g}.html").read_text(encoding="utf-8")
    blocco = re.search(r'  <!-- SOLO BOZZE:.*?-->\n(?:  <(?:link|script)[^\n]*(?:note\.(?:css|js)|scorri\.js|miniature\.js|modifica\.js)[^\n]*\n)+', bozza)
    if not blocco:
        sys.exit(f"{g}: righe SOLO BOZZE non trovate")
    v = re.search(r'note\.js\?v=([\d.]+)', blocco.group(0)).group(1)
    uscita = RADICE / "giorni" / f"{g}.html"
    pagina = bozza.replace(blocco.group(0), CARICATORE.format(g=g, v=v))
    pagina = LINK_ESTERNO.sub(r'<a \1 target="_blank" rel="noopener">', pagina)
    pagina = TRATTENUTE.sub("", pagina)
    pagina = VERIFICA.sub("", pagina)
    pagina = senza_blocchi_commentati(pagina)
    uscita.write_text(pagina, encoding="utf-8")
    print(f"{g}: {uscita.relative_to(RADICE)} aggiornato")
    if pdf:
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--virtual-time-budget=15000", f"--print-to-pdf={RADICE / 'giorni' / f'{PREFISSO}{g}.pdf'}",
                        f"{HOST}/giorni/{g}.html"], check=True, capture_output=True)
        print(f"{g}: giorni/{PREFISSO}{g}.pdf rigenerato")


def presentazione_unica():
    from pypdf import PdfWriter
    pdf = sorted((RADICE / "giorni").glob(f"{PREFISSO}g[0-9].pdf"))
    unica = PdfWriter()
    for f in pdf:
        unica.append(f, outline_item=f.stem.removeprefix(PREFISSO).upper())
    unica.write(RADICE / "giorni" / f"{PREFISSO}unione.pdf")
    print(f"giorni/{PREFISSO}unione.pdf: {', '.join(f.stem.removeprefix(PREFISSO) for f in pdf)}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for g in args or ["g1"]:
        pubblica(g, pdf="--senza-pdf" not in sys.argv)
    if "--senza-pdf" not in sys.argv:
        presentazione_unica()
