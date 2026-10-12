USE b2c_ecommerce_db;

INSERT INTO users (
    role_id,
    username,
    password_hash
)
VALUES
(2, 'John', 'hashed_password_001'),
(1, 'adrian noces', 'hashed_password_002');