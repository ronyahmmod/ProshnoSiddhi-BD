# ProshnoSiddhi BD Mobile App (React Native Client)

This directory contains the **React Native / Expo** mobile client for **ProshnoSiddhi BD (প্রশ্নসিদ্ধি)**.

## 🚀 Mobile App Capabilities
- **Candidate Dashboard**: Track XP, daily streak days, and target exam progress.
- **Searchable Question Bank**: Explore BCS past questions (10th-45th) and subject categories with Bengali solutions.
- **Exam Mode Quiz Runner**: Strict exam environment with zero answer leaks during testing, real-time timer, and post-exam performance breakdowns.
- **Performance Analytics**: View accuracy by subject, speed stats, and score histories.
- **Live Cloud Sync**: Connects to the cloud backend API.

---

## 📱 How to Run Instantly on Your Phone (Expo Go)

### 1. Prerequisites
Ensure you have Node.js (v18+) installed on your machine.

### 2. Navigate to `/mobile` and install packages
```bash
cd mobile
npm install
```

### 3. Start Expo Dev Server
```bash
npx expo start
```

### 4. Open on iOS / Android
- **On Physical Phone**: Install **Expo Go** from Google Play Store (Android) or App Store (iOS). Open Expo Go and scan the QR code printed in your terminal.
- **On Android Emulator**: Press `a` in the terminal.
- **On iOS Simulator**: Press `i` in the terminal (Mac only).

---

## 📦 Building Standalone APK / AAB for Android (Google Play)

EAS (Expo Application Services) compiles mobile binaries in the cloud without requiring Android Studio or Mac hardware.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to your Expo account (Free)
```bash
eas login
```

### Step 3: Build Standalone Direct-Install Android APK (Preview)
This generates an `.apk` file that you can install directly on any Android device or share with testers:
```bash
cd mobile
eas build -p android --profile preview
```

### Step 4: Build Production Google Play Store App Bundle (.aab)
This generates an `.aab` bundle ready for submission on the Google Play Console:
```bash
eas build -p android --profile production
```

---

## 🍎 Building for Apple iOS & TestFlight

### Step 1: Build iOS IPA for TestFlight
```bash
cd mobile
eas build -p ios --profile production
```
*(EAS will automatically ask for your Apple Developer account credentials, handle certificates, and upload the build to App Store Connect / TestFlight).*

---

## ⚙️ Backend API Configuration

The mobile client connects to your live Cloud Run API backend in `mobile/src/api.ts`:
```ts
const BASE_URL = 'https://ais-pre-c3ouz5k5b4ehinbg4yy6hp-365479616722.asia-southeast1.run.app/api';
```
For local machine emulator testing, you can change `BASE_URL` to:
- Android Emulator: `http://10.0.2.2:3000/api`
- iOS Simulator: `http://localhost:3000/api`
- Physical Phone over LAN: `http://<your-computer-local-ip>:3000/api`

