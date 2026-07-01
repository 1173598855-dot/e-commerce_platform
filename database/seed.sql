USE ecommerce;

INSERT INTO categories (id, name, icon, sort_order, status) VALUES
(1, 'Phones', 'phone', 1, 1),
(2, 'Computers', 'laptop', 2, 1),
(3, 'Accessories', 'headphones', 3, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), sort_order = VALUES(sort_order), status = VALUES(status);

INSERT INTO merchants (id, name, contact_name, contact_phone, status, rating, total_sales) VALUES
(1, 'Official Store', 'Admin', '13800138000', 1, 5.00, 0)
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

INSERT INTO merchant_users (merchant_id, user_id, role, status) VALUES
(1, 1, 'owner', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), status = VALUES(status);

INSERT INTO role_permissions (role, permission, status) VALUES
('admin', '*', 1),
('merchant', 'refund:list', 1),
('merchant', 'refund:detail', 1),
('merchant', 'refund:review', 1),
('merchant', 'refund:submit', 1),
('merchant', 'order:ship', 1),
('merchant', 'product:manage', 1),
('merchant', 'export:manage', 1),
('merchant', 'operation:log:list', 1),
('customer', 'refund:submit', 1)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO products (id, name, description, price, original_price, stock, category_id, merchant_id, brand, image, sales, rating, status) VALUES
(1, 'iPhone 15 Pro Max', 'Flagship smartphone with A17 Pro chip', 9999.00, 10999.00, 100, 1, 1, 'Apple', 'https://via.placeholder.com/300x300?text=iPhone15Pro', 1250, 4.90, 1),
(2, 'Mate 60 Pro', 'Flagship smartphone with satellite communication', 6999.00, 7999.00, 120, 1, 1, 'Huawei', 'https://via.placeholder.com/300x300?text=Mate60Pro', 2100, 4.80, 1),
(3, 'MacBook Pro 14', 'Laptop with M3 Pro chip', 16999.00, 17999.00, 50, 2, 1, 'Apple', 'https://via.placeholder.com/300x300?text=MacBookPro', 600, 4.70, 1),
(4, 'AirPods Pro 2', 'Wireless earbuds with noise cancellation', 1899.00, 1999.00, 200, 3, 1, 'Apple', 'https://via.placeholder.com/300x300?text=AirPodsPro', 5000, 4.60, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), stock = VALUES(stock), price = VALUES(price), status = VALUES(status);

INSERT INTO product_images (product_id, image_url, sort_order) VALUES
(1, 'https://via.placeholder.com/800x800?text=iPhone15Pro+1', 1),
(1, 'https://via.placeholder.com/800x800?text=iPhone15Pro+2', 2),
(2, 'https://via.placeholder.com/800x800?text=Mate60Pro+1', 1),
(3, 'https://via.placeholder.com/800x800?text=MacBookPro+1', 1),
(4, 'https://via.placeholder.com/800x800?text=AirPodsPro+1', 1);

INSERT INTO product_spec_options (product_id, spec_name, spec_value, sort_order) VALUES
(1, 'Color', 'Natural Titanium', 1),
(1, 'Storage', '256GB', 2),
(1, 'Storage', '512GB', 3),
(2, 'Color', 'Black', 1),
(2, 'Storage', '512GB', 2);

INSERT INTO product_skus (product_id, spec_name, spec_value, price, stock, sku_code, status) VALUES
(1, 'Storage', '256GB', 9999.00, 50, 'IP15PM-256', 1),
(1, 'Storage', '512GB', 11999.00, 30, 'IP15PM-512', 1),
(2, 'Storage', '512GB', 6999.00, 60, 'M60P-512', 1);

INSERT INTO hot_searches (keyword, search_count, is_hot, sort_order, status) VALUES
('iPhone', 5000, 1, 1, 1),
('Huawei', 4500, 1, 2, 1),
('MacBook', 2500, 1, 3, 1)
ON DUPLICATE KEY UPDATE search_count = VALUES(search_count), is_hot = VALUES(is_hot), sort_order = VALUES(sort_order), status = VALUES(status);

INSERT INTO users (id, phone, password, nickname, role, points, login_type, status) VALUES
(1, '13800138000', '$2a$10$yHMhx1pw8v0eJ1m./HT4De/1uKOY68ggKX2AYa6fa60TKjZczD3pC', 'Test User', 'admin', 100, 'password', 1)
ON DUPLICATE KEY UPDATE password = VALUES(password), nickname = VALUES(nickname), role = VALUES(role), points = VALUES(points), status = VALUES(status);

INSERT INTO coupons (id, name, type, value, min_amount, condition_amount, discount_amount, start_time, end_time, valid_start, valid_end, total, total_count, status) VALUES
(1, 'New User Coupon', 'fixed', 20.00, 100.00, 100.00, 20.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1000, 1000, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);
