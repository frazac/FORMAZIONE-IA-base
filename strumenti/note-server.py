#!/usr/bin/env python3
"""
Post-it — formazione-ia-base: server Python di sviluppo (alternativa a MAMP).
Imposta dove stanno le note (bozze/, esclusa da git) e avvia il server del plugin
strumenti/postit/api/annotate-server.py (subtree di github.com/frazac/postit-js).

Avvio:   python3 strumenti/note-server.py      → http://127.0.0.1:8765/note
"""
import os
import runpy
from pathlib import Path

QUI = Path(__file__).resolve().parent
os.environ.setdefault("POSTIT_DATA", str(QUI.parent / "bozze" / "note.json"))
runpy.run_path(str(QUI / "postit" / "api" / "annotate-server.py"), run_name="__main__")
