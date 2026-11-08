"""Quick manual test.   python scripts/try_it.py "2 ande 120 rupe dargen k hisab se" """
import sys, json, pathlib
from rozzy_nlu import load_model, predict

ROOT = pathlib.Path(__file__).resolve().parents[1]
m = load_model(ROOT / "models" / "rozzy_nlu_model.joblib")
text = " ".join(sys.argv[1:]) or "do kilo ata 40 rupee, or chawal 40 rupe"
print(json.dumps(predict(m, text), indent=2, ensure_ascii=False))
