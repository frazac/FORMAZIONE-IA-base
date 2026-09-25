<?php
/**
 * Riordino delle slide dalla scaletta (bozze/index.html) — solo in locale, servito da MAMP.
 *
 *   POST ordina-api.php                   {giorno: "g1", capitoli: [{num: "2", ids: ["s24", …]}, …]}
 *        → riscrive bozze/g1.html con le slide nel nuovo ordine (data-capitolo aggiornato
 *          se una slide cambia capitolo), dopo averne salvato una copia in bozze/backup/,
 *          poi rigenera la scaletta con strumenti/scaletta-da-slide.py
 *   POST ordina-api.php?action=annulla    {giorno: "g1"}  → ripristina l'ultima copia
 *
 * I capitoli restano nel loro ordine: si spostano solo le slide.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'forbidden']);
    exit;
}

$RADICE = dirname(__DIR__);

function rispondi(int $codice, array $dati): void
{
    http_response_code($codice);
    echo json_encode($dati, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Rigenera la scaletta in bozze/index.html (script Python del progetto). */
function scaletta(string $radice, string $giorno): string
{
    foreach (['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3'] as $py) {
        if (is_executable($py)) {
            $cmd = escapeshellarg($py) . ' ' . escapeshellarg("$radice/strumenti/scaletta-da-slide.py") . ' ' . escapeshellarg($giorno) . ' 2>&1';
            exec($cmd, $out, $ret);
            if ($ret !== 0) {
                rispondi(500, ['error' => 'scaletta non rigenerata', 'dettaglio' => implode("\n", $out)]);
            }
            return implode("\n", $out);
        }
    }
    rispondi(500, ['error' => 'python3 non trovato']);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    rispondi(405, ['error' => 'method not allowed']);
}

$corpo = json_decode((string) file_get_contents('php://input'), true);
$corpo = is_array($corpo) ? $corpo : [];
$giorno = (string) ($corpo['giorno'] ?? '');
if (!preg_match('/^g[1-4]$/', $giorno)) {
    rispondi(400, ['error' => 'giorno non valido']);
}
$file = "$RADICE/bozze/$giorno.html";
$cartella = "$RADICE/bozze/backup";

// --- annulla: ripristina l'ultima copia ---
if (($_GET['action'] ?? '') === 'annulla') {
    $copie = glob("$cartella/$giorno-*.html") ?: [];
    sort($copie);
    $ultima = end($copie);
    if (!$ultima) {
        rispondi(404, ['error' => 'nessuna copia da ripristinare']);
    }
    copy($ultima, $file);
    unlink($ultima);
    rispondi(200, ['ok' => true, 'ripristinato' => basename($ultima), 'scaletta' => scaletta($RADICE, $giorno)]);
}

// --- riordino ---
$html = (string) file_get_contents($file);

// testa (fino al primo capitolo), capitoli, coda (dopo l'ultima slide)
if (!preg_match('/^(.*?)(<!-- \d+ — .*? -->.*<\/section>)(.*)$/s', $html, $m)) {
    rispondi(500, ['error' => 'struttura delle slide non riconosciuta']);
}
[$tutto, $testa, $corpoSlide, $coda] = $m;

// titoli dei capitoli dai commenti, slide per id
preg_match_all('/<!-- (\d+) — (.*?) -->/', $corpoSlide, $cap, PREG_SET_ORDER);
$titoli = [];
foreach ($cap as $c) {
    $titoli[$c[1]] = $c[2];
}
preg_match_all('/<section class="slide[^"]*" id="([^"]+)".*?<\/section>/s', $corpoSlide, $sec, PREG_SET_ORDER);
$slide = [];
foreach ($sec as $s) {
    $slide[$s[1]] = $s[0];
}

// sicurezza: tra una slide e l'altra devono esserci solo spazi e commenti di capitolo
$resto = preg_replace('/<section class="slide[^"]*" id="[^"]+".*?<\/section>/s', '', $corpoSlide);
$resto = preg_replace('/<!-- \d+ — .*? -->/', '', $resto);
if (trim($resto) !== '') {
    rispondi(409, ['error' => 'tra le slide c\'è altro testo: riordino annullato per non perderlo', 'testo' => mb_substr(trim($resto), 0, 200)]);
}

// il nuovo ordine deve contenere esattamente le stesse slide
$capitoli = $corpo['capitoli'] ?? [];
$nuovi = [];
foreach ($capitoli as $c) {
    foreach (($c['ids'] ?? []) as $id) {
        $nuovi[] = (string) $id;
    }
}
$vecchi = array_keys($slide);
$a = $nuovi;
$b = $vecchi;
sort($a);
sort($b);
if ($a !== $b) {
    rispondi(400, ['error' => 'l\'elenco delle slide non corrisponde', 'mancano' => array_values(array_diff($vecchi, $nuovi)), 'in_piu' => array_values(array_diff($nuovi, $vecchi))]);
}
// niente da fare se ogni slide resta nello stesso posto e nello stesso capitolo
preg_match_all('/<!-- (\d+) — .*? -->|<section class="slide[^"]*" id="([^"]+)"/', $corpoSlide, $seq, PREG_SET_ORDER);
$firmaVecchia = [];
$numCorrente = '';
foreach ($seq as $t) {
    if (($t[1] ?? '') !== '') {
        $numCorrente = $t[1];
    } else {
        $firmaVecchia[] = "$numCorrente:{$t[2]}";
    }
}
$firmaNuova = [];
foreach ($capitoli as $c) {
    foreach ($c['ids'] ?? [] as $id) {
        $firmaNuova[] = ((string) ($c['num'] ?? '')) . ":$id";
    }
}
if ($firmaNuova === $firmaVecchia) {
    rispondi(200, ['ok' => true, 'invariato' => true]);
}

// ricostruzione: un commento per capitolo, poi le sue slide (data-capitolo aggiornato)
$parti = [];
foreach ($capitoli as $c) {
    $num = (string) ($c['num'] ?? '');
    if (!isset($titoli[$num])) {
        rispondi(400, ['error' => "capitolo sconosciuto: $num"]);
    }
    $parti[] = "<!-- $num — {$titoli[$num]} -->";
    foreach ($c['ids'] as $id) {
        $parti[] = preg_replace('/data-capitolo="[^"]*"/', 'data-capitolo="' . htmlspecialchars($titoli[$num], ENT_COMPAT | ENT_HTML5, 'UTF-8') . '"', $slide[$id], 1);
    }
}
// i capitoli senza voci (vuoti) restano, per non perdere il commento
$usati = array_map(fn($c) => (string) $c['num'], $capitoli);
foreach ($titoli as $num => $t) {
    if (!in_array((string) $num, $usati, true)) {
        rispondi(400, ['error' => "capitolo mancante nel nuovo ordine: $num"]);
    }
}

if (!is_dir($cartella)) {
    mkdir($cartella, 0775, true);
}
$copia = "$cartella/$giorno-" . date('Ymd-His') . '.html';
copy($file, $copia);

$nuovo = $testa . implode("\n\n", $parti) . $coda;
$tmp = "$file.tmp";
file_put_contents($tmp, $nuovo, LOCK_EX);
rename($tmp, $file);

rispondi(200, ['ok' => true, 'copia' => basename($copia), 'scaletta' => scaletta($RADICE, $giorno)]);
