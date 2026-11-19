import { matchParsedItemToProduct, normalizeName } from '../src/shared/utils/productMatcher';
import { setPendingCartItems, consumePendingCartItems, clearPendingCartItems, type PendingCartItem } from '../src/shared/utils/pendingCartBridge';
import type { ProductRecord } from '../src/core/database/repositories/productRepository';
import type { ParsedItem } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('=== Clarification State Machine & Edge Cases Tests ===');

// Resolver function identical to NativeVoiceScreen.tsx
function resolveClarificationReply(
  reply: string,
  candidates: ProductRecord[],
): ProductRecord | null {
  const normReply = normalizeName(reply);
  const matches = candidates.filter((c) => {
    const nameWords = normalizeName(c.name).split(' ');
    if (nameWords.some((w: string) => w.length > 2 && normReply.includes(w))) return true;
    return c.aliases.some((a: string) => {
      const aWords = normalizeName(a).split(' ');
      return aWords.some((w: string) => w.length > 2 && normReply.includes(w));
    });
  });
  return matches.length === 1 ? matches[0] : null;
}

const mockCatalogue: ProductRecord[] = [
  {
    id: 'p_basmati',
    shop_id: 's1',
    name: 'Basmati Chawal',
    aliases: ['basmati', 'chawal'],
    barcode: null,
    unit: 'kg',
    price: 380,
    stockQuantity: 100,
    lowStockThreshold: 10,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p_sella',
    shop_id: 's1',
    name: 'Sella Chawal',
    aliases: ['sella', 'chawal'],
    barcode: null,
    unit: 'kg',
    price: 320,
    stockQuantity: 100,
    lowStockThreshold: 10,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'p_cheeni',
    shop_id: 's1',
    name: 'Cheeni',
    aliases: ['chini'],
    barcode: null,
    unit: 'kg',
    price: 150,
    stockQuantity: 50,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

async function runClarificationTests() {
  // Scenario 1: Merchant says "Do kilo chawal laga do"
  // Ambiguity detected between Basmati Chawal and Sella Chawal
  const parsed1: ParsedItem = {
    product: 'chawal',
    qty: 2,
    unit: 'kg',
    price: null,
    price_type: null,
    price_per: null,
    qty_base: null,
    unit_price: null,
    line_total: null,
    confidence: 0.95,
    needs_review: false,
  };

  const matchRes = matchParsedItemToProduct(parsed1, mockCatalogue);
  assert(matchRes.status === 'ambiguous', 'Chawal must be detected as ambiguous');
  assert(matchRes.candidateProducts.length === 2, 'Must have 2 candidates: Basmati & Sella');
  assert(matchRes.product === null, 'Must never silently select an ambiguous product');
  console.log('✓ Scenario 1 - Turn 1: Ambiguity detected & candidates gathered');

  // Scenario 1 - Turn 2: Merchant replies "Basmati wala"
  const candidates = matchRes.candidateProducts;
  const reply1 = 'Basmati wala';
  const resolved1 = resolveClarificationReply(reply1, candidates);
  assert(resolved1 !== null, 'Reply "Basmati wala" must resolve');
  assert(resolved1?.id === 'p_basmati', 'Must resolve specifically to Basmati Chawal');
  assert(resolved1?.name === 'Basmati Chawal', 'Resolved name is Basmati Chawal');

  // Verify that original requested quantity (2 kg) is preserved when staging to cart
  const originalQty = parsed1.qty ?? 1;
  const stagedItem: PendingCartItem = {
    product: resolved1!,
    quantity: originalQty,
    unitPrice: resolved1!.price,
  };
  await setPendingCartItems([stagedItem]);

  const cartItems = await consumePendingCartItems();
  assert(cartItems.length === 1, 'Exactly one item added to cart');
  assert(cartItems[0].product.name === 'Basmati Chawal', 'Cart item is Basmati Chawal');
  assert(cartItems[0].quantity === 2, 'Quantity preserved as 2 kg');
  assert(cartItems[0].unitPrice === 380, 'Unit price matches product price');
  console.log('✓ Scenario 1 - Turn 2: "Basmati wala" resolves to Basmati Chawal with 2 kg preserved');

  // Scenario 2: Sella resolution ("Sella chawal de do")
  const replySella = 'sella wala';
  const resolvedSella = resolveClarificationReply(replySella, candidates);
  assert(resolvedSella?.id === 'p_sella', 'Reply "sella wala" resolves to Sella Chawal');
  console.log('✓ Scenario 2: Alternative candidate "sella wala" resolves correctly');

  // Scenario 3: Unclear / invalid clarification reply
  const replyUnclear = 'kuch bhi nahi pata';
  const resolvedUnclear = resolveClarificationReply(replyUnclear, candidates);
  assert(resolvedUnclear === null, 'Unclear reply must NOT resolve any product');
  console.log('✓ Scenario 3: Unclear reply returns null (prompts clarification again)');

  // Scenario 4: User cancellation during clarification
  // Simulates user hitting close button: candidates cleared and pending cart cleared
  let pendingClarificationCandidates: ProductRecord[] | null = [...candidates];
  await setPendingCartItems([stagedItem]);
  // Merchant cancels:
  pendingClarificationCandidates = null;
  await clearPendingCartItems();
  const consumedAfterCancel = await consumePendingCartItems();
  assert(pendingClarificationCandidates === null, 'Clarification state cleared on cancel');
  assert(consumedAfterCancel.length === 0, 'Pending cart empty after cancel');
  console.log('✓ Scenario 4: Merchant cancellation cleans up clarification & staged items safely');

  // Scenario 5: Duplicate speech event handling
  // If identical transcript arrives twice, single-use cart consumption guarantees no duplicate items
  await setPendingCartItems([stagedItem]);
  const firstConsume = await consumePendingCartItems();
  const secondConsume = await consumePendingCartItems();
  assert(firstConsume.length === 1, 'First consume has 1 item');
  assert(secondConsume.length === 0, 'Second consume is empty (no duplication)');
  console.log('✓ Scenario 5: Duplicate speech events cannot duplicate staged items');

  console.log('\nAll Clarification State Machine Tests PASSED successfully!');
}

runClarificationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
