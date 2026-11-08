import csv, re, time, joblib, numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import SGDClassifier, LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from .vocab import *

NUMW = set(SMALL) | set(TENS) | set(FRAC) | {"sau", "hazaar"}
CURW = {"rupee", "rupe", "rupay", "rs", "rupaye", "rupey", "rupai"}

def load_rows(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
    for r in rows:
        r["gold"] = [dict(zip(["product","qty","unit","price","price_type","price_per"], [None if x.strip()=="-" else x.strip() for x in c.split("|")])) for c in r["items"].split(" ; ")]
    return rows

def feats(toks, i):
    w = toks[i]
    f = {"w=" + w: 1, "p2=" + w[:2]: 1, "p3=" + w[:3]: 1, "s2=" + w[-2:]: 1, "s3=" + w[-3:]: 1,
         "dig": int(bool(re.fullmatch(r"\d+(\.\d+)?", w))), "numw": int(w in NUMW), "unitw": int(w in UNIT_LEX),
         "curw": int(w in CURW), "frac": int(w in FRAC), "len": min(len(w), 8), "comma": int(w == ",")}
    for d in (-3, -2, -1, 1, 2, 3):
        j = i + d
        v = toks[j] if 0 <= j < len(toks) else "<pad>"
        f[f"w{d}={v}"] = 1
        if abs(d) <= 2:
            f[f"d{d}"] = int(bool(re.fullmatch(r"\d+(\.\d+)?", v))); f[f"n{d}"] = int(v in NUMW)
            f[f"u{d}"] = int(v in UNIT_LEX); f[f"c{d}"] = int(v in CURW)
    f["bi-1=" + (toks[i-1] if i else "<s>") + "|" + w] = 1
    return f

def seg_products(toks, tags):
    segs, cur = [], []
    for t, g in zip(toks, tags):
        if g == "CONJ": segs.append(cur); cur = []
        else: cur.append((t, g))
    segs.append(cur)
    out = []
    for s in segs:
        p = " ".join(t for t, g in s if g in ("PROD_B", "PROD_I"))
        if p: out.append(p)
    return out

def train(rows, tag_rows=12000):
    t0 = time.time()
    X, y = [], []
    for r in rows[:tag_rows]:
        toks = tokenize(r["text"]); tags = r["tags"].split()
        assert len(toks) == len(tags), r["id"]
        for i in range(len(toks)): X.append(feats(toks, i)); y.append(tags[i])
    vec = DictVectorizer(dtype=np.float32); Xm = vec.fit_transform(X).tocsr(); Xm.indices = Xm.indices.astype(np.int32); Xm.indptr = Xm.indptr.astype(np.int32)
    tagger = SGDClassifier(loss="log_loss", alpha=1e-6, max_iter=15, tol=None, random_state=0, n_jobs=-1).fit(Xm, y)
    print("tagger trained", Xm.shape, round(time.time() - t0), "s")
    surf, lab = {}, []
    for r in rows:
        toks = tokenize(r["text"]); tags = r["tags"].split()
        ps = seg_products(toks, tags)
        if len(ps) == len(r["gold"]):
            for s, g in zip(ps, r["gold"]): surf[s] = g["product"]
    names = list(surf)
    prod = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4)), LogisticRegression(C=30, max_iter=300)).fit(names, [surf[n] for n in names])
    lang = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), max_features=60000), LogisticRegression(C=5, max_iter=200)).fit([r["text"] for r in rows[:20000]], [r["language"] for r in rows[:20000]])
    return {"vec": vec, "tagger": tagger, "prod": prod, "lang": lang, "thr": 0.5}

def predict(m, text):
    toks = tokenize(text)
    tags = list(m["tagger"].predict(m["vec"].transform([feats(toks, i) for i in range(len(toks))]))) if toks else []
    def pf(s):
        pr = m["prod"].predict_proba([s])[0]; k = pr.argmax()
        return (str(m["prod"].classes_[k]), pr[k]) if pr[k] >= m["thr"] else ("unknown", pr[k])
    items = [add_calculations(i) for i in assemble(toks, tags, pf)]
    lp = m["lang"].predict_proba([text])[0]; k = lp.argmax()
    return {"text": text, "language_guess": str(m["lang"].classes_[k]), "language_confidence": round(float(lp[k]), 3),
            "items": items, "needs_review": (not items) or any(i["needs_review"] for i in items)}

F = ["product", "qty", "unit", "price", "price_type", "price_per"]
def same(a, b, f):
    if f == "qty" or f == "price":
        if a is None or b is None: return a is None and b is None
        return abs(float(a) - float(b)) < 1e-9
    return a == b

def evaluate(m, rows, show=0):
    n_s = ok_s = n_i = ok_i = 0; fld = {f: [0, 0] for f in F}; bylang = {}; wrong = []
    for r in rows:
        out = predict(m, r["text"])["items"]; g = r["gold"]
        sent_ok = len(out) == len(g)
        for k, gi in enumerate(g):
            n_i += 1; pi = out[k] if k < len(out) else None
            good = pi is not None
            for f in F:
                fld[f][1] += 1
                if pi is not None and same(pi[f], None if gi[f] is None else gi[f], f): fld[f][0] += 1
                else: good = False
            ok_i += good; sent_ok = sent_ok and good
        n_s += 1; ok_s += sent_ok
        b = bylang.setdefault(r["language"], [0, 0]); b[0] += sent_ok; b[1] += 1
        if not sent_ok and len(wrong) < show: wrong.append((r["text"], r["items"], out))
    print(f"sentences exact: {ok_s/n_s:.4f} ({ok_s}/{n_s})  items exact: {ok_i/n_i:.4f} ({ok_i}/{n_i})")
    print("per field:", {f: round(a/b, 4) for f, (a, b) in fld.items()})
    print("per language:", {k: round(a/b, 4) for k, (a, b) in bylang.items()})
    return wrong

def save_model(m, path):
    joblib.dump(m, path)

def load_model(path):
    """Loads a model saved by save_model(). Needs the same scikit-learn version it was trained with."""
    return joblib.load(path)
