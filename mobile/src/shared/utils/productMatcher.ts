import { areUnitsCompatible, convertQuantity, reconcileNluUnit } from '@/shared/utils/units';
import type { ProductRecord } from '@/core/database/repositories/productRepository';
import type { ParsedItem } from '@/types';

export type MatchStatus = 'exact' | 'ambiguous' | 'not_found' | 'incompatible_unit';

export interface ProductMatchResult {
  status: MatchStatus;
  product: ProductRecord | null;
  matchedQuantity: number;
  candidateProducts: ProductRecord[];
  clarificationMessage?: string;
  reason?: string;
}

/**
 * Normalizes a text string for comparison: lowercase, trim, remove common punctuation,
 * normalize spaces.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a candidate name or alias matches a query string.
 */
function isNameOrAliasMatch(product: ProductRecord, query: string): boolean {
  const normQuery = normalizeName(query);
  if (!normQuery) return false;

  const normProdName = normalizeName(product.name);
  if (normProdName === normQuery) return true;

  for (const alias of product.aliases) {
    if (normalizeName(alias) === normQuery) return true;
  }

  return false;
}

/**
 * Matches a parsed NLU item against the active catalogue of products.
 *
 * Rules:
 * 1. If NLU item flagged needs_review or product is 'unknown', never match silently.
 * 2. Look for exact name or alias matches.
 * 3. If multiple distinct products match, report ambiguous.
 * 4. Check unit compatibility via unit reconciliation. If unit is incompatible, report incompatible_unit.
 * 5. Convert quantity to product's catalogue unit if compatible (e.g. 500g -> 0.5kg).
 */
export function matchParsedItemToProduct(
  parsedItem: ParsedItem,
  catalogue: ProductRecord[],
): ProductMatchResult {
  const queryProduct = parsedItem.product;

  // Rule 1: Unknown or review-flagged product
  if (!queryProduct || queryProduct.toLowerCase() === 'unknown') {
    return {
      status: 'not_found',
      product: null,
      matchedQuantity: 0,
      candidateProducts: [],
      clarificationMessage: 'Yeh cheez catalogue mein nahi mili. Baraye meherbani cheez ka naam dobara batayein.',
      reason: 'Product name is unknown or unparsed.',
    };
  }

  const normQuery = normalizeName(queryProduct);

  // Exact matches on name or alias
  const exactMatches = catalogue.filter((p) => p.isActive && isNameOrAliasMatch(p, normQuery));

  let matchedCandidates = exactMatches;

  // If no exact match, look for sub-phrase or word overlap matches cautiously
  if (matchedCandidates.length === 0) {
    matchedCandidates = catalogue.filter((p) => {
      if (!p.isActive) return false;
      const pName = normalizeName(p.name);
      // match if product name contains query or query contains product name as complete word
      const nameWords = pName.split(' ');
      const queryWords = normQuery.split(' ');
      return (
        nameWords.includes(normQuery) ||
        queryWords.includes(pName) ||
        p.aliases.some((a) => {
          const aWords = normalizeName(a).split(' ');
          return aWords.includes(normQuery) || queryWords.includes(normalizeName(a));
        })
      );
    });
  }

  // 0 candidates -> not found
  if (matchedCandidates.length === 0) {
    return {
      status: 'not_found',
      product: null,
      matchedQuantity: 0,
      candidateProducts: [],
      clarificationMessage: `"${queryProduct}" catalogue mein nahi mila. Baraye meherbani cheez dobara batayein.`,
      reason: `No matching active product found for "${queryProduct}".`,
    };
  }

  // >1 candidates -> ambiguous, ask shopkeeper
  if (matchedCandidates.length > 1) {
    const candidateNames = matchedCandidates.map((c) => c.name).join(' ya ');
    return {
      status: 'ambiguous',
      product: null,
      matchedQuantity: 0,
      candidateProducts: matchedCandidates,
      clarificationMessage: `Aap ka matlab ${candidateNames} mein se kya hai?`,
      reason: `Multiple products matched "${queryProduct}".`,
    };
  }

  const selected = matchedCandidates[0];

  // Unit and quantity handling
  const rawQty = parsedItem.qty ?? 1;
  const nluUnit = parsedItem.unit;

  // If NLU supplied a unit, check reconciliation
  if (nluUnit) {
    const recon = reconcileNluUnit(nluUnit);
    if (!recon.isSupported || recon.needsReview) {
      return {
        status: 'incompatible_unit',
        product: selected,
        matchedQuantity: 0,
        candidateProducts: [selected],
        clarificationMessage: `${selected.name} ke liye unit "${nluUnit}" samajh nahi aayi. Baraye meherbani unit dobara batayein.`,
        reason: recon.reason || `Unit ${nluUnit} is unsupported or needs review.`,
      };
    }

    if (recon.productUnit && !areUnitsCompatible(selected.unit, recon.productUnit)) {
      return {
        status: 'incompatible_unit',
        product: selected,
        matchedQuantity: 0,
        candidateProducts: [selected],
        clarificationMessage: `${selected.name} ki unit ${selected.unit} hai, magar aap ne ${nluUnit} farmaya. Durust unit batayein.`,
        reason: `Unit mismatch: product is in ${selected.unit}, voice specified ${nluUnit}.`,
      };
    }

    // Convert quantity to catalogue unit (e.g., 500g -> 0.5kg)
    const converted = recon.productUnit
      ? convertQuantity(rawQty, recon.productUnit, selected.unit)
      : rawQty;

    if (converted === null || converted <= 0) {
      return {
        status: 'incompatible_unit',
        product: selected,
        matchedQuantity: 0,
        candidateProducts: [selected],
        clarificationMessage: `${selected.name} ki quantity ${rawQty} ${nluUnit} ko ${selected.unit} mein convert nahi kiya ja saka.`,
        reason: 'Quantity conversion returned null or non-positive value.',
      };
    }

    return {
      status: 'exact',
      product: selected,
      matchedQuantity: converted,
      candidateProducts: [selected],
    };
  }

  // If no unit supplied in voice, check if raw quantity is valid
  return {
    status: 'exact',
    product: selected,
    matchedQuantity: rawQty > 0 ? rawQty : 1,
    candidateProducts: [selected],
  };
}
