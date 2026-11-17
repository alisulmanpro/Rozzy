import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import Screen from '@/shared/components/Screen';
import {
  getBillById,
  type BillRecord,
} from '@/core/database/repositories/billRepository';
import {
  getCustomerById,
  type CustomerRecord,
} from '@/core/database/repositories/customerRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';
import { formatRupees } from '@/shared/utils/format';

const logoSource = require('../../../assets/rozzy-logo.png');

function ScallopRow({ position }: { position: 'top' | 'bottom' }) {
  return (
    <View style={styles.scallopRow}>
      {Array.from({ length: 26 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.scallopTooth,
            { left: index * 16 - 2 },
            position === 'top' ? styles.scallopToothTop : styles.scallopToothBottom,
          ]}
        />
      ))}
    </View>
  );
}

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

function paymentLabel(method: BillRecord['payment_method']) {
  if (method === 'cash') return 'Cash';
  if (method === 'bank') return 'Bank';
  if (method === 'other') return 'Other';
  return 'Not received';
}

export default function BillDoneScreen() {
  const { billId } = useLocalSearchParams<{ billId?: string }>();
  const [bill, setBill] = useState<BillRecord | null>(null);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadReceipt() {
      if (!billId || typeof billId !== 'string') {
        setError('Bill ID nahi mila. Receipt load nahi ho sakti.');
        setLoading(false);
        return;
      }

      try {
        const savedBill = await getBillById(billId);
        if (!savedBill) {
          throw new Error('Yeh bill database mein nahi mila.');
        }

        const savedCustomer = savedBill.customer_id
          ? await getCustomerById(savedBill.customer_id)
          : null;

        if (active) {
          setBill(savedBill);
          setCustomer(savedCustomer);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Receipt load nahi ho saki.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReceipt();

    return () => {
      active = false;
    };
  }, [billId]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Text style={styles.stateText}>Receipt load ho rahi hai...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !bill) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.orangeText} />
          <Text style={styles.stateTitle}>Receipt nahi mili</Text>
          <Text style={styles.stateText}>{error || 'Bill available nahi hai.'}</Text>
          <Pressable onPress={() => router.replace('/home')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Home par jayein</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const subtotal = bill.subtotal_paisa / 100;
  const discount = bill.discount_paisa / 100;
  const total = bill.total_paisa / 100;
  const paid = bill.paid_paisa / 100;
  const remaining = Math.max(0, total - paid);

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.replace('/home')}
          accessibilityLabel="Home"
          hitSlop={8}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.topBarTitle}>Receipt</Text>
      </View>

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.receiptScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receipt}>
          <ScallopRow position="top" />

          <View style={styles.receiptHeader}>
            <Image source={logoSource} style={styles.headerLogo} />
            <Text style={styles.receiptTitle}>Bill Tayyar Hai</Text>
            <Text style={styles.receiptMeta}>
              BILL #: {bill.bill_number}
            </Text>
            <Text style={styles.receiptDate}>{formatBillDate(bill.created_at)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalBlock}>
            <Text style={styles.totalAmount}>{formatRupees(total)}</Text>
            <Text style={styles.totalLabel}>Kul Raqam</Text>
            <Text style={styles.statusText}>
              {bill.payment_status === 'paid'
                ? 'Paid'
                : bill.payment_status === 'partial'
                  ? 'Partially Paid'
                  : 'Udhaar'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.itemsHeader}>
            <Text style={styles.itemsHeaderLabel}>
              ITEMS ({bill.items.length})
            </Text>
          </View>

          <View style={styles.itemsList}>
            {bill.items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.receiptItem,
                  index < bill.items.length - 1 && styles.receiptItemBorder,
                ]}
              >
                <View style={styles.receiptItemDetails}>
                  <Text style={styles.receiptItemName}>{item.product_name}</Text>
                  <Text style={styles.receiptItemMeta}>
                    {item.quantity} {item.unit} × {formatRupees(item.unit_price_paisa / 100)}
                  </Text>
                </View>
                <Text style={styles.receiptItemAmount}>
                  {formatRupees(item.line_total_paisa / 100)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryList}>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatRupees(subtotal)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>{formatRupees(discount)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue}>{customer?.name || 'Walk-in'}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Received ({paymentLabel(bill.payment_method)})</Text>
              <Text style={styles.summaryValue}>{formatRupees(paid)}</Text>
            </View>
            <View style={styles.summaryRowLast}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, remaining > 0 && styles.remainingValue]}>
                {formatRupees(remaining)}
              </Text>
            </View>
          </View>

          {bill.notes ? (
            <View style={styles.notesBlock}>
              <Text style={styles.summaryLabel}>Notes</Text>
              <Text style={styles.notesText}>{bill.notes}</Text>
            </View>
          ) : null}

          <View style={styles.receiptFooter}>
            <View style={[styles.footerCircle, styles.footerCircleLeft]} />
            <View style={[styles.footerCircle, styles.footerCircleRight]} />
            <Text style={styles.footerText}>
              Rozzy se banaya gaya · Shukriya, phir tashreef laayein
            </Text>
            <Image source={logoSource} style={styles.footerLogo} />
          </View>

          <ScallopRow position="bottom" />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.replace('/bill')}
          style={({ pressed }) => [styles.newBillButton, pressed && styles.pressed]}
        >
          <Ionicons name="add-circle-outline" size={21} color={colors.white} />
          <Text style={styles.newBillLabel}>Naya bill banayein</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  topBarTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  receiptScroll: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
  },
  receipt: {
    backgroundColor: colors.white,
    borderRadius: 4,
    elevation: 4,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  scallopRow: {
    height: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  scallopTooth: {
    backgroundColor: colors.background,
    borderRadius: 6,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  scallopToothTop: { top: -6 },
  scallopToothBottom: { top: 6 },
  receiptHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 22,
    paddingTop: spacing.xl,
  },
  headerLogo: {
    borderRadius: radii.sm,
    height: 44,
    width: 44,
  },
  receiptTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: 24,
    fontWeight: fontWeights.bold,
  },
  receiptMeta: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  receiptDate: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  divider: {
    backgroundColor: colors.borderCard,
    height: 1,
    marginHorizontal: 22,
  },
  totalBlock: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: spacing.xl,
  },
  totalAmount: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: 34,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  totalLabel: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  statusText: {
    color: colors.violetDeep,
    fontFamily: fonts.heading,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
  itemsHeader: {
    paddingHorizontal: 22,
    paddingTop: spacing.md + 2,
  },
  itemsHeaderLabel: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.6,
  },
  itemsList: { paddingHorizontal: 22 },
  receiptItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  receiptItemBorder: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  receiptItemDetails: { flex: 1, gap: 2 },
  receiptItemName: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  receiptItemMeta: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  receiptItemAmount: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  summaryList: { paddingHorizontal: 22 },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  summaryRowBorder: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  summaryRowLast: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  summaryLabel: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
  },
  summaryValue: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
  },
  remainingValue: {
    color: colors.orangeText,
    fontWeight: fontWeights.semibold,
  },
  notesBlock: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.xs,
    marginHorizontal: 22,
    paddingVertical: spacing.md,
  },
  notesText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  receiptFooter: {
    alignItems: 'center',
    backgroundColor: colors.receiptFooter,
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    position: 'relative',
  },
  footerCircle: {
    backgroundColor: colors.background,
    borderRadius: 10,
    height: 20,
    position: 'absolute',
    top: -10,
    width: 20,
  },
  footerCircleLeft: { left: -10 },
  footerCircleRight: { right: -10 },
  footerText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
  footerLogo: {
    borderRadius: 8,
    height: 28,
    width: 28,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.borderCard,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  newBillButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 52,
    justifyContent: 'center',
  },
  newBillLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
  },
  stateText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontWeight: fontWeights.semibold,
  },
  pressed: { opacity: 0.85 },
});
