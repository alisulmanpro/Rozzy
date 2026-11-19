import { randomUUID } from 'expo-crypto';

import type { ProductUnit } from '@/shared/data/products';

import { getDatabase } from '../database';
import { getActiveShop } from './shopRepository';

export type ProductRecord = {
  id: string;
  shop_id: string;
  name: string;
  aliases: string[];
  barcode: string | null;
  unit: ProductUnit;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductInput = {
  name: string;
  aliases?: string[];
  barcode?: string;
  unit: ProductUnit;
  price: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
};

export type UpdateProductInput = CreateProductInput;

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  aliases_json: string;
  barcode: string | null;
  unit: ProductUnit;
  price_paisa: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapProduct(row: ProductRow): ProductRecord {
  let aliases: string[] = [];

  try {
    const parsed: unknown = JSON.parse(row.aliases_json);
    if (Array.isArray(parsed)) {
      aliases = parsed.filter(
        (value): value is string => typeof value === 'string',
      );
    }
  } catch {
    aliases = [];
  }

  return {
    id: row.id,
    shop_id: row.shop_id,
    name: row.name,
    aliases,
    barcode: row.barcode,
    unit: row.unit,
    price: row.price_paisa / 100,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateProduct(input: CreateProductInput): void {
  if (!input.name.trim()) {
    throw new Error('Product name is required.');
  }

  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Enter a valid product price.');
  }

  if (!Number.isFinite(input.stockQuantity ?? 0)) {
    throw new Error('Enter a valid stock quantity.');
  }

  if (
    !Number.isFinite(input.lowStockThreshold ?? 0) ||
    (input.lowStockThreshold ?? 0) < 0
  ) {
    throw new Error('Enter a valid low-stock threshold.');
  }

  if (!Number.isSafeInteger(Math.round(input.price * 100))) {
    throw new Error('Product price is too large.');
  }
}

async function requireActiveShopId(): Promise<string> {
  const shop = await getActiveShop();

  if (!shop) {
    throw new Error('No active shop found. Please complete shop setup.');
  }

  return shop.id;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ProductRecord> {
  validateProduct(input);

  const db = await getDatabase();
  const shopId = await requireActiveShopId();
  const id = randomUUID();
  const now = new Date().toISOString();

  const aliases = [
    ...new Set(
      (input.aliases ?? [])
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  ];

  await db.runAsync(
    `INSERT INTO products (
      id, shop_id, name, aliases_json, barcode, unit,
      price_paisa, stock_quantity, low_stock_threshold,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id,
    shopId,
    input.name.trim(),
    JSON.stringify(aliases),
    input.barcode?.trim() || null,
    input.unit,
    Math.round(input.price * 100),
    input.stockQuantity ?? 0,
    input.lowStockThreshold ?? 0,
    now,
    now,
  );

  const product = await getProductById(id);

  if (!product) {
    throw new Error('Product was saved but could not be retrieved.');
  }

  return product;
}

export async function getProductById(
  productId: string,
): Promise<ProductRecord | null> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();

  const row = await db.getFirstAsync<ProductRow>(
    `SELECT * FROM products
     WHERE id = ? AND shop_id = ? AND is_active = 1`,
    productId,
    shopId,
  );

  return row ? mapProduct(row) : null;
}

export async function listProducts(
  search = '',
): Promise<ProductRecord[]> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();
  const normalizedSearch = search.trim().toLowerCase();

  const rows = await db.getAllAsync<ProductRow>(
    `SELECT * FROM products
     WHERE shop_id = ? AND is_active = 1
     ORDER BY name COLLATE NOCASE ASC`,
    shopId,
  );

  const allProducts = rows.map(mapProduct);

  if (!normalizedSearch) {
    return allProducts;
  }

  return allProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.aliases.some((alias) =>
        alias.toLowerCase().includes(normalizedSearch),
      ) ||
      (product.barcode ?? '').toLowerCase().includes(normalizedSearch),
  );
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<ProductRecord> {
  validateProduct(input);

  const db = await getDatabase();
  const shopId = await requireActiveShopId();
  const now = new Date().toISOString();

  const aliases = [
    ...new Set(
      (input.aliases ?? [])
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  ];

  const result = await db.runAsync(
    `UPDATE products SET
      name = ?,
      aliases_json = ?,
      barcode = ?,
      unit = ?,
      price_paisa = ?,
      stock_quantity = ?,
      low_stock_threshold = ?,
      updated_at = ?
     WHERE id = ? AND shop_id = ? AND is_active = 1`,
    input.name.trim(),
    JSON.stringify(aliases),
    input.barcode?.trim() || null,
    input.unit,
    Math.round(input.price * 100),
    input.stockQuantity ?? 0,
    input.lowStockThreshold ?? 0,
    now,
    productId,
    shopId,
  );

  if (result.changes === 0) {
    throw new Error('Product not found in the active shop.');
  }

  const updated = await getProductById(productId);

  if (!updated) {
    throw new Error('Updated product could not be retrieved.');
  }

  return updated;
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();

  const result = await db.runAsync(
    `UPDATE products
     SET is_active = 0, updated_at = ?
     WHERE id = ? AND shop_id = ? AND is_active = 1`,
    new Date().toISOString(),
    productId,
    shopId,
  );

  if (result.changes === 0) {
    throw new Error('Product not found in the active shop.');
  }
}

export {
  seedShopCatalogue,
  isShopCatalogueSeeded,
  ensureShopCatalogueSeeded,
} from './catalogueSeeder';
