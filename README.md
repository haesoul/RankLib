# 🏆 RankLib

> **Offline-first** React Native application for building custom ranking systems, evaluation frameworks, and leaderboards.

`RankLib` allows you to define custom weighted categories for any subject (TV shows, video games, anime, characters, books, etc.) and grade items both overall and against these specific categories.

---

## ✨ Key Features

- **Custom terminology and ranking frameworks (`ClassOfGrading`)**

- **Hierarchical category systems**:
  - Multi-tier category structure using **Categories** and **Subcategories**.

- **Granular item evaluation (`GradeObject`)**:
  - Independent scoring at both the category and subcategory levels.
  - **Notes (`Note`)**: Dedicated notes with image attachments and pinning functionality.
  - **Media Gallery (`MediaItem`)**: Embedded gallery supporting thumbnails, MIME types, and captions.
  - **Nested tags (`Tag`)**: Parent-child tag hierarchies for flexible filtering and classification.
  - **Rank tiers (`RankType`)**: Score threshold tiers with customizable color coding.

- **Offline-first architecture**:
  - Zero server dependency for core functionality. Powered by **Realm DB** for fast local storage and instant UI responsiveness.

---

## 🛠 Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **Database (Local)**: Realm DB (Embedded object database)
- **Backend (On hold)**: Python / Django

---

## 🚧 Project Status

The project is being developed in stages:

- **Frontend (`/frontend/`)**: **Active development**. The current priority is 100% completion of the client application and the local workflow.
- **Backend (`/backend/`)**: **Temporarily on hold**. Backend development is paused and will only resume after the frontend is fully completed.

---

## 🚀 Getting Started

### Option A: Pre-built APK (Quick Testing)

To quickly test the app on an Android device without building from source, download the latest `.apk` from the **[Releases](../../releases)** section of this repository.

1. Open the **Releases** page.
2. Download the `.apk` file from the latest release.
3. Transfer it to your Android device and install it.

> 💡 **Recommended for testing:** The pre-built APK is the easiest way to try RankLib without setting up the development environment.

---

### Option B: Running from Source

> ⚠️ **Important**: This app uses **Realm DB** (native C++ binaries). It **WILL NOT WORK in Expo Go**.
> If you are not actively developing or modifying native code, **just use the pre-built `.apk`** (Option A).

If you really want to build and run it yourself:

1. **Prerequisites**:

   * [Node.js](https://nodejs.org/) (LTS)
   * EAS CLI installed globally (`npm i -g eas-cli`) and an Expo account.
   * Android Studio / Xcode configured (for local native builds) OR an active EAS cloud build setup.

2. **Setup & Install**:

   ```bash
   cd frontend
   npm install
   ```

3. **Build Development Client** (Required for Realm):

   ```bash
   # Build APK for a physical device or cloud:
   eas build --platform android --profile development

   # Or run locally via Native CLI (requires Android Studio / Xcode):
   npx expo run:android
   # or
   npx expo run:ios
   ```

4. **Start Dev Server**:

   ```bash
   npx expo start --dev-client
   ```

```

3. **Build Development Client** (Required for Realm):
```bash
# Build APK for a physical device or cloud:
eas build --platform android --profile development

# Or run locally via Native CLI (requires Android Studio / Xcode):
npx expo run:android
# or
npx expo run:ios

```


4. **Start Dev Server**:
```bash
npx expo start --dev-client