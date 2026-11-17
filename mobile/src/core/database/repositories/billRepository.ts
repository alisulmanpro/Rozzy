import { randomUUID } from 'expo-crypto';

import type { ProductUnit } from '@/shared/data/products';

import { getDatabase } from '../database';
import { getActiveShop } from './shopRepository';

export type BillPaymentMethod = 'cash' | 'bank' | 'other';

export type BillPaymentStatus = 'paid' | 'partial' | 'udhaar';

export type CreateBillItemInput = {
  productId?: string | null;
  productName?: string;
  quantity: number;
  unit?: ProductUnit;
  unitPrice?: number;
};

export type CreateBillInput = {
  items: CreateBillItemInput[];
  customerId?: string | null;
  discount?: number;
  paidAmount: number;
  paymentMethod?: BillPaymentMethod | null;
  notes?: string;
};

export type BillItemRecord = {
  id: string;
  bill_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_paisa: number;
  line_total_paisa: number;
  unitPrice: number;
  lineTotal: number;
};

export type BillRecord = {
  id: string;
  shop_id: string;
  bill_number: string;
  customer_id: string | null;
  bill_status: 'draft' | 'finalized' | 'cancelled';
  subtotal_paisa: number;
  discount_paisa: number;
  total_paisa: number;
  paid_paisa: number;
  payment_status: BillPaymentStatus;
  payment_method: BillPaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  outstanding: number;
  items: BillItemRecord[];
};

type ProductBillingRow = {
  id: string;
  name: string;
  unit: ProductUnit;
  price_paisa: number;
  stock_quantity: number;
};

type BillRow = Omit<
  BillRecord,
  | 'subtotal'
  | 'discount'
  | 'total'
  | 'paid'
  | 'outstanding'
  | 'items'
>;

type BillItemRow = {
  id: string;
  bill_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_paisa: number;
  line_total_paisa: number;
};

