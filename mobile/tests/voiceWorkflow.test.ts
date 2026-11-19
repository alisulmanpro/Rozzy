import { matchParsedItemToProduct } from '../src/shared/utils/productMatcher';
import { setPendingCartItems, consumePendingCartItems, clearPendingCartItems, type PendingCartItem } from '../src/shared/utils/pendingCartBridge';
import type { ProductRecord } from '../src/core/database/repositories/productRepository';
import type { ParsedItem } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('=== Voice Workflow & Safety Tests ===');

const mockCatalogue: ProductRecord[] = [
  {
    id: 'p1',
    shop_id: 's1',
    name: 'Cheeni',
    aliases: ['chini', 'khand'],
    barcode: null,
    unit: 'kg',
    price: 150,
    stockQuantity: 25,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p2',
    shop_id: 's1',
    name: 'Doodh',
    aliases: ['dudh'],
    barcode: null,
    unit: 'litre',
    price: 200,
    stockQuantity: 30,
    lowStockThreshold: 2,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p3',
    shop_id: 's1',
    name: 'Ata',
    aliases: ['atta'],
    barcode: null,
    unit: 'kg',
    price: 40,
    stockQuantity: 50,
    lowStockThreshold: 10,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p4',
    shop_id: 's1',
    name: 'Makki ka ata',
    aliases: ['makki'],
    barcode: null,
    unit: 'kg',
    price: 90,
    stockQuantity: 20,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

async function runAllTests() {
  // Test 1: Single item matching & cart preparation
  const parsed1: ParsedItem = {
    product: 'cheeni',
    qty: 2,
    unit: 'kg',
    price: null,
    price_type: null,
    price_per: null,
    qty_base: null,
    unit_price: null,
    line_total: null,
    confidence: 0.98,
    needs_review: false,
  };
  const match1 = matchParsedItemToProduct(parsed1, mockCatalogue);
  assert(match1.status === 'exact', 'match1 is exact');
  assert(match1.product?.name === 'Cheeni', 'match1 is Cheeni');
  assert(match1.matchedQuantity === 2, 'match1 qty 2');
  console.log('✓ Test 1: Single item matching passed');

  // Test 2: Ambiguous product detection ('ata' matches 'Ata' and 'Makki ka ata' if subphrase matched)
  // When user says "ata", exact match for 'Ata' exists, so it matches Ata.
  // When user says something ambiguous matching multiple products without exact match:
  const mockWithAmbiguous: ProductRecord[] = [
    { ...mockCatalogue[0], id: 'c1', name: 'Dalda Cooking Oil', aliases: ['oil'] },
    { ...mockCatalogue[0], id: 'c2', name: 'Mezan Cooking Oil', aliases: ['oil'] },
  ];
  const parsedAmbiguous: ParsedItem = {
    product: 'oil',
    qty: 1,
    unit: 'L',
    price: null,
    price_type: null,
    price_per: null,
    qty_base: null,
    unit_price: null,
    line_total: null,
    confidence: 0.9,
    needs_review: false,
  };
  const matchAmbiguous = matchParsedItemToProduct(parsedAmbiguous, mockWithAmbiguous);
  assert(matchAmbiguous.status === 'ambiguous', 'oil is ambiguous between Dalda and Mezan');
  assert(matchAmbiguous.candidateProducts.length === 2, 'two candidates');
  assert(matchAmbiguous.product === null, 'never silently select ambiguous product');
  assert(!!matchAmbiguous.clarificationMessage, 'clarification question generated');
  console.log('✓ Test 2: Ambiguity detection & clarification question passed');

  // Test 3: Unit reconciliation and conversion (grams to kg)
  const parsedGrams: ParsedItem = {
    product: 'cheeni',
    qty: 750,
    unit: 'g',
    price: null,
    price_type: null,
    price_per: null,
    qty_base: null,
    unit_price: null,
    line_total: null,
    confidence: 0.95,
    needs_review: false,
  };
  const matchGrams = matchParsedItemToProduct(parsedGrams, mockCatalogue);
  assert(matchGrams.status === 'exact', 'grams converted to kg');
  assert(matchGrams.matchedQuantity === 0.75, '750g is 0.75kg');
  console.log('✓ Test 3: Unit reconciliation (grams -> kg) passed');

  // Test 4: Incompatible unit prevention (cannot sell milk by the kg or sugar by the litre)
  const parsedIncompatible: ParsedItem = {
    product: 'cheeni',
    qty: 2,
    unit: 'L',
    price: null,
    price_type: null,
    price_per: null,
    qty_base: null,
    unit_price: null,
    line_total: null,
    confidence: 0.9,
    needs_review: false,
  };
  const matchIncompatible = matchParsedItemToProduct(parsedIncompatible, mockCatalogue);
  assert(matchIncompatible.status === 'incompatible_unit', 'cannot sell cheeni in litres');
  assert(!!matchIncompatible.clarificationMessage, 'clarification message generated for unit mismatch');
  console.log('✓ Test 4: Incompatible unit rejection passed');

  // Test 5: Cart population without automatically finalizing bills
  const pendingItems: PendingCartItem[] = [
    { product: mockCatalogue[0], quantity: 2, unitPrice: 150 },
    { product: mockCatalogue[1], quantity: 1, unitPrice: 200 },
  ];
  await setPendingCartItems(pendingItems);
  const consumed = await consumePendingCartItems();
  assert(consumed.length === 2, 'cart populated with 2 items');
  assert(consumed[0].product.name === 'Cheeni', 'first item Cheeni');
  assert(consumed[1].product.name === 'Doodh', 'second item Doodh');
  console.log('✓ Test 5: Cart population verified (ready for merchant review in BillScreen)');

  // Test 6: Duplicate transcript prevention & single-use consumption
  const secondConsumed = await consumePendingCartItems();
  assert(secondConsumed.length === 0, 'pending cart empty after first consumption');
  console.log('✓ Test 6: Duplicate transcript / repeat event prevention passed');

  // Test 7: Cancellation safety (cancellation leaves cart untouched)
  await setPendingCartItems(pendingItems);
  await clearPendingCartItems();
  const cancelledConsumed = await consumePendingCartItems();
  assert(cancelledConsumed.length === 0, 'cancellation leaves pending cart empty');
  console.log('✓ Test 7: Cancellation safety passed');

  console.log('\nAll Voice Workflow & Safety Tests PASSED successfully!');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
