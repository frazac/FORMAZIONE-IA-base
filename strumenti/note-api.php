<?php
/**
 * Post-it — formazione-ia-base: dove stanno le note, poi l'API del plugin.
 * Plugin: strumenti/postit/api/annotate-api.php (subtree di github.com/frazac/postit-js).
 * Le note restano in bozze/ (esclusa da git): il codice è pubblico, i commenti no.
 */

$POSTIT_DATA = dirname(__DIR__) . '/bozze/note.json';
$POSTIT_ARCHIVIO = dirname(__DIR__) . '/bozze/note-archivio.md';

require __DIR__ . '/postit/api/annotate-api.php';
