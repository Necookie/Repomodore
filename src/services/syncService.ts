import { activityRepository } from '@/src/storage/ActivityRepository';
import { ActivityRecord, UserSettings } from '@/src/storage/schema';

const API_ORIGIN =
  process.env.EXPO_PUBLIC_SYNC_API_URL || 'http://localhost:3001';

export interface SyncResult {
  success: boolean;
  status: 'synced' | 'failed' | 'disabled';
  pushedCount: number;
  pulledCount: number;
  error?: string;
}

export async function syncNow(
  userId: string,
  getToken: () => Promise<string | null>
): Promise<SyncResult> {
  try {
    const settings = await activityRepository.getSettings(userId);
    if (!settings.syncEnabled) {
      return {
        success: true,
        status: 'disabled',
        pushedCount: 0,
        pulledCount: 0,
      };
    }

    const token = await getToken();
    if (!token) {
      return {
        success: false,
        status: 'failed',
        pushedCount: 0,
        pulledCount: 0,
        error: 'No active session token found. Please sign in.',
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Gather pending local records to push
    const pending = await activityRepository.getPendingSyncRecords(userId);
    let pushedCount = 0;

    if (pending.length > 0) {
      const pushRes = await fetch(`${API_ORIGIN}/api/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          activities: pending,
          settings,
        }),
      });

      if (!pushRes.ok) {
        throw new Error(`Sync push failed with status ${pushRes.status}`);
      }

      const pushData = await pushRes.json();
      const syncedIds: string[] = pushData.syncedIds ?? [];
      await activityRepository.markRecordsSynced(userId, syncedIds);
      pushedCount = syncedIds.length;
    }

    // 2. Pull remote updates
    const pullRes = await fetch(`${API_ORIGIN}/api/sync/pull`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        since: '1970-01-01T00:00:00.000Z',
      }),
    });

    let pulledCount = 0;
    if (pullRes.ok) {
      const pullData = await pullRes.json();
      const remoteActs: ActivityRecord[] = pullData.activities ?? [];
      await activityRepository.mergeRemoteRecords(userId, remoteActs);
      pulledCount = remoteActs.length;
    }

    return {
      success: true,
      status: 'synced',
      pushedCount,
      pulledCount,
    };
  } catch (err: any) {
    console.warn('[Sync Service] Sync failed:', err.message);
    return {
      success: false,
      status: 'failed',
      pushedCount: 0,
      pulledCount: 0,
      error: err.message,
    };
  }
}

export async function deleteRemoteData(
  userId: string,
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_ORIGIN}/api/sync/remote`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirm: true }),
    });

    if (!res.ok) {
      throw new Error(`Delete remote failed with status ${res.status}`);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
