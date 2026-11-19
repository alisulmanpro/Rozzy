import { INITIAL_SCHEMA_SQL, DATABASE_VERSION } from '../src/core/database/schema';

// Minimal dynamic imports for Node builtins to stay completely compatible with react-native/expo tsconfig
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertStrictEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg}. Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn: () => void, expectedPattern: RegExp, msg: string) {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (!expectedPattern.test(err?.message || '')) {
      throw new Error(`Expected error matching ${expectedPattern}, but got: ${err?.message}`);
    }
  }
  if (!threw) {
    throw new Error(`Assertion failed: ${msg}. Function did not throw.`);
  }
}

console.log('=== Running Database Migration & Negative Stock Tests ===');

// --- Helper: Create Expo-like db wrapper over node:sqlite DatabaseSync ---
function createExpoDbAdapter(rawDb: InstanceType<typeof DatabaseSync>) {
  return {
    execAsync: async (sql: string) => {
      rawDb.exec(sql);
    },
    runAsync: async (sql: string, ...params: any[]) => {
      const stmt = rawDb.prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    getFirstAsync: async <T>(sql: string, ...params: any[]) => {
      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...params);
      return (row ?? null) as T | null;
    },
    getAllAsync: async <T>(sql: string, ...params: any[]) => {
      const stmt = rawDb.prepare(sql);
      const rows = stmt.all(...params);
      return rows as T[];
    },
    withTransactionAsync: async (action: () => Promise<void>) => {
      rawDb.exec('BEGIN IMMEDIATE;');
      try {
        await action();
        rawDb.exec('COMMIT;');
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    },
  };
}

// 1. Fresh Database Creation (v2) Test
console.log('\n--- Test 1: Fresh Database Creation (v2) ---');
{
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');

  // Run initial schema (v2)
  rawDb.exec(INITIAL_SCHEMA_SQL);
  rawDb.exec(`PRAGMA user_version = ${DATABASE_VERSION};`);

  const version = rawDb.prepare('PRAGMA user_version;').get() as { user_version: number };
  assertStrictEqual(version.user_version, 2, 'Fresh DB must have version 2');

  // Verify stock_movements table exists
  const stockMovementsTable = rawDb.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements';",
  ).get();
  assert(Boolean(stockMovementsTable), 'stock_movements table must exist in fresh schema');

  // Verify products table accepts negative stock
  rawDb.exec(`
    INSERT INTO shops (id, name, created_at, updated_at) VALUES ('shop1', 'Test Shop', datetime('now'), datetime('now'));
    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('p1', 'shop1', 'Aata', 'kg', 12000, -5, 0, 1, datetime('now'), datetime('now'));
  `);

  const prod = rawDb.prepare("SELECT stock_quantity FROM products WHERE id = 'p1'").get() as { stock_quantity: number };
  assertStrictEqual(prod.stock_quantity, -5, 'Products table in v2 must allow negative stock');

  const fkCheck = rawDb.prepare('PRAGMA foreign_key_check;').all();
  assertStrictEqual(fkCheck.length, 0, 'Fresh DB must have zero foreign key violations');
  console.log('✓ Fresh DB creation creates v2 schema, allows negative stock, and passes foreign_key_check');
}

