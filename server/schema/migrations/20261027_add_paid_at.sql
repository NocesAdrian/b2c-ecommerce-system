ALTER TABLE orders
    ADD COLUMN paid_at DATETIME NULL AFTER date_created,
    ADD INDEX idx_orders_status_paid_at (status, paid_at);

UPDATE orders
SET paid_at = date_created
WHERE status IN ('paid', 'delivered')
    AND paid_at IS NULL;
