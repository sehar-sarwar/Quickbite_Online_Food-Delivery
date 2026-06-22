CREATE DATABASE IF NOT EXISTS quickbite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quickbitea;

CREATE TABLE IF NOT EXISTS menu_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)   NOT NULL,
    description   TEXT,
    category      VARCHAR(60)    NOT NULL,
    price         DECIMAL(8,2)   NOT NULL,
    image         VARCHAR(300),
    rating        DECIMAL(2,1)   DEFAULT 4.5,
    delivery_time INT            DEFAULT 25,       -- minutes
    sizes         JSON,                            -- e.g. [{"label":"Small","price":299}]
    is_featured   TINYINT(1)     DEFAULT 0,
    is_available  TINYINT(1)     DEFAULT 1,
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Orders ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    customer_name   VARCHAR(120)  NOT NULL,
    phone           VARCHAR(30)   NOT NULL,
    address         TEXT          NOT NULL,
    city            VARCHAR(80),
    payment_method  ENUM('cod','easypaisa','card') DEFAULT 'cod',
    notes           TEXT,
    subtotal        DECIMAL(10,2) DEFAULT 0,
    delivery_fee    DECIMAL(8,2)  DEFAULT 99,
    discount        DECIMAL(8,2)  DEFAULT 0,
    total           DECIMAL(10,2) DEFAULT 0,
    status          ENUM('pending','confirmed','preparing','delivered','cancelled') DEFAULT 'pending',
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. Order Items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    order_id     INT            NOT NULL,
    menu_item_id INT,
    item_name    VARCHAR(120)   NOT NULL,
    size         VARCHAR(40)    DEFAULT '',
    price        DECIMAL(8,2)   NOT NULL,
    qty          INT            DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ── 4. Newsletter Subscribers ──────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(180) NOT NULL UNIQUE,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  SAMPLE MENU DATA
-- ============================================================
INSERT INTO menu_items (name, description, category, price, image, rating, delivery_time, sizes, is_featured) VALUES

-- Burgers
('Classic Zinger Burger',   'Crispy fried chicken fillet with lettuce and mayo.',       'Burgers', 399, NULL, 4.8, 20, NULL, 1),
('Double Smash Burger',     'Two smashed beef patties with cheddar and caramelised onion.', 'Burgers', 549, NULL, 4.9, 25, NULL, 1),
('Chicken BBQ Burger',      'Grilled chicken with smoky BBQ sauce and coleslaw.',        'Burgers', 449, NULL, 4.6, 22, NULL, 0),
('Veggie Burger',           'Crispy veg patty with fresh salad and ranch sauce.',        'Burgers', 299, NULL, 4.3, 20, NULL, 0),

-- Pizza
('Margherita Pizza',        'Classic tomato base with fresh mozzarella and basil.',      'Pizza',   699, NULL, 4.7, 30,
 '[{"label":"Small","price":499},{"label":"Medium","price":699},{"label":"Large","price":899}]', 1),
('Chicken Tikka Pizza',     'Spicy chicken tikka with bell peppers and onion.',          'Pizza',   799, NULL, 4.8, 30,
 '[{"label":"Small","price":599},{"label":"Medium","price":799},{"label":"Large","price":999}]', 1),
('BBQ Beef Pizza',          'Beef mince with BBQ sauce, jalapeños and cheese.',          'Pizza',   849, NULL, 4.6, 32,
 '[{"label":"Small","price":649},{"label":"Medium","price":849},{"label":"Large","price":1049}]', 0),

-- Biryani
('Chicken Biryani',         'Aromatic basmati rice slow-cooked with tender chicken.',    'Biryani', 499, NULL, 4.9, 35, NULL, 1),
('Beef Biryani',            'Rich slow-cooked beef with saffron basmati rice.',          'Biryani', 549, NULL, 4.8, 35, NULL, 0),
('Vegetable Biryani',       'Fragrant basmati with seasonal vegetables and whole spices.','Biryani', 349, NULL, 4.4, 30, NULL, 0),

-- Fries
('Classic Fries',           'Golden crispy fries lightly salted.',                       'Fries',   199, NULL, 4.5, 15, NULL, 0),
('Masala Fries',            'Fries tossed in spicy chaat masala and chilli flakes.',     'Fries',   249, NULL, 4.7, 15, NULL, 0),
('Loaded Cheese Fries',     'Fries topped with cheddar sauce, jalapeños and sour cream.','Fries',   349, NULL, 4.8, 18, NULL, 1),

-- Drinks
('Mango Shake',             'Fresh mango blended with milk and a hint of cream.',        'Drinks',  249, NULL, 4.7, 10, NULL, 0),
('Chocolate Shake',         'Rich Belgian chocolate blended with vanilla ice cream.',    'Drinks',  279, NULL, 4.8, 10, NULL, 1),
('Lemon Mint Cooler',       'Refreshing lemon juice with fresh mint and soda.',          'Drinks',  179, NULL, 4.6, 10, NULL, 0),
('Cold Coffee',             'Chilled coffee blended with milk and ice cream.',           'Drinks',  229, NULL, 4.5, 10, NULL, 0),

-- Wraps
('Chicken Tikka Wrap',      'Spicy chicken tikka with salad and garlic sauce in a paratha.','Wraps', 349, NULL, 4.6, 20, NULL, 0),
('Zinger Wrap',             'Crispy zinger fillet with coleslaw and chilli mayo.',       'Wraps',   329, NULL, 4.7, 20, NULL, 1),

-- Desserts
('Chocolate Lava Cake',     'Warm chocolate cake with a gooey molten centre.',           'Desserts', 299, NULL, 4.9, 20, NULL, 1),
('Gulab Jamun (4 pcs)',     'Soft milk-solid dumplings soaked in rose-flavoured syrup.', 'Desserts', 199, NULL, 4.7, 15, NULL, 0);