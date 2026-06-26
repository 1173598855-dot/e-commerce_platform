USE ecommerce;

-- 清空测试数据（可选）
-- SET FOREIGN_KEY_CHECKS=0; TRUNCATE categories; TRUNCATE products; TRUNCATE product_skus; TRUNCATE product_spec_options; TRUNCATE product_images; SET FOREIGN_KEY_CHECKS=1;

-- 分类
INSERT INTO categories (name, icon, sort_order, status) VALUES
('手机', 'phone', 1, 1),
('电脑', 'laptop', 2, 1),
('平板', 'tablet', 3, 1),
('耳机', 'headphone', 4, 1),
('智能手表', 'watch', 5, 1),
('相机', 'camera', 6, 1),
('游戏', 'game', 7, 1);

-- 商品
INSERT INTO products (name, description, price, original_price, stock, category_id, brand, image, sales, status) VALUES
('iPhone 15 Pro Max', 'Apple 2024旗舰手机 A17 Pro芯片 钛金属设计', 9999.00, 10999.00, 500, 1, 'Apple', 'https://via.placeholder.com/300x300?text=iPhone15Pro', 1250, 1),
('iPhone 15', 'Apple 2024标准版 A16芯片', 5999.00, 6999.00, 800, 1, 'Apple', 'https://via.placeholder.com/300x300?text=iPhone15', 2300, 1),
('华为 Mate 60 Pro', '华为旗舰 麒麟9000S 卫星通话', 6999.00, 7999.00, 300, 1, '华为', 'https://via.placeholder.com/300x300?text=Mate60Pro', 3500, 1),
('华为 P60 Pro', '华为影像旗舰 超聚光XMAGE', 5988.00, 6988.00, 400, 1, '华为', 'https://via.placeholder.com/300x300?text=P60Pro', 1800, 1),
('小米 14 Pro', '小米旗舰 骁龙8Gen3 徕卡影像', 4999.00, 5499.00, 600, 1, '小米', 'https://via.placeholder.com/300x300?text=Xiaomi14Pro', 2100, 1),
('小米 14', '小米标准旗舰 骁龙8Gen3', 3999.00, 4499.00, 900, 1, '小米', 'https://via.placeholder.com/300x300?text=Xiaomi14', 3200, 1),
('OPPO Find X7', 'OPPO年度旗舰 哈苏影像', 5499.00, 6499.00, 350, 1, 'OPPO', 'https://via.placeholder.com/300x300?text=FindX7', 900, 1),
('vivo X100 Pro', 'vivo旗舰 蔡司APO长焦', 4999.00, 5499.00, 450, 1, 'vivo', 'https://via.placeholder.com/300x300?text=X100Pro', 1100, 1),

('MacBook Pro 14 M3 Pro', 'Apple 2024笔记本 M3 Pro芯片', 16999.00, 17999.00, 200, 2, 'Apple', 'https://via.placeholder.com/300x300?text=MacBookPro', 600, 1),
('MacBook Air 15 M3', 'Apple轻薄本 M3芯片', 10499.00, 10999.00, 350, 2, 'Apple', 'https://via.placeholder.com/300x300?text=MacBookAir', 950, 1),
('联想 拯救者 Y9000P', '游戏本 i9-14900HX RTX4070', 10999.00, 11999.00, 250, 2, '联想', 'https://via.placeholder.com/300x300?text=Y9000P', 1500, 1),
('华为 MateBook X Pro', '华为旗舰轻薄本 酷睿Ultra', 11999.00, 12999.00, 180, 2, '华为', 'https://via.placeholder.com/300x300?text=MateBookX', 700, 1),
('小米笔记本 Pro 16', '小米高性能本 酷睿Ultra7', 6999.00, 7999.00, 300, 2, '小米', 'https://via.placeholder.com/300x300?text=MiNotebook', 850, 1),

('iPad Pro 12.9 M2', 'Apple平板 M2芯片', 8999.00, 9999.00, 200, 3, 'Apple', 'https://via.placeholder.com/300x300?text=iPadPro', 1200, 1),
('iPad Air M1', 'Apple平板 M1芯片', 4799.00, 5499.00, 400, 3, 'Apple', 'https://via.placeholder.com/300x300?text=iPadAir', 1800, 1),
('华为 MatePad Pro 13.2', '华为平板 鸿蒙专业办公', 5699.00, 6299.00, 250, 3, '华为', 'https://via.placeholder.com/300x300?text=MatePad', 650, 1),

('AirPods Pro 2', 'Apple降噪耳机 USB-C版', 1899.00, 1999.00, 1000, 4, 'Apple', 'https://via.placeholder.com/300x300?text=AirPodsPro', 5000, 1),
('华为 FreeBuds Pro 3', '华为降噪耳机 音乐旗舰', 1499.00, 1699.00, 800, 4, '华为', 'https://via.placeholder.com/300x300?text=FreeBuds', 2200, 1),
('Sony WH-1000XM5', '索尼头戴降噪耳机', 2499.00, 2999.00, 300, 4, 'Sony', 'https://via.placeholder.com/300x300?text=SonyXM5', 1500, 1),
('小米 Buds 4 Pro', '小米降噪耳机', 799.00, 999.00, 600, 4, '小米', 'https://via.placeholder.com/300x300?text=MiBuds', 1800, 1),

