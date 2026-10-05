USE b2c_ecommerce_db;

INSERT INTO users (
    role_id,
    username,
    password_hash,
    remember_me_token_hash
)
VALUES
(2, 'John', 'hashed_password_002', NULL),
(2, 'Maria', 'hashed_password_002', NULL),
(2, 'James', 'hashed_password_003', NULL),
(2, 'Anna', 'hashed_password_004', NULL),
(2, 'Mark', 'hashed_password_005', NULL),
(2, 'Sofia', 'hashed_password_006', NULL),
(2, 'Daniel', 'hashed_password_007', NULL),
(1, 'Lisa', 'hashed_password_008', NULL),
(2, 'Kevin', 'hashed_password_009', NULL),
(2, 'Michael', 'hashed_password_admin', NULL);