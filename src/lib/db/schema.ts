/** Idempotent schema. Runs automatically on the embedded DB, and via `npm run db:setup` in production. */
const TABLES = [
  'collections', 'products', 'product_variants', 'customers', 'addresses', 'wishlist', 'orders',
  'promo_codes', 'shipping_rates', 'reviews', 'settings', 'newsletter', 'stock_alerts', 'messages', 'rate_limits',
];

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS collections (
  slug text PRIMARY KEY,
  name_ar text NOT NULL, name_en text NOT NULL,
  story_ar text NOT NULL DEFAULT '', story_en text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '', sort int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  sku text NOT NULL,
  name_ar text NOT NULL, name_en text NOT NULL,
  desc_ar text NOT NULL DEFAULT '', desc_en text NOT NULL DEFAULT '',
  fabric_ar text NOT NULL DEFAULT '', fabric_en text NOT NULL DEFAULT '',
  care_ar text NOT NULL DEFAULT '', care_en text NOT NULL DEFAULT '',
  fit_ar text NOT NULL DEFAULT '', fit_en text NOT NULL DEFAULT '',
  price int NOT NULL CHECK (price >= 0),
  sale_price int CHECK (sale_price IS NULL OR sale_price >= 0),
  category text NOT NULL,
  fit text,
  gender text NOT NULL DEFAULT 'unisex',
  collection text REFERENCES collections(slug) ON DELETE SET NULL,
  tags jsonb NOT NULL DEFAULT '[]',
  colors jsonb NOT NULL DEFAULT '[]',
  video text,
  status text NOT NULL DEFAULT 'active',
  featured boolean NOT NULL DEFAULT false,
  sold_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);

CREATE TABLE IF NOT EXISTS product_variants (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id text NOT NULL,
  size text NOT NULL,
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  PRIMARY KEY (product_id, color_id, size)
);

CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL, phone text NOT NULL,
  governorate text NOT NULL, city text NOT NULL, address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist (
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, product_id)
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  number text UNIQUE NOT NULL,
  customer_id text REFERENCES customers(id) ON DELETE SET NULL,
  name text NOT NULL, phone text NOT NULL, alt_phone text, email text,
  governorate text NOT NULL, city text NOT NULL, address text NOT NULL, notes text,
  items jsonb NOT NULL,
  subtotal int NOT NULL, discount int NOT NULL DEFAULT 0, shipping int NOT NULL DEFAULT 0, total int NOT NULL,
  promo_code text,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_proof text,
  payment_ref text,
  status text NOT NULL DEFAULT 'pending',
  history jsonb NOT NULL DEFAULT '[]',
  locale text NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(phone);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS promo_codes (
  code text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value int NOT NULL CHECK (value > 0),
  min_subtotal int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  first_order_only boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id text PRIMARY KEY,
  name_ar text NOT NULL, name_en text NOT NULL,
  fee int NOT NULL DEFAULT 0,
  sort int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL, city text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  image text,
  status text NOT NULL DEFAULT 'pending',
  on_home boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id, status);

CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);

CREATE TABLE IF NOT EXISTS newsletter (email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS stock_alerts (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id text NOT NULL, size text NOT NULL, contact text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color_id, size, contact)
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  name text NOT NULL, phone text, email text, body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count int NOT NULL, reset_at timestamptz NOT NULL);

-- Hosted Postgres can expose the public schema over a REST API. This app connects directly as
-- the table owner, so RLS with no policies blocks that API without affecting the site.
${TABLES.map((t) => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`).join('\n')}
`;
