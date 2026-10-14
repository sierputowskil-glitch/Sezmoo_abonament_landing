<?php
/**
 * SEZMOO — obsługa formularza kontaktowego (PL + EN)
 * Hosting: Cyberfolks (Apache + PHP). Zwraca JSON.
 *
 * Wymaga config.local.php (zob. config.local.php.example).
 * Wysyłka: SMTP przez PHPMailer (fallback: mail()).
 * Antyspam: Cloudflare Turnstile + honeypot + filtry treści.
 */

declare(strict_types=1);

const RATE_SECONDS = 20;
const MAX_LINKS    = 2;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function load_config(): array {
    $file = __DIR__ . '/config.local.php';
    if (!is_file($file)) {
        fail('Brak konfiguracji formularza.', 500);
    }
    $cfg = require $file;
    if (!is_array($cfg)) {
        fail('Nieprawidłowa konfiguracja formularza.', 500);
    }
    return $cfg;
}

function form_log(string $line): void {
    $dir = __DIR__ . '/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    @file_put_contents(
        $dir . '/form-' . date('Y-m') . '.log',
        date('c') . ' ' . $line . "\n",
        FILE_APPEND | LOCK_EX
    );
}

function verify_turnstile(string $token, string $secret, string $ip): bool {
    if ($token === '' || $secret === '') {
        return false;
    }
    $payload = http_build_query([
        'secret'   => $secret,
        'response' => $token,
        'remoteip' => $ip,
    ]);
    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $raw = curl_exec($ch);
    }
    if ($raw === false) {
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $payload,
                'timeout' => 8,
            ],
        ]);
        $raw = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ctx);
    }
    if ($raw === false) {
        return false;
    }
    $data = json_decode($raw, true);
    return is_array($data) && !empty($data['success']);
}

/** Display-name bezpieczne dla nagłówka Reply-To (bez CR/LF i znaków specjalnych). */
function header_safe_name(string $name): string {
    $name = str_replace(["\r", "\n", "\0", '"', '\\', '<', '>'], '', $name);
    $name = trim(preg_replace('/\s+/u', ' ', $name) ?? $name);
    return mb_substr($name, 0, 120);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed', 405);
}

$cfg = load_config();
$mailTo     = (string)($cfg['MAIL_TO'] ?? 'biuro@sezmoo.com');
$smtpFrom   = (string)($cfg['SMTP_FROM'] ?? 'no-reply@sezmoo.com');
$smtpName   = (string)($cfg['SMTP_FROM_NAME'] ?? 'SEZMOO');
$tsSecret   = (string)($cfg['TURNSTILE_SECRET_KEY'] ?? '');

// --- honeypot ---
if (trim((string)($_POST['bot-field'] ?? '')) !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

$ipRaw = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$now   = time();

// --- Turnstile ---
$cfToken = trim((string)($_POST['cf-turnstile-response'] ?? ''));
if ($tsSecret === '' || str_contains($tsSecret, '...')) {
    fail('Turnstile nie jest skonfigurowany.', 500);
}
if (!verify_turnstile($cfToken, $tsSecret, $ipRaw)) {
    fail('Weryfikacja antybot nieudana. Odśwież stronę i spróbuj ponownie.', 403);
}

// --- rate limit po IP ---
$lockDir = sys_get_temp_dir() . '/sezmoo-form';
@mkdir($lockDir, 0700, true);
$lockFile = $lockDir . '/' . hash('sha256', $ipRaw . $tsSecret);
if (is_file($lockFile) && ($now - (int)@filemtime($lockFile)) < RATE_SECONDS) {
    fail('Za szybko — odczekaj chwilę.', 429);
}

// --- pobranie i sanityzacja pól ---
$clean = static function (string $key, int $max = 300): string {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);
    return mb_substr($v, 0, $max);
};

$name    = $clean('name', 120);
$name    = preg_replace('/\s+/u', ' ', $name) ?? $name;
$email   = $clean('email', 160);
$phone   = $clean('phone', 40);
$company = $clean('company', 160);
$need    = $clean('need', 80);
$message = trim((string)($_POST['message'] ?? ''));
$message = str_replace("\0", '', $message);
$message = mb_substr($message, 0, 5000);
$consent = isset($_POST['consent']);
$package = $clean('package', 40);
$allowedPackage = ['30h', '60h', '120h', '250h', 'Nie wiem – doradźcie'];
if ($package !== '' && !in_array($package, $allowedPackage, true)) {
    $package = '';
}
$lang    = ($clean('lang', 4) === 'en') ? 'en' : 'pl';
$origin  = $clean('form-name', 40) === 'abonament' ? 'abonament' : 'kontakt';

$allowedNeed = [
    // kontakt PL
    'Wideo / motion', 'Kampania / content', 'Social media', 'Design / grafika',
    'Strona / landing page', 'Nie wiem, chcę pogadać',
    // kontakt EN
    'Video / motion', 'Campaign / content', 'Design / graphics',
    'Website / landing page', 'Not sure, let’s talk', "Not sure, let's talk",
    // abonament PL / EN
    'Foto', 'Grafika', 'Wszystko po trochu',
    'Photo', 'Design', 'A bit of everything',
];
if ($need !== '' && !in_array($need, $allowedNeed, true)) {
    fail('Nieprawidłowy obszar.');
}

