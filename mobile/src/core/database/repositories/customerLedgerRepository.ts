import { getDatabase } from '../database';
import { getActiveShop } from './shopRepository';

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
