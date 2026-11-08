"""Train and save the model.   python scripts/train.py
Reads data/Train.csv, prints Test results, saves models/rozzy_nlu_model.joblib"""
import argparse, pathlib
from rozzy_nlu import load_rows, train, evaluate, save_model

ROOT = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument("--train", default=str(ROOT / "data" / "Train.csv"))
p.add_argument("--test", default=str(ROOT / "data" / "Test.csv"))
p.add_argument("--out", default=str(ROOT / "models" / "rozzy_nlu_model.joblib"))
p.add_argument("--tag-rows", type=int, default=12000, help="rows used for the tagger (RAM limit)")
a = p.parse_args()

rows = load_rows(a.train)
model = train(rows, tag_rows=a.tag_rows)
pathlib.Path(a.out).parent.mkdir(exist_ok=True)
save_model(model, a.out)
print("saved:", a.out)
print("== TEST ==")
evaluate(model, load_rows(a.test), show=3)
