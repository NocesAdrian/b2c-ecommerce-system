# B2C E-Commerce System

A local-demo merchandise shop with customer browsing, carts, checkout, order history, and admin product, order, and user management.

## Features

- Customer registration, login, and profile editing for username, password, and delivery location
- Product browsing, search, categories, stock visibility, and cart quantity controls
- Checkout with pending orders and a manual GCash demo confirmation
- Inventory is deducted atomically when an order is marked paid; payment is rejected if stock is no longer available
- Admin dashboard, product/category management, order fulfillment, order date/status filters, user management, and printable order reports
- Server-side customer/admin authorization for protected API routes
- Ain's AI store assistant with per-account conversation history and role-appropriate order/product context
- Login-time AI summaries of customer order status and admin store activity, with database-based fallback notices

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
   - Run `server/schema/migrations/20261029_add_gemini_request_limiter.sql` once against existing databases to enable the shared one-request-per-minute Gemini cooldown.
4. Open `client/` as the static web root and serve it at <http://127.0.0.1:5500> (for example, open that folder in VS Code before starting Live Server). Do not serve the repository root. The API origin and CORS origin are configured for these local addresses by default. If you change the client origin, update both `client/config.js` and `CLIENT_ORIGIN` in `infra/.env`.
5. Register an account through the app. To create the first admin, use Adminer to set that account's `role_id` to `1` in the `users` table. The public registration endpoint always creates customer accounts.
6. Sign in as the admin, create categories and products, then sign in as a customer to test browse → cart → checkout → history. Use `scripts/off.sh` to stop the local containers.
7. To enable the AI assistant and AI-generated login greeting, add a Gemini API key to `GEMINI_API_KEY` in `infra/.env`, optionally set `GEMINI_MODEL` (defaults to `gemini-3.5-flash`), then recreate the server container with `cd infra && podman compose up -d --force-recreate server`. The key stays on the server and is never sent to the browser. If Gemini is unavailable, login falls back to the database-based order and product update notice.

The database volume is stored under `database/` and persists between starts. Do not remove or replace it to reset the database unless you have backed up any data you want to keep.

## GitHub Pages frontend

The GitHub Actions workflow publishes only `client/`, keeping its relative page links and asset paths intact for the repository subpath. It deploys when changes are pushed to the `production` branch or when manually started from the Actions tab. Enable GitHub Pages for the repository with **Build and deployment → GitHub Actions**. The project site URL is `https://nocesadrian.github.io/b2c-ecommerce-system/`.

The frontend selects its API origin in `client/config.js`: local browser hosts use the local Compose API, and deployed pages use `https://despera-merchandise.42web.io`. Update that production URL there if the PHP API is hosted elsewhere. Deploy the contents of `server/` as the API document root so the API routes resolve at `/api/...`; configure `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD` in the PHP host's environment, and import `server/schema/db_create.sql` only into a new, empty database because it drops and recreates the database. For an existing hosted database, apply each migration that has not already been run, including `server/schema/migrations/20261029_add_gemini_request_limiter.sql`. Product image storage under `server/storage/products/images/` must be writable and persisted by the host.

The PHP API allows the GitHub Pages origin (`https://nocesadrian.github.io`) by default. If CORS is restricted with `CLIENT_ORIGIN` or `CLIENT_ORIGINS`, include that exact origin (without the repository path). The browser sends the session cookie with credentialed API requests, but the current API cookie uses `SameSite=Lax`; GitHub Pages and the 42web API are different sites, so browsers do not send that cookie on cross-site API requests. Third-party-cookie restrictions are an additional limitation. As a result, the GitHub Pages deployment is suitable for the static storefront preview, but authenticated features are not reliably usable with this split-host setup. For a fully functional store, host the frontend and API on the same site domain, or put both behind a same-site custom domain and configure HTTPS, CORS, and cookies accordingly.

## Demo payment limitation

The GCash screen is a demonstration only. The customer manually confirms that payment was made, and the server records the order as paid; no payment provider verifies or processes money. Do not use this flow for real payments or deploy it as a production store without a payment-provider integration and production security/configuration review.

The Ain customer-service assistant sends the signed-in user's recent messages and role-appropriate store data to the Gemini API. Its composed, curious voice is an original interpretation inspired by broad traits of Ain from *Despera*. Conversations are stored in the application's database. Chat requests and AI login greetings share a store-wide cooldown of one Gemini request per minute; the cooldown state is stored in the database, so it applies across accounts and devices. Avoid entering sensitive personal or payment information in chat. Gemini API availability, data handling, model access, and usage limits are controlled by Google and can change.

## Project layout

- `client/` — customer and admin pages, scripts, styles, and API clients
- `server/api/` — HTTP route handlers
- `server/services/` — database repositories and authorization helpers
- `server/schema/` — database schema and optional sample SQL
- `infra/` — local Podman Compose configuration
- `scripts/` — local setup/start/stop helpers
