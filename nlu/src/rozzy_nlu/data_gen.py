"""Rozzy NLU data generator v2 (Roman_Urdu + Roman_Punjabi). One big Train CSV + one Test CSV.
Columns: id, language, text, items, num_items, tags
items cell: 'product | qty | unit | price | price_type | price_per ; ...'  ('-' = not said)
NOTE: Punjabi spellings are a STARTER list and need review by a native Pakistani Punjabi speaker.
"""
import csv, random
from .products import PRODUCTS, PA_EXTRA

# ---------- units ----------
UNIT_W = {"kg": ["kilo", "kilo", "kilo", "kg"], "g": ["gram", "gm"], "L": ["litre", "liter", "ltr"],
          "dozen": ["dozen", "darjan", "dargen"], "piece": ["piece", "pcs", "adad"],
          "packet": ["packet", "pack", "pkt"], "pao": ["pao"], "chhatank": ["chhatank", "chhattank"],
          "seer": ["seer", "ser"], "mann": ["mann", "man"], "ton": ["ton"]}
GRAIN = {"ata", "maida", "chawal", "cheeni", "gur", "daal_chana", "daal_masoor", "daal_mash", "chanay", "lobia", "khajoor", "badam"}
SPICE = {"namak", "lal_mirch", "haldi", "dhania", "zeera", "adrak", "lehsan"}
VEG = {"aloo", "pyaz", "tamatar", "seb"}
def unit_choices(p):
    if p in GRAIN: return [("kg", 70), ("pao", 12), ("seer", 6), ("mann", 5), ("g", 4), ("packet", 3)]
    if p in SPICE: return [("kg", 40), ("pao", 25), ("chhatank", 12), ("g", 15), ("packet", 8)]
    if p in VEG: return [("kg", 75), ("pao", 10), ("seer", 10), ("mann", 2), ("g", 3)]
    if p in ("doodh", "tel", "cold_drink"): return [("L", 55), ("packet", 15), ("kg", 10), ("pao", 10), ("piece", 10)]
    if p in ("dahi", "makhan", "ghee", "chai", "surf"): return [("kg", 50), ("pao", 20), ("packet", 25), ("g", 5)]
    if p in ("anday", "kela"): return [("dozen", 60), ("piece", 40)]
    if p == "mombatti": return [("dozen", 40), ("packet", 60)]
    if p in ("sabun", "bread", "machis"): return [("piece", 60), ("packet", 40)]
    return [("packet", 70), ("piece", 30)]          # biscuit, noodles
DEFAULT_UNIT = {"anday": "piece", "kela": "piece", "sabun": "piece", "biscuit": "packet", "noodles": "packet",
                "bread": "piece", "cold_drink": "piece", "machis": "packet", "mombatti": "packet"}
def wchoice(rng, pairs):
    r = rng.random() * sum(w for _, w in pairs)
    for v, w in pairs:
        r -= w
        if r <= 0: return v
    return pairs[-1][0]

# ---------- numbers ----------
SM = {"ur": {1: ["aik", "ek"], 2: ["do"], 3: ["teen"], 4: ["char"], 5: ["panch"], 6: ["chhe"], 7: ["saat"], 8: ["aath"], 9: ["nau"], 10: ["das"]},
      "pa": {1: ["ik", "ek"], 2: ["do"], 3: ["tin"], 4: ["chaar"], 5: ["panj"], 6: ["chhe"], 7: ["satt"], 8: ["atth"], 9: ["nau"], 10: ["das"]}}
TN = {"ur": {10: ["das"], 20: ["bees"], 30: ["tees"], 40: ["chalees"], 50: ["pachas"], 60: ["saath"], 70: ["sattar"], 80: ["assi"], 90: ["nabbay"]},
      "pa": {10: ["das"], 20: ["vee", "veeh"], 30: ["tih", "tee"], 40: ["chaali", "chalis"], 50: ["pachaas", "panjah"], 60: ["saath"], 70: ["sattar"], 80: ["assi"], 90: ["nabbay", "navve"]}}
FR = {0.5: ["aadha", "adha"], 1.5: ["dedh"], 2.5: ["dhai", "dhaai"], 1.25: ["sawa"], 0.75: ["paune"]}
def fmt(v):
    return str(int(v)) if float(v).is_integer() else ("%g" % v)

def qty_tokens(v, lang, rng):
    if v in FR and rng.random() < 0.7: return [rng.choice(FR[v])]
    if float(v).is_integer() and 1 <= v <= 10 and rng.random() < 0.45: return [rng.choice(SM[lang][int(v)])]
    return [fmt(v)]

