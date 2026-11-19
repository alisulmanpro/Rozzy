import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  listCustomers,
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
import { formatMoney } from '@/shared/utils/format';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomers = useCallback(async (query = '') => {
    try {
      setError('');
      const records = await listCustomers(query);
      setCustomers(records);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Customers load nahi ho sake.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadCustomers(search);
    }, [loadCustomers, search]),
  );

  const udhaarTotal = customers.reduce(
    (sum, customer) => sum + Math.max(0, customer.outstanding),
    0,
  );

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Customers</Text>
            <Text style={styles.subtitle}>
              {`Udhaar baqi · ${formatMoney(udhaarTotal)}`}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/add-customer')}
            accessibilityRole="button"
            accessibilityLabel="Add customer"
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={22} color={colors.white} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textCaption}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Naam ya phone number search karein"
            placeholderTextColor={colors.textCaption}
            style={styles.searchInput}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={colors.textCaption}
              />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.message}>
            <ActivityIndicator size="large" color={colors.violet} />
            <Text style={styles.messageText}>Customers load ho rahe hain...</Text>
          </View>
        ) : error ? (
          <View style={styles.message}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={() => {
                setIsLoading(true);
                void loadCustomers(search);
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Dobara try karein</Text>
            </Pressable>
          </View>
        ) : customers.length === 0 ? (
          <View style={styles.message}>
            <Ionicons
              name="people-outline"
              size={42}
              color={colors.textCaption}
            />
            <Text style={styles.emptyTitle}>
              {search ? 'Customer nahi mila' : 'Abhi koi customer nahi'}
            </Text>
            <Text style={styles.messageText}>
              {search
                ? 'Doosra naam ya phone number search karein.'
                : 'Naya customer add karne ke liye Add button press karein.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {customers.map((customer) => (
              <Pressable
                key={customer.id}
                onPress={() =>
                  router.push({
                    pathname: '/customers/[id]',
                    params: { id: customer.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={customer.name}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initialsOf(customer.name)}
                  </Text>
                </View>

                <View style={styles.details}>
                  <Text style={styles.name}>{customer.name}</Text>
                  <Text style={styles.phone}>
                    {customer.phone || 'Phone number nahi diya'}
                  </Text>
                </View>

                <View style={styles.balance}>
                  <Text
                    style={[
                      styles.balanceAmount,
                      customer.outstanding <= 0 && styles.balanceAmountGreen,
                    ]}
                  >
                    {formatMoney(Math.abs(customer.outstanding))}
                  </Text>
                  <Text
                    style={[
                      styles.balanceLabel,
                      customer.outstanding < 0 && styles.balanceLabelAdvance,
                      customer.outstanding === 0 && styles.balanceLabelZero,
                    ]}
                  >
                    {customer.outstanding > 0
                      ? 'Udhaar'
                      : customer.outstanding < 0
                        ? 'Advance'
                        : 'Bebaak'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: spacing.md,
  },

  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  headerText: {
    flex: 1,
    gap: 3,
  },

  title: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
  },

  subtitle: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },

  addButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  addButtonText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },

  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 50,
  },

  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    height: '100%',
  },

  list: {
    paddingBottom: spacing.xxl,
  },

  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },

  avatar: {
    alignItems: 'center',
    backgroundColor: colors.violetTint,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  avatarText: {
    color: colors.violetDeep,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  details: {
    flex: 1,
    gap: 2,
  },

  name: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  phone: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  balance: {
    alignItems: 'flex-end',
    gap: 2,
  },

  balanceAmount: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge - 1,
    fontWeight: fontWeights.semibold,
  },

  balanceAmountGreen: {
    color: '#15803D',
  },

  balanceLabel: {
    color: colors.orangeText,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
  },

  balanceLabelAdvance: {
    color: '#15803D',
  },

  balanceLabelZero: {
    color: '#15803D',
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

  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
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
    opacity: 0.8,
  },
});
