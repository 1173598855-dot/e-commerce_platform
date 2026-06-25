const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'ecommerce',
  });

  try {
    console.log('开始插入种子数据...\n');

    // 插入分类
    const categories = [
      { name: '手机数码', parent_id: null, icon: '📱', sort_order: 1 },
      { name: '电脑办公', parent_id: null, icon: '💻', sort_order: 2 },
      { name: '服装鞋帽', parent_id: null, icon: '👔', sort_order: 3 },
      { name: '家用电器', parent_id: null, icon: '🏠', sort_order: 4 },
      { name: '食品饮料', parent_id: null, icon: '🍔', sort_order: 5 },
      { name: '美妆护肤', parent_id: null, icon: '💄', sort_order: 6 },
      { name: '运动户外', parent_id: null, icon: '⚽', sort_order: 7 },
      { name: '图书文具', parent_id: null, icon: '📚', sort_order: 8 },
    ];

    const catResults = [];
    for (const cat of categories) {
      const [result] = await connection.execute(
        'INSERT IGNORE INTO categories (name, parent_id, icon, sort_order) VALUES (?, ?, ?, ?)',
        [cat.name, cat.parent_id, cat.icon, cat.sort_order]
      );
      catResults.push(result);
    }
    console.log(`分类插入完成: ${catResults.filter(r => r.affectedRows > 0).length} 条`);

    // 获取分类ID
    const [allCats] = await connection.query('SELECT id, name FROM categories');
    const catMap = {};
    allCats.forEach(c => catMap[c.name] = c.id);

    // 插入商品
    const products = [
      { name: 'iPhone 15 Pro Max 256GB', desc: 'A17芯片，钛金属设计', price: 9999, originalPrice: 10999, stock: 100, catId: catMap['手机数码'], brand: 'Apple', spec: '256GB/钛金色', image: '/uploads/iphone.jpg', sales: 5200 },
      { name: '华为 Mate 60 Pro 12+512GB', desc: '麒麟9000S，卫星通信', price: 6999, originalPrice: 7999, stock: 80, catId: catMap['手机数码'], brand: '华为', spec: '12+512GB/雅丹黑', image: '/uploads/huawei.jpg', sales: 3800 },
      { name: '小米14 Ultra 16+512GB', desc: '徕卡光学镜头，骁龙8Gen3', price: 5999, originalPrice: 6499, stock: 150, catId: catMap['手机数码'], brand: '小米', spec: '16+512GB/黑色', image: '/uploads/xiaomi.jpg', sales: 2600 },
      { name: 'MacBook Pro 16寸 M3 Max', desc: '苹果M3 Max芯片，36GB内存', price: 24999, originalPrice: 26999, stock: 30, catId: catMap['电脑办公'], brand: 'Apple', spec: 'M3 Max/36GB/1TB', image: '/uploads/macbook.jpg', sales: 890 },
      { name: '联想 ThinkPad X1 Carbon', desc: '轻薄商务本，i7处理器', price: 12999, originalPrice: 14999, stock: 50, catId: catMap['电脑办公'], brand: '联想', spec: 'i7/32GB/1TB', image: '/uploads/thinkpad.jpg', sales: 1200 },
      { name: '戴尔 XPS 15 酷睿Ultra', desc: '3.5K OLED触控屏', price: 11999, originalPrice: 13499, stock: 45, catId: catMap['电脑办公'], brand: '戴尔', spec: 'Ultra7/32GB/1TB', image: '/uploads/dell.jpg', sales: 670 },
      { name: '男士纯棉休闲T恤', desc: '100%新疆长绒棉，舒适透气', price: 99, originalPrice: 199, stock: 500, catId: catMap['服装鞋帽'], brand: '优衣库', spec: 'XL/白色', image: '/uploads/tshirt.jpg', sales: 15000 },
      { name: '女士春季新款连衣裙', desc: '法式优雅，碎花雪纺', price: 259, originalPrice: 459, stock: 200, catId: catMap['服装鞋帽'], brand: 'ZARA', spec: 'M/碎花蓝', image: '/uploads/dress.jpg', sales: 8900 },
      { name: 'Nike Air Jordan 1 复刻版', desc: '经典篮球鞋，高帮设计', price: 1299, originalPrice: 1599, stock: 60, catId: catMap['服装鞋帽'], brand: 'Nike', spec: '42码/黑红', image: '/uploads/nike.jpg', sales: 3400 },
      { name: '索尼 WH-1000XM5 降噪耳机', desc: '行业领先降噪，30小时续航', price: 2499, originalPrice: 2999, stock: 120, catId: catMap['手机数码'], brand: '索尼', spec: '黑色', image: '/uploads/sony.jpg', sales: 4500 },
      { name: '戴森 V15 无线吸尘器', desc: '激光探测，智能清洁', price: 4990, originalPrice: 5690, stock: 40, catId: catMap['家用电器'], brand: '戴森', spec: '金色', image: '/uploads/dyson.jpg', sales: 2100 },
      { name: '美的 变频空调 1.5匹', desc: '新一级能效，智能温控', price: 2899, originalPrice: 3599, stock: 80, catId: catMap['家用电器'], brand: '美的', spec: '1.5匹/白色', image: '/uploads/midea.jpg', sales: 6700 },
      { name: '三只松鼠 坚果大礼包', desc: '每日坚果，混合装1500g', price: 128, originalPrice: 198, stock: 300, catId: catMap['食品饮料'], brand: '三只松鼠', spec: '1500g', image: '/uploads/snacks.jpg', sales: 25000 },
      { name: '茅台 飞天白酒 53度 500ml', desc: '经典酱香型白酒', price: 1499, originalPrice: 1499, stock: 20, catId: catMap['食品饮料'], brand: '茅台', spec: '500ml', image: '/uploads/moutai.jpg', sales: 1800 },
      { name: '兰蔻 小黑瓶精华肌底液', desc: '修护肌肤，紧致淡纹', price: 1180, originalPrice: 1380, stock: 90, catId: catMap['美妆护肤'], brand: '兰蔻', spec: '100ml', image: '/uploads/lancome.jpg', sales: 7200 },
      { name: 'SK-II 神仙水护肤精华', desc: 'PITERA™精华，改善肤质', price: 1540, originalPrice: 1760, stock: 70, catId: catMap['美妆护肤'], brand: 'SK-II', spec: '230ml', image: '/uploads/skii.jpg', sales: 5600 },
      { name: '迪卡侬 跑步鞋 男款', desc: '轻量缓震，透气网面', price: 299, originalPrice: 399, stock: 200, catId: catMap['运动户外'], brand: '迪卡侬', spec: '42码/灰色', image: '/uploads/deca.jpg', sales: 9800 },
      { name: '《深入理解计算机系统》', desc: '计算机经典教材，第三版', price: 109, originalPrice: 139, stock: 150, catId: catMap['图书文具'], brand: '机械工业出版社', spec: '平装', image: '/uploads/cs.jpg', sales: 4300 },
    ];

    let productCount = 0;
    for (const p of products) {
      const [result] = await connection.execute(
        `INSERT INTO products (name, description, price, original_price, stock, category_id, brand, spec, image, sales, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [p.name, p.desc, p.price, p.originalPrice, p.stock, p.catId, p.brand, p.spec, p.image, p.sales]
      );
      if (result.affectedRows > 0) productCount++;
    }
    console.log(`商品插入完成: ${productCount} 条`);

    // 插入测试用户
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('123456', 10);
    await connection.execute(
      `INSERT INTO users (phone, password, nickname, status) VALUES (?, ?, ?, 1)`,
      ['13800138000', hashedPassword, '测试用户']
    );
    console.log('测试用户已创建: 13800138000 / 123456');

    console.log('\n✅ 种子数据插入完成！');
  } catch (err) {
    console.error('❌ 种子数据插入失败:', err.message);
  } finally {
    await connection.end();
  }
}

seedDatabase();
