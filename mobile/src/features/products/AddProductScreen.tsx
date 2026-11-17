
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import Screen from '@/shared/components/Screen';
import { UNITS } from '@/shared/data/products';
import type { ProductUnit } from '@/shared/data/products';
import {
  createProduct,
  getProductById,
  updateProduct,
} from '@/core/database/repositories/productRepository';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';

export default function AddProductScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' ? id : undefined;
  const isEditMode = Boolean(productId);

  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditMode);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('kg');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;

    let isActive = true;

    const loadProduct = async () => {
      try {
        setError('');

        const product = await getProductById(productId);

        if (!isActive) return;

        if (!product) {
          setError('Product nahi mila. Shayad remove ho chuka hai.');
          return;
        }

        setName(product.name);
        setUnit(product.unit);
        setPrice(String(product.price));
        setStock(String(product.stockQuantity));
        setAliases(product.aliases);
      } catch (loadError) {
        if (!isActive) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Product details load nahi ho sakein.',
        );
      } finally {
        if (isActive) {
          setIsLoadingProduct(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isActive = false;
    };
  }, [productId]);

  const addAlias = () => {
    const value = aliasInput.trim();

    if (!value) return;

    if (
      value.toLowerCase() === name.trim().toLowerCase() ||
      aliases.some((alias) => alias.toLowerCase() === value.toLowerCase())
    ) {
      setAliasInput('');
      return;
    }

    setAliases((current) => [...current, value]);
    setAliasInput('');
  };

  const saveProduct = async () => {
    if (isSaving || isLoadingProduct) return;

    const parsedPrice = Number(price);
    const parsedStock = stock.trim() === '' ? 0 : Number(stock);

    if (!name.trim()) {
      setError('Cheez ka naam enter karein.');
      return;
    }

    if (
      price.trim() === '' ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      setError('Sahi rate enter karein.');
      return;
    }

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setError('Sahi stock quantity enter karein.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const productData = {
        name: name.trim(),
        aliases,
        unit,
        price: parsedPrice,
        stockQuantity: parsedStock,
      };

      if (isEditMode && productId) {
        await updateProduct(productId, productData);
      } else {
        await createProduct(productData);
      }

      router.back();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Product save nahi ho saka. Dobara try karein.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={styles.flex}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>

          <Text style={styles.title}>
            {isEditMode ? 'Product edit karein' : 'Nayi cheez'}
          </Text>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoadingProduct && (
            <Text style={styles.helper}>
              Product details load ho rahi hain...
            </Text>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Cheez ka naam</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              editable={!isLoadingProduct && !isSaving}
              onChangeText={(value) => {
                setName(value);
                setError('');
              }}
              placeholder="Misal: Aata"
              placeholderTextColor={colors.textCaption}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kis cheez se bechte hain?</Text>

            <View style={styles.unitChips}>
              {UNITS.map((unitOption) => {
                const active = unitOption === unit;

                return (
                  <Pressable
                    key={unitOption}
                    onPress={() => setUnit(unitOption)}
                    disabled={isLoadingProduct || isSaving}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.unitChip,
                      active && styles.unitChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitChipLabel,
                        active && styles.unitChipLabelActive,
                      ]}
                    >
                      {unitOption}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{`Rate (1 ${unit} ka)`}</Text>

            <View style={styles.rateRow}>
              <View style={styles.ratePrefixWrap}>
                <Text style={styles.ratePrefix}>Rs</Text>
              </View>

              <TextInput
                style={styles.rateInput}
                value={price}
                editable={!isLoadingProduct && !isSaving}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={colors.textCaption}
                keyboardType="decimal-pad"
              />

              <Text style={styles.rateSuffix}>{`per ${unit}`}</Text>
            </View>

            <Text style={styles.helper}>
              Agar rate nahi bataya to Rozzy bill mein aap se poochay ga.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Bolne ke alfaz (Rozzy inhein pehchane ga)
            </Text>

            <View style={styles.aliasChips}>
              {aliases.map((alias) => (
                <Pressable
                  key={alias}
                  onPress={() =>
                    setAliases((current) =>
                      current.filter((item) => item !== alias),
                    )
                  }
                  disabled={isLoadingProduct || isSaving}
                  accessibilityRole="button"
                  accessibilityLabel={`${alias} hataein`}
                  style={({ pressed }) => [
                    styles.aliasChip,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.aliasChipLabel}>{alias}</Text>
                  <Text style={styles.aliasChipRemove}>×</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.aliasInputRow}>
              <TextInput
                style={styles.aliasInput}
                value={aliasInput}
                editable={!isLoadingProduct && !isSaving}
                onChangeText={setAliasInput}
                placeholder="Misal: aata, atta"
                placeholderTextColor={colors.textCaption}
                onSubmitEditing={addAlias}
                returnKeyType="done"
              />

              <Pressable
                onPress={addAlias}
                disabled={isLoadingProduct || isSaving}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.addAliasButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.addAliasLabel}>Add</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Stock abhi kitna hai (optional)</Text>

            <TextInput
              style={styles.stockInput}
              value={stock}
              editable={!isLoadingProduct && !isSaving}
              onChangeText={setStock}
              placeholder="0"
              placeholderTextColor={colors.textCaption}
              keyboardType="decimal-pad"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={saveProduct}
            disabled={isSaving || isLoadingProduct}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              (pressed || isSaving || isLoadingProduct) && styles.pressed,
            ]}
          >
            <Text style={styles.saveLabel}>
              {isSaving
                ? 'Saving...'
                : isLoadingProduct
                  ? 'Loading...'
                  : isEditMode
                    ? 'Changes save karein'
                    : 'Save karein'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
  },

  form: {
    gap: 18,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  field: {
    gap: spacing.sm,
  },

  label: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.medium,
  },

  nameInput: {
    backgroundColor: colors.white,
    borderColor: colors.violet,
    borderRadius: radii.md,
    borderWidth: 1.5,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    height: 54,
    paddingHorizontal: spacing.lg,
  },

  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  unitChip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  unitChipActive: {
    backgroundColor: colors.violet,
    borderWidth: 0,
  },

  unitChipLabel: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },

  unitChipLabelActive: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },

  rateRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 54,
    overflow: 'hidden',
  },

  ratePrefixWrap: {
    alignItems: 'center',
    borderRightColor: colors.borderCard,
    borderRightWidth: 1,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: spacing.md + 2,
  },

  ratePrefix: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  rateInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    paddingHorizontal: spacing.md + 2,
  },

  rateSuffix: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    paddingHorizontal: spacing.md + 2,
  },

  helper: {
    color: colors.textCaption,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
  },

  aliasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  aliasInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  aliasInput: {
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    height: 46,
    paddingHorizontal: spacing.md,
  },

  addAliasButton: {
    alignItems: 'center',
    backgroundColor: colors.violetTint,
    borderRadius: radii.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  addAliasLabel: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontWeight: fontWeights.semibold,
  },

  aliasChip: {
    alignItems: 'center',
    backgroundColor: colors.violetTint,
    borderRadius: 19,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 38,
    paddingHorizontal: spacing.md + 2,
  },

  aliasChipLabel: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
  },

  aliasChipRemove: {
    color: colors.violetDeep,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,
  },

  stockInput: {
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.input,
    height: 54,
    paddingHorizontal: spacing.lg,
  },

  error: {
    color: '#DC2626',
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
  },

  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },

  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },

  cancelLabel: {
    color: colors.ink,
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    fontWeight: fontWeights.semibold,  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    flex: 1.6,
    height: 56,
    justifyContent: 'center',
  },

  saveLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: fontSizes.input,
    fontWeight: fontWeights.semibold,  },

  pressed: {
    opacity: 0.85,
  },
});
