export const DATABASE_VERSION = 2;

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE shops (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  language TEXT NOT NULL DEFAULT 'Roman Urdu',
  bill_footer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE device_settings (
  setting_key TEXT PRIMARY KEY NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  shop_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (shop_id, setting_key),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE TABLE products (
  id TEXT PRIMARY KEY NOT NULL,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  barcode TEXT,
  unit TEXT NOT NULL,
  price_paisa INTEGER NOT NULL CHECK (price_paisa >= 0),
  stock_quantity REAL NOT NULL DEFAULT 0,
  low_stock_threshold REAL NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE (id, shop_id)
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE (id, shop_id)
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY NOT NULL,
  shop_id TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  customer_id TEXT,
  bill_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    bill_status IN ('draft', 'finalized', 'cancelled')
  ),
  subtotal_paisa INTEGER NOT NULL CHECK (subtotal_paisa >= 0),
  discount_paisa INTEGER NOT NULL DEFAULT 0 CHECK (
    discount_paisa >= 0 AND discount_paisa <= subtotal_paisa
  ),
  total_paisa INTEGER NOT NULL CHECK (
    total_paisa >= 0 AND total_paisa = subtotal_paisa - discount_paisa
  ),
  paid_paisa INTEGER NOT NULL DEFAULT 0 CHECK (
    paid_paisa >= 0 AND paid_paisa <= total_paisa
  ),
  payment_status TEXT NOT NULL DEFAULT 'udhaar' CHECK (
    payment_status IN ('paid', 'partial', 'udhaar')
  ),
  payment_method TEXT CHECK (
    payment_method IS NULL OR
    payment_method IN ('cash', 'bank', 'other')
  ),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id, shop_id)
    REFERENCES customers(id, shop_id),
  UNIQUE (shop_id, bill_number),
  UNIQUE (id, shop_id),
  CHECK (
    (payment_status = 'paid' AND paid_paisa = total_paisa)
    OR
    (payment_status = 'partial' AND paid_paisa > 0 AND paid_paisa < total_paisa)
    OR
    (payment_status = 'udhaar' AND paid_paisa = 0)
  )
);

CREATE TABLE bill_items (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price_paisa INTEGER NOT NULL CHECK (unit_price_paisa >= 0),
  line_total_paisa INTEGER NOT NULL CHECK (line_total_paisa >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (bill_id, shop_id)
    REFERENCES bills(id, shop_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id, shop_id)
    REFERENCES products(id, shop_id) ON DELETE RESTRICT
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  shop_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  bill_id TEXT,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('sale', 'restock', 'adjustment', 'return')
  ),
  quantity REAL NOT NULL,
  previous_stock REAL NOT NULL,
  resulting_stock REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id, shop_id)
    REFERENCES products(id, shop_id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id)
    REFERENCES bills(id) ON DELETE SET NULL
);

CREATE TABLE customer_ledger (
  id TEXT PRIMARY KEY NOT NULL,
  shop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  bill_id TEXT,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('bill_udhaar', 'payment_received', 'adjustment')
  ),
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
  payment_method TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id, shop_id)
    REFERENCES customers(id, shop_id),
  FOREIGN KEY (bill_id, shop_id)
    REFERENCES bills(id, shop_id)
);

CREATE INDEX idx_products_shop_active
  ON products(shop_id, is_active);

CREATE INDEX idx_products_shop_name
  ON products(shop_id, name);

CREATE INDEX idx_customers_shop_name
  ON customers(shop_id, name);

CREATE INDEX idx_bills_shop_created
  ON bills(shop_id, created_at);

CREATE INDEX idx_bill_items_bill
  ON bill_items(bill_id);

CREATE INDEX idx_bill_items_shop
  ON bill_items(shop_id);

CREATE INDEX idx_stock_movements_product
  ON stock_movements(shop_id, product_id, created_at);

CREATE INDEX idx_stock_movements_bill
  ON stock_movements(bill_id);

CREATE INDEX idx_customer_ledger_customer
  ON customer_ledger(shop_id, customer_id, created_at);
`;
