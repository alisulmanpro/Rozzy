import type { ProductRecord } from '@/core/database/repositories/productRepository';

export interface PendingCartItem {
  product: ProductRecord;
  quantity: number;
  unitPrice: number;
}

const STORAGE_KEY_PENDING_CART = 'rozzy:pending_voice_cart_items';

let inMemoryPendingCart: PendingCartItem[] = [];

/**
 * Stores pending cart items in memory and asynchronously in AsyncStorage.
 */
export async function setPendingCartItems(items: PendingCartItem[]): Promise<void> {
  inMemoryPendingCart = [...items];
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(STORAGE_KEY_PENDING_CART, JSON.stringify(items));
  } catch {
    // In-memory fallback is active
  }
}

/**
 * Retrieves and clears pending cart items.
 * Guarantees that items are retrieved only once to prevent duplicate additions.
 */
export async function consumePendingCartItems(): Promise<PendingCartItem[]> {
  const result = [...inMemoryPendingCart];
  inMemoryPendingCart = [];

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const stored = await AsyncStorage.getItem(STORAGE_KEY_PENDING_CART);
    if (stored) {
      await AsyncStorage.removeItem(STORAGE_KEY_PENDING_CART);
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && result.length === 0) {
        return parsed as PendingCartItem[];
      }
    }
  } catch {
    // In-memory items returned
  }

  return result;
}

/**
 * Clears any pending cart items without using them (e.g. on cancellation).
 */
export async function clearPendingCartItems(): Promise<void> {
  inMemoryPendingCart = [];
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(STORAGE_KEY_PENDING_CART);
  } catch {
    // Ignored
  }
}
