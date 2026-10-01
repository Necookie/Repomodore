# Updating Repomodore on Your Mobile Phone

Repomodore is built to make updating the app on your mobile phone fast, seamless, and flexible.

---

## 3 Easy Methods to Update on Mobile

### Method 1: In-App 1-Tap Over-The-Air (OTA) Update (Fastest)

When you run Repomodore on your phone, you do not need to reinstall the app for UI, bug fixes, or feature updates.

1. Open **Settings** tab in Repomodore on your phone.
2. Scroll to the **Mobile App & Updates** section.
3. Tap **Check for Mobile Updates**.
4. If a newer bundle is available, tap **Restart & Apply Update Now**.
5. The app will reload immediately with the latest code and assets.

> **How it works**: Powered by `expo-updates`. On launch, Repomodore checks for published update bundles. When approved, it updates over the air without needing App Store or APK reinstalls.

---

### Method 2: Direct APK Download via GitHub Actions (Zero Local Setup)

Every commit to `main` triggers our automated GitHub Actions workflow to build the Android `.apk`.

1. On your phone's browser, open your GitHub repository:
   `https://github.com/Necookie/Repomodore`
2. Tap the **Actions** tab.
3. Tap the latest **Build Android Mobile APK** run.
4. Under **Artifacts**, tap **`repomodore-mobile-apk`** to download `app-debug.apk`.
5. Open the downloaded `.apk` file on your phone to update/install the app.

---

### Method 3: EAS Build & EAS Update (Cloud Delivery)

If you use EAS (Expo Application Services) with the configured `eas.json`:

#### Publish an instant OTA update:
```bash
npx eas update --channel preview --message "Integrate animated mascot and custom ringtones"
```
All connected mobile phones on the `preview` channel will receive this update on next app launch.

#### Build an installable APK via EAS cloud:
```bash
npx eas build -p android --profile preview
```
EAS builds a standalone APK that can be installed on any Android phone directly.

---

## Testing Locally via Expo Go / Metro

If pairing with your local development machine:

```bash
# Start Metro bundler with QR code
npx expo start -c
```

1. Open the **Expo Go** app on your Android or iOS device.
2. Scan the terminal QR code.
3. Code changes update in real time with Fast Refresh.
