<?php
/**
 * Modifica diretta del testo delle slide (strumenti/modifica.js) — solo in locale, servito da MAMP.
 *
 *   POST modifica-api.php  {giorno: "g1", slide: {"s12": "<h2>…</h2>…", …}}
 *        → sostituisce il contenuto di quelle <section> in bozze/gN.html (la fonte, anche se
 *          si modifica da giorni/gN.html), dopo una copia in bozze/backup/ (stessa cartella del
 *          riordino: «Annulla» di ordina-api.php la ripristina); poi rigenera la scaletta e,
 *          se la giornata è pubblicata, giorni/gN.html (senza PDF) e l'indice pubblico.
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

/** Lancia uno script Python del progetto; restituisce l'output o esce con errore. */
function python(string $radice, array $argomenti): string
{
    foreach (['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3'] as $py) {
        if (is_executable($py)) {
            $cmd = escapeshellarg($py) . ' ' . implode(' ', array_map('escapeshellarg', $argomenti)) . ' 2>&1';
            exec($cmd, $out, $ret);
            if ($ret !== 0) {
                rispondi(500, ['error' => 'script non riuscito: ' . basename($argomenti[0]), 'dettaglio' => implode("\n", $out)]);
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
$slide = $corpo['slide'] ?? [];
if (!preg_match('/^g[1-4]$/', $giorno) || !is_array($slide) || !$slide) {
    rispondi(400, ['error' => 'richiesta non valida']);
}

$file = "$RADICE/bozze/$giorno.html";
$html = (string) file_get_contents($file);
$cambiate = [];

foreach ($slide as $id => $contenuto) {
    $id = (string) $id;
    $contenuto = (string) $contenuto;
    if (!preg_match('/^[\w-]+$/', $id)) {
        rispondi(400, ['error' => "id non valido: $id"]);
    }
    // il contenuto non può chiudere la slide né aprirne un'altra
    if (preg_match('/<\/?section\b/i', $contenuto)) {
        rispondi(400, ['error' => "contenuto non valido nella slide $id"]);
    }
    $trovate = 0;
    $html = preg_replace_callback(
        '/(<section class="slide[^"]*" id="' . preg_quote($id, '/') . '"[^>]*>)(.*?)(<\/section>)/s',
        function ($m) use ($contenuto, &$trovate) {
            $trovate++;
            return $m[1] . "\n  " . trim($contenuto) . "\n" . $m[3];
        },
        $html,
        1
    );
    if ($trovate !== 1) {
        rispondi(404, ['error' => "slide non trovata in bozze/$giorno.html: $id"]);
    }
    $cambiate[] = $id;
}

$cartella = "$RADICE/bozze/backup";
if (!is_dir($cartella)) {
    mkdir($cartella, 0775, true);
}
$copia = "$cartella/$giorno-" . date('Ymd-His') . '.html';
copy($file, $copia);
$tmp = "$file.tmp";
file_put_contents($tmp, $html, LOCK_EX);
rename($tmp, $file);

$log = [python($RADICE, ["$RADICE/strumenti/scaletta-da-slide.py", $giorno])];
if (is_file("$RADICE/giorni/$giorno.html")) {
    $log[] = python($RADICE, ["$RADICE/strumenti/pubblica.py", $giorno, '--senza-pdf']);
    $log[] = python($RADICE, ["$RADICE/strumenti/genera-indice.py", $giorno]);
}

rispondi(200, ['ok' => true, 'slide' => $cambiate, 'copia' => basename($copia), 'log' => implode("\n", $log)]);
