
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useFocusEffect } from 'expo-router';

import Screen from '@/shared/components/Screen';
import SearchBar from '@/shared/components/SearchBar';
import {
  deleteProduct,
  ensureShopCatalogueSeeded,
  listProducts,
  type ProductRecord,
} from '@/core/database/repositories/productRepository';
import { getActiveShop } from '@/core/database/repositories/shopRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

export default function ProductsScreen() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      let result = await listProducts(query);
      if (result.length === 0 && !query) {
        const shop = await getActiveShop();
        if (shop) {
          const seeded = await ensureShopCatalogueSeeded(shop.id);
          if (seeded > 0) {
            result = await listProducts(query);
          }
        }
      }
      setProducts(result);
    } catch (err) {
      console.error('Products load error:', err);
      setError('Products load nahi ho sakein. Dobara try karein.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setError('');
          setIsLoading(true);
          let result = await listProducts(query);
          if (result.length === 0 && !query) {
            const shop = await getActiveShop();
            if (shop) {
              const seeded = await ensureShopCatalogueSeeded(shop.id);
              if (seeded > 0) {
                result = await listProducts(query);
              }
            }
          }

          if (isActive) setProducts(result);
        } catch (err) {
          console.error('Products load error:', err);

          if (isActive) {
            setError('Products load nahi ho sakein. Dobara try karein.');
          }
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      void load();

      return () => {
        isActive = false;
      };
    }, [query]),
  );

  const removeProduct = (product: ProductRecord) => {
    Alert.alert(
      'Product remove karein?',
      `${product.name} ko product list se remove kar diya jayega. Purane bills ka record safe rahega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              await loadProducts();
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error
                  ? err.message
                  : 'Product remove nahi ho saka.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.count}>{`${products.length} cheezein`}</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isLoading
              ? 'Products load ho rahi hain...'
              : error
                ? error
                : query.trim()
                  ? 'Koi matching cheez nahi mili.'
                  : 'Abhi koi product add nahi ki.'}
          </Text>
        }
        ListHeaderComponent={
          <View>
            <SearchBar
              placeholder="Cheez dhoondein"
              value={query}
              onChangeText={setQuery}
            />
            <View style={styles.listTopGap} />
            {!!error && (
              <Pressable onPress={loadProducts} style={styles.retryButton}>
                <Text style={styles.retryLabel}>Dobara try karein</Text>
              </Pressable>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onEdit={() =>
              router.push({
                pathname: '/add-product',
                params: { id: item.id },
              })
            }
            onRemove={() => removeProduct(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={() => router.push('/add-product')}
        accessibilityRole="button"
        accessibilityLabel="Nayi cheez"
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={styles.fabLabel}>Nayi cheez</Text>
      </Pressable>
    </Screen>
  );
}

function ProductCard({
  product,
  onEdit,
  onRemove,
}: {
  product: ProductRecord;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.productRow}>
        <View style={styles.cardDetails}>
          <Text style={styles.cardName}>{product.name}</Text>
          <Text style={styles.cardAliases}>
            {`Bolne ke alfaz: ${product.aliases.join(', ') || 'Koi nahi'}`}
          </Text>
        </View>

        <View style={styles.cardPricing}>
          <Text style={styles.cardPrice}>{`Rs ${product.price}`}</Text>
          <Text style={styles.cardUnit}>{`per ${product.unit}`}</Text>
          <Text
            style={[
              styles.cardStock,
              product.stockQuantity < 0 && styles.negativeStock,
              product.stockQuantity === 0 && styles.zeroStock,
            ]}
          >
            {`Stock: ${product.stockQuantity} ${product.unit}`}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="create-outline" size={17} color={colors.violetDeep} />
          <Text style={styles.editLabel}>Edit</Text>
        </Pressable>

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={17} color="#DC2626" />
          <Text style={styles.removeLabel}>Remove</Text>
        </Pressable>
      </View>
    </View>
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
  listContent: {
    paddingBottom: 100,
  },
  listTopGap: {
    height: spacing.md,
  },
  empty: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
  retryLabel: {
    color: colors.violet,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.borderCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  productRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardDetails: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  cardAliases: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  cardPricing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cardPrice: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  cardUnit: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  cardStock: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  negativeStock: {
    color: '#DC2626',
    fontWeight: fontWeights.bold,
  },
  zeroStock: {
    color: colors.orangeText,
    fontWeight: fontWeights.medium,
  },
  actionsRow: {
    borderTopColor: colors.borderCard,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.violetTint,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 38,
  },
  editLabel: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 38,
  },
  removeLabel: {
    color: '#DC2626',
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.semibold,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: 28,
    bottom: spacing.xl,
    elevation: 10,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 22,
    position: 'absolute',
    right: spacing.xl,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  fabLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
});
