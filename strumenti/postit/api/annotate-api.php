<?php
/**
 * Post-it — motore di commenti a segnaposto, v2.3.0 (vedi CHANGELOG.md)
 * Backend PHP (stesse API e stesso formato dati del server Python annotate-server.py).
 *
 * Uso: un file dell'installazione imposta le variabili e poi fa require di questo file.
 *   $POSTIT_DATA       file JSON delle note (default: notes.json accanto a questo file)
 *   $POSTIT_ARCHIVIO   archivio Markdown di «Archivia tutto» (default: note-archivio.md accanto ai dati)
 *   $POSTIT_CONSENTITO callable(): bool — chi può usare l'API (default: solo 127.0.0.1 / ::1)
 *
 *   GET    annotate-api.php                          → elenco note
 *   POST   annotate-api.php                          → nuova nota {page, text, quote?, anchor, context, x_percent, y_percent, viewport, doc, ua, url}
 *   POST   annotate-api.php?action=risposta&id=…     → risposta {text, author, status?}
 *   PATCH  annotate-api.php?id=…                     → cambio di stato {status}
 *   PATCH  annotate-api.php?id=…                     → spostamento {position: {anchor, context, x_percent, …}} (2.2)
 *   DELETE annotate-api.php?id=…                     → elimina
 *   POST   annotate-api.php?action=risolvi-tutto   → {page}: open → resolved
 *   POST   annotate-api.php?action=archivia        → {page}: tutte in archivio Markdown, poi via dal JSON
 */

