# Architecture

```
┌─────────────┐  text (later: voice)   ┌──────────────┐    ┌──────────────┐
│ Mobile app  │ ─────────────────────► │ FastAPI      │───►│ rozzy_nlu    │
│ Expo RN     │ ◄───────────────────── │ /parse       │◄───│ (scikit-learn)│
│ SQLite      │       JSON items       └──────────────┘    └──────────────┘
└─────────────┘
```

## Principles

1. **ML extracts what was said. Code does the maths.** Quantity, unit and price come from the model;
   `unit_price`, `line_total`, `qty_base` come from `add_calculations()` using `Decimal`.
2. **Never guess silently.** Low confidence or missing info => `needs_review: true` and the app asks the shopkeeper.
3. **Offline first (app side).** Bills are written to SQLite on the phone first, synced to the cloud later.
4. **Price is never invented.** If the shopkeeper did not say a price, `price` is `null`; the app may use the saved catalogue price.

## Pipeline inside the model (`nlu/src/rozzy_nlu/`)

1. `tokenize` splits the sentence into lowercase tokens (comma becomes its own token).
2. **Tagger** gives every token a tag: `QTY UNIT PROD_B PROD_I PRICE CUR CONJ PER_UNIT PER_MARK TOTAL_MARK FILL`.
3. Items are split at `CONJ` (aur / or / te / ate / comma).
4. **Product classifier** (character n-grams) maps spellings to a canonical name (`khand` -> `cheeni`). Low confidence => `unknown`.
5. `parse_number` / `UNIT_LEX` turn words into numbers and standard units (`dedh` -> 1.5, `darjan` -> `dozen`).
6. `add_calculations` converts units (`pao` = 0.25 kg, `mann` = 40 kg, `dozen` = 12 piece) and computes totals.

## Planned (not built yet)

- Voice: Whisper on the server first, small on-device model later (needs offline plan).
- Intent classifier: add_items / remove_item / undo / show_total / confirm / cancel.
- PostgreSQL + sync endpoints (idempotent, unique IDs), data flywheel (see `docs/NLU.md`).
- Website (Next.js) and desktop (Tauri/Electron) sharing a TypeScript billing package.
