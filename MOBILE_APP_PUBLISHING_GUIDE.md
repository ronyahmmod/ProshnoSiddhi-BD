# Mobile App Publishing Guide (Flutter & React Native / Expo)
## ProshnoSiddhi & Uttoron BCS Preparation App

This guide provides end-to-end instructions for turning the platform into production mobile apps for **Android (Google Play Store)** and **iOS (Apple App Store)** using both **Flutter** and **React Native / Expo**.

---

## 📱 Option A: React Native / Expo (Recommended & Fastest)

Because the current web app is built in React + TypeScript + Tailwind CSS, you can reuse TypeScript logic, models, API interfaces, and state management seamlessly with React Native or Expo.

### Step 1: Initialize Expo Project
```bash
npx create-expo-app@latest proshnosiddhi-mobile --template blank-typescript
cd proshnosiddhi-mobile
```

### Step 2: Install Mobile Libraries
```bash
npx expo install @react-native-async-storage/async-storage react-native-safe-area-context react-native-screens react-native-svg expo-linear-gradient
npm install lucide-react-native katex react-native-katex
```

### Step 3: Connect to the Backend API
Set your production API base URL in `src/config.ts`:
```typescript
export const API_BASE_URL = 'https://ais-pre-c3ouz5k5b4ehinbg4yy6hp-365479616722.asia-southeast1.run.app';
```

### Step 4: Configure `app.json` for App Stores
```json
{
  "expo": {
    "name": "ProshnoSiddhi BCS Preparation",
    "slug": "proshnosiddhi-bcs",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#047857"
    },
    "android": {
      "package": "com.proshnosiddhi.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#047857"
      },
      "permissions": ["INTERNET"]
    },
    "ios": {
      "bundleIdentifier": "com.proshnosiddhi.app",
      "buildNumber": "1.0.0",
      "supportsTablet": true
    }
  }
}
```

### Step 5: Build and Publish with EAS Build
```bash
# Install EAS CLI
npm install -g eas-cli
eas login
eas build:configure

# Build Android App Bundle (.aab) for Google Play:
eas build --platform android --profile production

# Build iOS Archive (.ipa) for App Store:
eas build --platform ios --profile production

# Submit directly to Google Play Store & Apple TestFlight / App Store:
eas submit --platform android
eas submit --platform ios
```

---

## 🎯 Option B: Flutter (High-Performance Native Engine)

Flutter is an ideal choice for high performance, offline SQLite databases, and smooth animations.

### Step 1: Initialize Flutter Project
```bash
flutter create --org com.proshnosiddhi proshnosiddhi_app
cd proshnosiddhi_app
```

### Step 2: Add Essential Dependencies (`pubspec.yaml`)
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  flutter_math_fork: ^0.7.2     # High-performance LaTeX and math rendering
  shared_preferences: ^2.2.2
  provider: ^6.1.1
  google_fonts: ^6.1.0
  cached_network_image: ^3.3.1
  flutter_staggered_animations: ^1.1.1
  lottie: ^3.1.0
```

### Step 3: Math Formula Rendering in Flutter
Use `flutter_math_fork` to render math, LaTeX, and Bengali exam equations:
```dart
import 'package:flutter_math_fork/flutter_math.dart';

Widget renderMathQuestion(String rawText) {
  // If LaTeX enclosed in $ or $$
  if (rawText.contains(r'$')) {
    return Math.tex(
      rawText.replaceAll(r'$', ''),
      textStyle: TextStyle(fontSize: 16, color: Colors.black87),
    );
  }
  return Text(rawText, style: TextStyle(fontSize: 16));
}
```

### Step 4: Build for Android (Google Play Store)
1. **Configure Signing Keystore**:
```bash
keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
2. **Configure `android/key.properties`**:
```properties
storePassword=YourKeystorePassword
keyPassword=YourKeyPassword
keyAlias=upload
storeFile=upload-keystore.jks
```
3. **Build Android App Bundle (.aab)**:
```bash
flutter build appbundle --release
```
Your release bundle will be generated at:
`build/app/outputs/bundle/release/app-release.aab`

Upload this file to **Google Play Console** -> **Production** / **Internal Testing**.

### Step 5: Build for iOS (Apple App Store)
1. Open `ios/Runner.xcworkspace` in Xcode.
2. In **Signing & Capabilities**, select your **Apple Developer Team** and Bundle Identifier (`com.proshnosiddhi.app`).
3. Build the release archive:
```bash
flutter build ipa --release
```
4. Upload to **App Store Connect** using **Xcode Organizer** or **Transporter App**.

---

## 📋 App Store Checklist Before Submission

1. **Google Play Store**:
   - Google Play Developer Account ($25 one-time fee).
   - App Icon (512x512 PNG, 32-bit).
   - Feature Graphic (1024x500 PNG).
   - At least 4 phone screenshots (1080x1920 or 1080x2400).
   - Privacy Policy URL.
   - Content Rating Questionnaire (Educational / Reference).

2. **Apple App Store**:
   - Apple Developer Program ($99/year).
   - App Icons (1024x1024 without alpha transparency).
   - iPhone 6.7" and 6.5" screenshots.
   - iPad Pro screenshots (if tablet support enabled).
   - Age Rating & Privacy Policy URL.
   - In-App Purchase setup if enabling SSLCommerz / Apple Pay Pro subscription.
