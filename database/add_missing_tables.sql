-- =====================================================
-- 添加缺少的表：收藏表、物流追踪表
-- 执行时间：2026-06-27
-- =====================================================

-- 1. 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';

-- 2. 物流追踪主表
CREATE TABLE IF NOT EXISTS logistics_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    tracking_number VARCHAR(100) NOT NULL COMMENT '物流单号',
    company_code VARCHAR(50) NOT NULL COMMENT '物流公司编码',
    company_name VARCHAR(100) NOT NULL COMMENT '物流公司名称',
    status TINYINT DEFAULT 0 COMMENT '状态：0-待发货，1-运输中，2-已签收，3-异常',
    shipped_at TIMESTAMP NULL COMMENT '发货时间',
    delivered_at TIMESTAMP NULL COMMENT '签收时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_tracking_number (tracking_number),
    UNIQUE KEY uk_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流追踪主表';

-- 3. 物流轨迹明细表
CREATE TABLE IF NOT EXISTS logistics_traces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tracking_id INT NOT NULL COMMENT '关联 logistics_tracking.id',
    trace_time DATETIME NOT NULL COMMENT '轨迹时间',
    status_desc VARCHAR(200) NOT NULL COMMENT '状态描述',
    location VARCHAR(200) COMMENT '当前位置',
    description TEXT COMMENT '详细描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tracking_id (tracking_id),
    FOREIGN KEY (tracking_id) REFERENCES logistics_tracking(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流轨迹明细表';

-- =====================================================
-- 修复字段名不匹配问题
-- =====================================================

-- 检查并修复 addresses 表字段名
-- 如果字段名是 province/city/district，改为 province_name/city_name/district_name
SET @sql = (
    SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
            'ALTER TABLE addresses CHANGE COLUMN province province_name VARCHAR(50) NOT NULL, CHANGE COLUMN city city_name VARCHAR(50) NOT NULL, CHANGE COLUMN district district_name VARCHAR(50) NOT NULL'
        ELSE 'SELECT 1'
    END
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'addresses' 
    AND COLUMN_NAME = 'province'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并修复 coupons 表字段名
-- 确保 type 字段类型一致（建议使用 VARCHAR）
ALTER TABLE coupons MODIFY COLUMN type VARCHAR(20) NOT NULL COMMENT '优惠券类型：full_reduction-满减，discount-折扣';

-- 检查并修复 orders 表字段名
-- 确保字段名与代码中使用的一致
ALTER TABLE orders MODIFY COLUMN total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总金额';
ALTER TABLE orders MODIFY COLUMN actual_amount DECIMAL(10,2) NOT NULL COMMENT '实际支付金额';

-- =====================================================
-- 添加热门搜索表的 UNIQUE 约束
-- =====================================================
ALTER TABLE hot_searches ADD UNIQUE KEY uk_keyword (keyword);
