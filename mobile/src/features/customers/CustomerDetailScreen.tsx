import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';

import Screen from '@/shared/components/Screen';
import {
  getCustomerById,
  type CustomerRecord,
} from '@/core/database/repositories/customerRepository';
import {
  listCustomerLedger,
  type CustomerLedgerEntry,
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

  if (entry.entry_type === 'payment_received') return 'Payment received';

  return entry.notes || 'Balance adjustment';
}

export default function CustomerDetailScreen({
  customerId,
}: CustomerDetailScreenProps) {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
          <Pressable onPress={() => {
            setIsLoading(true);
            void loadDetails();
          }} style={styles.retryButton}>
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
            <Text style={styles.balanceLabel}>Kul udhaar baqi</Text>
            <Text style={styles.balanceAmount}>
              {formatMoney(customer.outstanding)}
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
                        name={isCredit ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
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
                        <Text style={styles.entryDate}>{entry.notes}</Text>
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.entryAmount,
                        isCredit ? styles.credit : styles.debit,
                      ]}
                    >
                      {isCredit ? '+' : '-'}
                      {formatMoney(entry.amount_paisa / 100)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
  balanceAmount: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.display + 2,
    fontWeight: fontWeights.bold,
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
});
