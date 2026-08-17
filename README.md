# SNYPE Stat

Mobile-first, offline hockey shift and individual stat tracker for Android. This repository is a new app; `../snypemobile` was used only as visual reference.

## Run on Android

Requirements: Node.js, Android Studio/SDK, and either an Android emulator or a USB-connected device with debugging enabled.

```powershell
npm install
npm run android
```

For Expo Go during UI development:

```powershell
npm start
```

Then scan the QR code or press `a` to open an available Android emulator.

## Prototype workflow

1. Create a player profile.
2. Create a game and select period settings.
3. Tap the game clock to start or pause it.
4. Start a shift and record quick events.
5. End shifts, move to the next period, and end the game.
6. Review automatically calculated TOI, shift, and event totals.

All app data is stored locally with AsyncStorage. Game clock values are stored as integer seconds; shifts and events retain game-clock and wall-clock context.

## Checks

```powershell
npm run typecheck
npx expo-doctor
npx expo export --platform android
```
