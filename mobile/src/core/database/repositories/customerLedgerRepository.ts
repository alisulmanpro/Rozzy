import { randomUUID } from 'expo-crypto';

import { getDatabase } from '../database';
import { getActiveShop } from './shopRepository';

export type PaymentMethod = 'cash' | 'bank' | 'other';

export type CustomerLedgerEntry = {
  id: string;
  entry_type: 'bill_udhaar' | 'payment_received' | 'adjustment';
  direction: 'debit' | 'credit';
  amount_paisa: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  bill_number: string | null;
};

export type RecordPaymentInput = {
  customerId: string;
  amount: number; // In Rupees
  paymentMethod?: PaymentMethod;
  notes?: string;
};

/**
 * Returns all ledger history entries for a given customer in the active shop.
 */
export async function listCustomerLedger(
  customerId: string,
): Promise<CustomerLedgerEntry[]> {
  const db = await getDatabase();
  const shop = await getActiveShop();

  if (!shop) {
    throw new Error('No active shop found.');
  }

  return db.getAllAsync<CustomerLedgerEntry>(
    `SELECT
       l.id,
       l.entry_type,
       l.direction,
       l.amount_paisa,
       l.payment_method,
       l.notes,
       l.created_at,
       b.bill_number
     FROM customer_ledger l
     LEFT JOIN bills b
       ON b.id = l.bill_id AND b.shop_id = l.shop_id
     WHERE l.shop_id = ? AND l.customer_id = ?
     ORDER BY l.created_at DESC`,
    shop.id,
    customerId,
  );
}

/**
 * Records a customer repayment with atomic transaction safety and ledger credit entry.
 * Validates customer existence, positive non-zero amount, and valid payment method.
 */
export async function recordCustomerPayment(
  input: RecordPaymentInput,
): Promise<CustomerLedgerEntry> {
  const { customerId, amount, paymentMethod = 'cash', notes } = input;

  if (!customerId?.trim()) {
    throw new Error('Customer ID is required.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter a valid payment amount greater than zero.');
  }

  const amountPaisa = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountPaisa) || amountPaisa <= 0) {
    throw new Error('Payment amount is invalid or exceeds maximum limit.');
  }

  const validMethods: PaymentMethod[] = ['cash', 'bank', 'other'];
  if (paymentMethod && !validMethods.includes(paymentMethod)) {
    throw new Error('Select a valid payment method (cash, bank, or other).');
  }

  if (notes && notes.length > 500) {
    throw new Error('Payment notes cannot exceed 500 characters.');
  }

  const db = await getDatabase();
  const shop = await getActiveShop();

  if (!shop) {
    throw new Error('No active shop found.');
  }

  // Verify customer belongs to the active shop
  const customer = await db.getFirstAsync<{ id: string; name: string }>(
    `SELECT id, name FROM customers WHERE id = ? AND shop_id = ?`,
    customerId,
    shop.id,
  );

  if (!customer) {
    throw new Error('Customer not found in the active shop.');
  }

  const entryId = randomUUID();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO customer_ledger (
        id, shop_id, customer_id, bill_id, entry_type, direction,
        amount_paisa, payment_method, notes, created_at
      ) VALUES (?, ?, ?, NULL, 'payment_received', 'credit', ?, ?, ?, ?)`,
      entryId,
      shop.id,
      customerId,
      amountPaisa,
      paymentMethod,
      notes?.trim() || null,
      now,
    );
  });

  const entry = await db.getFirstAsync<CustomerLedgerEntry>(
    `SELECT
       l.id,
       l.entry_type,
       l.direction,
       l.amount_paisa,
       l.payment_method,
       l.notes,
       l.created_at,
       b.bill_number
     FROM customer_ledger l
     LEFT JOIN bills b
       ON b.id = l.bill_id AND b.shop_id = l.shop_id
     WHERE l.id = ? AND l.shop_id = ?`,
    entryId,
    shop.id,
  );

  if (!entry) {
    throw new Error('Payment entry was recorded but could not be retrieved.');
  }

  return entry;
}
