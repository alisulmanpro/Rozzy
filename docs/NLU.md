# NLU model

Text only (Roman script). Turns a shopkeeper sentence into items. Lives in `nlu/`.

## Data

`nlu/scripts/generate_data.py` writes one big `Train.csv` (100,000 rows, git-ignored) and one `Test.csv`
(5,000 rows, committed). Same seeds => identical files. `nlu/data/Train_sample.csv` is the first 5,000 rows
(committed) so you can train quickly (`python nlu/scripts/train.py --train nlu/data/Train_sample.csv`).

| Column | Meaning |
|---|---|
| `id`, `language` (`Roman_Urdu` / `Roman_Punjabi`), `text`, `num_items` | basic info |
| `items` | `product \| qty \| unit \| price \| price_type \| price_per`, items separated by ` ; `, `-` = not said |
| `tags` | one tag per token (training label for the tagger). **Real data will not have it**; see "Real data" below |

About 50% Urdu / 50% Punjabi, 1 to 30 items per sentence, with fractions, traditional units, rate and total prices,
different word orders, filler words ("bhai", "likh do", "de deo") and repeated products.

## Results (synthetic Test.csv, 5,000 sentences)

Full sentence correct: **98.9%**. Items correct: **99.84%**. Urdu 98.90%, Punjabi 98.95%.
These are measured on data from the same generator as training, so they are **not** real-world accuracy.

## Known limits (be honest with users)

1. Test data is synthetic. Real accuracy is lower. Make a hand-written `nlu/data/Test_human.csv` (100-200 sentences) and never train on it.
2. Items with no separator ("ata chawal cheeni") are read as one item (flagged `needs_review`).
3. Two numbers next to each other ("kele 6 65 rupey") can swap qty and price.
4. Only 37 products. A new product comes out as `unknown` (this is correct behaviour). Add products in `products.py`.
5. Punjabi spellings are a starter list written by Claude, partly from an Indian-published book. **A native Pakistani Punjabi speaker must review them.**
6. `mann` = 40 kg and `seer` = 1 kg are assumptions; they differ by region. Change `FACTOR` in `vocab.py`.
7. "adha kilo dudh" comes out in kg, not litres.
8. `language_guess` is unreliable on short sentences shared by both languages.

## Adding things

- **New product:** `products.py` (PRODUCTS + PA_EXTRA), unit rules in `data_gen.unit_choices()`, regenerate, retrain.
- **New unit / number word:** `vocab.py` (`UNIT_LEX`, `FACTOR`, `FAMILY`, `SMALL/TENS/FRAC`), add examples in the generator, retrain.
- **New sentence pattern:** add a mode in `data_gen.make_item()`, regenerate, retrain, check `Test.csv` AND a hand-written test.

## Real data (the data flywheel)

Plan: the app saves what the shopkeeper said and the final bill he confirmed/edited, syncs to the cloud on a schedule, and we retrain on it.
- The **label is the shopkeeper-confirmed final bill**, not the model's prediction.
- Remove customer names and phone numbers; get consent.
- Sync must be idempotent (unique IDs). Keep a fixed human test set out of training. Version models (`..._v3.joblib`).
- Real rows have no `tags`: derive them with a rule-based labeller or label by hand, and check a sample.

## Training notes

The tagger trains on 12,000 rows by default (`--tag-rows`) to keep RAM low (a full 100K run needs more than 8 GB). The product classifier uses all rows.
