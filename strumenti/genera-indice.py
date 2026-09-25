#!/usr/bin/env python3
"""
Copia nell'indice pubblico (index.html) la scaletta delle giornate pubblicate,
prendendola da bozze/index.html. Così struttura e titoli restano identici.

Uso: python3 strumenti/genera-indice.py g1 [g2 ...]
Nell'index.html la giornata va tra i marcatori <!-- g1:inizio --> e <!-- g1:fine -->.
Toglie ciò che serve solo in bozza: lettere del tipo, minuti, righe "verifica",
attributi data-nota, id dei blocchi.
"""
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
BOZZA = RADICE / "bozze" / "index.html"
INDICE = RADICE / "index.html"


def scaletta(bozza, giorno):
    m = re.search(rf'<section class="giornata" id="{giorno}".*?</section>', bozza, re.S)
    if not m:
        sys.exit(f"{giorno}: giornata non trovata in bozze/index.html")
    blocchi = re.findall(r'<div id="[^"]+" data-nota="[^"]+">(.*?)</div>', m.group(0), re.S)
    righe = []
    n = 0  # numerazione continua della giornata, scritta nel markup (i capitoli chiusi non contano nei contatori CSS)
    for b in blocchi:
        h3 = re.search(r"<h3>(.*?)</h3>", b, re.S).group(1)
        h3 = re.sub(r'\s*<span class="meta">.*?</span>', "", h3).strip()
        if h3 == "Pausa":
            # la pausa resta nell'elenco precedente, senza intestazione
            if righe and righe[-2] == "      </ol>":
                n += 1
                righe.insert(len(righe) - 2, f'        <li data-t="F" data-n="{n}"><b></b>Pausa</li>')
            continue
        righe.append("")
        righe.append('    <details class="capitolo">')
        righe.append(f"      <summary><h3>{h3}</h3></summary>")
        righe.append('      <ol class="slide-titoli">')
        for t, testo in re.findall(r'<li data-t="(\w)"[^>]*><b>\w</b>(.*?)</li>', b, re.S):
            n += 1
            righe.append(f'        <li data-t="{t}" data-n="{n}"><b></b>{testo}</li>')
        righe.append("      </ol>")
        righe.append("    </details>")
    return "\n".join(righe) + "\n"


def main():
    giorni = sys.argv[1:] or ["g1"]
    bozza = BOZZA.read_text(encoding="utf-8")
    indice = INDICE.read_text(encoding="utf-8")
    for g in giorni:
        inizio, fine = f"<!-- {g}:inizio -->", f"<!-- {g}:fine -->"
        if inizio not in indice or fine not in indice:
            sys.exit(f"{g}: marcatori {inizio} / {fine} mancanti in index.html")
        prima, resto = indice.split(inizio, 1)
        _, dopo = resto.split(fine, 1)
        indice = prima + inizio + "\n" + scaletta(bozza, g) + "    " + fine + dopo
        print(f"{g}: scaletta aggiornata")
    INDICE.write_text(indice, encoding="utf-8")


if __name__ == "__main__":
    main()
