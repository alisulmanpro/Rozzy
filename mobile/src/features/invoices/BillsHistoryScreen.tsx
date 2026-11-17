import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import BillCard from '@/shared/components/BillCard';
import Screen from '@/shared/components/Screen';
import { listBills, type BillRecord } from '@/core/database/repositories/billRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

export default function BillsHistoryScreen() {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBills = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');

    try {
      const records = await listBills(search, 500, 0);
      setBills(records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Bills load nahi ho sakin.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void loadBills();
    }, [loadBills]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadBills(false);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bills</Text>
        <Text style={styles.count}>{`${bills.length} bills`}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Bill number ya customer search karein"
          placeholderTextColor={colors.textCaption}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Text style={styles.stateText}>Bills load ho rahi hain...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadBills()} style={styles.retryButton}>
            <Text style={styles.retryText}>Dobara try karein</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            bills.length === 0 && styles.emptyListContent,
          ]}
          renderItem={({ item }) => <BillCard bill={item} showDate />}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'Koi bill nahi mila' : 'Abhi koi bill nahi hai'}
              </Text>
              <Text style={styles.stateText}>
                {search.trim()
                  ? 'Search badal kar dobara dekhein.'
                  : 'Naya bill banane ke baad woh yahan nazar aayega.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
  },
  count: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    textAlign: 'center',
  },
  errorText: {
    color: colors.orangeText,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontWeight: fontWeights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
});
