# Rozzy 🛒

**Voice billing assistant for Pakistani kiryana (grocery) shops.**
The shopkeeper *says* the order in Roman Urdu or Roman Punjabi; Rozzy turns it into a bill.

> Part of the DukanPro plan: mobile app first, then POS / desktop / website.

---

## The problem

Small shopkeepers write bills by hand or use a calculator while customers wait. Typing every item into a
normal POS app is slow, and most shopkeepers are more comfortable speaking than typing. They also speak
**Roman Urdu and (mostly) Punjabi**, mix units like *pao, chhatank, seer, mann, dozen*, use fractions like
*dedh, dhai, sawa*, and quote prices in different ways:

- `2 ande 120 rupe dargen k hisab se` (rate per dozen)
- `10 kilo ata 160 rupee kilo k hisab se` (rate per kilo)
- `50 rupee ki ilachi` (a fixed amount)
- `ik kilo khand te adha kilo dudh` (Punjabi)

Existing apps do not understand this way of speaking.

## The solution

A small ML model reads the sentence and returns **structured JSON**. Normal code (not ML) then does all
the maths (unit conversion, rate, line total), so the money is always exact.

```
voice (later) ─► text ─► NLU model ─► JSON items ─► billing maths ─► bill on screen / printer
```

Example (`POST /parse`):

```json
{ "text": "2 ande 120 rupe dargen k hisab se" }
```
```json
{
  "language_guess": "Roman_Urdu",
  "items": [{
    "product": "anday", "qty": 2, "unit": "piece",
    "price": 120, "price_type": "per_unit", "price_per": "dozen",
    "unit_price": { "value": 10.0, "per": "piece" }, "line_total": 20.0,
    "needs_review": false
  }],
  "needs_review": false
}
```

Rule for the app: **if `needs_review` is true, ask the shopkeeper. Never add the item silently.**

## Current status

| Part | State |
|---|---|
| Text NLU model (`nlu/`) | ✅ Working. 98.9% full-sentence match on the synthetic test set (see limits below) |
| Backend API (`backend/`) | ✅ Minimal: `/health`, `/parse` |
| Mobile app (`mobile/`) | 🚧 Skeleton only (parse screen). **This is where the developer starts.** |
| Voice (Whisper) | ⏳ Not started |
| Intents (undo, remove, total, confirm) | ⏳ Not started |
| Cloud sync / Postgres | ⏳ Later |

> ⚠️ The 98.9% is measured on **synthetic** data made by our own generator. Real shopkeepers will score lower.
> Collecting real sentences (and a hand-written test set) is a top priority. See `docs/NLU.md`.

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Mobile app | Expo React Native + TypeScript | One code base for Android and iPhone; most shopkeepers use Android |
| On-phone data | SQLite (`expo-sqlite`) | Bills are saved offline first, synced later |
| Backend | Python + FastAPI | The model is Python (scikit-learn), so it becomes an API directly |
| NLU model | scikit-learn (token tagger + product classifier), saved with joblib | Small, fast, easy to retrain |
| Voice (planned) | Whisper | Speech to text, server first, phone later |
| Later | PostgreSQL, Next.js website, Tauri/Electron desktop | Not needed yet |

Brand: name **Rozzy**, light theme. Violet `#7B2CF5`, magenta `#E81EC8`, coral `#F03E5A`, orange `#FFA13B`,
ink `#14123A`, background `#F7F5FF`. Fonts: Poppins, Inter, Noto Nastaliq Urdu.

## Repo layout

```
rozzy/
├── nlu/        Python package + scripts: data generator, training, evaluation, the model file
├── backend/    FastAPI server that wraps the model
├── mobile/     Expo app source (src/); see mobile/README.md to create the Expo project
└── docs/       ARCHITECTURE.md, API.md, NLU.md, ROADMAP.md
```

## Quick start (about 5 minutes)

**You need:** Python 3.11+, Node.js 20+ (LTS), Git. Android Studio emulator or the *Expo Go* app on a phone.

### 1. Clone

```bash
git clone git@github.com:alisulmanpro/Rozzy.git
cd Rozzy
```

### 2. Backend + NLU

```bash
python -m venv .venv
source .venv/bin/activate          # Windows (PowerShell): .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt     # also installs nlu/ in editable mode

pytest nlu                         # model + maths tests (10 tests)
pytest backend                     # API tests (2 tests)

cd backend
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs and try `POST /parse`, or from a second terminal:

```bash
python nlu/scripts/try_it.py "10 kilo ata 160 rupee kilo k hisab se"
```

A trained model is already included at `nlu/models/rozzy_nlu_model.joblib`, so you do not need to train anything to start.

### 3. Mobile app

Follow `mobile/README.md` (create the Expo project, copy `mobile/src`, run `npx expo start`).
Set the backend address in `EXPO_PUBLIC_API_URL` (see `.env.example`). On a real phone use your PC's
LAN IP, e.g. `http://192.168.1.5:8000`, and keep phone and PC on the same Wi-Fi.

### 4. Retrain the model (only when data or code changes)

```bash
python nlu/scripts/generate_data.py      # makes nlu/data/Train.csv (100K rows, 70 MB, git-ignored) and Test.csv
python nlu/scripts/train.py              # ~2 minutes; saves nlu/models/rozzy_nlu_model.joblib and prints Test results
python nlu/scripts/evaluate.py nlu/data/Test_human.csv   # your own hand-written test file
```

The model file must be loaded with the **same scikit-learn version** it was trained with (pinned to `1.9.1`).

## Where to start (developer)

1. Run the quick start above and confirm `/parse` works.
2. Build the mobile **Bill screen**: text box first (voice later), list of parsed items, total, and a
   "check this item" state for `needs_review`. Port the billing maths if you need it offline
   (`nlu/src/rozzy_nlu/vocab.py`, function `add_calculations`).
3. Save bills in SQLite. Read `docs/ROADMAP.md` for the order of work.

## Contributing

See `docs/ARCHITECTURE.md` for the design and `docs/NLU.md` for the model. Please:
- Create a branch (`feature/...`) and open a pull request; do not push to `main` directly.
- Run `pytest nlu backend` before you push.
- Never put customer names or phone numbers into datasets.

## License

Not decided yet. Until the owner adds a LICENSE file, all rights are reserved.
