# Contributing

1. Branch from `main`: `git checkout -b feature/short-name`.
2. Keep changes small. Run `pytest nlu backend` before pushing.
3. Commit messages: short, present tense ("Add bill screen").
4. Open a pull request and describe what changed and how you tested it.
5. Do not commit secrets, `.env`, `node_modules`, or the 70 MB `Train.csv` (regenerate it instead).
6. Never put customer names, phone numbers, or other personal data in datasets or tests.
