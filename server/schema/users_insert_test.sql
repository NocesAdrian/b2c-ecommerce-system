USE b2c_ecommerce_db;

INSERT INTO users (
    role_id,
    username,
    password_hash
)
VALUES
(2, 'John', 'hashed_password_002'),
(2, 'Maria', 'hashed_password_002'),
(2, 'James', 'hashed_password_003'),
(2, 'Anna', 'hashed_password_004'),
(2, 'Mark', 'hashed_password_005'),
(2, 'Sofia', 'hashed_password_006'),
(2, 'Daniel', 'hashed_password_007'),
(1, 'Lisa', 'hashed_password_008'),
(2, 'Kevin', 'hashed_password_009'),
(2, 'Michael', 'hashed_password_admin');