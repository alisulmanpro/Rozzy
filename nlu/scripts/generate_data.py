"""Generate the synthetic dataset.   python scripts/generate_data.py
Writes data/Train.csv (100,000 rows, git-ignored: 70 MB) and data/Test.csv (5,000 rows).
Same seeds => same files, so everyone gets identical data."""
import argparse, pathlib
from rozzy_nlu.data_gen import generate

ROOT = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument("--train-rows", type=int, default=100_000)
p.add_argument("--test-rows", type=int, default=5_000)
a = p.parse_args()
(ROOT / "data").mkdir(exist_ok=True)
generate(ROOT / "data" / "Train.csv", ROOT / "data" / "Test.csv", a.train_rows, a.test_rows)
print("done ->", ROOT / "data")