def price_tokens(v, lang, rng):
    if v % 10 == 0 and v <= 900 and rng.random() < 0.4:
        h, r = divmod(v, 100)
        out = []
        if h: out += [rng.choice(SM[lang][h]), "sau"] if h > 1 else (["ek", "sau"] if rng.random() < .3 else ["sau"])
        if r: out.append(rng.choice(TN[lang][r]))
        return out
    return [fmt(v)]

QTY_POOL = [1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 8, 10, 12, 15, 20, 0.5, 0.5, 1.5, 2.5, 1.25, 0.75, 3.5, 7, 25, 50]
def qty_for(u, rng):
    if u == "ton": return rng.choice([1, 2])
    if u == "mann": return rng.choice([1, 1, 2, 3, 0.5])
    if u in ("pao", "chhatank"): return rng.choice([1, 1, 2, 3, 4, 0.5, 1.5, 2.5]) if u == "pao" else rng.choice([1, 2, 3, 4])
    if u == "g": return rng.choice([100, 200, 250, 500, 50])
    if u == "seer": return rng.choice([1, 2, 3, 5, 0.5, 1.5])
    return rng.choice(QTY_POOL)

CUR = {"ur": ["rupee", "rupe", "rupay", "rs", "rupaye"], "pa": ["rupaye", "rupey", "rupai", "rupe"]}
AND = {"ur": ["aur", "or", "aor"], "pa": ["te", "ate", "ta"]}
TOTAL = {"ur": ["ki", "ka", "ke"], "pa": ["di", "da", "de"]}
PERM = {"ur": [["k", "hisab", "se"], ["ke", "hisab", "se"], ["ke", "rate", "se"], ["ka", "rate"]],
        "pa": [["de", "hisab", "naal"], ["de", "bhaa", "naal"], ["de", "hisaab", "naal"], ["da", "rate"]]}
FILL_PRE = {"ur": [["bhai"], ["bhaiya"], ["yaar"], ["acha", "bhai"], ["suno"]], "pa": [["veere"], ["paaji"], ["mainu"], ["oye", "veere"], ["sun", "paaji"]]}
FILL_POST = {"ur": [["likh", "do"], ["de", "do"], ["dedo"], ["chahiye"], ["bhai"], ["g"]], "pa": [["likh", "deo"], ["de", "deo"], ["chahida", "ae"], ["pa", "deo"], ["paaji"], ["g"]]}

def typo(w, rng, p=0.07):
    if len(w) < 4 or rng.random() > p: return w
    i = rng.randrange(1, len(w) - 1)
    return w[:i] + w[i + 1:] if rng.random() < 0.5 else w[:i] + w[i] + w[i:]

def prod_tokens(p, lang, rng):
    forms = list(PRODUCTS[p][0])
    if lang == "pa" and p in PA_EXTRA and rng.random() < 0.7: forms = PA_EXTRA[p]
    w = rng.choice(forms)
    return [typo(t, rng) for t in w.split()]

