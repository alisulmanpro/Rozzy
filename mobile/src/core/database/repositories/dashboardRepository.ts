import { getDatabase } from '../database';
import { getActiveShop } from './shopRepository';
import {
  listBills,
  type BillRecord,
} from './billRepository';

export type DashboardSummary = {
  saleTotal: number;
  billCount: number;
  udhaarTotal: number;
  recentBills: BillRecord[];
};

type SalesSummaryRow = {
  sale_total_paisa: number | null;
  bill_count: number;
};

type OutstandingRow = {
  outstanding_paisa: number | null;
};

/**
 * Returns UTC boundaries for the current calendar day in Pakistan.
 * Pakistan uses UTC+05:00.
 */
function getPakistanDayBoundaries(): {
  start: string;
  end: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);

  // Pakistan midnight is 19:00 UTC on the previous calendar day.
  const startUtc = Date.UTC(year, month - 1, day) - 5 * 60 * 60 * 1000;
  const endUtc = startUtc + 24 * 60 * 60 * 1000;

  return {
    start: new Date(startUtc).toISOString(),
    end: new Date(endUtc).toISOString(),
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDatabase();
  const shop = await getActiveShop();

  if (!shop) {
    throw new Error('No active shop found. Please complete shop setup.');
  }

  const { start, end } = getPakistanDayBoundaries();

  const salesRow = await db.getFirstAsync<SalesSummaryRow>(
    `SELECT
       COALESCE(SUM(total_paisa), 0) AS sale_total_paisa,
       COUNT(*) AS bill_count
     FROM bills
     WHERE shop_id = ?
       AND bill_status = 'finalized'
       AND created_at >= ?
       AND created_at < ?`,
    shop.id,
    start,
    end,
  );

  const outstandingRow = await db.getFirstAsync<OutstandingRow>(
    `SELECT
       COALESCE(
         SUM(
           CASE
             WHEN direction = 'debit' THEN amount_paisa
             WHEN direction = 'credit' THEN -amount_paisa
             ELSE 0
           END
         ),
         0
       ) AS outstanding_paisa
     FROM customer_ledger
     WHERE shop_id = ?`,
    shop.id,
  );

  const recentBills = await listBills('', 3, 0);

  return {
    saleTotal: (salesRow?.sale_total_paisa ?? 0) / 100,
    billCount: salesRow?.bill_count ?? 0,
    udhaarTotal: (outstandingRow?.outstanding_paisa ?? 0) / 100,
    recentBills,
  };
}
