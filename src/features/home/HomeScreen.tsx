import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';

import { getActiveShop } from '@/core/database/repositories/shopRepository';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '@/core/database/repositories/dashboardRepository';
import BillCard from '@/shared/components/BillCard';
import Card from '@/shared/components/Card';
import Screen from '@/shared/components/Screen';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';
import { formatMoney } from '@/shared/utils/format';

const logoSource = require('../../../assets/rozzy-logo.png');

export default function HomeScreen() {
  const [shopName, setShopName] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }

    setLoadError(null);

    try {
      const shop = await getActiveShop();

      if (!shop) {
        router.replace('/shop-setup');
        return;
      }

      const dashboardData = await getDashboardSummary();

      setShopName(shop.name);
      setSummary(dashboardData);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Dashboard ki maloomat load nahi ho sakin.',
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const handleRefresh = () => {
    void loadDashboard(false);
  };

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Text style={styles.stateText}>Dukaan load ho rahi hai...</Text>
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen edges={['top']}>
        <View style={styles.stateContainer}>
          <Text style={styles.errorTitle}>Dashboard load nahi ho saka</Text>
          <Text style={styles.stateText}>{loadError}</Text>
          <Pressable
            onPress={() => void loadDashboard()}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Dobara koshish karein</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!shopName || !summary) {
    return null;
  }

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.violet}
            colors={[colors.violet]}
          />
        }
      >
        <View style={styles.header}>
          <Image source={logoSource} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Assalam o Alaikum</Text>
            <Text style={styles.shopName}>{shopName}</Text>
          </View>
        </View>

        <Card style={styles.saleCard}>
          <Text style={styles.saleLabel}>Aaj ki sale</Text>
          <Text style={styles.saleTotal}>
            {formatMoney(summary.saleTotal)}
          </Text>

          <View style={styles.statsRow}>
            <View style={[styles.statChip, styles.statChipViolet]}>
              <Text style={[styles.statLabel, styles.statLabelViolet]}>
                Bills
              </Text>
              <Text style={styles.statValue}>{summary.billCount}</Text>
            </View>

            <Pressable
              onPress={() => router.push('/customers')}
              accessibilityRole="button"
              accessibilityLabel="Udhaar baqi"
              style={({ pressed }) => [
                styles.statChip,
                styles.statChipOrange,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.statLabel, styles.statLabelOrange]}>
                Udhaar baqi
              </Text>
              <Text style={styles.statValue}>
                {formatMoney(summary.udhaarTotal)}
              </Text>
            </Pressable>
          </View>
        </Card>

        <Pressable
          onPress={() => router.push('/bill')}
          accessibilityRole="button"
          accessibilityLabel="Naya Bill"
          style={({ pressed }) => [
            styles.newBillButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="mic" size={26} color={colors.white} />
          <Text style={styles.newBillLabel}>Naya Bill</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pichle bills</Text>
          <Pressable
            onPress={() => router.navigate('/bills')}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>Sab dekhein</Text>
          </Pressable>
        </View>

        <View style={styles.billList}>
          {summary.recentBills.length > 0 ? (
            summary.recentBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))
          ) : (
            <Text style={styles.emptyBills}>
              Abhi koi bill nahi hai. Naya bill banane ke baad woh yahan
              nazar aayega.
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
    paddingBottom: spacing.xxl,
  },

  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },

  stateText: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    textAlign: 'center',
  },

  errorTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  },

  retryText: {
    color: colors.violetLink,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },

  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },

  logo: {
    borderRadius: radii.sm,
    height: 44,
    width: 44,
  },

  headerText: {
    flex: 1,
    gap: 1,
  },

  greeting: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  shopName: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge + 2,
    fontWeight: fontWeights.semibold,
  },

  saleCard: {
    borderRadius: radii.xxl,
    gap: 14,
    marginTop: spacing.xl,
    padding: spacing.xl,
  },

  saleLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.medium,
  },

  saleTotal: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: 36,
    fontWeight: fontWeights.bold,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  statChip: {
    borderRadius: radii.md,
    flex: 1,
    gap: 2,
    padding: spacing.md,
  },

  statChipViolet: {
    backgroundColor: colors.violetTint,
  },

  statChipOrange: {
    backgroundColor: colors.orangeTint,
  },

  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
  },

  statLabelViolet: {
    color: colors.violetDeep,
  },

  statLabelOrange: {
    color: colors.orangeText,
  },

  statValue: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge + 4,
    fontWeight: fontWeights.semibold,
  },

  newBillButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.xl,
    flexDirection: 'row',
    gap: spacing.md,
    height: 64,
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    elevation: 10,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },

  newBillLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.input + 2,
    fontWeight: fontWeights.semibold,
  },

  pressed: {
    opacity: 0.85,
  },

  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },

  sectionTitle: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge + 1,
    fontWeight: fontWeights.semibold,
  },

  sectionLink: {
    color: colors.violetLink,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },

  billList: {
    gap: 10,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },

  emptyBills: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: 21,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
});
