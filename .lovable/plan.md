# Plan: Mobile App Migration (Capacitor)

We will convert your existing React web application into a cross-platform mobile app using Capacitor. This approach is better than a pure React Native rewrite because it preserves your complex quiz logic, PDF generation, and glassmorphic UI while providing a native APK for Android and IPA for iOS.

## User Review Required

> [!IMPORTANT]
> To build a production APK, you will eventually need a local development environment with Android Studio installed. I will provide the code and the commands, but the final APK "bundling" happens on a machine with the Android SDK.

## Proposed Changes

### 1. Mobile Infrastructure
- Install Capacitor core and platforms (Android/iOS).
- Configure `capacitor.config.ts` with your app identity (`com.testsagar.app`).
- Add mobile-specific meta tags to `index.html` (viewport handling for notches).

### 2. Native Features Integration
- Implement `App` plugin for hardware back button handling (crucial for Android quizzes).
- Add `StatusBar` plugin to match your glassmorphic theme (transparent/colored status bar).
- Update `TncPdf.tsx` and `tncPdf.ts` to use Capacitor `Filesystem` and `Share` plugins so users can save/open PDFs directly on their phones.

### 3. Build & Export Workflow
- Create a `mobile:build` script that syncs the React build to the native platforms.
- Provide step-by-step terminal commands for generating the debug APK.

## Technical Details

- **Framework**: Capacitor 6.0 (Latest).
- **Plugins**: `@capacitor/android`, `@capacitor/ios`, `@capacitor/share`, `@capacitor/filesystem`, `@capacitor/status-bar`.
- **Handling Redirects**: We will ensure Supabase Auth works correctly within the `hostname` of the mobile app.

## Terminal Commands (Summary)

After implementation, you will run:
1. `npm install` (to get Capacitor)
2. `npm run build` (to build the web app)
3. `npx cap sync` (to push code to Android/iOS)
4. `npx cap open android` (to open in Android Studio and click "Build APK")