if ($name === '' || $message === '') {
    fail($lang === 'en' ? 'Please fill in the required fields.' : 'Uzupełnij wymagane pola.');
}

// Imię i nazwisko: litery (PL/EN), spacje, myślnik, apostrof — min. dwa człony
if (!preg_match(
    "/^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\\-]*(?:\\s+[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\\-]*)+$/u",
    $name
)) {
    fail($lang === 'en'
        ? 'Enter your first and last name (letters only).'
        : 'Podaj imię i nazwisko (same litery).');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail($lang === 'en' ? 'Invalid email address.' : 'Nieprawidłowy adres e-mail.');
}

// Telefon opcjonalny; jeśli podany — 9–15 cyfr, dozwolone +, spacje, -, ()
if ($phone !== '') {
    $phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
    if (
        !preg_match('/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/', $phone)
        || strlen($phoneDigits) < 9
        || strlen($phoneDigits) > 15
    ) {
        fail($lang === 'en'
            ? 'Enter a valid phone number (e.g. +48 500 000 000).'
            : 'Podaj prawidłowy numer telefonu (np. +48 500 000 000).');
    }
}

if (!$consent) {
    fail($lang === 'en' ? 'Consent is required.' : 'Wymagana zgoda na przetwarzanie danych.');
}
if (mb_strlen($message) < 10) {
    fail($lang === 'en' ? 'Message is too short.' : 'Wiadomość jest zbyt krótka.');
}

if (preg_match_all('~https?://|www\.~i', $name . ' ' . $message) > MAX_LINKS) {
    fail('Wiadomość odrzucona.');
}
if (preg_match('~\[url=|\[/url\]|<a\s+href~i', $name . ' ' . $message)) {
    fail('Wiadomość odrzucona.');
}
if (preg_match('~\b(seo\s+services|backlinks?|crypto\s+invest|viagra|casino|loan\s+offer)\b~i', $message)) {
    fail('Wiadomość odrzucona.');
}
if (preg_match('~https?://~i', $name)) {
    fail('Wiadomość odrzucona.');
}

$when = date('Y-m-d H:i:s');
$companyLine = $company !== '' ? "Firma           : {$company}\n" : '';
$originLine  = $origin === 'abonament' ? "Formularz       : abonament\n" : '';
$packageLine = $package !== '' ? "Pakiet          : {$package}\n" : '';

$body = <<<TXT
Nowe zapytanie z formularza na sezmoo.com
{$originLine}
Imię i nazwisko : {$name}
{$companyLine}E-mail          : {$email}
Telefon         : {$phone}
Obszar          : {$need}
{$packageLine}Język formularza: {$lang}

Wiadomość:
{$message}

---
Zgoda RODO: TAK (checkbox zaznaczony)
Data        : {$when}
IP          : {$ipRaw}
TXT;

$subject = 'Nowe zapytanie ze strony sezmoo.com — ' . $name;
$replyName = header_safe_name($name);

$sent = false;
$errorDetail = '';
$via = 'mail';

$smtpHost = trim((string)($cfg['SMTP_HOST'] ?? ''));
$autoload = __DIR__ . '/vendor/autoload.php';

if ($smtpHost !== '' && is_file($autoload)) {
    require_once $autoload;
    $via = 'smtp';
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host       = $smtpHost;
        $mail->Port       = (int)($cfg['SMTP_PORT'] ?? 587);
        $mail->SMTPAuth   = true;
        $mail->Username   = (string)($cfg['SMTP_USER'] ?? '');
        $mail->Password   = (string)($cfg['SMTP_PASS'] ?? '');
        $secure = strtolower((string)($cfg['SMTP_SECURE'] ?? 'tls'));
        if ($secure === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($secure === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = false;
            $mail->SMTPAutoTLS = false;
        }
        $mail->setFrom($smtpFrom, $smtpName);
        $mail->addAddress($mailTo);
        $mail->addReplyTo($email, $replyName !== '' ? $replyName : $email);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->isHTML(false);
        $mail->send();
        $sent = true;
    } catch (Throwable $e) {
        $errorDetail = $e->getMessage();
        $sent = false;
    }
} else {
    $headers = [
        'From'                      => sprintf('%s <%s>', $smtpName, $smtpFrom),
        'Reply-To'                  => sprintf('%s <%s>', $replyName !== '' ? $replyName : 'SEZMOO', $email),
        'MIME-Version'              => '1.0',
        'Content-Type'              => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
        'X-Mailer'                  => 'sezmoo-form',
    ];
    $headerLines = '';
    foreach ($headers as $k => $v) {
        $headerLines .= $k . ': ' . $v . "\r\n";
    }
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $sent = @mail($mailTo, $encodedSubject, $body, $headerLines, '-f' . $smtpFrom);
    if (!$sent) {
        $errorDetail = 'mail() returned false';
    }
}

form_log(sprintf(
    'origin=%s lang=%s email=%s via=%s ok=%s ip=%s%s',
    $origin,
    $lang,
    $email,
    $via,
    $sent ? '1' : '0',
    $ipRaw,
    $errorDetail !== '' ? ' err=' . str_replace(["\r", "\n"], ' ', $errorDetail) : ''
));

if (!$sent) {
    fail('Nie udało się wysłać wiadomości.', 500);
}

@touch($lockFile);
echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
