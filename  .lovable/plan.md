# Multi-Platform Expansion Plan (Mobile + Desktop)

I am extending the existing Capacitor infrastructure to support Desktop (Windows, Mac, Linux) via Electron, while maintaining the Android/iOS capabilities. This allows us to target all platforms without rewriting in Flutter, preserving the current Glassmorphic React UI.

## Technical Details

### 1. Platform Infrastructure
- **Mobile**: Android and iOS projects are already initialized.
- **Desktop**: Added `@capacitor/electron`. This creates an `electron/` directory that wraps the web app for Windows, macOS, and Linux.

### 2. Cross-Platform Handling
- The codebase uses `Capacitor.isNativePlatform()` to detect when it's running inside a native shell.
- Unified handling for native features (Status Bar, Back Button, File System).

## Build Instructions

### Android / iOS
1. `npm run build`
2. `npx cap sync android` (or `ios`)
3. `npx cap open android` (to build APK in Android Studio)

### Desktop (Windows, Mac, Linux)
1. `npm run build`
2. `npx cap open electron`
3. To package for production, go to the `electron/` folder and run `npm run electron:make`.

## Why not Flutter?
Rewriting in Flutter would lose all existing logic and UI components. By using Capacitor + Electron, we get native apps for 5+ platforms while keeping the same high-performance React code.
