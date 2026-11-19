import { randomUUID } from 'expo-crypto';

import { products } from '@/shared/data/products';
import { getDatabase } from '../database';

/**
 * Seeds the canonical Pakistani grocery products into SQLite for the specified shop.
 *
 * Safety & Correctness Guarantees:
 * 1. Default initial stock is 0: New catalogues start unstocked to reflect physical retail reality
 *    and prevent phantom inventory / inaccurate inventory valuation before physical stock is added.
 * 2. Per-product deduplication: Queries existing product names for this shop and only inserts missing items.
 *    This ensures that shops with existing custom or partial products receive missing catalogue items without
 *    overwriting, resetting, or duplicating any existing merchant inventory or custom pricing.
 * 3. Shop isolation: Each product row gets a unique UUID and is strictly scoped to `shop_id`.
 * 4. Transactional atomicity: All inserts happen inside `db.withTransactionAsync`.
 *
 * @param shopId The shop ID to populate
 * @param initialStock Default initial stock (default: 0 to prevent phantom inventory)
 * @returns Number of products inserted (0 if all already exist)
 */
export async function seedShopCatalogue(
  shopId: string,
  initialStock = 0,
): Promise<number> {
  if (!shopId?.trim()) {
    throw new Error('Shop ID is required to seed catalogue.');
  }

  const safeStock = Math.max(0, Math.floor(initialStock));
  const db = await getDatabase();

  // Query existing product names for this shop to safely handle partial catalogues and custom merchant items
  const existingRows = await db.getAllAsync<{ name: string }>(
    `SELECT LOWER(TRIM(name)) as name FROM products WHERE shop_id = ?`,
    shopId,
  );
  const existingNames = new Set(
    existingRows.map((r) => r.name?.toLowerCase().trim()).filter(Boolean),
  );

  // Filter canonical products to only those not yet present for this shop
  const missingProducts = products.filter(
    (item) => !existingNames.has(item.name.toLowerCase().trim()),
  );

  if (missingProducts.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  let count = 0;

  await db.withTransactionAsync(async () => {
    for (const item of missingProducts) {
      const id = randomUUID();
      const pricePaisa = Math.round(item.price * 100);
      const aliasesJson = JSON.stringify(item.aliases ?? []);
      const lowStock = 5;

      await db.runAsync(
        `INSERT INTO products (
          id, shop_id, name, aliases_json, barcode, unit,
          price_paisa, stock_quantity, low_stock_threshold,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        id,
        shopId,
        item.name,
        aliasesJson,
        null,
        item.unit,
        pricePaisa,
        safeStock,
        lowStock,
        now,
        now,
      );
      count++;
    }
  });

  return count;
}

/**
 * Checks if a shop already has products in its SQLite database.
 */
export async function isShopCatalogueSeeded(shopId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM products WHERE shop_id = ?`,
    shopId,
  );
  return (row?.count ?? 0) > 0;
}

/**
 * Idempotently ensures the shop catalogue is seeded.
 * Safely inserts any missing canonical products without modifying existing inventory.
 */
export async function ensureShopCatalogueSeeded(
  shopId: string,
  initialStock = 0,
): Promise<number> {
  return seedShopCatalogue(shopId, initialStock);
}
