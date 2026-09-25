#!/usr/bin/env python3
"""
Post-it — motore di commenti a segnaposto, v2.3.0 (vedi CHANGELOG.md)
Server locale per i post-it di revisione sulle bozze (solo in locale, mai online).

Avvio:   python3 strumenti/note-server.py
Ascolta: http://127.0.0.1:8765/note
Salva:   bozze/note.json

Stati di una nota: open (lasciata da FZ) → resolved (Claude dichiara di averla
sistemata) → closed (FZ conferma) oppure di nuovo open (FZ riapre).
Ogni nota ha un filo di risposte: POST /note?action=risposta&id=… (o /note/risposta?id=…)  {"text", "author", "status"?}
("status" facoltativo: cambia lo stato insieme alla risposta, es. riaprire con un commento).
Spostamento (2.2): PATCH /note?id=…  {"position": {anchor, context, x_percent, y_percent, viewport, doc, ua, url}}
Stesse regole di strumenti/note-api.php (riferimento: masterismi.dev/public/annotate-api.php).
Accetta richieste anche da pagine aperte come file:// (origine "null").
"""
import json
import os
import secrets
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

VERSIONE = "2.3.0"
HOST, PORT = "127.0.0.1", int(os.environ.get("POSTIT_PORT", 8765))
DATA = Path(os.environ.get("POSTIT_DATA", Path(__file__).resolve().parent / "notes.json"))
STATI = {"open", "resolved", "closed"}