function toPaisa(amount: number, label: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Enter a valid ${label}.`);
  }

  const paisa = Math.round(amount * 100);

  if (!Number.isSafeInteger(paisa)) {
    throw new Error(`${label} is too large.`);
  }

  return paisa;
}

function mapBillItem(row: BillItemRow): BillItemRecord {
  return {
    ...row,
    unitPrice: row.unit_price_paisa / 100,
    lineTotal: row.line_total_paisa / 100,
  };
}

function mapBill(row: BillRow, items: BillItemRecord[] = []): BillRecord {
  return {
    ...row,
    subtotal: row.subtotal_paisa / 100,
    discount: row.discount_paisa / 100,
    total: row.total_paisa / 100,
    paid: row.paid_paisa / 100,
    outstanding: (row.total_paisa - row.paid_paisa) / 100,
    items,
  };
}

async function requireActiveShopId(): Promise<string> {
  const shop = await getActiveShop();

  if (!shop) {
    throw new Error('No active shop found. Please complete shop setup.');
  }

  return shop.id;
}

export async function createBill(
  input: CreateBillInput,
): Promise<BillRecord> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Add at least one item to the bill.');
  }

  const db = await getDatabase();
  const shopId = await requireActiveShopId();

  const discountPaisa = toPaisa(input.discount ?? 0, 'discount');
  const paidPaisa = toPaisa(input.paidAmount, 'paid amount');

  const customerId = input.customerId?.trim() || null;
  const paymentMethod = input.paymentMethod ?? null;

  if (
    paymentMethod !== null &&
    !['cash', 'bank', 'other'].includes(paymentMethod)
  ) {
    throw new Error('Select a valid payment method.');
  }

  if (paidPaisa > 0 && !paymentMethod) {
    throw new Error('Select a payment method for the received amount.');
  }

  if (input.notes && input.notes.length > 1000) {
    throw new Error('Bill notes cannot exceed 1000 characters.');
  }

  const billId = randomUUID();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (customerId) {
      const customer = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM customers
         WHERE id = ? AND shop_id = ?`,
        customerId,
        shopId,
      );

      if (!customer) {
        throw new Error('Selected customer was not found in this shop.');
      }
    }

    const preparedItems: {
      id: string;
      productId: string | null;
      productName: string;
      quantity: number;
      unit: string;
      unitPricePaisa: number;
      lineTotalPaisa: number;
    }[] = [];

    let subtotalPaisa = 0;

    for (const item of input.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error(
          'Every item must have a valid quantity greater than zero.',
        );
      }

      if (!Number.isSafeInteger(Math.round(item.quantity * 1000000))) {
        throw new Error('Item quantity is too precise or too large.');
      }

      let productId: string | null = null;
      let productName: string;
      let unit: string;
      let unitPricePaisa: number;

      if (item.productId) {
        const product = await db.getFirstAsync<ProductBillingRow>(
          `SELECT id, name, unit, price_paisa, stock_quantity
           FROM products
           WHERE id = ? AND shop_id = ? AND is_active = 1`,
          item.productId,
          shopId,
        );

        if (!product) {
          throw new Error(
            'A selected product no longer exists in this shop.',
          );
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock_quantity} ${product.unit}.`,
          );
        }

        productId = product.id;
        productName = product.name;
        unit = product.unit;

        // Use the billing-time rate when supplied.
        // Otherwise, use the current catalogue rate.
        unitPricePaisa =
          item.unitPrice === undefined
            ? product.price_paisa
            : toPaisa(item.unitPrice, 'item price');
      } else {
        productName = item.productName?.trim() ?? '';
        unit = item.unit ?? 'piece';

        if (!productName) {
          throw new Error('Custom item name is required.');
        }

        if (productName.length > 150) {
          throw new Error('Item name cannot exceed 150 characters.');
        }

        if (item.unitPrice === undefined) {
          throw new Error(`Enter a valid price for ${productName}.`);
        }

        unitPricePaisa = toPaisa(item.unitPrice, 'item price');
      }

      const lineTotalPaisa = Math.round(
        item.quantity * unitPricePaisa,
      );

      if (!Number.isSafeInteger(lineTotalPaisa)) {
        throw new Error(`Total for ${productName} is too large.`);
      }

      subtotalPaisa += lineTotalPaisa;

      if (!Number.isSafeInteger(subtotalPaisa)) {
        throw new Error('Bill subtotal is too large.');
      }

      preparedItems.push({
        id: randomUUID(),
        productId,
        productName,
        quantity: item.quantity,
        unit,
        unitPricePaisa,
        lineTotalPaisa,
      });
    }

    if (discountPaisa > subtotalPaisa) {
      throw new Error('Discount cannot exceed the bill subtotal.');
    }

    const totalPaisa = subtotalPaisa - discountPaisa;

    if (paidPaisa > totalPaisa) {
      throw new Error('Received amount cannot exceed the bill total.');
    }

    const outstandingPaisa = totalPaisa - paidPaisa;

    if (outstandingPaisa > 0 && !customerId) {
      throw new Error(
        'Select a customer to save an outstanding balance.',
      );
    }

    const paymentStatus: BillPaymentStatus =
      paidPaisa === totalPaisa
        ? 'paid'
        : paidPaisa > 0
          ? 'partial'
          : 'udhaar';

    const numberRow = await db.getFirstAsync<{ next_number: number }>(
      `SELECT COALESCE(MAX(CAST(bill_number AS INTEGER)), 0) + 1
       AS next_number
       FROM bills
       WHERE shop_id = ?`,
      shopId,
    );

    const billNumber = String(
      numberRow?.next_number ?? 1,
    ).padStart(3, '0');

    await db.runAsync(
      `INSERT INTO bills (
        id, shop_id, bill_number, customer_id, bill_status,
        subtotal_paisa, discount_paisa, total_paisa, paid_paisa,
        payment_status, payment_method, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'finalized', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      billId,
      shopId,
      billNumber,
      customerId,
      subtotalPaisa,
      discountPaisa,
      totalPaisa,
      paidPaisa,
      paymentStatus,
      paymentMethod,
      input.notes?.trim() || null,
      now,
      now,
    );

    for (const item of preparedItems) {
      if (item.productId) {
        const stockUpdate = await db.runAsync(
          `UPDATE products
           SET stock_quantity = stock_quantity - ?, updated_at = ?
           WHERE id = ? AND shop_id = ? AND is_active = 1
             AND stock_quantity >= ?`,
          item.quantity,
          now,
          item.productId,
          shopId,
          item.quantity,
        );

        if (stockUpdate.changes !== 1) {
          throw new Error(
            `Stock changed while billing ${item.productName}. Please try again.`,
          );
        }
      }

      await db.runAsync(
        `INSERT INTO bill_items (
          id, bill_id, shop_id, product_id, product_name,
          quantity, unit, unit_price_paisa, line_total_paisa, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        billId,
        shopId,
        item.productId,
        item.productName,
        item.quantity,
        item.unit,
        item.unitPricePaisa,
        item.lineTotalPaisa,
        now,
      );
    }

    if (outstandingPaisa > 0 && customerId) {
      await db.runAsync(
        `INSERT INTO customer_ledger (
          id, shop_id, customer_id, bill_id, entry_type,
          direction, amount_paisa, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, 'bill_udhaar', 'debit', ?, NULL, ?, ?)`,
        randomUUID(),
        shopId,
        customerId,
        billId,
        outstandingPaisa,
        `Outstanding balance for bill ${billNumber}`,
        now,
      );
    }
  });

  const bill = await getBillById(billId);

  if (!bill) {
    throw new Error('Bill was saved but could not be retrieved.');
  }

  return bill;
}

export async function getBillById(
  billId: string,
): Promise<BillRecord | null> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();

  const row = await db.getFirstAsync<BillRow>(
    `SELECT * FROM bills
     WHERE id = ? AND shop_id = ?`,
    billId,
    shopId,
  );

  if (!row) {
    return null;
  }

  const itemRows = await db.getAllAsync<BillItemRow>(
    `SELECT id, bill_id, product_id, product_name, quantity,
            unit, unit_price_paisa, line_total_paisa
     FROM bill_items
     WHERE bill_id = ? AND shop_id = ?
     ORDER BY rowid ASC`,
    billId,
    shopId,
  );

  return mapBill(row, itemRows.map(mapBillItem));
}

export async function listBills(
  search = '',
  limit = 100,
  offset = 0,
): Promise<BillRecord[]> {
  const db = await getDatabase();
  const shopId = await requireActiveShopId();

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500 ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    throw new Error('Invalid bill history pagination.');
  }

  const normalizedSearch = search.trim();

  const rows = await db.getAllAsync<BillRow>(
    `SELECT b.*
     FROM bills b
     LEFT JOIN customers c
       ON c.id = b.customer_id AND c.shop_id = b.shop_id
     WHERE b.shop_id = ?
       AND b.bill_status = 'finalized'
       AND (
         ? = ''
         OR b.bill_number LIKE ?
         OR c.name LIKE ?
         OR c.phone LIKE ?
       )
     ORDER BY b.created_at DESC, b.rowid DESC
     LIMIT ? OFFSET ?`,
    shopId,
    normalizedSearch,
    `%${normalizedSearch}%`,
    `%${normalizedSearch}%`,
    `%${normalizedSearch}%`,
    limit,
    offset,
  );

  const bills: BillRecord[] = [];

  for (const row of rows) {
    const items = await db.getAllAsync<BillItemRow>(
      `SELECT id, bill_id, product_id, product_name, quantity,
              unit, unit_price_paisa, line_total_paisa
       FROM bill_items
       WHERE bill_id = ? AND shop_id = ?
       ORDER BY rowid ASC`,
      row.id,
      shopId,
    );

    bills.push(mapBill(row, items.map(mapBillItem)));
  }

  return bills;
}
