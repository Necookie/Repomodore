# Repomodore Setup Guide

This guide covers setting up and running Repomodore locally and in production.

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the required keys:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: From your Clerk Dashboard -> API Keys.
- `CLERK_SECRET_KEY`: Server-side Clerk Secret Key for the sync microservice.
- `TURSO_DATABASE_URL`: Your Turso database endpoint (e.g. `libsql://repomodore-necookie.aws-ap-northeast-1.turso.io`).
- `TURSO_AUTH_TOKEN`: Your Turso authentication token (rotated and kept confidential).
- `EXPO_PUBLIC_SYNC_API_URL`: URL of the running sync service (defaults to `http://localhost:3001` in local dev).

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Sync API Server
```bash
npm run server
```

### 3. Run the Expo Application
```bash
npm run start
```
- Press `w` to run in web mode.
- Press `a` to run in Android emulator / connected Android device.

## Testing & Quality Gates
```bash
npm test          # Run unit and integration tests
npm run typecheck # Validate TypeScript types
npm run lint      # Check formatting and lint rules
npm run build:web # Verify production web bundle build
```