def leggi():
    if not DATA.exists():
        return {}
    try:
        return json.loads(DATA.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def scrivi(note):
    DATA.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA.with_suffix(".tmp")
    tmp.write_text(json.dumps(note, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(DATA)


def adesso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def breve(valore, massimo):
    return str(valore).strip()[:massimo] if isinstance(valore, (str, int, float)) else ""


def unita(valore):
    try:
        return max(0.0, min(1.0, float(valore)))
    except (TypeError, ValueError):
        return 0.0


def misura(valore):
    if not isinstance(valore, dict):
        return None
    try:
        out = {"w": int(valore["w"]), "h": int(valore["h"])}
    except (KeyError, TypeError, ValueError):
        return None
    if isinstance(valore.get("dpr"), (int, float)):
        out["dpr"] = round(float(valore["dpr"]), 2)
    return out


def aggancio(valore):
    """Elemento DOM agganciato: None se la nota è solo a coordinate."""
    if not isinstance(valore, dict) or not breve(valore.get("selector", ""), 600):
        return None
    return {
        "selector": breve(valore["selector"], 600),
        "tag": breve(valore.get("tag", ""), 20),
        "id": breve(valore.get("id", ""), 100),
        "text": breve(valore.get("text", ""), 120),
        "x": unita(valore.get("x", 0)),
        "y": unita(valore.get("y", 0)),
    }


def contesto(valore):
    """Elemento intermedio (slide, sezione [data-nota]): None se non c'è."""
    if not isinstance(valore, dict) or not breve(valore.get("selector", ""), 600):
        return None
    return {
        "selector": breve(valore["selector"], 600),
        "label": breve(valore.get("label", ""), 120),
        "x": unita(valore.get("x", 0)),
        "y": unita(valore.get("y", 0)),
    }


def posizione(d):
    """Campi di posizione comuni a creazione e spostamento."""
    return {
        "anchor": aggancio(d.get("anchor")),
        "context": contesto(d.get("context")),
        "x_percent": unita(d.get("x_percent", 0)),
        "y_percent": unita(d.get("y_percent", 0)),
        "viewport": misura(d.get("viewport")),
        "doc": misura(d.get("doc")),
        "ua": breve(d.get("ua", ""), 300),
        "url": breve(d.get("url", ""), 600),
    }


class Gestore(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Postit-Versione", VERSIONE)

    def _json(self, codice, dati):
        corpo = json.dumps(dati, ensure_ascii=False).encode("utf-8")
        self.send_response(codice)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _corpo(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError:
            return {}

    def _id(self):
        return (parse_qs(urlparse(self.path).query).get("id") or [""])[0]

    def _percorso_ok(self, percorso="/note"):
        return urlparse(self.path).path == percorso

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if not self._percorso_ok():
            return self._json(404, {"error": "not found"})
        self._json(200, list(leggi().values()))

    def do_POST(self):
        azione = (parse_qs(urlparse(self.path).query).get("action") or [""])[0]
        if self._percorso_ok("/note/risposta") or (self._percorso_ok() and azione == "risposta"):
            return self._risposta()
        if self._percorso_ok() and azione in ("risolvi-tutto", "archivia"):
            return self._tutte(azione)
        if not self._percorso_ok():
            return self._json(404, {"error": "not found"})
        dati = self._corpo()
        testo = str(dati.get("text", "")).strip()
        if not testo:
            return self._json(400, {"error": "text required"})
        note = leggi()
        nid = secrets.token_hex(6)
        note[nid] = {
            "id": nid,
            "page": breve(dati.get("page", ""), 600),
            **posizione(dati),
            "quote": breve(dati.get("quote", ""), 1000),
            "text": testo,
            "status": "open",
            "created_at": adesso(),
            "replies": [],
        }
        scrivi(note)
        self._json(200, note[nid])

    def _risposta(self):
        note, nid = leggi(), self._id()
        if nid not in note:
            return self._json(404, {"error": "not found"})
        dati = self._corpo()
        testo = str(dati.get("text", "")).strip()
        if not testo:
            return self._json(400, {"error": "text required"})
        stato = dati.get("status")
        if stato is not None and stato not in STATI:
            return self._json(400, {"error": "invalid status"})
        note[nid].setdefault("replies", []).append({
            "author": str(dati.get("author") or "FZ"),
            "text": testo,
            "created_at": adesso(),
        })
        if stato:
            note[nid]["status"] = stato
            note[nid][{"open": "reopened_at", "closed": "closed_at"}.get(stato, "resolved_at")] = adesso()
        scrivi(note)
        self._json(200, note[nid])

    def _tutte(self, azione):
        """Risolvi tutto / archivia tutto per una pagina (come note-api.php)."""
        pagina = str(self._corpo().get("page", ""))
        if not pagina:
            return self._json(400, {"error": "page required"})
        note = leggi()
        della = [n for n in note.values() if n.get("page") == pagina]
        if azione == "risolvi-tutto":
            aperte = [n for n in della if n.get("status") == "open"]
            for n in aperte:
                n["status"] = "resolved"
                n["resolved_at"] = adesso()
            scrivi(note)
            return self._json(200, {"ok": True, "risolte": len(aperte)})
        if not della:
            return self._json(200, {"ok": True, "archiviate": 0})
        della.sort(key=lambda n: n.get("created_at", ""))
        md = f"\n## {pagina} — archiviate il {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        for n in della:
            dove = (n.get("context") or {}).get("label") or (n.get("anchor") or {}).get("selector") or n.get("slide") or "pagina"
            md += f"### {str(n.get('created_at', ''))[:16]} · {dove} · {n.get('status', '')}\n\n"
            if n.get("quote"):
                md += "> " + n["quote"].replace("\n", "\n> ") + "\n\n"
            md += f"**FZ:** {str(n.get('text', '')).strip()}\n\n"
            for r in n.get("replies", []):
                md += f"**{r.get('author', '?')}:** {str(r.get('text', '')).strip()}\n\n"
            note.pop(n["id"], None)
        archivio = DATA.parent / "note-archivio.md"
        if not archivio.exists():
            archivio.write_text("# Archivio delle note di revisione\n\nNote archiviate con «Archivia tutto» (solo in locale, non si pubblica).\n", encoding="utf-8")
        with archivio.open("a", encoding="utf-8") as f:
            f.write(md)
        scrivi(note)
        return self._json(200, {"ok": True, "archiviate": len(della)})

    def do_PATCH(self):
        note, nid = leggi(), self._id()
        if nid not in note:
            return self._json(404, {"error": "not found"})
        dati = self._corpo()
        if isinstance(dati.get("position"), dict):
            # spostamento: il nuovo aggancio sostituisce quello vecchio (anche quello 2.0 a slide)
            note[nid].update(posizione(dati["position"]), moved_at=adesso())
            for campo in ("legacy", "slide", "slide_n"):
                note[nid].pop(campo, None)
            scrivi(note)
            return self._json(200, note[nid])
        stato = str(dati.get("status", "resolved"))
        if stato not in STATI:
            return self._json(400, {"error": "invalid status"})
        note[nid]["status"] = stato
        note[nid][{"open": "reopened_at", "closed": "closed_at"}.get(stato, "resolved_at")] = adesso()
        scrivi(note)
        self._json(200, note[nid])

    def do_DELETE(self):
        note, nid = leggi(), self._id()
        if nid not in note:
            return self._json(404, {"error": "not found"})
        del note[nid]
        scrivi(note)
        self._json(200, {"ok": True})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"Post-it v{VERSIONE} su http://{HOST}:{PORT}/note → {DATA}")
    ThreadingHTTPServer((HOST, PORT), Gestore).serve_forever()