def make_item(rng, lang, p):
    """returns (list of (token, tag)), label tuple"""
    u = wchoice(rng, unit_choices(p))
    ut = lambda unit: [rng.choice(UNIT_W[unit])]
    cur = lambda: ([(rng.choice(CUR[lang]), "CUR")] if rng.random() < 0.85 else [])
    P = [(t, "PROD_B" if i == 0 else "PROD_I") for i, t in enumerate(prod_tokens(p, lang, rng))]
    mode = wchoice(rng, [("A", 26), ("B", 10), ("C", 12), ("D", 14), ("F", 14), ("G", 9), ("R", 5), ("E", 6), ("H", 4)])
    price = rng.choice(list(range(10, 100, 5)) + list(range(100, 520, 10)) + [600, 700, 800, 1000, 1200, 1500])
    implicit = p in DEFAULT_UNIT and rng.random() < 0.35
    if implicit: u = DEFAULT_UNIT[p]
    q = qty_for(u, rng) if not implicit else rng.choice([1, 2, 3, 4, 5, 6, 8, 10, 12])
    if implicit and u == "piece" and p in ("anday", "kela"): q = rng.choice([2, 3, 4, 6, 10, 12])
    def Q(): return [(t, "QTY") for t in qty_tokens(q, lang, rng)]
    def U(): return [] if implicit else [(t, "UNIT") for t in ut(u)]
    def PR(): return [(t, "PRICE") for t in price_tokens(price, lang, rng)]
    lab = lambda **k: (p, k.get("q"), k.get("u"), k.get("pr"), k.get("pt"), k.get("pp"))
    if mode == "A":   # qty unit prod price cur
        return Q() + U() + P + PR() + cur(), lab(q=q, u=u, pr=price, pt="per_unit", pp=u)
    if mode == "B":   # prod qty unit price cur
        return P + Q() + U() + PR() + cur(), lab(q=q, u=u, pr=price, pt="per_unit", pp=u)
    if mode == "C":   # prod price cur   (no qty)
        return P + PR() + cur(), lab(pr=price, pt="per_unit")
    if mode == "D":   # qty unit prod  (no price)
        return Q() + U() + P, lab(q=q, u=u)
    if mode == "E":   # word order: prod qty unit (no price)  /  price prod qty unit
        return P + Q() + U(), lab(q=q, u=u)
    if mode == "H":   # word order: price cur prod qty unit  ("40 rupay ka ata do kilo" is total? -> keep per-unit form)
        return PR() + cur() + P + Q() + U() if False else (Q() + U() + P + cur() + PR(), lab(q=q, u=u, pr=price, pt="per_unit", pp=u))
    if mode == "G":   # total price: 50 rupee ki ilachi
        pr = rng.choice([10, 20, 30, 50, 60, 100, 150, 200, 250, 300, 500])
        pt = [(t, "PRICE") for t in price_tokens(pr, lang, rng)]
        return pt + cur() + [(rng.choice(TOTAL[lang]), "TOTAL_MARK")] + P, lab(pr=pr, pt="total")
    if mode == "R":   # prod price cur rateunit (no qty)
        ru = u if u in ("kg", "L", "dozen", "pao") else "kg"
        if p in ("anday", "kela"): ru = "dozen"
        return P + PR() + cur() + [(t, "PER_UNIT") for t in ut(ru)], lab(pr=price, pt="per_unit", pp=ru)
    # F: rate with hisab-se mark
    ru = u
    if p in ("anday", "kela") and u == "piece": ru = "dozen"
    if p in ("anday", "kela") and implicit: ru = "dozen"
    mk = [(t, "PER_MARK") for t in rng.choice(PERM[lang])]
    return Q() + U() + P + PR() + cur() + [(t, "PER_UNIT") for t in ut(ru)] + mk, lab(q=q, u=u, pr=price, pt="per_unit", pp=ru)

def pick_n(rng):
    r = rng.random()
    return rng.randint(1, 4) if r < .55 else rng.randint(5, 10) if r < .85 else rng.randint(11, 30)

def cell(l):
    p, q, u, pr, pt, pp = l
    f = lambda x: "-" if x is None else fmt(x) if isinstance(x, (int, float)) else x
    return " | ".join([p, f(q), f(u), f(pr), f(pt), f(pp)])

def make_row(rng, rid, pa_share):
    lang = "pa" if rng.random() < pa_share else "ur"
    n = pick_n(rng)
    prods = list(PRODUCTS)
    chosen = [rng.choice(prods) for _ in range(n)] if rng.random() < 0.08 else rng.sample(prods, min(n, len(prods)))
    while len(chosen) < n: chosen.append(rng.choice(prods))
    toks, tags, labels = [], [], []
    if rng.random() < 0.18:
        for w in rng.choice(FILL_PRE[lang]): toks.append(w); tags.append("FILL")
    for i, p in enumerate(chosen):
        seg, lab = make_item(rng, lang, p)
        if i:
            if rng.random() < 0.25: toks.append(","); tags.append("CONJ")
            else: toks.append(rng.choice(AND[lang])); tags.append("CONJ")
        for t, g in seg: toks.append(t); tags.append(g)
        labels.append(lab)
    if rng.random() < 0.2:
        for w in rng.choice(FILL_POST[lang]): toks.append(w); tags.append("FILL")
    text = " ".join(toks).replace(" ,", ",")
    return [rid, "Roman_Punjabi" if lang == "pa" else "Roman_Urdu", text, " ; ".join(cell(l) for l in labels), n, " ".join(tags)]

def write(path, n, seed, pa_share=0.5, prefix="R"):
    rng = random.Random(seed)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["id", "language", "text", "items", "num_items", "tags"])
        for i in range(n): w.writerow(make_row(rng, f"{prefix}{i+1:06d}", pa_share))

def generate(train_path, test_path, train_rows=100_000, test_rows=5_000, seed=11, test_seed=977):
    """Writes one big Train CSV and one Test CSV (same seeds => same files)."""
    write(train_path, train_rows, seed, prefix="TR")
    write(test_path, test_rows, test_seed, prefix="TS")
