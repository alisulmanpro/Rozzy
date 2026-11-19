import { matchParsedItemToProduct, normalizeName } from '../src/shared/utils/productMatcher';
import type { ProductRecord } from '../src/core/database/repositories/productRepository';
import type { ParsedItem } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- Running Product Matcher & Unit Tests ---');

// Test 1: Normalization
assert(normalizeName('  Ata  ') === 'ata', 'normalize whitespace');
assert(normalizeName('Daal-Masoor!') === 'daal masoor', 'normalize punctuation');
console.log('✓ Normalization tests passed');

// Mock Catalogue
const mockCatalogue: ProductRecord[] = [
  {
    id: 'prod-1',
    shop_id: 'shop-1',
    name: 'Ata',
    aliases: ['aata', 'atta'],
    barcode: null,
    unit: 'kg',
    price: 40,
    stockQuantity: 100,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    shop_id: 'shop-1',
    name: 'Basmati Chawal',
    aliases: ['basmati', 'chawal basmati'],
    barcode: null,
    unit: 'kg',
    price: 320,
    stockQuantity: 50,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    shop_id: 'shop-1',
    name: 'Sella Chawal',
    aliases: ['sella', 'chawal sella'],
    barcode: null,
    unit: 'kg',
    price: 260,
    stockQuantity: 40,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    shop_id: 'shop-1',
    name: 'Doodh',
    aliases: ['dudh'],
    barcode: null,
    unit: 'litre',
    price: 200,
    stockQuantity: 20,
    lowStockThreshold: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Test 2: Exact Match & Unit Conversion (500g -> 0.5kg)
const item1: ParsedItem = {
  product: 'ata',
  qty: 500,
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
const res1 = matchParsedItemToProduct(item1, mockCatalogue);
assert(res1.status === 'exact', 'res1 status exact');
assert(res1.product?.id === 'prod-1', 'res1 matches Ata');
assert(res1.matchedQuantity === 0.5, `res1 converted 500g to 0.5kg, got ${res1.matchedQuantity}`);
console.log('✓ Exact match & unit conversion passed (500g Ata -> 0.5kg)');

// Test 3: Alias Match (aata -> Ata)
const item2: ParsedItem = {
  product: 'aata',
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
const res2 = matchParsedItemToProduct(item2, mockCatalogue);
assert(res2.status === 'exact', 'res2 status exact');
assert(res2.product?.id === 'prod-1', 'res2 matches Ata via alias');
assert(res2.matchedQuantity === 2, 'res2 qty 2');
console.log('✓ Alias match passed (aata -> Ata)');

// Test 4: Ambiguous Match ('chawal' matches both Basmati Chawal and Sella Chawal)
const item3: ParsedItem = {
  product: 'chawal',
  qty: 1,
  unit: 'kg',
  price: null,
  price_type: null,
  price_per: null,
  qty_base: null,
  unit_price: null,
  line_total: null,
  confidence: 0.90,
  needs_review: false,
};
const res3 = matchParsedItemToProduct(item3, mockCatalogue);
assert(res3.status === 'ambiguous', 'res3 status ambiguous');
assert(res3.candidateProducts.length === 2, 'res3 has 2 candidates');
assert(res3.product === null, 'res3 never silently picks a product');
assert(!!res3.clarificationMessage, 'res3 has clarification question');
console.log('✓ Ambiguous match passed (chawal asks shopkeeper Basmati vs Sella)');

// Test 5: Incompatible Unit (Doodh is litre, requested piece/adad)
const item4: ParsedItem = {
  product: 'doodh',
  qty: 2,
  unit: 'piece',
  price: null,
  price_type: null,
  price_per: null,
  qty_base: null,
  unit_price: null,
  line_total: null,
  confidence: 0.90,
  needs_review: false,
};
const res4 = matchParsedItemToProduct(item4, mockCatalogue);
assert(res4.status === 'incompatible_unit', 'res4 status incompatible_unit');
assert(res4.product?.id === 'prod-4', 'res4 identified product');
assert(!!res4.clarificationMessage, 'res4 provides clarification message');
console.log('✓ Incompatible unit test passed');

// Test 6: Unknown product
const item5: ParsedItem = {
  product: 'unknown',
  qty: 1,
  unit: 'kg',
  price: null,
  price_type: null,
  price_per: null,
  qty_base: null,
  unit_price: null,
  line_total: null,
  confidence: 0.1,
  needs_review: true,
};
const res5 = matchParsedItemToProduct(item5, mockCatalogue);
assert(res5.status === 'not_found', 'res5 status not_found');
console.log('✓ Unknown item test passed');

// Test 7: Unsupported regional unit (mann, seer, chhatank)
const item6: ParsedItem = {
  product: 'ata',
  qty: 1,
  unit: 'mann',
  price: null,
  price_type: null,
  price_per: null,
  qty_base: null,
  unit_price: null,
  line_total: null,
  confidence: 0.85,
  needs_review: true,
};
const res6 = matchParsedItemToProduct(item6, mockCatalogue);
assert(res6.status === 'incompatible_unit', 'res6 mann is unsupported');
console.log('✓ Unsupported regional unit test passed');

console.log('All product matching tests PASSED!');