('Apple Watch Ultra 2', 'Apple极限运动手表', 6499.00, 6999.00, 150, 5, 'Apple', 'https://via.placeholder.com/300x300?text=WatchUltra', 800, 1),
('华为 Watch 4 Pro', '华为高端智能手表', 3488.00, 3988.00, 250, 5, '华为', 'https://via.placeholder.com/300x300?text=Watch4Pro', 1100, 1),
('小米 Watch S3', '小米智能手表', 999.00, 1299.00, 500, 5, '小米', 'https://via.placeholder.com/300x300?text=MiWatch', 1500, 1),

('Sony A7M4', '索尼全画幅微单', 16999.00, 17999.00, 100, 6, 'Sony', 'https://via.placeholder.com/300x300?text=SonyA7M4', 400, 1),
('佳能 R6 Mark II', '佳能全画幅微单', 15999.00, 16999.00, 80, 6, 'Canon', 'https://via.placeholder.com/300x300?text=CanonR6', 350, 1),

('PS5 光驱版', 'Sony PlayStation 5', 3899.00, 4299.00, 300, 7, 'Sony', 'https://via.placeholder.com/300x300?text=PS5', 2500, 1),
('Switch OLED', 'Nintendo Switch OLED版', 2199.00, 2499.00, 500, 7, 'Nintendo', 'https://via.placeholder.com/300x300?text=Switch', 3800, 1),
('Xbox Series X', '微软次世代主机', 3899.00, 4299.00, 200, 7, 'Microsoft', 'https://via.placeholder.com/300x300?text=Xbox', 1200, 1);

-- 商品图片
INSERT INTO product_images (product_id, image_url, sort_order) VALUES
(1, 'https://via.placeholder.com/800x800?text=iPhone15Pro+1', 1),
(1, 'https://via.placeholder.com/800x800?text=iPhone15Pro+2', 2),
(1, 'https://via.placeholder.com/800x800?text=iPhone15Pro+3', 3),
(2, 'https://via.placeholder.com/800x800?text=iPhone15+1', 1),
(3, 'https://via.placeholder.com/800x800?text=Mate60Pro+1', 1),
(3, 'https://via.placeholder.com/800x800?text=Mate60Pro+2', 2),
(9, 'https://via.placeholder.com/800x800?text=MacBookPro+1', 1),
(9, 'https://via.placeholder.com/800x800?text=MacBookPro+2', 2),
(17, 'https://via.placeholder.com/800x800?text=AirPodsPro+1', 1),
(25, 'https://via.placeholder.com/800x800?text=PS5+1', 1),
(26, 'https://via.placeholder.com/800x800?text=Switch+1', 1);

-- SKU规格选项
INSERT INTO product_spec_options (product_id, spec_name, spec_value, sort_order) VALUES
(1, '颜色', '原色钛金属', 1),
(1, '颜色', '蓝色钛金属', 2),
(1, '颜色', '白色钛金属', 3),
(1, '颜色', '黑色钛金属', 4),
(1, '存储', '256GB', 5),
(1, '存储', '512GB', 6),
(1, '存储', '1TB', 7),
(3, '颜色', '雅丹黑', 1),
(3, '颜色', '白沙银', 2),
(3, '存储', '256GB', 3),
(3, '存储', '512GB', 4),
(3, '存储', '1TB', 5),
(5, '颜色', '岩石黑', 1),
(5, '颜色', '白色', 2),
(5, '颜色', '粉色', 3),
(5, '存储', '256GB', 4),
(5, '存储', '512GB', 5);

-- SKU
INSERT INTO product_skus (product_id, spec_name, spec_value, price, stock, sku_code, status) VALUES
(1, '颜色', '原色钛金属', 9999.00, 100, 'IP15PM-256-TI', 1),
(1, '颜色', '蓝色钛金属', 9999.00, 120, 'IP15PM-256-BL', 1),
(1, '存储', '512GB', 11999.00, 80, 'IP15PM-512', 1),
(1, '存储', '1TB', 13999.00, 50, 'IP15PM-1TB', 1),
(3, '颜色', '雅丹黑', 6999.00, 150, 'M60P-256-BK', 1),
(3, '存储', '512GB', 7999.00, 100, 'M60P-512', 1),
(5, '颜色', '岩石黑', 4999.00, 200, 'MI14P-256-BK', 1),
(5, '存储', '512GB', 5499.00, 150, 'MI14P-512', 1);

-- 热门搜索
INSERT INTO hot_searches (keyword, search_count, is_hot, sort_order) VALUES
('iPhone', 5000, 1, 1),
('华为', 4500, 1, 2),
('小米', 3000, 1, 3),
('笔记本', 2500, 1, 4),
('耳机', 2000, 1, 5),
('iPad', 1800, 0, 6),
('游戏机', 1500, 0, 7),
('手表', 1200, 0, 8);

-- 测试用户（密码都是 123456 的 bcrypt hash）
INSERT INTO users (phone, password, nickname, points, login_type) VALUES
('13800000001', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '测试用户1', 100, 'password'),
('13800000002', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '测试用户2', 200, 'password'),
('13800000003', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '测试用户3', 0, 'sms');
