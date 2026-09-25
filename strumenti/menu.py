#!/usr/bin/env python3
"""
Menu del footer + menu admin, uguali in tutte le pagine (sito e bozze).
Si scrivono tra i marcatori <!-- menu:inizio --> e <!-- menu:fine -->; alla prima
esecuzione sostituiscono i vecchi <nav class="menu"> o si aggiungono in fondo.

Uso: python3 strumenti/menu.py
Quando si pubblica una giornata: aggiungerla a PUBBLICATE e rilanciare.
"""
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
PUBBLICATE = {1}                     # giornate visibili nel menu pubblico
MAMP = "https://formazione-ia-base.localhost:8890"
BADGE = ' <span class="stato stato--prossima">seguirà</span>'


def menu(pre):
    """pre = prefisso dei link relativi ('' dalla radice, '../' da bozze/ e giorni/)."""
    voci = [f'<li><a href="{pre}index.html">Indice</a></li>']
    for g in range(1, 5):
        if g in PUBBLICATE:
            voci.append(f'<li><a href="{pre}index.html#g{g}">Giornata {g}</a></li>')
        else:
            voci.append(f'<li><span class="disattivo" aria-disabled="true">Giornata {g}</span>{BADGE}</li>')
    voci += [
        f'<li><a href="{pre}materiali.html">Materiali</a></li>',
        f'<li><a href="{pre}materiali.html#glossario">Glossario</a></li>',
        f'<li><a href="{pre}bibliografia.html">Bibliografia</a></li>',
        '<li><a href="https://github.com/frazac/FORMAZIONE-IA-base">GitHub ↖</a></li>',
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


FOOTER_SLIDE = (
    '  <footer class="licenza">\n'
    '    <p class="copyright">© 2026 Francesco Zaccaria, Licenza CC BY salvo diversa specificazione.</p>\n'
    "  </footer>\n"
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
# slide: menu e copyright in un blocco dopo l'ultima slide (solo a schermo), che pubblica.py porta anche in giorni/
for g in range(1, 5):
    p = RADICE / "bozze" / f"g{g}.html"
    if p.exists() and "<!-- menu:inizio" not in p.read_text(encoding="utf-8"):
        s = p.read_text(encoding="utf-8")
        s = s.replace("\n</body>", '\n<div class="piede-slide">\n' + menu("../") + FOOTER_SLIDE + "</div>\n\n</body>", 1)
        p.write_text(s, encoding="utf-8")
        print("menu (nuovo):", p.name)
    else:
        applica(f"bozze/g{g}.html", "../", "\n</body>")
