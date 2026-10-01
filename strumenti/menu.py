#!/usr/bin/env python3
"""
Menu del footer + menu admin, uguali in tutte le pagine del sito e nella scaletta (non nelle slide).
Si scrivono tra i marcatori <!-- menu:inizio --> e <!-- menu:fine -->; alla prima
esecuzione sostituiscono i vecchi <nav class="menu"> o si aggiungono in fondo.

Uso: python3 strumenti/menu.py
"""
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
MAMP = "https://formazione-ia-base.localhost:8890"
BADGE = ' <span class="stato stato--prossima">seguirà</span>'


def menu(pre):
    """pre = prefisso dei link relativi ('' dalla radice, '../' da bozze/ e giorni/)."""
    voci = [
        f'<li><a href="{pre}index.html">Homepage</a></li>',
        f'<li><a href="{pre}materiali.html">Materiali</a></li>',
        f'<li><a href="{pre}bibliografia.html">Bibliografia</a></li>',
    ]
    # admin: link assoluti a MAMP (bozze/ non è pubblicata). Schema = scaletta, Scrivibile = slide modificabili
    admin = []
    for g in range(1, 5):
        admin.append(f'<li><a href="{MAMP}/bozze/index.html#g{g}">Giornata {g} Schema</a></li>')
        if (RADICE / "bozze" / f"g{g}.html").exists():
            admin.append(f'<li><a href="{MAMP}/bozze/g{g}.html">Giornata {g} Scrivibile</a></li>')
        else:
            admin.append(f'<li><span class="disattivo" aria-disabled="true">Giornata {g} Scrivibile</span>{BADGE}</li>')
    r = lambda xs: "\n".join("      " + x for x in xs)
    return (
        "  <!-- menu:inizio — generato da strumenti/menu.py, non modificare a mano -->\n"
        '  <nav class="menu" aria-label="Menu del sito">\n    <ul>\n' + r(voci) + "\n    </ul>\n  </nav>\n\n"
        '  <nav class="menu menu--admin" aria-label="Menu admin" hidden>\n    <p class="etichetta">Menu admin</p>\n    <ul>\n'
        + r(admin) + "\n    </ul>\n  </nav>\n"
        # nascosto di default; compare solo fuori da *.github.io (MAMP, file://)
        "  <script>if (!/github\\.io$/.test(location.hostname)) document.currentScript.previousElementSibling.hidden = false;</script>\n"
        "  <!-- menu:fine -->\n"
    )


def applica(nome, pre, prima_di):
    p = RADICE / nome
    if not p.exists():
        return
    s = p.read_text(encoding="utf-8")
    blocco = menu(pre)
    if "<!-- menu:inizio" in s:
        s = re.sub(r"  <!-- menu:inizio.*?<!-- menu:fine -->\n", lambda m: blocco, s, count=1, flags=re.S)
    elif '<nav class="menu"' in s:
        # prima volta nelle pagine del sito: via i vecchi nav (menu e admin, con il commento che li precede)
        s = re.sub(r'  <nav class="menu" aria-label="Menu del sito">.*?</nav>\n\n(?:  <!--[^\n]*-->\n)?  <nav class="menu menu--admin".*?</nav>\n',
                   lambda m: blocco, s, count=1, flags=re.S)
    else:
        s = s.replace(prima_di, blocco + "\n" + prima_di, 1)
    p.write_text(s, encoding="utf-8")
    print("menu:", nome)


applica("index.html", "", '  <footer class="licenza">')
applica("materiali.html", "", '  <footer class="licenza">')
applica("bibliografia.html", "", '  <footer class="licenza">')
applica("bozze/index.html", "../", '  <footer class="licenza">')
# slide: niente menu dopo l'ultima slide (tolto il 2026-10-01 su richiesta di FZ);
# se una pagina di slide ha ancora il vecchio blocco piede-slide, si toglie
for nome in [f"{d}/g{g}.html" for d in ("bozze", "giorni") for g in (1, 2, 3, 4, "x")]:
    p = RADICE / nome
    if p.exists():
        s = p.read_text(encoding="utf-8")
        s2 = re.sub(r'\n<div class="piede-slide">\n.*?</footer>\n</div>\n', "", s, count=1, flags=re.S)
        if s2 != s:
            p.write_text(s2, encoding="utf-8")
            print("menu tolto:", nome)
