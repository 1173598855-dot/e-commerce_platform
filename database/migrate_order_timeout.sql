-- Order timeout compensation migration for existing databases.
-- Adds the composite index used by pending order expiration scans.

USE ecommerce;

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_orders_status_created'
);
SET @sql = IF(
  @exists = 0,
  'CREATE INDEX idx_orders_status_created ON orders(status, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
