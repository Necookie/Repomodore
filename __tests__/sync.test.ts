import request from 'supertest';
import app from '../server/index';

// Set test environment
process.env.NODE_ENV = 'test';

describe('Sync API & Turso Endpoints', () => {
  it('responds with 200 on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('repomodore-sync-api');
  });

  it('rejects unauthenticated requests to /api/sync/pull', async () => {
    const res = await request(app).post('/api/sync/pull').send({});
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated requests to /api/sync/push', async () => {
    const res = await request(app).post('/api/sync/push').send({ activities: [] });
    expect(res.status).toBe(401);
  });

  it('rejects push exceeding 100 batch limit', async () => {
    const oversized = Array.from({ length: 101 }, (_, i) => ({
      id: `batch_${i}`,
      mode: 'study',
    }));

    const res = await request(app)
      .post('/api/sync/push')
      .set('x-test-user-id', 'test_user_sync_1')
      .send({ activities: oversized });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Batch size exceeds maximum limit');
  });

  it('pushes, pulls, and deletes remote activities idempotently for a user', async () => {
    const userId = 'test_user_sync_e2e';
    const testRecord = {
      id: 'sync_test_rec_1',
      userId,
      mode: 'study_squats',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      focusSeconds: 2700,
      breakSeconds: 300,
      movementLabel: 'squats',
      repGoal: 10,
      reportedReps: 10,
      breakOutcome: 'done',
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    // 1. Push
    const pushRes = await request(app)
      .post('/api/sync/push')
      .set('x-test-user-id', userId)
      .send({
        activities: [testRecord],
        settings: {
          userId,
          focusDurationSeconds: 2700,
          breakDurationSeconds: 300,
          repGoal: 10,
          soundEnabled: true,
          notificationsEnabled: false,
          syncEnabled: true,
          updatedAt: new Date().toISOString(),
        },
      });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.syncedIds).toContain('sync_test_rec_1');

    // 2. Pull
    const pullRes = await request(app)
      .post('/api/sync/pull')
      .set('x-test-user-id', userId)
      .send({ since: '1970-01-01T00:00:00.000Z' });

    expect(pullRes.status).toBe(200);
    expect(Array.isArray(pullRes.body.activities)).toBe(true);
    const found = pullRes.body.activities.find((a: any) => a.id === 'sync_test_rec_1');
    expect(found).toBeDefined();
    expect(found.userId).toBe(userId);

    // 3. Delete without confirm fails
    const badDeleteRes = await request(app)
      .delete('/api/sync/remote')
      .set('x-test-user-id', userId)
      .send({ confirm: false });
    expect(badDeleteRes.status).toBe(400);

    // 4. Delete with confirm succeeds
    const deleteRes = await request(app)
      .delete('/api/sync/remote')
      .set('x-test-user-id', userId)
      .send({ confirm: true });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 5. Verify records are gone
    const pullAfterDelete = await request(app)
      .post('/api/sync/pull')
      .set('x-test-user-id', userId)
      .send({ since: '1970-01-01T00:00:00.000Z' });
    expect(pullAfterDelete.body.activities.length).toBe(0);
  });
});