const VERSIONE = '2.3.0';
const STATI = ['open', 'resolved', 'closed'];
$DATA = $POSTIT_DATA ?? (__DIR__ . '/notes.json');
$ARCHIVIO = $POSTIT_ARCHIVIO ?? (dirname($DATA) . '/note-archivio.md');
$CONSENTITO = $POSTIT_CONSENTITO ?? fn(): bool => in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Postit-Versione: ' . VERSIONE);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// accesso: di default solo dalla macchina locale
if (!$CONSENTITO()) {
    http_response_code(401); // il widget tratta 401 come «fuori linea»
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function leggi(string $file): array
{
    if (!is_file($file)) {
        return [];
    }
    $dati = json_decode((string) file_get_contents($file), true);
    return is_array($dati) ? $dati : [];
}

function scrivi(string $file, array $note): void
{
    if (!is_dir(dirname($file))) {
        mkdir(dirname($file), 0775, true);
    }
    $tmp = $file . '.tmp';
    file_put_contents($tmp, json_encode($note, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
    rename($tmp, $file);
}

function rispondi(int $codice, $dati): void
{
    http_response_code($codice);
    echo json_encode($dati, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function adesso(): string
{
    return date('c');
}

function timbro_stato(array &$nota, string $stato): void
{
    $nota['status'] = $stato;
    $campo = ['open' => 'reopened_at', 'closed' => 'closed_at'][$stato] ?? 'resolved_at';
    $nota[$campo] = adesso();
}

function testo_breve($valore, int $max): string
{
    return is_scalar($valore) ? mb_substr(trim((string) $valore), 0, $max) : '';
}

function unita($valore): float
{
    return max(0.0, min(1.0, is_numeric($valore) ? (float) $valore : 0.0));
}

function misura($valore): ?array
{
    if (!is_array($valore) || !is_numeric($valore['w'] ?? null) || !is_numeric($valore['h'] ?? null)) {
        return null;
    }
    $out = ['w' => (int) $valore['w'], 'h' => (int) $valore['h']];
    if (is_numeric($valore['dpr'] ?? null)) {
        $out['dpr'] = round((float) $valore['dpr'], 2);
    }
    return $out;
}

/** Elemento DOM agganciato: null se la nota è solo a coordinate. */
function aggancio($valore): ?array
{
    if (!is_array($valore) || testo_breve($valore['selector'] ?? '', 600) === '') {
        return null;
    }
    return [
        'selector' => testo_breve($valore['selector'], 600),
        'tag' => testo_breve($valore['tag'] ?? '', 20),
        'id' => testo_breve($valore['id'] ?? '', 100),
        'text' => testo_breve($valore['text'] ?? '', 120),
        'x' => unita($valore['x'] ?? 0),
        'y' => unita($valore['y'] ?? 0),
    ];
}

/** Elemento intermedio (slide, sezione [data-nota]): null se non c'è. */
function contesto($valore): ?array
{
    if (!is_array($valore) || testo_breve($valore['selector'] ?? '', 600) === '') {
        return null;
    }
    return [
        'selector' => testo_breve($valore['selector'], 600),
        'label' => testo_breve($valore['label'] ?? '', 120),
        'x' => unita($valore['x'] ?? 0),
        'y' => unita($valore['y'] ?? 0),
    ];
}

/** Campi di posizione comuni a creazione e spostamento. */
function posizione(array $d): array
{
    return [
        'anchor' => aggancio($d['anchor'] ?? null),
        'context' => contesto($d['context'] ?? null),
        'x_percent' => unita($d['x_percent'] ?? 0),
        'y_percent' => unita($d['y_percent'] ?? 0),
        'viewport' => misura($d['viewport'] ?? null),
        'doc' => misura($d['doc'] ?? null),
        'ua' => testo_breve($d['ua'] ?? '', 300),
        'url' => testo_breve($d['url'] ?? '', 600),
    ];
}

$note = leggi($DATA);
$id = (string) ($_GET['id'] ?? '');
$azione = (string) ($_GET['action'] ?? '');
$corpo = json_decode((string) file_get_contents('php://input'), true);
$corpo = is_array($corpo) ? $corpo : [];

if ($metodo === 'GET') {
    rispondi(200, array_values($note));
}

// --- azioni su tutte le note di una pagina (formazione-ia-base) ---
if ($metodo === 'POST' && in_array($azione, ['risolvi-tutto', 'archivia'], true)) {
    $pagina = (string) ($corpo['page'] ?? '');
    if ($pagina === '') {
        rispondi(400, ['error' => 'page required']);
    }
    $della = array_filter($note, fn($n) => ($n['page'] ?? '') === $pagina);

    if ($azione === 'risolvi-tutto') {
        $n = 0;
        foreach ($della as $nid => $nota) {
            if (($nota['status'] ?? '') === 'open') {
                timbro_stato($note[$nid], 'resolved');
                $n++;
            }
        }
        scrivi($DATA, $note);
        rispondi(200, ['ok' => true, 'risolte' => $n]);
    }

    // archivia: tutte le note della pagina in bozze/note-archivio.md, poi via da note.json
    if (!$della) {
        rispondi(200, ['ok' => true, 'archiviate' => 0]);
    }
    usort($della, fn($a, $b) => strcmp($a['created_at'] ?? '', $b['created_at'] ?? ''));
    $md = "\n## " . $pagina . ' — archiviate il ' . date('Y-m-d H:i') . "\n\n";
    foreach ($della as $nota) {
        $dove = $nota['context']['label'] ?? ($nota['anchor']['selector'] ?? ($nota['slide'] ?? 'pagina'));
        $md .= '### ' . substr((string) ($nota['created_at'] ?? ''), 0, 16) . ' · ' . $dove . ' · ' . ($nota['status'] ?? '') . "\n\n";
        if (($nota['quote'] ?? '') !== '') {
            $md .= '> ' . str_replace("\n", "\n> ", $nota['quote']) . "\n\n";
        }
        $md .= '**FZ:** ' . trim((string) ($nota['text'] ?? '')) . "\n\n";
        foreach ($nota['replies'] ?? [] as $r) {
            $md .= '**' . ($r['author'] ?? '?') . ':** ' . trim((string) ($r['text'] ?? '')) . "\n\n";
        }
        unset($note[$nota['id']]);
    }
    // scrittura atomica (tmp + rename) anche per l'archivio: regge se il file è stato riscritto da altri (es. git pull)
    $prima = is_file($ARCHIVIO)
        ? (string) file_get_contents($ARCHIVIO)
        : "# Archivio delle note di revisione\n\nNote archiviate con «Archivia tutto» (non si pubblica).\n";
    $tmp = $ARCHIVIO . '.tmp';
    file_put_contents($tmp, $prima . $md, LOCK_EX);
    rename($tmp, $ARCHIVIO);
    scrivi($DATA, $note);
    rispondi(200, ['ok' => true, 'archiviate' => count($della)]);
}

if ($metodo === 'POST' && $azione === 'risposta') {
    if (!isset($note[$id])) {
        rispondi(404, ['error' => 'not found']);
    }
    $testo = trim((string) ($corpo['text'] ?? ''));
    if ($testo === '') {
        rispondi(400, ['error' => 'text required']);
    }
    $stato = $corpo['status'] ?? null;
    if ($stato !== null && !in_array($stato, STATI, true)) {
        rispondi(400, ['error' => 'invalid status']);
    }
    $note[$id]['replies'] = $note[$id]['replies'] ?? [];
    $note[$id]['replies'][] = [
        'author' => (string) (($corpo['author'] ?? '') ?: 'FZ'),
        'text' => $testo,
        'created_at' => adesso(),
    ];
    if ($stato) {
        timbro_stato($note[$id], $stato);
    }
    scrivi($DATA, $note);
    rispondi(200, $note[$id]);
}

if ($metodo === 'POST') {
    $testo = trim((string) ($corpo['text'] ?? ''));
    if ($testo === '') {
        rispondi(400, ['error' => 'text required']);
    }
    $nid = bin2hex(random_bytes(6));
    $note[$nid] = ['id' => $nid, 'page' => testo_breve($corpo['page'] ?? '', 600)]
        + posizione($corpo)
        + [
            'quote' => testo_breve($corpo['quote'] ?? '', 1000),
            'text' => $testo,
            'status' => 'open',
            'created_at' => adesso(),
            'replies' => [],
        ];
    scrivi($DATA, $note);
    rispondi(200, $note[$nid]);
}

if (!isset($note[$id])) {
    rispondi(404, ['error' => 'not found']);
}

if ($metodo === 'PATCH' && is_array($corpo['position'] ?? null)) {
    // spostamento: il nuovo aggancio sostituisce quello vecchio (anche quello 2.0 a slide)
    $note[$id] = array_merge($note[$id], posizione($corpo['position']), ['moved_at' => adesso()]);
    unset($note[$id]['legacy'], $note[$id]['slide'], $note[$id]['slide_n']);
    scrivi($DATA, $note);
    rispondi(200, $note[$id]);
}

if ($metodo === 'PATCH') {
    $stato = (string) ($corpo['status'] ?? 'resolved');
    if (!in_array($stato, STATI, true)) {
        rispondi(400, ['error' => 'invalid status']);
    }
    timbro_stato($note[$id], $stato);
    scrivi($DATA, $note);
    rispondi(200, $note[$id]);
}

if ($metodo === 'DELETE') {
    unset($note[$id]);
    scrivi($DATA, $note);
    rispondi(200, ['ok' => true]);
}

rispondi(405, ['error' => 'method not allowed']);
