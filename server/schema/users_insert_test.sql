USE b2c_ecommerce;

INSERT INTO users (
    role_id,
    first_name,
    last_name,
    location,
    password_hash
) VALUES
(1, 'John', 'Carter', 'Manila', 'hashed_password_001'),
(1, 'Maria', 'Santos', 'Quezon City', 'hashed_password_002'),
(1, 'James', 'Reyes', 'Cebu City', 'hashed_password_003'),
(1, 'Anna', 'Garcia', 'Davao City', 'hashed_password_004'),
(1, 'Mark', 'Cruz', 'Pasig', 'hashed_password_005'),
(1, 'Sofia', 'Mendoza', 'Makati', 'hashed_password_006'),
(1, 'Daniel', 'Torres', 'Taguig', 'hashed_password_007'),
(1, 'Lisa', 'Ramos', 'Caloocan', 'hashed_password_008'),
(1, 'Kevin', 'Flores', 'Antipolo', 'hashed_password_009'),
(2, 'Michael', 'Anderson', 'Manila', 'hashed_password_admin');