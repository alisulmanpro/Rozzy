import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';

import Screen from '@/shared/components/Screen';
import SegmentedControl from '@/shared/components/SegmentedControl';
import {
  getCustomerById,
  type CustomerRecord,
} from '@/core/database/repositories/customerRepository';
import {
  listCustomerLedger,
  recordCustomerPayment,
  type CustomerLedgerEntry,
  type PaymentMethod,
} from '@/core/database/repositories/customerLedgerRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';
import { formatMoney } from '@/shared/utils/format';

type CustomerDetailScreenProps = {
  customerId?: string;
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ledgerTitle(entry: CustomerLedgerEntry): string {
  if (entry.entry_type === 'bill_udhaar') {
    return entry.bill_number
      ? `Bill #${entry.bill_number}`
      : 'Udhaar added';
  }

  if (entry.entry_type === 'payment_received') {
    const methodStr = entry.payment_method ? ` (${entry.payment_method.toUpperCase()})` : '';
    return `Payment wasool hui${methodStr}`;
  }

  return entry.notes || 'Balance adjustment';
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank', 'other'];

export default function CustomerDetailScreen({
  customerId,
}: CustomerDetailScreenProps) {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Modal State
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const loadDetails = useCallback(async () => {
    if (!customerId) {
      setCustomer(null);
      setEntries([]);
      setError('Customer ID nahi mila.');
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      const [record, ledger] = await Promise.all([
        getCustomerById(customerId),
        listCustomerLedger(customerId),
      ]);

      setCustomer(record);
      setEntries(ledger);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Customer details load nahi ho sakin.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadDetails();
    }, [loadDetails]),
  );

  const submittingRef = useRef(false);

  const openPaymentModal = () => {
    setPaymentAmount('');
    setSelectedMethod('cash');
    setPaymentNotes('');
    setPaymentError('');
    setIsPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    if (isSubmittingPayment) return;
    setIsPaymentModalVisible(false);
  };

  const executePayment = async (amountNum: number) => {
    if (!customer) return;

    try {
      setIsSubmittingPayment(true);
      submittingRef.current = true;
      setPaymentError('');

      await recordCustomerPayment({
        customerId: customer.id,
        amount: amountNum,
        paymentMethod: selectedMethod,
        notes: paymentNotes.trim() || undefined,
      });

      setIsPaymentModalVisible(false);
      await loadDetails();

      Alert.alert(
        'Payment Record Ho Gayi',
        `Rs. ${amountNum} ki payment kamiyabi se customer ledger mein darj ho gayi.`,
      );
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Payment record nahi ho saki.',
      );
    } finally {
      submittingRef.current = false;
      setIsSubmittingPayment(false);
    }
  };

  const handleRecordPayment = () => {
    if (submittingRef.current || isSubmittingPayment || !customer) return;

    const amountNum = Number(paymentAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPaymentError('Durust raqam enter karein (zero se zyada).');
      return;
    }

    // Check for accidental overpayment when customer owes money
    if (customer.outstanding > 0 && amountNum > customer.outstanding) {
      const advanceAmount = Math.round(amountNum - customer.outstanding);
      Alert.alert(
        'Advance Payment Confirmation',
        `Customer ka kul udhaar Rs. ${customer.outstanding} hai.\nAap Rs. ${amountNum} wasool kar rahe hain.\n\nExtra Rs. ${advanceAmount} customer ke advance / jama balance mein darj hoga.\n\nKya aap jari rakhna chahte hain?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Jari Rakhein',
            onPress: () => void executePayment(amountNum),
          },
        ],
      );
      return;
    }

    // If customer has 0 debt or already has advance credit
    if (customer.outstanding <= 0) {
      Alert.alert(
        'Advance Payment Confirmation',
        `Customer ka koi udhaar baqi nahi hai.\nYeh poori raqam (Rs. ${amountNum}) customer ke advance / jama balance mein darj hogi.\n\nKya aap jari rakhna chahte hain?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Jari Rakhein',
            onPress: () => void executePayment(amountNum),
          },
        ],
      );
      return;
    }

    void executePayment(amountNum);
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>{customer?.name || 'Customer details'}</Text>
      </View>

      {isLoading ? (
        <View style={styles.message}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Text style={styles.messageText}>Details load ho rahi hain...</Text>
        </View>
      ) : error ? (
        <View style={styles.message}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            onPress={() => {
              setIsLoading(true);
              void loadDetails();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Dobara try karein</Text>
          </Pressable>
        </View>
      ) : !customer ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>Customer nahi mila.</Text>
        </View>
      ) : (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.balanceCard}>
            <Text
              style={[
                styles.balanceLabel,
                customer.outstanding < 0 && styles.balanceLabelAdvance,
                customer.outstanding === 0 && styles.balanceLabelZero,
              ]}
            >
              {customer.outstanding > 0
                ? 'Kul udhaar baqi'
                : customer.outstanding < 0
                  ? 'Customer ka advance / Jama raqam'
                  : 'Hisaab bebaak (0 baqi)'}
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                customer.outstanding <= 0 && styles.balanceAmountGreen,
              ]}
            >
              {formatMoney(Math.abs(customer.outstanding))}
            </Text>
            <View style={styles.phoneRow}>
              <Ionicons
                name="call-outline"
                size={18}
                color={colors.violetLink}
              />
              <Text style={styles.phone}>
                {customer.phone || 'Phone number nahi diya'}
              </Text>
            </View>

            <Pressable
              onPress={openPaymentModal}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.payButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="cash-outline" size={19} color={colors.white} />
              <Text style={styles.payButtonText}>Payment Wasool Karein</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Udhaar aur payment history</Text>

          {entries.length === 0 ? (
            <Text style={styles.empty}>
              Abhi koi udhaar ya payment entry nahi hai.
            </Text>
          ) : (
            <View style={styles.entryList}>
              {entries.map((entry) => {
                const isCredit = entry.direction === 'credit';

                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryIcon}>
                      <Ionicons
                        name={
                          isCredit
                            ? 'arrow-down-circle-outline'
                            : 'arrow-up-circle-outline'
                        }
                        size={23}
                        color={isCredit ? '#15803D' : colors.orangeText}
                      />
                    </View>

                    <View style={styles.entryDetails}>
                      <Text style={styles.entryTitle}>
                        {ledgerTitle(entry)}
                      </Text>
                      <Text style={styles.entryDate}>
                        {formatDate(entry.created_at)}
                      </Text>
                      {entry.notes && entry.entry_type !== 'adjustment' ? (
                        <Text style={styles.entryNotes}>{entry.notes}</Text>
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.entryAmount,
                        isCredit ? styles.credit : styles.debit,
                      ]}
                    >
                      {isCredit ? '-' : '+'}
                      {formatMoney(entry.amount_paisa / 100)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Payment Recording Modal */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closePaymentModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Payment Wasool Karein</Text>
                <Text style={styles.modalSubtitle}>
                  {customer?.name} ·{' '}
                  {(customer?.outstanding ?? 0) > 0
                    ? `Kul baqi: ${formatMoney(customer?.outstanding ?? 0)}`
                    : (customer?.outstanding ?? 0) < 0
                      ? `Advance jama: ${formatMoney(Math.abs(customer?.outstanding ?? 0))}`
                      : 'Hisaab bebaak'}
                </Text>
              </View>
              <Pressable
                onPress={closePaymentModal}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>

            {paymentError ? (
              <View style={styles.paymentErrorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.paymentErrorText}>{paymentError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Wasool shuda raqam (Rs.) *</Text>
            <TextInput
              style={styles.amountInput}
              value={paymentAmount}
              onChangeText={(val) => {
                setPaymentAmount(val.replace(/[^0-9.]/g, ''));
                setPaymentError('');
              }}
              placeholder="0"
              placeholderTextColor={colors.textCaption}
              keyboardType="numeric"
              autoFocus
            />

            {/* Quick Fill Buttons */}
            {customer && customer.outstanding > 0 ? (
              <View style={styles.quickFillRow}>
                <Pressable
                  onPress={() => {
                    setPaymentAmount(String(customer.outstanding));
                    setPaymentError('');
                  }}
                  style={styles.quickFillPill}
                >
                  <Text style={styles.quickFillText}>
                    Poori Raqam ({formatMoney(customer.outstanding)})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPaymentAmount(String(Math.round(customer.outstanding / 2)));
                    setPaymentError('');
                  }}
                  style={styles.quickFillPill}
                >
                  <Text style={styles.quickFillText}>Aadhi Raqam</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Payment Method</Text>
            <SegmentedControl
              options={['Cash', 'Bank', 'Other']}
              value={
                selectedMethod === 'cash'
                  ? 'Cash'
                  : selectedMethod === 'bank'
                    ? 'Bank'
                    : 'Other'
              }
              onChange={(val) => {
                const lower = val.toLowerCase() as PaymentMethod;
                if (PAYMENT_METHODS.includes(lower)) {
                  setSelectedMethod(lower);
                }
              }}
              height={42}
            />

            <Text style={styles.inputLabel}>Tafseel / Hawala (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholder="e.g. JazzCash, EasyPaisa, dukan par diya"
              placeholderTextColor={colors.textCaption}
              maxLength={200}
            />

            <View style={styles.modalActionRow}>
              <Pressable
                onPress={closePaymentModal}
                style={styles.modalCancelButton}
                disabled={isSubmittingPayment}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleRecordPayment()}
                style={[
                  styles.modalSubmitButton,
                  isSubmittingPayment && styles.disabledButton,
                ]}
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Payment Jama Karein</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge + 2,
    fontWeight: fontWeights.semibold,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  balanceCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 6,
    padding: spacing.lg,
  },
  balanceLabel: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
  balanceLabelAdvance: {
    color: '#15803D',
  },
  balanceLabelZero: {
    color: '#15803D',
  },
  balanceAmount: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.display + 2,
    fontWeight: fontWeights.bold,
  },
  balanceAmountGreen: {
    color: '#15803D',
  },
  phoneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  phone: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 46,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  payButtonText: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge + 1,
    fontWeight: fontWeights.semibold,
    marginTop: spacing.xl,
  },
  entryList: {
    gap: 10,
    marginTop: spacing.md,
  },
  entryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  entryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDetails: {
    flex: 1,
    gap: 3,
  },
  entryTitle: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },
  entryDate: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  entryNotes: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  entryAmount: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },
  credit: {
    color: '#15803D',
  },
  debit: {
    color: colors.orangeText,
  },
  empty: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  message: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  messageText: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    textAlign: 'center',
  },
  error: {
    color: '#DC2626',
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.violetTint,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontWeight: fontWeights.semibold,
  },
  pressed: {
    opacity: 0.85,
  },

  // Modal Styles
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge + 2,
    fontWeight: fontWeights.bold,
  },
  modalSubtitle: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    marginTop: 2,
  },
  modalCloseButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  paymentErrorBox: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  paymentErrorText: {
    color: '#DC2626',
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },
  inputLabel: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
    marginTop: 2,
  },
  amountInput: {
    backgroundColor: colors.background,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1.5,
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    height: 52,
    paddingHorizontal: spacing.md + 2,
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  quickFillPill: {
    backgroundColor: colors.violetTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  quickFillText: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderColor: colors.borderInput,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    height: 44,
    paddingHorizontal: spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.borderCard,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
  },
  modalSubmitButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flex: 2,
    height: 48,
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
