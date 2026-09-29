# Repomodore - Software Requirements Specification (SRS)

**Version:** 1.1 (Final Working MVP)  
**Date:** September 29, 2026  
**Status:** Implemented & Verified  

---

## 1. Purpose and System Boundary

This specification defines the functional, technical, and security requirements for the cross-platform Repomodore application across Android, Web, and iOS. Mobile is the design and release priority. 

Access requires authentication via Clerk. Local activity records are scoped strictly to the authenticated user ID and persist durably on-device (via `expo-sqlite` on native mobile and IndexedDB on web). Cloud synchronization with Turso (libSQL) is provided through a dedicated server-side TypeScript microservice that validates Clerk JWT session tokens on every request. Client bundles never hold Turso credentials or Clerk secret keys.

---

## 2. Actors and System Roles

1. **Unauthenticated Visitor**: Must sign in or register before entering the application. Sees the Welcome/Auth screen.
2. **Authenticated Local User**: Signed in via Clerk; operates with 100% on-device local storage. Cloud sync is disabled by default.
3. **Opt-in Sync User**: Explicitly enables Turso cloud synchronization in Settings after reviewing what data is stored.
4. **Sync API Microservice**: Standalone TypeScript service verifying Clerk JWT tokens and performing parameterized libSQL queries against Turso.

---

## 3. Functional Requirements

| ID | Requirement | Acceptance Condition |
|---|---|---|
| **FR-01** | Clerk Authentication Barrier | Unauthenticated users cannot access the timer. Must sign in via Google, GitHub, or Email/Password. |
| **FR-02** | Timer Mode Selection | Offers "Study" (focus only) and "Study + Squats" (focus + movement break). |
| **FR-03** | Configurable Durations & Targets | Focus (1–180 min, default 45m), Break (1–60 min, default 5m), Squat Goal (1–100 reps, default 10). |
| **FR-04** | Core Timer Controls | Start, Pause, Resume, Reset (with confirmation before discarding active progress). |
| **FR-05** | Study Mode Progression | At focus deadline, completes session, logs focus block, and lands in `ready_focus`. No movement break. |
| **FR-06** | Study + Squats Progression | At focus deadline, logs focus block and transitions into a 5-minute movement break with 10 squat goal. |
| **FR-07** | Movement Break Responses | "Done" logs goal reps once without ending break. "Skip" logs 0 reps. "Rest only" logs 0 reps. Reps cannot be double-counted. |
| **FR-08** | Early Break Completion | User can tap "End Break Early" to finish break immediately and prepare next focus block. |
| **FR-09** | Explicit Focus Initiation | Completed break transitions to `ready_focus`; next study cycle never starts automatically without explicit "Start". |
| **FR-10** | Wall-Clock Timing Precision | Countdown uses target epoch deadlines (`deadlineTimestamp`). Backgrounding/sleep restores exact remaining time. |
| **FR-11** | Local-First Offline Storage | Activity records, timer state, and user settings persist locally per user ID. Works offline with cached session. |
| **FR-12** | Multi-Account Isolation | Signing out or switching accounts isolates local data without silent deletion. Data is partition-scoped by `userId`. |
| **FR-13** | Transparent Opt-in Sync | Cloud sync to Turso requires explicit user activation in Settings. Unsynced changes remain safely queued locally. |
| **FR-14** | History & 7-Day Stats | Derives completed blocks, focus minutes, and squats in local calendar timezone days. |
| **FR-15** | Data Sovereignty & Deletion | Provides JSON data export, local history deletion, and remote Turso cloud deletion with confirmation. |

---

## 4. Timer State Machine

The timer is governed by six deterministic states:
- `idle_focus`: Ready to begin fresh focus block.
- `running_focus`: Focus countdown active with wall-clock deadline.
- `paused_focus`: Focus paused; remaining seconds frozen.
- `running_break`: Break countdown active with wall-clock deadline.
- `paused_break`: Break paused; remaining seconds frozen.
- `ready_focus`: Focus/break completed; awaiting deliberate user Start.

### Invariants:
1. **No Phantom Cycles**: If the app is suspended in the background for longer than the cycle duration, it resolves the elapsed phase, logs at most one completed session, and lands in `ready_focus`. It never fabricates recurring loops.
2. **Break Independence**: Resetting or aborting during a movement break does not delete the focus block already recorded at focus completion.
3. **Idempotent Reporting**: Break outcome is initially `pending`. Tapping "Done" records reps once. Repeated taps do not increment further.

---

## 5. Security & Synchronization Architecture

1. **Zero Client Secrets**: Client code holds only `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and the sync API URL. Turso credentials and Clerk Secret Key reside solely on the server.
2. **Token Verification**: Every request to `/api/sync/*` validates the `Authorization: Bearer <token>` using Clerk's `verifyToken`.
3. **Parameterized Scoping**: All database queries enforce `WHERE user_id = :userId`.
4. **Idempotent Reconciliation**:
   - Local and remote records use client-generated RFC4122 v4 UUIDs.
   - Upsert uses monotonic `updated_at` timestamps to resolve concurrent conflicts.
   - Deletions utilize tombstones (`deleted_at`) to prevent deleted records from reappearing across devices.
5. **Batch Limits**: Push batches are validated and restricted to a maximum of 100 activities per request.

---

## 6. Non-Functional Requirements

- **NFR-01 Accessibility**: VoiceOver, TalkBack, and web keyboard navigation supported. Tap targets >= 44px. Visible focus outlines and WCAG AA contrast.
- **NFR-02 Responsiveness**: Optimized for 320px mobile viewports through wide desktop screens.
- **NFR-03 Performance**: Countdown loop uses wall-clock timestamps; maximum foreground display error <= 1 second.
- **NFR-04 Privacy**: No health data or biometric sensor readings collected.
- **NFR-05 Durability**: Unsynced records remain preserved through network failures and application restarts.
