<?php
declare(strict_types=1);

const HF_ENDPOINT = 'https://api-inference.huggingface.co/models/briaai/RMBG-1.4';
const MAX_BYTES = 12582912;

header('Cache-Control: no-store');

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

function load_api_key(): string
{
    $key = getenv('HF_API_KEY');

    if (!$key && isset($_SERVER['HF_API_KEY'])) {
        $key = $_SERVER['HF_API_KEY'];
    }

    $envPath = __DIR__ . '/.env';
    if (!$key && is_readable($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, 'HF_API_KEY=') === 0) {
                $key = trim(substr($line, strlen('HF_API_KEY=')), " \t\n\r\0\x0B\"'");
                break;
            }
        }
    }

    return $key ? trim($key) : '';
}

function friendly_error(int $status, string $body): array
{
    $decoded = json_decode($body, true);
    $rawMessage = is_array($decoded) && isset($decoded['error']) ? (string) $decoded['error'] : $body;

    if ($status === 429) {
        return array(
            'status' => 429,
            'message' => 'The AI background remover is rate limited right now. Please wait a minute and try again.'
        );
    }

    if ($status === 503 || stripos($rawMessage, 'loading') !== false || stripos($rawMessage, 'currently loading') !== false) {
        return array(
            'status' => 503,
            'message' => 'The AI model is starting up. Please wait 20 seconds, then try again.'
        );
    }

    return array(
        'status' => 502,
        'message' => 'Background removal could not finish. Please try again.'
    );
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, array('message' => 'Use POST to remove a background.'));
}

$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength <= 0) {
    json_response(400, array('message' => 'No image data was received.'));
}

if ($contentLength > MAX_BYTES) {
    json_response(413, array('message' => 'Please choose an image under 12 MB.'));
}

$contentType = isset($_SERVER['CONTENT_TYPE']) ? strtolower(trim($_SERVER['CONTENT_TYPE'])) : 'application/octet-stream';
$contentType = explode(';', $contentType)[0];
$allowedTypes = array('image/jpeg', 'image/png', 'image/webp');

if (!in_array($contentType, $allowedTypes, true)) {
    json_response(415, array('message' => 'Please upload a JPG, PNG, or WebP image.'));
}

$apiKey = load_api_key();
if ($apiKey === '') {
    json_response(500, array('message' => 'Background removal is not configured yet. Add HF_API_KEY on the server.'));
}

if (!function_exists('curl_init')) {
    json_response(500, array('message' => 'Background removal needs PHP cURL enabled on the server.'));
}

$imageBytes = file_get_contents('php://input');
if ($imageBytes === false || strlen($imageBytes) === 0) {
    json_response(400, array('message' => 'The uploaded image could not be read.'));
}

$curl = curl_init(HF_ENDPOINT);
curl_setopt_array($curl, array(
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_POSTFIELDS => $imageBytes,
    CURLOPT_HTTPHEADER => array(
        'Authorization: Bearer ' . $apiKey,
        'Accept: image/png',
        'Content-Type: ' . $contentType
    )
));

$response = curl_exec($curl);
if ($response === false) {
    $error = curl_error($curl);
    curl_close($curl);
    json_response(502, array('message' => 'Background removal service is unavailable. Please try again.', 'detail' => $error));
}

$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($curl, CURLINFO_HEADER_SIZE);
$body = substr($response, $headerSize);
$responseType = (string) curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
curl_close($curl);

if ($status >= 200 && $status < 300 && stripos($responseType, 'image/') !== false) {
    http_response_code(200);
    header('Content-Type: image/png');
    echo $body;
    exit;
}

$error = friendly_error($status, $body);
json_response($error['status'], array('message' => $error['message']));
