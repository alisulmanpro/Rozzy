import { randomUUID } from 'expo-crypto';

import { getDatabase } from '../database';
import { getActiveShop } from './shopRepository';

export type CustomerRecord = {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  outstandingPaisa: number;
  outstanding: number;
  created_at: string;
  updated_at: string;
};

export type CreateCustomerInput = {
  name: string;
  phone?: string;
};

type CustomerRow = {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  outstanding_paisa: number | null;
  created_at: string;
  updated_at: string;
};

function mapCustomer(row: CustomerRow): CustomerRecord {
  const outstandingPaisa = row.outstanding_paisa ?? 0;

  return {
    id: row.id,
    shop_id: row.shop_id,
    name: row.name,
    phone: row.phone,
    outstandingPaisa,
    outstanding: outstandingPaisa / 100,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function requireActiveShopId(): Promise<string> {
  const shop = await getActiveShop();

  if (!shop) {
    throw new Error('No active shop found. Please complete shop setup.');
  }

  return shop.id;
}

function validateCustomer(input: CreateCustomerInput): void {
  if (!input.name.trim()) {
    throw new Error('Customer name is required.');
  }

  if (input.name.trim().length > 100) {
    throw new Error('Customer name is too long.');
  }

  const phone = input.phone?.trim() ?? '';

  if (phone.length > 30) {
    throw new Error('Phone number is too long.');
  }
}

const CUSTOMER_SELECT = `
  SELECT
    c.id,
    c.shop_id,
    c.name,
    c.phone,
    COALESCE(
      SUM(
        CASE
          WHEN l.direction = 'debit' THEN l.amount_paisa
          WHEN l.direction = 'credit' THEN -l.amount_paisa
          ELSE 0
        END
      ),
      0
    ) AS outstanding_paisa,
    c.created_at,
    c.updated_at
  FROM customers c
  LEFT JOIN customer_ledger l
    ON l.customer_id = c.id
    AND l.shop_id = c.shop_id
`;

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerRecord> {
  validateCustomer(input);

  const db = await getDatabase();
  const shopId = await requireActiveShopId();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO customers (
      id, shop_id, name, phone, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    shopId,
    input.name.trim(),
    input.phone?.trim() || null,
    now,
    now,
  );

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new Error('Customer was saved but could not be retrieved.');
  }

  return customer;
}

export async function getCustomerById(
  customerId: string,
): Promise<CustomerRecord | null> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();

  const row = await db.getFirstAsync<CustomerRow>(
    `${CUSTOMER_SELECT}
     WHERE c.id = ? AND c.shop_id = ?
     GROUP BY c.id`,
    customerId,
    shopId,
  );

  return row ? mapCustomer(row) : null;
}

export async function listCustomers(
  search = '',
): Promise<CustomerRecord[]> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();
  const normalizedSearch = search.trim();

  const rows = await db.getAllAsync<CustomerRow>(
    `${CUSTOMER_SELECT}
     WHERE c.shop_id = ?
       AND (
         c.name LIKE ?
         OR COALESCE(c.phone, '') LIKE ?
       )
     GROUP BY c.id
     ORDER BY c.name COLLATE NOCASE ASC`,
    shopId,
    `%${normalizedSearch}%`,
    `%${normalizedSearch}%`,
  );

  return rows.map(mapCustomer);
}
