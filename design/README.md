# Rozzy design

## Phase 1 screens (11 screens, light theme)

Preview images are in `design/phase1/png/` (390 x 844, phone size). Static HTML of each screen is in `design/phase1/html/`
(open the file in a browser; width 390px). Logos: `design/phase1/assets/rozzy-logo.png` (navy square tile, used in the app screens) and `design/phase1/assets/rozzy-logo-full.png` (full-size logo on white).

| # | Screen | Image |
|---|---|---|
| 1 | Splash | `png/Main.png` |
| 2 | Login (phone + OTP) | `png/Login.png` |
| 3 | Shop setup | `png/Setup.png` |
| 4 | Home | `png/Home.png` |
| 4b | Voice assistant ("Rozzy AI", Siri-style orb) | `png/Voice.png` |
| 5 | New Bill (with a `needs_review` item) | `png/Bill.png` |
| 6 | Item edit (bottom sheet) | `png/ItemEdit.png` |
| 7 | Bill complete (receipt that scrolls; payment + Print/Share stay at the bottom) | `png/Done.png` |
| 8 | Products | `png/Products.png` |
| 8b | Add product | `png/AddProduct.png` |
| 9 | Settings | `png/Settings.png` |

`design/phase1/canvas-source/` holds the original `.dc.html` files from the Claude Design canvas (for re-importing).

## Look and feel

Light theme. Violet `#7B2CF5` (main buttons), magenta `#E81EC8`, coral `#F03E5A`, orange `#FFA13B` (warnings / `needs_review`),
ink `#14123A`, background `#F7F5FF`, navy `#02002F` (logo tile). Fonts: Poppins (headings), Inter (text).
Radius 12-20 px, touch targets at least 44 px.

## Notes for the developer

- Phase 2 screens (Bills history, Udhaar, Reports, Stock, Voice tutorial, Sync) are on the design canvas but not exported here yet.
- The Voice screen is static. The waveform and rings should animate while listening.
- "Hey Rozzy" always-on listening is hard on Android (background mic, battery, permissions). Start with opening the Voice screen from the mic button; add the wake word later.
- All numbers and customer names in the screens are sample data.