// 2. Migration from Populated v1 Database with Bills & Bill Items
console.log('\n--- Test 2: Migration from Populated v1 Database with Bills & Bill Items ---');
{
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  const db = createExpoDbAdapter(rawDb);

  // Create v1 schema with CHECK (stock_quantity >= 0) and bill_items referencing products ON DELETE RESTRICT
  const V1_SCHEMA_SQL = `
    CREATE TABLE shops (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      city TEXT,
      language TEXT NOT NULL DEFAULT 'Roman Urdu',
      bill_footer TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE products (
      id TEXT PRIMARY KEY NOT NULL,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      aliases_json TEXT NOT NULL DEFAULT '[]',
      barcode TEXT,
      unit TEXT NOT NULL,
      price_paisa INTEGER NOT NULL CHECK (price_paisa >= 0),
      stock_quantity REAL NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
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
      bill_status TEXT NOT NULL DEFAULT 'draft',
      subtotal_paisa INTEGER NOT NULL,
      discount_paisa INTEGER NOT NULL DEFAULT 0,
      total_paisa INTEGER NOT NULL,
      paid_paisa INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'udhaar',
      payment_method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id, shop_id) REFERENCES customers(id, shop_id),
      UNIQUE (shop_id, bill_number),
      UNIQUE (id, shop_id)
    );

    CREATE TABLE bill_items (
      id TEXT PRIMARY KEY NOT NULL,
      bill_id TEXT NOT NULL,
      shop_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity > 0),
      unit TEXT NOT NULL,
      unit_price_paisa INTEGER NOT NULL,
      line_total_paisa INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bill_id, shop_id) REFERENCES bills(id, shop_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id, shop_id) REFERENCES products(id, shop_id) ON DELETE RESTRICT
    );
  `;

  rawDb.exec(V1_SCHEMA_SQL);
  rawDb.exec('PRAGMA user_version = 1;');

  // Seed sample data in v1: 2 shops, products, bills, bill_items
  rawDb.exec(`
    INSERT INTO shops (id, name, created_at, updated_at) VALUES ('shop_mig', 'Migration Shop', datetime('now'), datetime('now'));
    INSERT INTO shops (id, name, created_at, updated_at) VALUES ('shop_other', 'Other Shop', datetime('now'), datetime('now'));

    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('prod_1', 'shop_mig', 'Chawal Basmati', 'kg', 25000, 10, 2, 1, datetime('now'), datetime('now'));
    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('prod_2', 'shop_mig', 'Sugar', 'kg', 15000, 0, 5, 1, datetime('now'), datetime('now'));
    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('prod_3', 'shop_other', 'Sugar', 'kg', 16000, 20, 5, 1, datetime('now'), datetime('now'));

    INSERT INTO bills (id, shop_id, bill_number, subtotal_paisa, total_paisa, paid_paisa, payment_status, payment_method, created_at, updated_at)
    VALUES ('bill_mig_1', 'shop_mig', '001', 25000, 25000, 25000, 'paid', 'cash', datetime('now'), datetime('now'));

    INSERT INTO bill_items (id, bill_id, shop_id, product_id, product_name, quantity, unit, unit_price_paisa, line_total_paisa, created_at)
    VALUES ('bi_mig_1', 'bill_mig_1', 'shop_mig', 'prod_1', 'Chawal Basmati', 1, 'kg', 25000, 25000, datetime('now'));
  `);

  // Verify v1 rejected negative stock
  assertThrows(() => {
    rawDb.exec("UPDATE products SET stock_quantity = -1 WHERE id = 'prod_2';");
  }, /CHECK constraint failed/, 'v1 schema must reject negative stock');

  // Run migrations module with foreign keys enabled
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrateDatabase } = require('../src/core/database/migrations');
  const runMigration = async () => {
    await migrateDatabase(db as any);
  };

  runMigration().then(() => {
    const newVersion = rawDb.prepare('PRAGMA user_version;').get() as { user_version: number };
    assertStrictEqual(newVersion.user_version, 2, 'Migrated DB must have user_version 2');

    // Verify foreign key pragma was restored to ON after migration
    const fkStatus = rawDb.prepare('PRAGMA foreign_keys;').get() as { foreign_keys: number };
    assertStrictEqual(fkStatus.foreign_keys, 1, 'Foreign keys enforcement must be ON after migration');

    // Run PRAGMA foreign_key_check
    const violations = rawDb.prepare('PRAGMA foreign_key_check;').all();
    assertStrictEqual(violations.length, 0, 'Must have zero foreign key violations after migration');

    // Verify existing data preserved
    const p1 = rawDb.prepare("SELECT * FROM products WHERE id = 'prod_1'").get() as any;
    assertStrictEqual(p1.name, 'Chawal Basmati', 'Product 1 name preserved');
    assertStrictEqual(p1.stock_quantity, 10, 'Product 1 stock preserved');

    const p2 = rawDb.prepare("SELECT * FROM products WHERE id = 'prod_2'").get() as any;
    assertStrictEqual(p2.name, 'Sugar', 'Product 2 name preserved');
    assertStrictEqual(p2.stock_quantity, 0, 'Product 2 stock preserved');

    const bi = rawDb.prepare("SELECT * FROM bill_items WHERE id = 'bi_mig_1'").get() as any;
    assertStrictEqual(bi.product_id, 'prod_1', 'Bill item foreign key intact');

    // Verify negative stock is now allowed
    rawDb.exec("UPDATE products SET stock_quantity = -3 WHERE id = 'prod_2';");
    const p2After = rawDb.prepare("SELECT stock_quantity FROM products WHERE id = 'prod_2'").get() as any;
    assertStrictEqual(p2After.stock_quantity, -3, 'Migrated DB must accept negative stock');

    // Verify stock_movements table created and ready
    const movements = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements';").get();
    assert(Boolean(movements), 'stock_movements table must exist after migration');

    console.log('✓ Migration from populated v1 with bill_items succeeded: FK toggled cleanly, data preserved, zero violations');
  }).catch((err) => {
    console.error('Migration test failed:', err);
    process.exit(1);
  });
}

