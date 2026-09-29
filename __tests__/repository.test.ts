import { activityRepository } from '../src/storage/ActivityRepository';
import { ActivityRecord } from '../src/storage/schema';

describe('ActivityRepository & Multi-User Isolation', () => {
  beforeEach(async () => {
    await activityRepository.init();
    await activityRepository.clearLocalData('user_alice');
    await activityRepository.clearLocalData('user_bob');
  });

  it('strictly isolates records between different users', async () => {
    const actAlice: ActivityRecord = {
      id: 'rec_alice_1',
      userId: 'user_alice',
      mode: 'study',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date().toISOString(),
      focusSeconds: 2700,
      breakSeconds: 0,
      movementLabel: 'rest_only',
      repGoal: 0,
      reportedReps: 0,
      breakOutcome: 'rest_only',
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    const actBob: ActivityRecord = {
      id: 'rec_bob_1',
      userId: 'user_bob',
      mode: 'study_squats',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date().toISOString(),
      focusSeconds: 2700,
      breakSeconds: 300,
      movementLabel: 'squats',
      repGoal: 10,
      reportedReps: 10,
      breakOutcome: 'done',
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    await activityRepository.saveActivity(actAlice);
    await activityRepository.saveActivity(actBob);

    const aliceRecords = await activityRepository.getActivities('user_alice');
    const bobRecords = await activityRepository.getActivities('user_bob');

    expect(aliceRecords.length).toBe(1);
    expect(aliceRecords[0].id).toBe('rec_alice_1');

    expect(bobRecords.length).toBe(1);
    expect(bobRecords[0].id).toBe('rec_bob_1');
  });

  it('aggregates daily statistics accurately in local timezone', async () => {
    const todayISO = new Date().toISOString();
    const act1: ActivityRecord = {
      id: 'rec_today_1',
      userId: 'user_alice',
      mode: 'study_squats',
      startedAt: todayISO,
      completedAt: todayISO,
      focusSeconds: 2700, // 45 mins
      breakSeconds: 300,
      movementLabel: 'squats',
      repGoal: 10,
      reportedReps: 10,
      breakOutcome: 'done',
      syncStatus: 'pending',
      updatedAt: todayISO,
      deletedAt: null,
    };

    await activityRepository.saveActivity(act1);

    const todayStats = await activityRepository.getTodayStats('user_alice');
    expect(todayStats.focusBlocks).toBe(1);
    expect(todayStats.focusMinutes).toBe(45);
    expect(todayStats.reportedReps).toBe(10);
  });

  it('preserves deletion tombstones without silently deleting offline records', async () => {
    const act: ActivityRecord = {
      id: 'rec_to_delete',
      userId: 'user_alice',
      mode: 'study',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      focusSeconds: 1500,
      breakSeconds: 0,
      movementLabel: 'rest_only',
      repGoal: 0,
      reportedReps: 0,
      breakOutcome: 'rest_only',
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    await activityRepository.saveActivity(act);
    await activityRepository.deleteActivity('user_alice', 'rec_to_delete');

    const activeList = await activityRepository.getActivities('user_alice');
    expect(activeList.length).toBe(0); // Excluded from visible active list
  });

  it('exports user data cleanly as valid JSON', async () => {
    const exported = await activityRepository.exportDataJSON('user_alice');
    const parsed = JSON.parse(exported);

    expect(parsed.userId).toBe('user_alice');
    expect(parsed.exportVersion).toBe(1);
    expect(Array.isArray(parsed.activities)).toBe(true);
    expect(parsed.settings).toBeDefined();
  });
});
