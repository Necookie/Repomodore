# Repomodore 🐀🍅

> **Focus. Rep. Repeat.**

Repomodore is a mobile-first, cross-platform productivity timer that alternates deep, focused study sessions with intentional movement breaks. Built with a calm cream/peach minimalist aesthetic and guided by an encouraging white gym rat mascot in a gray hoodie, Repomodore makes physical well-being a natural companion to mental focus.

---

## ✨ Features

- **Dual Modes**:
  - **Study**: Pure focus timer (customizable 1–180 min, default 45 min) with zero distraction.
  - **Study + Squats**: 45-minute focus session followed immediately by a 5-minute movement break with a 10-squat goal. The 5 minutes serve as the full rest period.
- **Accurate Wall-Clock Timing**: Timing is anchored to absolute timestamps—backgrounding the app, sleeping the device, or refreshing never loses track of elapsed time or fabricates phantom cycles.
- **Privacy-First Authentication**: Powered by Clerk. Unauthenticated visitors are greeted by a clean welcome screen. Signed-in users default to 100% local-only storage.
- **Optional Turso Cloud Sync**: Transparent, opt-in cross-device synchronization with Turso libSQL. Users review exactly what is synced before enabling.
- **Offline Durability**: Full offline persistence using `expo-sqlite` on native (Android/iOS) and durable IndexedDB storage on the web behind a unified repository layer.
- **Per-User Isolation**: Local database records are strictly isolated by Clerk user ID, preventing data leakage across accounts on shared devices.
- **Data Sovereignty**: Complete JSON export, local history deletion, and explicit remote cloud data deletion with confirmation.
- **Accessible & Responsive**: Designed for 320px mobile viewports up to desktop widths, 44px+ touch targets, visible focus, screen reader announcements (TalkBack & VoiceOver), and reduced motion support.

---

## 🎨 Design System

Repomodore follows a warm, quiet study desk palette inspired by the design guide:

| Token | Hex | Usage |
|---|---|---|
| **Canvas** | `#FBF7F2` | Main application background |
| **Surface** | `#FFFFFF` | Cards, active panels, countdown center |
| **Ink** | `#20232A` | Primary typography and icons |
| **Muted** | `#687078` | Secondary labels, hints, timestamps |
| **Accent** | `#E86F61` | Primary coral action buttons, active rings |
| **Accent Soft** | `#FCE4DF` | Selection chips, progress tracks |
| **Border** | `#E9E2DD` | Subtle dividers and outlines |
| **Dark Panel** | `#25262C` | Auth hero card and contrast surfaces |

---

## 🏗️ Architecture & Tech Stack

- **Framework**: [Expo](https://expo.dev) SDK 52+ / React Native / React Native Web
- **Routing**: Expo Router (file-based navigation with native tabs)
- **Language**: TypeScript (strict mode)
- **Authentication**: [@clerk/clerk-expo](https://clerk.com/docs/expo/getting-started/quickstart) with `expo-secure-store`
- **Local Storage**: `expo-sqlite` (Native Android/iOS) & IndexedDB adapter (Web) behind a unified `ActivityRepository` interface
- **Cloud Sync**: Microservice TypeScript API powered by `@libsql/client` (Turso) and `@clerk/backend`
- **Testing**: Jest, React Native Testing Library, unit tests for timer state machine, storage scoping, and sync merge algorithms

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested on Node v24)
- npm or pnpm
- Clerk CLI (`npm install -g clerk`)
- Android Studio / Android Emulator (for native testing) or Chrome/Edge/Safari (for web)

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Necookie/Repomodore.git
   cd repomodore
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and populate your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Start the Sync API Server**:
   ```bash
   npm run server
   ```

5. **Start the Expo App**:
   ```bash
   npm run start
   ```
   - Press `w` to open in your web browser.
   - Press `a` to launch on a connected Android device or emulator.

---

## 🧪 Testing

```bash
# Run unit and integration tests
npm test

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint

# Export production web build
npm run build:web
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
