# API

Base URL (dev): `http://localhost:8000`   |   Interactive docs: `/docs`

## GET /health
`{"status": "ok", "model": "rozzy_nlu_model.joblib"}`

## POST /parse
Request: `{"text": "<1-2000 chars>"}`  (empty text => 422)

Response:

| Field | Type | Meaning |
|---|---|---|
| `language_guess` | `Roman_Urdu` \| `Roman_Punjabi` | hint only, do not use for decisions |
| `items[].product` | string | canonical name (`ata`, `cheeni`, `doodh`...) or `"unknown"` |
| `items[].qty` | number \| null | 2, 0.5, 2.5 ... |
| `items[].unit` | string \| null | `kg g L dozen piece packet pao chhatank seer mann ton` |
| `items[].price` | number \| null | the number the shopkeeper said |
| `items[].price_type` | `per_unit` \| `total` \| null | rate ("40 rupay kilo") or fixed amount ("50 rupee ki ilachi") |
| `items[].price_per` | string \| null | what a `per_unit` price is per (kg, dozen...) |
| `items[].qty_base` | `{value, unit}` \| null | qty in kg / L / piece / packet |
| `items[].unit_price` | `{value, per}` \| null | price of one base unit |
| `items[].line_total` | number \| null | total for this item |
| `items[].confidence` | 0..1 | product confidence |
| `items[].needs_review` | bool | **ask the user, do not add silently** |
| `needs_review` | bool | true if any item needs review or no item was found |

Examples:

| Sentence | Result |
|---|---|
| `2 ande 120 rupe dargen k hisab se` | anday, 2 piece, 120 per dozen, unit_price 10, line_total 20 |
| `10 kilo ata 160 rupee kilo k hisab se` | ata, 10 kg, line_total 1600 |
| `sawa kilo chai patti 600 rupaye kilo de hisab naal` | chai, 1.25 kg, line_total 750 |
| `50 rupee ki ilachi` | product `unknown`, price_type `total`, needs_review true (ilachi is not in the product list yet) |
