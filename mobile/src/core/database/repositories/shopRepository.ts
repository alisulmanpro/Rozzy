import { randomUUID } from 'expo-crypto';

import { getDatabase } from '../database';

const ACTIVE_SHOP_SETTING = 'active_shop_id';

export type Shop = {
  id: string;
  name: string;
  city: string | null;
  language: string;
  bill_footer: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateShopInput = {
  name: string;
  city?: string;
  language?: string;
  billFooter?: string;
};

export async function createShop(input: CreateShopInput): Promise<Shop> {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Shop name is required.');
  }

  const db = await getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO shops (
        id, name, city, language, bill_footer, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      name,
      input.city?.trim() || null,
      input.language?.trim() || 'Roman Urdu',
      input.billFooter?.trim() || null,
      now,
      now,
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO device_settings (
        setting_key, setting_value, updated_at
      ) VALUES (?, ?, ?)`,
      ACTIVE_SHOP_SETTING,
      id,
      now,
    );
  });

  const shop = await db.getFirstAsync<Shop>(
    'SELECT * FROM shops WHERE id = ?',
    id,
  );

  if (!shop) {
    throw new Error('Shop was saved but could not be retrieved.');
  }

  return shop;
}

export async function getActiveShop(): Promise<Shop | null> {
  const db = await getDatabase();

  const setting = await db.getFirstAsync<{ setting_value: string }>(
    'SELECT setting_value FROM device_settings WHERE setting_key = ?',
    ACTIVE_SHOP_SETTING,
  );

  if (!setting) {
    return null;
  }

  const shop = await db.getFirstAsync<Shop>(
    'SELECT * FROM shops WHERE id = ?',
    setting.setting_value,
  );

  if (!shop) {
    await db.runAsync(
      'DELETE FROM device_settings WHERE setting_key = ?',
      ACTIVE_SHOP_SETTING,
    );

    return null;
  }

  return shop;
}

export async function setActiveShop(shopId: string): Promise<void> {
  const db = await getDatabase();

  const shop = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM shops WHERE id = ?',
    shopId,
  );

  if (!shop) {
    throw new Error('Shop not found.');
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO device_settings (
      setting_key, setting_value, updated_at
    ) VALUES (?, ?, ?)`,
    ACTIVE_SHOP_SETTING,
    shopId,
    new Date().toISOString(),
  );
}
