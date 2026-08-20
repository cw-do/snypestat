# StatCam Hockey

Mobile-first, offline hockey shift-film and individual stat tracker for Android. Record the shifts that matter, bookmark live events, and review game development without taking your eyes off the ice.

The Android application ID and local storage namespace temporarily retain their legacy values so existing preview installations can update without losing local game data. They are not part of the StatCam Hockey product identity.

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

## Camera Shift Mode

Camera Shift Mode keeps the rear-camera preview visible behind large, translucent live controls.

- `START SHIFT + RECORD` starts shift timing and a rear-camera recording together.
- `END SHIFT` closes the shift immediately, then saves the video into app document storage.
- Events recorded during a filmed shift keep a video offset for one-tap review bookmarks.
- Native recording choices are `16:9 / 720p` and `4:3`; zoom stays within the device-supported normalized range.
- Camera, microphone, file saving, and video playback failures never discard shift or stat data.
- The app remains fully usable in Standard Mode without camera permissions.

Shift videos are local to the device and are not uploaded or synchronized.

## Penalty minutes

Games have a configurable default minor penalty of `1:30` or `2:00`. Live penalty presets include minor, double minor, major, misconduct, game misconduct, and major plus game misconduct. Review/Edit supports PIM correction in 30-second steps. PIM stores the official assessed duration rather than inferred time away from play.

## Checks

```powershell
npm run typecheck
npx expo-doctor
npx expo export --platform android
```