// 3. Billing, Bill Deletion & SET NULL vs Stock History Preservation Test
console.log('\n--- Test 3: Bill Deletion & Stock Movement History Preservation ---');
{
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec(INITIAL_SCHEMA_SQL);
  rawDb.exec('PRAGMA user_version = 2;');

  // Shop setup
  rawDb.exec(`
    INSERT INTO shops (id, name, created_at, updated_at) VALUES ('shop_bill', 'Bismillah Store', datetime('now'), datetime('now'));
    INSERT INTO device_settings (setting_key, setting_value, updated_at) VALUES ('active_shop_id', 'shop_bill', datetime('now'));
    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('p_zero', 'shop_bill', 'Dal Chana', 'kg', 20000, 0, 2, 1, datetime('now'), datetime('now'));
  `);

  const billId = 'bill_to_delete';
  const shopId = 'shop_bill';
  const now = new Date().toISOString();

  // Insert bill and stock movement
  rawDb.exec(`
    INSERT INTO bills (
      id, shop_id, bill_number, customer_id, bill_status,
      subtotal_paisa, discount_paisa, total_paisa, paid_paisa,
      payment_status, payment_method, notes, created_at, updated_at
    ) VALUES (
      '${billId}', '${shopId}', '001', NULL, 'finalized',
      60000, 0, 60000, 60000,
      'paid', 'cash', NULL, '${now}', '${now}'
    );

    UPDATE products SET stock_quantity = stock_quantity - 3, updated_at = '${now}' WHERE id = 'p_zero' AND shop_id = '${shopId}';

    INSERT INTO stock_movements (id, shop_id, product_id, bill_id, movement_type, quantity, previous_stock, resulting_stock, notes, created_at)
    VALUES ('sm_del_1', '${shopId}', 'p_zero', '${billId}', 'sale', -3, 0, -3, 'Sale in Bill #001', '${now}');

    INSERT INTO bill_items (id, bill_id, shop_id, product_id, product_name, quantity, unit, unit_price_paisa, line_total_paisa, created_at)
    VALUES ('bi_del_1', '${billId}', '${shopId}', 'p_zero', 'Dal Chana', 3, 'kg', 20000, 60000, '${now}');
  `);

  // Verify stock movement before bill deletion
  const smBefore = rawDb.prepare("SELECT * FROM stock_movements WHERE id = 'sm_del_1'").get() as any;
  assertStrictEqual(smBefore.bill_id, billId, 'Bill ID before delete');
  assertStrictEqual(smBefore.shop_id, shopId, 'Shop ID must be preserved');

  // Delete the bill!
  rawDb.exec(`DELETE FROM bills WHERE id = '${billId}';`);

  // Verify bill deletion succeeded and stock movement history is preserved!
  const smAfter = rawDb.prepare("SELECT * FROM stock_movements WHERE id = 'sm_del_1'").get() as any;
  assert(Boolean(smAfter), 'Stock movement record must be preserved');
  assertStrictEqual(smAfter.bill_id, null, 'bill_id in stock_movements must become NULL when bill is deleted');
  assertStrictEqual(smAfter.shop_id, shopId, 'shop_id in stock_movements must remain intact and NOT NULL');
  assertStrictEqual(smAfter.quantity, -3, 'Stock movement quantity must remain preserved');
  assertStrictEqual(smAfter.previous_stock, 0, 'Stock movement previous stock preserved');
  assertStrictEqual(smAfter.resulting_stock, -3, 'Stock movement resulting stock preserved');

  // Verify bill_items were cascaded
  const biAfter = rawDb.prepare("SELECT * FROM bill_items WHERE id = 'bi_del_1'").get();
  assertStrictEqual(biAfter, undefined, 'Bill items must cascade on bill delete');

  // Verify foreign key integrity after bill delete
  const fkCheck = rawDb.prepare('PRAGMA foreign_key_check;').all();
  assertStrictEqual(fkCheck.length, 0, 'Zero FK violations after bill deletion');
  console.log('✓ Bill deletion succeeded: stock_movements.bill_id set to NULL, shop_id preserved, zero FK violations');
}

