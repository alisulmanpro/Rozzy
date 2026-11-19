import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DATABASE_VERSION,
  INITIAL_SCHEMA_SQL,
} from './schema';

export async function migrateDatabase(
  db: SQLiteDatabase,
): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionResult = await db.getFirstAsync<{
    user_version: number;
  }>('PRAGMA user_version;');

  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }

  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  // SQLite PRAGMA foreign_keys = OFF is a no-op if executed inside an active transaction.
  // Therefore, foreign keys must be disabled before opening the migration transaction
  // and restored in a finally block so that table rebuilds with child foreign keys (e.g. bill_items -> products)
  // succeed safely without FK violation errors or leaving foreign keys disabled.
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  try {
    await db.withTransactionAsync(async () => {
      let version = currentVersion;

      if (version === 0) {
        await db.execAsync(INITIAL_SCHEMA_SQL);
        version = DATABASE_VERSION;
      }

      if (version === 1) {
        // Migration from v1 to v2:
        // 1. Rebuild products table to remove CHECK (stock_quantity >= 0) while preserving data, unique constraint, and foreign keys.
        // 2. Create stock_movements audit table and indexes.
        await db.execAsync(`
          CREATE TABLE products_new (
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

          INSERT INTO products_new (
            id, shop_id, name, aliases_json, barcode, unit,
            price_paisa, stock_quantity, low_stock_threshold,
            is_active, created_at, updated_at
          )
          SELECT
            id, shop_id, name, aliases_json, barcode, unit,
            price_paisa, stock_quantity, low_stock_threshold,
            is_active, created_at, updated_at
          FROM products;

          DROP TABLE products;

          ALTER TABLE products_new RENAME TO products;

          CREATE INDEX IF NOT EXISTS idx_products_shop_active
            ON products(shop_id, is_active);

          CREATE INDEX IF NOT EXISTS idx_products_shop_name
            ON products(shop_id, name);

          CREATE TABLE IF NOT EXISTS stock_movements (
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

          CREATE INDEX IF NOT EXISTS idx_stock_movements_product
            ON stock_movements(shop_id, product_id, created_at);

          CREATE INDEX IF NOT EXISTS idx_stock_movements_bill
            ON stock_movements(bill_id);
        `);

        version = 2;
      }

      await db.execAsync(`PRAGMA user_version = ${version};`);
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
