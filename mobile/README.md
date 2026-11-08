# Rozzy mobile app (Expo React Native + TypeScript)

This folder holds the app **source files only**. The Expo project itself is created by the developer
(so versions are always current):

```bash
# from the repo root
npx create-expo-app@latest mobile-app --template blank-typescript
cp -r mobile/src mobile-app/src          # our code
# in mobile-app/App.tsx:  import ParseScreen from "./src/screens/ParseScreen"; export default ParseScreen;
cd mobile-app && npx expo start
```

Once it works, move `mobile-app/*` into `mobile/` (keep `src/`) and delete `mobile-app/`. Commit it.

Set the backend address with `EXPO_PUBLIC_API_URL` (Android emulator default `http://10.0.2.2:8000`;
real phone: your PC's LAN IP). See `docs/ARCHITECTURE.md` for what to build next.
