import { consumePendingCartItems, clearPendingCartItems, setPendingCartItems, type PendingCartItem } from '../src/shared/utils/pendingCartBridge';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('--- Running Pending Cart Bridge Tests ---');

// Mock pending items
const mockItems: PendingCartItem[] = [
  {
    product: {
      id: 'p1',
      shop_id: 's1',
      name: 'Cheeni',
      aliases: [],
      barcode: null,
      unit: 'kg',
      price: 150,
      stockQuantity: 10,
      lowStockThreshold: 2,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    quantity: 2,
    unitPrice: 150,
  },
];

async function runTests() {
  // Test 1: Set and consume
  await setPendingCartItems(mockItems);
  const consumed = await consumePendingCartItems();
  assert(consumed.length === 1, 'consumed length 1');
  assert(consumed[0].product.name === 'Cheeni', 'consumed item is Cheeni');
  assert(consumed[0].quantity === 2, 'consumed qty 2');
  console.log('✓ Pending items set and consumed');

  // Test 2: Consume again -> must be empty (single-use guarantee, preventing duplicate additions)
  const consumedSecond = await consumePendingCartItems();
  assert(consumedSecond.length === 0, 'second consume must be empty');
  console.log('✓ Single-use guarantee verified (duplicate prevention)');

  // Test 3: Cancellation clears items without consuming
  await setPendingCartItems(mockItems);
  await clearPendingCartItems();
  const consumedAfterCancel = await consumePendingCartItems();
  assert(consumedAfterCancel.length === 0, 'consumed after cancel must be empty');
  console.log('✓ Cancellation safety verified (no items added on cancel)');

  console.log('All pending cart bridge tests PASSED!');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
