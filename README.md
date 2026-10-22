# DocuSweep Android

DocuSweep scans a chosen date range in your Android photo library for likely notebook pages, documents, receipts, and text-heavy images using on-device Google ML Kit OCR. It does not upload photos. Every match must be reviewed by the user before requesting deletion.

## Build an installable APK using cloud build (phone-friendly)

This project includes `eas.json` with an Android APK preview profile. The cloud builder handles Android compilation, so you do not need Android Studio or an Android SDK installed on your phone.

1. Extract this ZIP into a cloud development environment such as GitHub Codespaces, or use a computer with Node.js.
2. Open a terminal in the `DocuSweepAndroid` project folder.
3. Install packages:
   ```bash
   npm install
   ```
4. Install the Expo Application Services CLI:
   ```bash
   npx eas-cli@latest login
   ```
   Sign in with your Expo account. If prompted to configure EAS for this project, run:
   ```bash
   npx eas-cli@latest build:configure
   ```
   Keep the existing `eas.json` preview profile. If Expo asks to link/create a project, follow its prompts.
5. Start a cloud Android APK build:
   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```
6. When the build finishes, open the build link Expo provides and download the APK to your Android phone. Allow installation from that download source if Android asks.

## Local build (computer with Android SDK)

```bash
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug`. The APK is normally created at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Notes

- Native ML Kit OCR requires a custom Android build; it will not run in standard Expo Go.
- OCR is a first-pass signal, not a perfect visual classifier. It can miss handwriting or flag unrelated images containing text.
- Android may show a system confirmation before deleting selected photos.
- Test first with unimportant sample photos. DocuSweep does not automatically delete scan results.
