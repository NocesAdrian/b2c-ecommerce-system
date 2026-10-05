USE b2c_ecommerce_db;

INSERT INTO roles (
    name,
    description
)
VALUES
('admin', 'all powerful account'),
('customer', 'browse, add to cart, checkout, buy product, add/edit profile/location');
