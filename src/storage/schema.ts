export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface ActivityRecord {
  id: string; // stable UUID v4
  userId: string; // scoped to Clerk User ID
  mode: 'study' | 'study_squats';
  startedAt: string; // ISO 8601 UTC
  completedAt: string; // ISO 8601 UTC
  focusSeconds: number;
  breakSeconds: number;
  movementLabel: 'squats' | 'other' | 'rest_only';
  repGoal: number;
  reportedReps: number;
  breakOutcome: 'pending' | 'done' | 'skipped' | 'rest_only';
  syncStatus: SyncStatus;
  updatedAt: string; // ISO 8601 UTC
  deletedAt: string | null; // Tombstone for deletions
}

export interface UserSettings {
  userId: string;
  focusDurationSeconds: number;
  breakDurationSeconds: number;
  repGoal: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  syncEnabled: boolean;
  updatedAt: string;
}

export interface DailyStats {
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon", "Tue"
  focusBlocks: number;
  focusMinutes: number;
  reportedReps: number;
  skippedBreaks: number;
}

export const DEFAULT_USER_SETTINGS = (userId: string): UserSettings => ({
  userId,
  focusDurationSeconds: 45 * 60,
  breakDurationSeconds: 5 * 60,
  repGoal: 10,
  soundEnabled: true,
  notificationsEnabled: false,
  syncEnabled: false,
  updatedAt: new Date().toISOString(),
});

export function getLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}
