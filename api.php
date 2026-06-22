<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

/* ── DB Config ── */
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'quickbitea');
define('DB_USER', 'root');
define('DB_PASS', '');

/* ── Connect ── */
function db() {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

/* ── Response helpers ── */
function ok($data = [])  { echo json_encode(['success' => true]  + $data); exit; }
function err($msg, $code = 400) { http_response_code($code); echo json_encode(['success' => false, 'message' => $msg]); exit; }

/* ── Router ── */
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// POST body
$body = [];
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $body['action'] ?? $action;
}

try {
    switch ($action) {

        /* ── GET /api.php?action=menu ── */
        case 'menu':
            $cat   = $_GET['category'] ?? '';
            $q     = $_GET['q']        ?? '';
            $sql   = 'SELECT * FROM menu_items WHERE is_available = 1';
            $params = [];
            if ($cat) { $sql .= ' AND category = ?'; $params[] = $cat; }
            if ($q)   { $sql .= ' AND (name LIKE ? OR description LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
            $sql .= ' ORDER BY is_featured DESC, id ASC';
            $stmt = db()->prepare($sql);
            $stmt->execute($params);
            ok(['items' => $stmt->fetchAll()]);

        /* ── GET /api.php?action=categories ── */
        case 'categories':
            $rows = db()->query('SELECT DISTINCT category FROM menu_items WHERE is_available = 1 ORDER BY category')->fetchAll();
            ok(['categories' => array_column($rows, 'category')]);

        /* ── POST place_order ── */
        case 'place_order':
            $required = ['name', 'phone', 'address', 'items'];
            foreach ($required as $f) {
                if (empty($body[$f])) err("Field '$f' is required.");
            }
            if (!is_array($body['items']) || !count($body['items'])) err('Cart is empty.');

            $pdo = db();
            $pdo->beginTransaction();

            // Insert order
            $stmt = $pdo->prepare('INSERT INTO orders (customer_name, phone, address, city, payment_method, notes, subtotal, delivery_fee, discount, total, status)
                                   VALUES (?,?,?,?,?,?,?,?,?,?,?)');
            $stmt->execute([
                $body['name'], $body['phone'], $body['address'],
                $body['city']    ?? '',
                $body['payment'] ?? 'cod',
                $body['notes']   ?? '',
                $body['subtotal']      ?? 0,
                $body['delivery_fee']  ?? 99,
                $body['discount']      ?? 0,
                $body['total']         ?? 0,
                'pending'
            ]);
            $orderId = $pdo->lastInsertId();

            // Insert order items
            $si = $pdo->prepare('INSERT INTO order_items (order_id, menu_item_id, item_name, size, price, qty) VALUES (?,?,?,?,?,?)');
            foreach ($body['items'] as $item) {
                $si->execute([
                    $orderId,
                    $item['id']    ?? null,
                    $item['name']  ?? '',
                    $item['size']  ?? '',
                    $item['price'] ?? 0,
                    $item['qty']   ?? 1
                ]);
            }

            $pdo->commit();
            ok(['order_id' => $orderId]);

        /* ── GET /api.php?action=orders (admin) ── */
        case 'orders':
            $rows = db()->query('SELECT o.*, GROUP_CONCAT(oi.item_name, " x", oi.qty SEPARATOR ", ") AS items_summary
                                 FROM orders o
                                 LEFT JOIN order_items oi ON oi.order_id = o.id
                                 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100')->fetchAll();
            ok(['orders' => $rows]);

        /* ── POST update_order_status (admin) ── */
        case 'update_status':
            if (empty($body['order_id']) || empty($body['status'])) err('order_id and status required.');
            $allowed = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];
            if (!in_array($body['status'], $allowed)) err('Invalid status.');
            $stmt = db()->prepare('UPDATE orders SET status = ? WHERE id = ?');
            $stmt->execute([$body['status'], $body['order_id']]);
            ok();

        /* ── POST subscribe (newsletter) ── */
        case 'subscribe':
            $email = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);
            if (!$email) err('Invalid email address.');
            $stmt = db()->prepare('INSERT IGNORE INTO subscribers (email) VALUES (?)');
            $stmt->execute([$email]);
            ok(['message' => 'Subscribed successfully!']);

        default:
            err('Unknown action.', 404);
    }
} catch (PDOException $e) {
    err('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    err($e->getMessage(), 500);
}