# Roadmap (suggested order)

## Phase 1: working text-to-bill app (developer starts here)
- [ ] Create the Expo project from `mobile/` (see `mobile/README.md`), run the Parse screen against the backend.
- [ ] Bill screen: text input, parsed item list, running total, remove item, "check this item" for `needs_review`.
- [ ] Product catalogue on the phone (SQLite): name, unit, saved price. Use it when `price` is null.
- [ ] Save bills in SQLite (offline first).
- [ ] Bluetooth thermal receipt printing (ESC/POS).
- [ ] Deploy backend (small VPS / Railway / Render) and make the API URL configurable.

## Phase 2: voice
- [ ] Mic button, Whisper on the server, send text to `/parse`.
- [ ] Add speech-recognition noise to the training data; test with real voices.

## Phase 3: model quality
- [ ] Review Punjabi spellings with a native speaker.
- [ ] Hand-written `Test_human.csv` (100-200 sentences) and measure.
- [ ] More products (ilachi, paneer, ...). Separator-less sentences.
- [ ] Intent classifier (undo, remove, total, confirm, cancel).

## Phase 4: data flywheel and growth
- [ ] Save sentence + confirmed bill locally, sync to cloud (PostgreSQL), retrain on real data.
- [ ] Website (Next.js) and desktop POS, shared TypeScript billing package.