// 4. Shop Deletion & Product Deletion Cascade Behavior Test
console.log('\n--- Test 4: Shop Isolation & Product/Shop Deletion Cascade ---');
{
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec(INITIAL_SCHEMA_SQL);
  rawDb.exec('PRAGMA user_version = 2;');

  rawDb.exec(`
    INSERT INTO shops (id, name, created_at, updated_at) VALUES ('shop_a', 'Shop A', datetime('now'), datetime('now'));
    INSERT INTO shops (id, name, created_at, updated_at) VALUES ('shop_b', 'Shop B', datetime('now'), datetime('now'));

    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('p_a', 'shop_a', 'Item A', 'kg', 1000, 10, 0, 1, datetime('now'), datetime('now'));
    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('p_b', 'shop_b', 'Item B', 'kg', 2000, 20, 0, 1, datetime('now'), datetime('now'));

    INSERT INTO stock_movements (id, shop_id, product_id, bill_id, movement_type, quantity, previous_stock, resulting_stock, notes, created_at)
    VALUES ('sm_a', 'shop_a', 'p_a', NULL, 'adjustment', 10, 0, 10, 'Initial', datetime('now'));
    INSERT INTO stock_movements (id, shop_id, product_id, bill_id, movement_type, quantity, previous_stock, resulting_stock, notes, created_at)
    VALUES ('sm_b', 'shop_b', 'p_b', NULL, 'adjustment', 20, 0, 20, 'Initial', datetime('now'));
  `);

  // Delete Shop A
  rawDb.exec("DELETE FROM shops WHERE id = 'shop_a';");

  // Shop A products and movements cascaded
  const pA = rawDb.prepare("SELECT * FROM products WHERE shop_id = 'shop_a'").all();
  assertStrictEqual(pA.length, 0, 'Shop A products must be deleted');
  const smA = rawDb.prepare("SELECT * FROM stock_movements WHERE shop_id = 'shop_a'").all();
  assertStrictEqual(smA.length, 0, 'Shop A movements must be deleted');

  // Shop B products and movements untouched (Shop isolation)
  const pB = rawDb.prepare("SELECT * FROM products WHERE shop_id = 'shop_b'").all();
  assertStrictEqual(pB.length, 1, 'Shop B products must remain untouched');
  const smB = rawDb.prepare("SELECT * FROM stock_movements WHERE shop_id = 'shop_b'").all();
  assertStrictEqual(smB.length, 1, 'Shop B movements must remain untouched');

  const fkCheck = rawDb.prepare('PRAGMA foreign_key_check;').all();
  assertStrictEqual(fkCheck.length, 0, 'Zero FK violations after shop cascade deletion');
  console.log('✓ Shop deletion cascade and multi-shop isolation verified with zero FK violations');
}

