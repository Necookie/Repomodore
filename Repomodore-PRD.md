# Repomodore - Product Requirements Document (PRD)

**Version:** 1.1 (Final Working MVP)  
**Date:** September 29, 2026  
**Status:** Implemented & Verified  
**Brand Promise:** Focus. Rep. Repeat.

---

## 1. Product Summary

Repomodore is a mobile-first, cross-platform productivity application designed for desk-bound students, programmers, and professionals. It pairs deep, focused study sessions with intentional bodyweight movement breaks. Guided by an encouraging mascot—a white gym rat wearing round black glasses, a gray hoodie, with a laptop and dumbbell—Repomodore makes physical movement a seamless, guilt-free companion to intellectual focus.

---

## 2. Overriding Core Decisions & Boundary Rules

1. **Platform Release Priority**:
   - Android and Web are fully implemented and verified.
   - iOS shared code compatibility is maintained within the single Expo project.
   - Mobile viewport, touch targets (>=44px), and accessibility (VoiceOver/TalkBack) take priority.

2. **Authentication Architecture**:
   - Authentication is **required** to enter the app. Unauthenticated visitors are presented with a clean, focused Welcome/Auth screen.
   - Powered by Clerk (`@clerk/clerk-expo`).
   - Authenticated sessions default strictly to **100% local-only storage**. Signing in does **not** silently enable cloud sync or upload personal activity data.
   - Initial sign-in requires network connectivity; once authenticated, the cached session continues to work fully offline.

3. **Optional Turso Cloud Sync**:
   - Cloud synchronization with Turso (libSQL) is strictly **opt-in** from the Settings screen.
   - Users review an explicit disclosure of what is uploaded before enabling.
   - Disabling sync stops remote writes while preserving local records.
   - Server-side TypeScript API validates Clerk JWT identity on every request. Client bundles never contain database credentials or secrets.

4. **Dual Timer Modes**:
   - **Study**: Single focus phase (1–180 minutes, default 45 min). No movement phase is scheduled.
   - **Study + Squats**: Default 45-minute focus session followed immediately by a 5-minute movement break with a 10-squat goal.
   - The 5 minutes represent the **full rest period**, not extra time after squats.
   - Marking "Done" records the goal reps once and leaves the rest timer running. Tapping Done multiple times does not double count.
   - Marking "Skip" records zero reps while rest countdown continues.
   - Gentle alternative options include "Other gentle movement" or "Rest only".
   - The next focus block requires an explicit user "Start"—no surprise timers.

---

## 3. Core Screens & User Flow

### 3.1 Welcome & Auth Screen
- Appears whenever no valid user session is detected.
- Features the dark hero aesthetic (`#25262C`), mascot avatar, and brand typography.
- Offers Google OAuth, GitHub OAuth, and email/password authentication with verification code support.
- Communicates that the app operates offline once signed in.

### 3.2 Timer Screen (Main Home)
- Segmented mode toggle: "Study" vs "Study + Squats".
- Oversized circular progress ring (`CircularProgressRing`) with tabular countdown numerals (`45:00`).
- Dominant coral button for Start / Pause / Resume.
- Secondary Reset button with confirmation to discard active sessions.
- In Combined mode: Next-up card displaying squat mascot and "Next: 10 squats / 5 min movement break".
- Compact summary card displaying today's completed blocks, squats, and focus minutes.

### 3.3 Movement Break Screen
- Displays cheerful squatting mascot and large rep counter (`0 / 10`).
- Action buttons: "I did my 10 squats" (Done once), "Skip", and "Rest Only".
- Circular rest countdown ring showing remaining break time.
- Secondary action: "End Break Early" to transition immediately to ready focus.

### 3.4 History Screen
- Summary statistics cards: Total Repomodoros, Total Squats, Total Focus Time, and Skipped Breaks.
- 7-day focus chart with labeled columns and numerical minute totals (Mon–Sun).
- Chronological list of completed sessions with local timestamps.

### 3.5 Settings Screen
- Steppers for Focus Duration (1–180 min), Break Duration (1–60 min), and Squat Target (1–100 reps).
- Sound effects and platform notifications toggles.
- Account control panel displaying avatar, email, and safe sign-out.
- Data location selector: "On this device" vs "Sync across devices".
- Cloud sync status indicators: "Saved on this device", "Syncing", "Synced", "Sync needs retry".
- Data sovereignty actions: JSON export, Clear Local Data, and Delete Remote Data.

---

## 4. Non-Functional & Quality Standards

- **Timing Accuracy**: Anchored to wall-clock epoch timestamps (`deadlineTimestamp`). Backgrounding or device sleep recomputes elapsed time accurately. Never fabricates phantom cycles.
- **Accessibility**: Tap targets at least 44px high. Full TalkBack/VoiceOver labels, visible focus states on web, and WCAG AA contrast.
- **Privacy & Security**: Zero health biometric collection. No claims of automatic squat detection. All records scoped strictly to Clerk user ID.
