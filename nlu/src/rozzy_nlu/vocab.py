import re
from decimal import Decimal, ROUND_HALF_UP

# ---- number words (Roman Urdu + Roman Punjabi). Digits like "40" or "2.5" are handled separately. ----
SMALL = {"aik": 1, "ek": 1, "ik": 1, "do": 2, "teen": 3, "tin": 3, "tinn": 3, "char": 4, "chaar": 4,
         "panch": 5, "panj": 5, "chhe": 6, "chheh": 6, "saat": 7, "satt": 7, "aath": 8, "atth": 8,
         "nau": 9, "das": 10}
TENS = {"bees": 20, "vee": 20, "veeh": 20, "tees": 30, "tih": 30, "tee": 30, "chalees": 40, "chaali": 40, "chalis": 40,
        "pachas": 50, "pachaas": 50, "panjah": 50, "saath": 60, "sattar": 70, "assi": 80,
        "nabbay": 90, "nabbe": 90, "navve": 90}
FRAC = {"aadha": 0.5, "adha": 0.5, "paun": 0.75, "paune": 0.75, "sawa": 1.25, "dedh": 1.5,
        "dhai": 2.5, "dhaai": 2.5}

def _clean(v):
    return int(v) if float(v).is_integer() else v

def parse_number(tokens):
    """['do','sau','pachas'] -> 250 ; ['dedh'] -> 1.5 ; ['2.5'] -> 2.5 ; unknown word -> None"""
    toks = [t.lower() for t in tokens]
    if len(toks) == 1 and re.fullmatch(r"\d+(\.\d+)?", toks[0]):
        return _clean(float(toks[0]))
    total = cur = 0
    seen = False
    for t in toks:
        if t in SMALL or t in TENS or t in FRAC:
            cur += SMALL.get(t) or TENS.get(t) or FRAC[t]
            seen = True
        elif t == "sau":
            cur = (cur or 1) * 100
            seen = True
        elif t == "hazaar":
            total += (cur or 1) * 1000
            cur = 0
            seen = True
        else:
            return None
    return _clean(total + cur) if seen else None

# ---- units ----
UNIT_LEX = {"kilo": "kg", "kg": "kg", "kilogram": "kg", "gram": "g", "gm": "g", "g": "g",
            "litre": "L", "liter": "L", "ltr": "L", "dozen": "dozen", "darjan": "dozen", "dargen": "dozen",
            "darzan": "dozen", "piece": "piece", "pcs": "piece", "adad": "piece", "packet": "packet",
            "pack": "packet", "pkt": "packet", "pao": "pao", "chhatank": "chhatank", "chhattank": "chhatank",
            "seer": "seer", "ser": "seer", "mann": "mann", "man": "mann", "ton": "ton"}
# how many "base units" one unit is (bulk base = kg or L, count base = piece)
FACTOR = {"kg": 1, "g": 0.001, "pao": 0.25, "chhatank": 0.0625, "seer": 1, "mann": 40, "ton": 1000,
          "L": 1, "dozen": 12, "piece": 1, "packet": 1}
FAMILY = {"kg": "bulk", "g": "bulk", "pao": "bulk", "chhatank": "bulk", "seer": "bulk", "mann": "bulk",
          "ton": "bulk", "L": "bulk", "dozen": "count", "piece": "count", "packet": "packet"}
# when the shopkeeper says "2 ande" (no unit), these products count in:
DEFAULT_UNIT = {"anday": "piece", "kela": "piece", "sabun": "piece", "biscuit": "packet", "rusk": "packet",
                "noodles": "packet", "bread": "piece", "cold_drink": "piece", "machis": "packet",
                "mombatti": "packet", "tarbooz": "piece"}
LIQUIDS = {"doodh", "lassi", "tel"}

TAG_CODES = {"Q": "QTY", "U": "UNIT", "B": "PROD_B", "I": "PROD_I", "P": "PRICE", "C": "CUR",
             "J": "CONJ", "R": "PER_UNIT", "M": "PER_MARK", "T": "TOTAL_MARK", "F": "FILL", "O": "O"}

def tokenize(text):
    return re.sub(r"([,،])", r" \1 ", text.lower()).split()

def assemble(tokens, tags, product_fn):
    """tokens + tags (full names) -> list of items. product_fn(surface_text) -> (product, confidence)."""
    segments, cur = [], []
    for i, g in enumerate(tags):
        if g == "CONJ":
            segments.append(cur)
            cur = []
        else:
            cur.append(i)
    segments.append(cur)
    items = []
    for seg in segments:
        pick = lambda tag: [tokens[i] for i in seg if tags[i] == tag]
        prod = [tokens[i] for i in seg if tags[i] in ("PROD_B", "PROD_I")]
        if not prod:
            continue
        review = False
        product, conf = product_fn(" ".join(prod))
        if product == "unknown":
            review = True
        qty = parse_number(pick("QTY")) if pick("QTY") else None
        price = parse_number(pick("PRICE")) if pick("PRICE") else None
        if (pick("QTY") and qty is None) or (pick("PRICE") and price is None):
            review = True
        unit = None
        if pick("UNIT"):
            unit = UNIT_LEX.get(pick("UNIT")[0])
            review = review or unit is None
        elif qty is not None:
            unit = DEFAULT_UNIT.get(product)          # "2 ande" -> piece
            review = review or unit is None
        price_type = None
        price_per = None
        if price is not None:
            price_type = "total" if pick("TOTAL_MARK") else "per_unit"
            if price_type == "per_unit":
                if pick("PER_UNIT"):
                    price_per = UNIT_LEX.get(pick("PER_UNIT")[0])
                    review = review or price_per is None
                elif unit is not None:
                    price_per = unit                  # "do kilo ata 40 rupay" -> 40 per kg
        items.append({"product": product, "qty": qty, "unit": unit, "price": price,
                      "price_type": price_type, "price_per": price_per,
                      "confidence": round(float(conf), 3), "needs_review": review})
    return items

def money(x):
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def add_calculations(item):
    """Billing maths is done by plain code (never by the ML model)."""
    q, u, p, pt, pp = item["qty"], item["unit"], item["price"], item["price_type"], item["price_per"]
    item.update({"qty_base": None, "unit_price": None, "line_total": None})
    if q is not None and u in FACTOR:
        base_unit = ("L" if item["product"] in LIQUIDS else "kg") if FAMILY[u] == "bulk" else \
                    ("piece" if FAMILY[u] == "count" else "packet")
        item["qty_base"] = {"value": float(Decimal(str(q)) * Decimal(str(FACTOR[u]))), "unit": base_unit}
    if p is None:
        return item
    if pt == "per_unit" and pp in FACTOR:
        up = Decimal(str(p)) / Decimal(str(FACTOR[pp]))
        base_family = FAMILY[pp]
        item["unit_price"] = {"value": money(up), "per": ("L" if item["product"] in LIQUIDS else "kg")
                              if base_family == "bulk" else ("piece" if base_family == "count" else "packet")}
        if item["qty_base"] is not None:
            if FAMILY.get(u) == base_family:
                item["line_total"] = money(up * Decimal(str(item["qty_base"]["value"])))
            else:
                item["needs_review"] = True           # e.g. qty in kg but price per dozen
    elif pt == "total":
        item["line_total"] = money(p)
        if item["qty_base"] is not None and item["qty_base"]["value"]:
            item["unit_price"] = {"value": money(Decimal(str(p)) / Decimal(str(item["qty_base"]["value"]))),
                                  "per": item["qty_base"]["unit"]}
    return item
