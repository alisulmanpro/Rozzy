// Shape returned by POST /parse  (see docs/API.md)
export type Unit = "kg" | "g" | "L" | "dozen" | "piece" | "packet" | "pao" | "chhatank" | "seer" | "mann" | "ton";

export interface ParsedItem {
  product: string;                 // canonical name or "unknown"
  qty: number | null;
  unit: Unit | null;
  price: number | null;            // number as spoken
  price_type: "per_unit" | "total" | null;
  price_per: Unit | null;          // what the price is "per" (kg, dozen, ...)
  qty_base: { value: number; unit: string } | null;
  unit_price: { value: number; per: string } | null;
  line_total: number | null;
  confidence: number;
  needs_review: boolean;           // true => ASK the shopkeeper, never add silently
}

export interface ParseResponse {
  text: string;
  language_guess: "Roman_Urdu" | "Roman_Punjabi";
  language_confidence: number;
  items: ParsedItem[];
  needs_review: boolean;
}
