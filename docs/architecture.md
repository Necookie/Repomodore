# Repomodore Architecture

Repomodore is structured as a cross-platform mobile-first Expo application with a dedicated server-side synchronization API.

```
                           +------------------------+
                           |  Clerk Auth Provider   |
                           +-----------+------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
         +-------------------+                   +-------------------+
         | Native (Android/  |                   |   Web Browser     |
         | iOS) App          |                   | (React Native Web)|
         +---------+---------+                   +---------+---------+
                   |                                       |
                   v                                       v
       +-----------------------+               +-----------------------+
       | expo-sqlite Storage   |               | IndexedDB Storage     |
       +-----------+-----------+               +-----------+-----------+
                   \                                       /
                    \                                     /
                     +-----------------+-----------------+
                                       |
                          Unified ActivityRepository
                                       | (Optional Opt-In Sync)
                                       v
                        +------------------------------+
                        |  Node.js Sync Microservice   |
                        |  (Clerk JWT Auth Validation) |
                        +--------------+---------------+
                                       |
                                       v
                        +------------------------------+
                        | Turso Database (libSQL cloud)|
                        +------------------------------+
```

## Key Architectural Principles

1. **Strict Client-Side Partitioning**:
   All activity records, preferences, and active timer states stored locally are scoped by `userId`. Unauthenticated guests do not enter the app. When accounts switch or sign out, data for each account remains isolated without silent deletion.

2. **Durable Local-First Repository**:
   - Native platforms use `expo-sqlite`.
   - Web uses durable IndexedDB.
   - The UI communicates only with the abstract `ActivityRepository` interface.

3. **Wall-Clock Timer Precision**:
   Timer state records the target end deadline (`deadlineTimestamp`) and total duration. When the app is backgrounded, device sleeps, or page reloads, remaining time is recomputed from the current wall-clock epoch time:
   `remainingSeconds = Math.max(0, Math.round((deadline - Date.now()) / 1000))`

4. **Zero-Trust Server-Side Cloud Sync**:
   - Clients never hold Turso credentials or Clerk secret keys.
   - The sync server verifies Clerk authorization headers on every call.
   - All queries are parameterized and scoped strictly to `user_id = :userId`.
   - Synchronization is idempotent using stable UUIDs and tombstones for deletions.
