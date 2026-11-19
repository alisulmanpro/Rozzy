import type { Unit } from '@/types';
import type { ProductUnit } from '@/shared/data/products';

export const UNSUPPORTED_NLU_UNITS = [
  'chhatank',
  'seer',
  'mann',
  'ton',
] as const;

export type UnsupportedNluUnit = (typeof UNSUPPORTED_NLU_UNITS)[number];

export type UnitFamily = 'weight' | 'volume' | 'count' | 'packet' | 'unsupported';

export interface UnitReconciliationResult {
  productUnit: ProductUnit | null;
  isSupported: boolean;
  needsReview: boolean;
  reason?: string;
}

/**
 * Checks whether an incoming unit name represents a regional unit not natively
 * supported in the SQLite shopkeeper inventory.
 */
export function isUnsupportedUnit(
  unit: string | null | undefined,
): unit is UnsupportedNluUnit {
  if (!unit) return false;
  return (UNSUPPORTED_NLU_UNITS as readonly string[]).includes(unit.toLowerCase());
}

/**
 * Explicitly maps NLU units (e.g. 'g', 'L') to local SQLite ProductUnits ('gram', 'litre').
 * Non-convertible or unsupported units (e.g. 'chhatank', 'seer', 'mann', 'ton')
 * return isSupported: false, productUnit: null and needsReview: true.
 */
export function reconcileNluUnit(
  nluUnit: Unit | string | null | undefined,
): UnitReconciliationResult {
  if (!nluUnit) {
    return {
      productUnit: null,
      isSupported: true,
      needsReview: false,
    };
  }

  const normalized = nluUnit.trim();

  // Explicit mappings for compatible differences
  switch (normalized) {
    case 'g':
    case 'gram':
    case 'gm':
      return { productUnit: 'gram', isSupported: true, needsReview: false };

    case 'L':
    case 'litre':
    case 'liter':
    case 'ltr':
      return { productUnit: 'litre', isSupported: true, needsReview: false };

    case 'kg':
    case 'kilo':
    case 'kilogram':
      return { productUnit: 'kg', isSupported: true, needsReview: false };

    case 'dozen':
    case 'darjan':
      return { productUnit: 'dozen', isSupported: true, needsReview: false };

    case 'piece':
    case 'pcs':
    case 'adad':
      return { productUnit: 'piece', isSupported: true, needsReview: false };

    case 'packet':
    case 'pack':
    case 'pkt':
      return { productUnit: 'packet', isSupported: true, needsReview: false };

    case 'pao':
      return { productUnit: 'pao', isSupported: true, needsReview: false };

    case 'chhatank':
    case 'seer':
    case 'mann':
    case 'ton':
      return {
        productUnit: null,
        isSupported: false,
        needsReview: true,
        reason: `Local unit '${normalized}' is not supported by the product catalogue and cannot be converted silently.`,
      };

    default:
      return {
        productUnit: null,
        isSupported: false,
        needsReview: true,
        reason: `Unrecognized unit '${normalized}'.`,
      };
  }
}

/**
 * Maps a SQLite ProductUnit back to an NLU Unit.
 */
export function productUnitToNluUnit(productUnit: ProductUnit): Unit {
  switch (productUnit) {
    case 'gram':
      return 'g';
    case 'litre':
      return 'L';
    default:
      return productUnit;
  }
}

/**
 * Determines the measurement category for a unit.
 */
export function getUnitFamily(unit: ProductUnit | Unit | string): UnitFamily {
  const u = unit.toLowerCase();
  if (['kg', 'g', 'gram', 'gm', 'pao'].includes(u)) return 'weight';
  if (['l', 'litre', 'liter', 'ltr'].includes(u)) return 'volume';
  if (['dozen', 'darjan', 'piece', 'pcs', 'adad'].includes(u)) return 'count';
  if (['packet', 'pack', 'pkt'].includes(u)) return 'packet';
  return 'unsupported';
}

/**
 * Validates whether the requested voice unit can be converted or matched
 * to the product's configured unit without unit type conflicts.
 */
export function areUnitsCompatible(
  productUnit: ProductUnit,
  requestedUnit: Unit | ProductUnit | string,
): boolean {
  const prodFamily = getUnitFamily(productUnit);
  const reqFamily = getUnitFamily(requestedUnit);

  if (prodFamily === 'unsupported' || reqFamily === 'unsupported') {
    return false;
  }

  return prodFamily === reqFamily;
}

/**
 * Standard conversion factors relative to the family base:
 * - Weight base: kg (kg: 1, gram: 0.001, pao: 0.25)
 * - Volume base: litre (litre: 1)
 * - Count base: piece (piece: 1, dozen: 12)
 * - Packet base: packet (packet: 1)
 */
const BASE_FACTORS: Record<string, number> = {
  kg: 1,
  gram: 0.001,
  g: 0.001,
  gm: 0.001,
  pao: 0.25,
  litre: 1,
  l: 1,
  liter: 1,
  ltr: 1,
  piece: 1,
  pcs: 1,
  adad: 1,
  dozen: 12,
  darjan: 12,
  packet: 1,
  pack: 1,
  pkt: 1,
};

/**
 * Converts a quantity from one unit to another within the same measurement family.
 * Returns null if the conversion is incompatible or unsupported.
 * Never converts across incompatible families silently.
 */
export function convertQuantity(
  quantity: number,
  fromUnit: Unit | ProductUnit | string,
  toUnit: ProductUnit,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const fromNormalized = fromUnit.toLowerCase();
  const toNormalized = toUnit.toLowerCase();

  if (fromNormalized === toNormalized) {
    return quantity;
  }

  if (!areUnitsCompatible(toUnit, fromUnit)) {
    return null;
  }

  const fromFactor = BASE_FACTORS[fromNormalized];
  const toFactor = BASE_FACTORS[toNormalized];

  if (!fromFactor || !toFactor) {
    return null;
  }

  // Convert to base, then to target unit
  const baseValue = quantity * fromFactor;
  const targetValue = baseValue / toFactor;

  return Math.round(targetValue * 10000) / 10000;
}
