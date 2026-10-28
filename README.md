# B2C E-Commerce System

A local-demo merchandise shop with customer browsing, carts, checkout, order history, and admin product, order, and user management.

## Features

- Customer registration, login, and profile editing for username, password, and delivery location
- Product browsing, search, categories, stock visibility, and cart quantity controls
- Checkout with pending orders and a manual GCash demo confirmation
- Inventory is deducted atomically when an order is marked paid; payment is rejected if stock is no longer available
- Admin dashboard, product/category management, order fulfillment, and user management
- Server-side customer/admin authorization for protected API routes
- GPT-powered customer service with per-account conversation history and order/product context
- Login-time customer order/product updates and admin order/product activity summaries

## Stack

- PHP 8.4 with Apache and PDO MySQL
- MySQL 8
- HTML, CSS, JavaScript modules, and Bootstrap 5
- Podman Compose for the local backend and database

## Local demo setup

1. Install Podman with Compose support, a browser, and a static file server such as the VS Code Live Server extension.
2. From the repository root, run `scripts/setup.sh`. This copies `infra/.env.example` to `infra/.env` only when no local configuration exists, then starts the PHP and MySQL containers. Edit `infra/.env` first if the default ports are already in use.
3. Open Adminer at <http://127.0.0.1:8082> and import `server/schema/db_create.sql` into the demo database. This schema script drops and recreates `b2c_ecommerce_db`; only use it for a fresh demo database.
   - System: MySQL
   - Server: `database`
   - Username/password: `root` and the `DATABASE_ROOT_PASSWORD` value from `infra/.env`
   - If you already have a database from an earlier version, do not re-import the schema. Run `server/schema/migrations/20261027_add_paid_at.sql` once against `b2c_ecommerce_db` in Adminer to add payment timestamps needed for accurate dashboard sales. Existing paid orders are backfilled to their order creation date because the original payment time was not recorded.
   - Also run `server/schema/migrations/20261028_add_customer_service.sql` once against existing databases to create the customer-service conversation tables.
4. Open `client/` as the static web root and serve it at <http://127.0.0.1:5500> (for example, open that folder in VS Code before starting Live Server). Do not serve the repository root. The API origin and CORS origin are configured for these local addresses by default. If you change the client origin, update both `client/config.js` and `CLIENT_ORIGIN` in `infra/.env`.
5. Register an account through the app. To create the first admin, use Adminer to set that account's `role_id` to `1` in the `users` table. The public registration endpoint always creates customer accounts.
6. Sign in as the admin, create categories and products, then sign in as a customer to test browse → cart → checkout → history. Use `scripts/off.sh` to stop the local containers.
7. To enable the AI assistant, add a Gemini API key to `GEMINI_API_KEY` in `infra/.env`, optionally set `GEMINI_MODEL` (defaults to `gemini-3.5-flash`), then recreate the server container with `cd infra && podman compose up -d --force-recreate server`. The key stays on the server and is never sent to the browser. Without a key, order/product update notices still work and the chat reports that AI service is not configured.

The database volume is stored under `database/` and persists between starts. Do not remove or replace it to reset the database unless you have backed up any data you want to keep.

## Demo payment limitation

The GCash screen is a demonstration only. The customer manually confirms that payment was made, and the server records the order as paid; no payment provider verifies or processes money. Do not use this flow for real payments or deploy it as a production store without a payment-provider integration and production security/configuration review.

The customer-service assistant sends the signed-in user's recent messages and role-appropriate store data to the Gemini API. Conversations are stored in the application's database. Avoid entering sensitive personal or payment information in chat. Gemini API availability, data handling, model access, and usage limits are controlled by Google and can change.

## Project layout

- `client/` — customer and admin pages, scripts, styles, and API clients
- `server/api/` — HTTP route handlers
- `server/services/` — database repositories and authorization helpers
- `server/schema/` — database schema and optional sample SQL
- `infra/` — local Podman Compose configuration
- `scripts/` — local setup/start/stop helpers
