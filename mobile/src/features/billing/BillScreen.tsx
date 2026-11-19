import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { router, useFocusEffect } from 'expo-router';

import Screen from '@/shared/components/Screen';
import SegmentedControl from '@/shared/components/SegmentedControl';
import {
  listProducts,
  type ProductRecord,
} from '@/core/database/repositories/productRepository';
import {
  createBill,
  type BillPaymentMethod,
} from '@/core/database/repositories/billRepository';
import {
  listCustomers,
  type CustomerRecord,
} from '@/core/database/repositories/customerRepository';
import { consumePendingCartItems } from '@/shared/utils/pendingCartBridge';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from '@/shared/theme';
import { formatMoney } from '@/shared/utils/format';

type CartItem = {
  product: ProductRecord;
  quantity: string;
  unitPrice: string;
};

const parseAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default function BillScreen() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<BillPaymentMethod>('cash');
  const [paymentType, setPaymentType] = useState('Cash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [productRows, customerRows] = await Promise.all([
        listProducts(search),
        listCustomers(customerSearch),
      ]);
      setError('');
      setProducts(productRows);
      setCustomers(customerRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Data load nahi ho saka.');
    } finally {
      setLoading(false);
    }
  }, [search, customerSearch]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void loadData();

      const importPendingVoiceItems = async () => {
        const pendingItems = await consumePendingCartItems();
        if (!active || pendingItems.length === 0) return;

        setCart((current) => {
          let updated = [...current];

          for (const pending of pendingItems) {
            const existingIndex = updated.findIndex((i) => i.product.id === pending.product.id);
            if (existingIndex >= 0) {
              const currentQty = parseAmount(updated[existingIndex].quantity);
              const newQty = currentQty + pending.quantity;
              updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: String(newQty),
              };
            } else {
              updated.push({
                product: pending.product,
                quantity: String(pending.quantity),
                unitPrice: String(pending.unitPrice),
              });
            }
          }

          return updated;
        });
      };

      void importPendingVoiceItems();

      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + parseAmount(item.quantity) * parseAmount(item.unitPrice),
        0,
      ),
    [cart],
  );

  const discountValue = parseAmount(discount);
  const total = Math.max(0, subtotal - discountValue);
  const paid = paidAmount.trim() === '' ? (paymentType === 'Cash' ? total : 0) : parseAmount(paidAmount);
  const outstanding = Math.max(0, total - paid);

  const addProduct = (product: ProductRecord) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        const nextQuantity = parseAmount(existing.quantity) + 1;

        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: String(nextQuantity) }
            : item,
        );
      }

      return [
        ...current,
        {
          product,
          quantity: '1',
          unitPrice: String(product.price),
        },
      ];
    });
  };

  const updateCartItem = (
    productId: string,
    field: 'quantity' | 'unitPrice',
    value: string,
  ) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  };

  const executeSaveBill = async () => {
    try {
      setSaving(true);
      const bill = await createBill({
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        customerId: selectedCustomer?.id ?? null,
        discount: discountValue,
        paidAmount: paid,
        paymentMethod: paid > 0 ? paymentMethod : null,
      });

      router.replace({
        pathname: '/bill-done',
        params: { billId: bill.id },
      });
    } catch (err) {
      Alert.alert(
        'Bill save nahi hua',
        err instanceof Error ? err.message : 'Koi masla aa gaya. Dobara try karein.',
      );
    } finally {
      setSaving(false);
    }
  };

  const saveBill = async () => {
    if (saving) return;
    if (cart.length === 0) {
      Alert.alert('Bill khaali hai', 'Pehle kam az kam ek product add karein.');
      return;
    }

    const insufficientItems: { name: string; requested: number; available: number; unit: string }[] = [];

    for (const item of cart) {
      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        Alert.alert(
          'Quantity ghalat hai',
          `${item.product.name} ki quantity zero se zyada honi chahiye.`,
        );
        return;
      }

      if (quantity > item.product.stockQuantity) {
        insufficientItems.push({
          name: item.product.name,
          requested: quantity,
          available: item.product.stockQuantity,
          unit: item.product.unit,
        });
      }

      const unitPrice = Number(item.unitPrice);

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        Alert.alert(
          'Rate ghalat hai',
          `${item.product.name} ka rate Rs 0 se zyada enter karein.`,
        );
        return;
      }
    }

    if (discountValue > subtotal) {
      Alert.alert('Discount ghalat hai', 'Discount subtotal se zyada nahi ho sakta.');
      return;
    }
    if (paid > total) {
      Alert.alert('Payment ghalat hai', 'Received amount total se zyada nahi ho sakta.');
      return;
    }
    if (outstanding > 0 && !selectedCustomer) {
      Alert.alert('Customer select karein', 'Udhaar ya partial payment ke liye customer zaroori hai.');
      return;
    }
    if (paid > 0 && !paymentMethod) {
      Alert.alert('Payment method', 'Payment method select karein.');
      return;
    }

    if (insufficientItems.length > 0) {
      const details = insufficientItems
        .map(
          (i) =>
            `• ${i.name}: Chahiye ${i.requested} ${i.unit} (Available: ${i.available} ${i.unit})`,
        )
        .join('\n');

      Alert.alert(
        'Kam Stock Ki Wazahat / Stock Kam Hai',
        `Mandarja zail products ka stock kam/khatam hai:\n\n${details}\n\nKya aap negative stock ke sath bill save karna chahte hain?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Haan, Save Karein',
            onPress: () => {
              void executeSaveBill();
            },
          },
        ],
      );
      return;
    }

    await executeSaveBill();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>Naya Bill</Text>
              <Text style={styles.headerCaption}>Manual billing</Text>
            </View>
            <Pressable
              onPress={() => router.push('/voice')}
              style={styles.voiceButton}
              accessibilityRole="button"
              accessibilityLabel="Voice billing"
            >
              <Ionicons name="mic" size={20} color={colors.white} />
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Products</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Product search karein..."
              placeholderTextColor={colors.textCaption}
              style={styles.searchInput}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={colors.violet} style={styles.loader} />
          ) : error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void loadData()}>
                <Text style={styles.linkText}>Dobara try karein</Text>
              </Pressable>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.mutedText}>Koi active product nahi mila.</Text>
              <Pressable onPress={() => router.push('/add-product')}>
                <Text style={styles.linkText}>Product add karein</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => (
                <View key={product.id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>
                      {formatMoney(product.price)} / {product.unit} · Stock:{' '}
                      <Text
                        style={[
                          styles.stockHighlight,
                          product.stockQuantity < 0 && styles.negativeStock,
                          product.stockQuantity === 0 && styles.zeroStock,
                        ]}
                      >
                        {product.stockQuantity}
                      </Text>
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => addProduct(product)}
                    style={styles.addButton}
                    accessibilityRole="button"
                  >
                    <Ionicons name="add" size={22} color={colors.white} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Bill items ({cart.length})</Text>

          {cart.length === 0 ? (
            <Text style={styles.mutedText}>Products list se items add karein.</Text>
          ) : (
            <View style={styles.cartList}>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartCard}>
                  <View style={styles.cartHeader}>
                    <Text style={styles.productName}>{item.product.name}</Text>
                    <Pressable onPress={() => removeCartItem(item.product.id)}>
                      <Ionicons name="trash-outline" size={19} color={colors.orangeText} />
                    </Pressable>
                  </View>
                  <View style={styles.cartInputs}>
                    <View style={styles.cartInputGroup}>
                      <Text style={styles.inputLabel}>Quantity ({item.product.unit})</Text>
                      <TextInput
                        value={item.quantity}
                        onChangeText={(value) =>
                          updateCartItem(item.product.id, 'quantity', value)
                        }
                        keyboardType="decimal-pad"
                        style={styles.cartInput}
                      />
                    </View>
                    <View style={styles.cartInputGroup}>
                      <Text style={styles.inputLabel}>Rate (Rs)</Text>
                      <TextInput
                        value={item.unitPrice}
                        onChangeText={(value) =>
                          updateCartItem(item.product.id, 'unitPrice', value)
                        }
                        keyboardType="decimal-pad"
                        style={styles.cartInput}
                      />
                    </View>
                    <View style={styles.lineTotal}>
                      <Text style={styles.inputLabel}>Amount</Text>
                      <Text style={styles.lineAmount}>
                        {formatMoney(parseAmount(item.quantity) * parseAmount(item.unitPrice))}
                      </Text>
                    </View>
                  </View>
                  {parseAmount(item.quantity) > item.product.stockQuantity && (
                    <View style={styles.stockWarningBox}>
                      <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                      <Text style={styles.stockWarningText}>
                        Stock se zyada quantity hai ·{' '}
                        {item.product.stockQuantity <= 0
                          ? `Abhi stock available nahi hai (${item.product.stockQuantity} ${item.product.unit})`
                          : `Available: ${item.product.stockQuantity} ${item.product.unit}`}{' '}
                        (Maangi gayi: {item.quantity || 0} {item.product.unit})
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Customer (optional)</Text>
          <View style={styles.searchBox}>
            <Ionicons name="person-outline" size={19} color={colors.textSecondary} />
            <TextInput
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholder="Customer search karein..."
              placeholderTextColor={colors.textCaption}
              style={styles.searchInput}
            />
          </View>
          {selectedCustomer ? (
            <View style={styles.selectedCustomer}>
              <Text style={styles.productName}>{selectedCustomer.name}</Text>
              <Pressable onPress={() => setSelectedCustomer(null)}>
                <Text style={styles.linkText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.customerList}>
              {customers.slice(0, 5).map((customer) => (
                <Pressable
                  key={customer.id}
                  onPress={() => setSelectedCustomer(customer)}
                  style={styles.customerOption}
                >
                  <Text style={styles.productName}>{customer.name}</Text>
                  <Text style={styles.productMeta}>{customer.phone || 'Phone nahi diya'}</Text>
                </Pressable>
              ))}
              {customers.length === 0 ? (
                <Text style={styles.mutedText}>Customer list khaali hai.</Text>
              ) : null}
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Payment</Text>
          <Text style={styles.inputLabel}>Payment type</Text>
          <SegmentedControl
            options={['Cash', 'Partial', 'Udhaar']}
            value={paymentType}
            onChange={(value) => {
              setPaymentType(value);
              if (value === 'Cash') {
                setPaidAmount('');
                setPaymentMethod('cash');
              } else if (value === 'Udhaar') {
                setPaidAmount('0');
              } else {
                setPaidAmount('');
              }
            }}
          />
          {paymentType !== 'Cash' ? (
            <>
              <Text style={styles.inputLabel}>Received amount (Rs)</Text>
              <TextInput
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                style={styles.amountInput}
              />
            </>
          ) : null}
          {paid > 0 ? (
            <>
              <Text style={styles.inputLabel}>Payment method</Text>
              <SegmentedControl
                options={['Cash', 'Bank', 'Other']}
                value={paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'bank' ? 'Bank' : 'Other'}
                onChange={(value) =>
                  setPaymentMethod(value === 'Cash' ? 'cash' : value === 'Bank' ? 'bank' : 'other')
                }
              />
            </>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Bill summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatMoney(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount (Rs)</Text>
            <TextInput
              value={discount}
              onChangeText={setDiscount}
              keyboardType="decimal-pad"
              style={styles.discountInput}
            />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Received</Text>
            <Text style={styles.summaryValue}>{formatMoney(paid)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[styles.summaryValue, outstanding > 0 && styles.outstanding]}>
              {formatMoney(outstanding)}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={saving || cart.length === 0}
            onPress={() => void saveBill()}
            style={({ pressed }) => [
              styles.saveButton,
              (saving || cart.length === 0) && styles.saveButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Bill save karein · {formatMoney(total)}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: { width: 40, height: 44, justifyContent: 'center' },
  headerTitleGroup: { flex: 1 },
  headerTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: fontSizes.heading, fontWeight: fontWeights.bold },
  headerCaption: { color: colors.textCaption, fontFamily: fonts.body, fontSize: fontSizes.caption },
  voiceButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.semibold, marginTop: spacing.sm },
  searchBox: { height: 48, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: fontSizes.body },
  loader: { padding: spacing.xl },
  emptyBox: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white, borderRadius: radii.md },
  errorText: { color: colors.orangeText, fontFamily: fonts.body, fontSize: fontSizes.body },
  linkText: { color: colors.violetLink, fontFamily: fonts.heading, fontWeight: fontWeights.semibold },
  mutedText: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSizes.small, paddingVertical: spacing.sm },
  productList: { gap: spacing.sm },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radii.md, padding: spacing.md },
  productInfo: { flex: 1, gap: 4 },
  productName: { color: colors.ink, fontFamily: fonts.body, fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.semibold },
  productMeta: { color: colors.textCaption, fontFamily: fonts.body, fontSize: fontSizes.caption },
  addButton: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { backgroundColor: colors.textCaption, opacity: 0.55 },
  divider: { height: 1, backgroundColor: colors.borderCard, marginVertical: spacing.sm },
  cartList: { gap: spacing.sm },
  cartCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartInputs: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  cartInputGroup: { flex: 1, gap: 5 },
  inputLabel: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSizes.caption, marginBottom: 5 },
  cartInput: { height: 42, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.sm, paddingHorizontal: 8, color: colors.ink, fontFamily: fonts.body },
  lineTotal: { flex: 1, gap: 5 },
  lineAmount: { color: colors.ink, fontFamily: fonts.heading, fontSize: fontSizes.body, fontWeight: fontWeights.semibold, paddingVertical: 10 },
  customerList: { gap: spacing.xs },
  customerOption: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radii.sm, padding: spacing.md, gap: 3 },
  selectedCustomer: { backgroundColor: colors.violetTint, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountInput: { height: 46, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.md, paddingHorizontal: spacing.md, color: colors.ink, fontFamily: fonts.body, fontSize: fontSizes.body },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  summaryLabel: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: fontSizes.body },
  summaryValue: { color: colors.ink, fontFamily: fonts.body, fontSize: fontSizes.body, fontWeight: fontWeights.medium },
  discountInput: { width: 110, height: 38, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.sm, paddingHorizontal: spacing.sm, textAlign: 'right', color: colors.ink },
  totalLabel: { color: colors.ink, fontFamily: fonts.heading, fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.bold },
  totalAmount: { color: colors.ink, fontFamily: fonts.heading, fontSize: fontSizes.title, fontWeight: fontWeights.bold },
  stockHighlight: { fontFamily: fonts.body, fontWeight: fontWeights.medium },
  negativeStock: { color: '#DC2626', fontWeight: fontWeights.bold },
  zeroStock: { color: colors.orangeText },
  stockWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: 2,
  },
  stockWarningText: {
    flex: 1,
    color: '#DC2626',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: fontWeights.medium,
  },
  outstanding: { color: colors.orangeText },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderCard, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  saveButton: { height: 54, backgroundColor: colors.violet, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: colors.white, fontFamily: fonts.heading, fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.semibold },
  pressed: { opacity: 0.82 },
});