// 5. Concurrency-Safe Stock Deduction & Movement Continuity Test
console.log('\n--- Test 5: Concurrency-Safe Stock Movement Continuity & Rollback ---');
{
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec(INITIAL_SCHEMA_SQL);
  rawDb.exec('PRAGMA user_version = 2;');

  // Seed shop & product with initial stock 5
  rawDb.exec(`
    INSERT INTO shops VALUES ('shop_c', 'Store C', 'LHE', 'Roman Urdu', NULL, datetime('now'), datetime('now'));
    INSERT INTO products (id, shop_id, name, unit, price_paisa, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
    VALUES ('p_audit', 'shop_c', 'Chai', 'pack', 50000, 5, 1, 1, datetime('now'), datetime('now'));
  `);

  // Helper simulating the atomic UPDATE ... RETURNING logic in createBill
  function recordSale(billId: string, billNumber: string, quantity: number) {
    rawDb.exec('BEGIN IMMEDIATE;');
    try {
      const now = new Date().toISOString();
      const updated = rawDb.prepare(`
        UPDATE products
        SET stock_quantity = stock_quantity - ?, updated_at = ?
        WHERE id = ? AND shop_id = ? AND is_active = 1
        RETURNING
          stock_quantity AS resulting_stock,
          (stock_quantity + ?) AS previous_stock
      `).get(quantity, now, 'p_audit', 'shop_c', quantity) as {
        resulting_stock: number;
        previous_stock: number;
      };

      if (!updated) throw new Error('Product not found or update failed');

      rawDb.prepare(`
        INSERT INTO bills (id, shop_id, bill_number, subtotal_paisa, total_paisa, paid_paisa, payment_status, payment_method, created_at, updated_at)
        VALUES (?, ?, ?, 1000, 1000, 1000, 'paid', 'cash', ?, ?)
      `).run(billId, 'shop_c', billNumber, now, now);

      rawDb.prepare(`
        INSERT INTO stock_movements (id, shop_id, product_id, bill_id, movement_type, quantity, previous_stock, resulting_stock, notes, created_at)
        VALUES (?, ?, ?, ?, 'sale', ?, ?, ?, ?, ?)
      `).run(
        `sm_${billNumber}`,
        'shop_c',
        'p_audit',
        billId,
        -quantity,
        updated.previous_stock,
        updated.resulting_stock,
        `Sale in Bill #${billNumber}`,
        now,
      );

      rawDb.exec('COMMIT;');
      return updated;
    } catch (err) {
      rawDb.exec('ROLLBACK;');
      throw err;
    }
  }

  // First sale: 3 units
  const res1 = recordSale('b_seq_1', '001', 3);
  assertStrictEqual(res1.previous_stock, 5, 'First sale previous stock must be 5');
  assertStrictEqual(res1.resulting_stock, 2, 'First sale resulting stock must be 2');

  // Second sale: 4 units (crosses into negative stock)
  const res2 = recordSale('b_seq_2', '002', 4);
  assertStrictEqual(res2.previous_stock, 2, 'Second sale previous stock must be 2');
  assertStrictEqual(res2.resulting_stock, -2, 'Second sale resulting stock must be -2');

  // Verify product final stock in DB
  const finalProduct = rawDb.prepare("SELECT stock_quantity FROM products WHERE id = 'p_audit'").get() as any;
  assertStrictEqual(finalProduct.stock_quantity, -2, 'Final product stock must be -2');

  // Verify stock movement records in exact order
  const movements = rawDb.prepare("SELECT * FROM stock_movements WHERE product_id = 'p_audit' ORDER BY id ASC").all() as any[];
  assertStrictEqual(movements.length, 2, 'Must have recorded 2 movements');

  // Movement 1: 5 -> 2
  assertStrictEqual(movements[0].previous_stock, 5, 'Movement 1 previous stock');
  assertStrictEqual(movements[0].resulting_stock, 2, 'Movement 1 resulting stock');
  assertStrictEqual(movements[0].quantity, -3, 'Movement 1 quantity');

  // Movement 2: 2 -> -2
  assertStrictEqual(movements[1].previous_stock, 2, 'Movement 2 previous stock');
  assertStrictEqual(movements[1].resulting_stock, -2, 'Movement 2 resulting stock');
  assertStrictEqual(movements[1].quantity, -4, 'Movement 2 quantity');

  // Test rollback on failure during movement insertion
  let failed = false;
  try {
    rawDb.exec('BEGIN IMMEDIATE;');
    const now = new Date().toISOString();
    rawDb.prepare(`
      UPDATE products
      SET stock_quantity = stock_quantity - 10, updated_at = ?
      WHERE id = 'p_audit' AND shop_id = 'shop_c'
    `).run(now);

    // Simulate failure during movement insert (e.g. invalid foreign key or constraint)
    rawDb.exec("INSERT INTO stock_movements (id, shop_id, product_id, bill_id, movement_type, quantity, previous_stock, resulting_stock, created_at) VALUES ('sm_fail', 'non_existent_shop', 'p_audit', NULL, 'sale', -10, -2, -12, datetime('now'));");
    rawDb.exec('COMMIT;');
  } catch (e) {
    failed = true;
    rawDb.exec('ROLLBACK;');
  }

  assertStrictEqual(failed, true, 'Operation must fail and throw');
  const rolledBackProduct = rawDb.prepare("SELECT stock_quantity FROM products WHERE id = 'p_audit'").get() as any;
  assertStrictEqual(rolledBackProduct.stock_quantity, -2, 'Stock must roll back completely to -2 on failure');

  const finalMovements = rawDb.prepare("SELECT count(*) as c FROM stock_movements WHERE product_id = 'p_audit'").get() as any;
  assertStrictEqual(finalMovements.c, 2, 'No orphan movements created on failure');

  console.log('✓ Sequential/concurrency-safe stock movement continuity (5 -> 2 -> -2) and rollback safety verified!');
}
