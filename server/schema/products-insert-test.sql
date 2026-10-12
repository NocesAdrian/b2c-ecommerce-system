USE b2c_ecommerce_db;

INSERT INTO products (
    category_id,
    name,
    description,
    unit_price,
    stocks,
    image_path
) VALUES
(1, 'Despera Logo T-Shirt',
 'Cotton T-shirt featuring a Despera-inspired logo design.',
 599.00, 25, 'images/products/despera-logo-shirt.jpg'),

(1, 'Despera Character Hoodie',
 'Comfortable hoodie featuring original Despera-inspired artwork.',
 1299.00, 15, 'images/products/despera-hoodie.jpg'),

(2, 'Despera Acrylic Standee',
 'Decorative acrylic character standee for desks and shelves.',
 249.00, 40, 'images/products/despera-standee.jpg'),

(2, 'Despera Character Keychain',
 'Lightweight acrylic keychain featuring Despera-inspired artwork.',
 99.00, 60, 'images/products/despera-keychain.jpg'),

(2, 'Despera Art Poster',
 'High-quality printed poster featuring Despera-inspired artwork.',
 199.00, 35, 'images/products/despera-poster.jpg'),

(2, 'Despera Button Pin Set',
 'Set of three collectible button pins with themed illustrations.',
 149.00, 50, 'images/products/despera-pins.jpg'),

(3, 'Despera Artbook',
 'Collection of concept art, character illustrations, and design notes.',
 899.00, 12, 'images/products/despera-artbook.jpg'),

(3, 'Despera Sticker Pack',
 'Collection of themed stickers for laptops, notebooks, and accessories.',
 129.00, 45, 'images/products/despera-stickers.jpg'),

(2, 'Despera Phone Case',
 'Protective phone case featuring a Despera-inspired design.',
 349.00, 20, 'images/products/despera-phone-case.jpg'),

(3, 'Despera Collector Badge',
 'Collectible metal-style badge featuring themed artwork.',
 179.00, 30, 'images/products/despera-badge.jpg'),

(1, 'Despera Canvas Tote Bag',
 'Reusable canvas tote bag with a minimalist themed graphic.',
 299.00, 25, 'images/products/despera-tote-bag.jpg'),

(3, 'Despera Collector Box',
 'Merchandise bundle containing themed stickers, a keychain, and a mini poster.',
 1499.00, 8, 'images/products/despera-collector-box.jpg');