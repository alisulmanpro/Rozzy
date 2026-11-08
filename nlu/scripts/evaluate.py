"""Evaluate a saved model on any CSV (e.g. your hand-written Test_human.csv).
python scripts/evaluate.py data/Test.csv"""
import sys, pathlib
from rozzy_nlu import load_rows, load_model, evaluate

ROOT = pathlib.Path(__file__).resolve().parents[1]
test = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "data" / "Test.csv")
model = load_model(ROOT / "models" / "rozzy_nlu_model.joblib")
evaluate(model, load_rows(test), show=5)
