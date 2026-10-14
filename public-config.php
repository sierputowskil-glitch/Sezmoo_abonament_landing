<?php
/**
 * Publiczny fragment konfiguracji formularza (tylko site key Turnstile).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');

$siteKey = '';
$configFile = __DIR__ . '/config.local.php';
if (is_file($configFile)) {
    $cfg = require $configFile;
    if (is_array($cfg)) {
        $siteKey = (string)($cfg['TURNSTILE_SITE_KEY'] ?? '');
    }
}

echo json_encode(['turnstileSiteKey' => $siteKey], JSON_UNESCAPED_UNICODE);
