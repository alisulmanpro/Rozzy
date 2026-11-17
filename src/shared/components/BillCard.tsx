import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { BillRecord } from '@/core/database/repositories/billRepository';
import type { Bill } from '@/shared/data/bills';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';
import { formatRupees } from '@/shared/utils/format';

type BillCardProps = {
  bill: BillRecord | Bill;
  showDate?: boolean;
};

function formatBillDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isDatabaseBill(bill: BillRecord | Bill): bill is BillRecord {
  return 'bill_number' in bill;
}

export default function BillCard({ bill, showDate = false }: BillCardProps) {
  const databaseBill = isDatabaseBill(bill);

  const billNumber = databaseBill ? bill.bill_number : bill.number;
  const summary = databaseBill
    ? (() => {
        const names = bill.items
          .slice(0, 3)
          .map((item) => item.product_name)
          .join(', ');
        const remaining = bill.items.length - 3;
        return remaining > 0 ? `${names} +${remaining} more` : names || 'No items';
      })()
    : bill.itemsSummary;

  const itemCount = databaseBill ? bill.items.length : bill.itemCount;
  const paymentLabel = databaseBill
    ? bill.payment_status === 'paid'
      ? 'Paid'
      : bill.payment_status === 'partial'
        ? 'Partial'
        : 'Udhaar'
    : bill.payment === 'cash'
      ? 'Paid'
      : 'Udhaar';
  const isPaid = databaseBill
    ? bill.payment_status === 'paid'
    : bill.payment === 'cash';

  const content = (
    <>
      <View style={styles.left}>
        <Text style={styles.title}>{`Bill #${billNumber}`}</Text>
        <Text style={styles.summary}>{`${summary} · ${itemCount} items`}</Text>
        {showDate ? (
          <Text style={styles.date}>
            {databaseBill
              ? formatBillDate(bill.created_at)
              : `${bill.date} · ${bill.time}`}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={styles.total}>{formatRupees(bill.total)}</Text>
        <Text style={[styles.tag, isPaid ? styles.tagPaid : styles.tagUdhaar]}>
          {paymentLabel}
        </Text>
      </View>
    </>
  );

  if (!databaseBill) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/bill-done',
          params: { billId: bill.id },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`Bill ${bill.bill_number}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.8 },
  left: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  title: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge - 1,
    fontWeight: fontWeights.semibold,
  },
  summary: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  date: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  total: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge - 1,
    fontWeight: fontWeights.semibold,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
  },
  tagPaid: { color: colors.successGreen },
  tagUdhaar: { color: colors.orangeText },
});
