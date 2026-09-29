import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth';
import { getDbClient } from '../db';

export const syncRouter = Router();

// Apply auth middleware to all sync endpoints
syncRouter.use(requireAuth);

/**
 * POST /api/sync/pull
 * Fetches remote activities and settings updated since client timestamp
 */
syncRouter.post('/pull', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const since = typeof req.body.since === 'string' ? req.body.since : '1970-01-01T00:00:00.000Z';
  const db = getDbClient();

  try {
    // Parameterized query scoped strictly to authenticated user
    const actResult = await db.execute({
      sql: `
        SELECT 
          id,
          user_id AS userId,
          mode,
          started_at AS startedAt,
          completed_at AS completedAt,
          focus_seconds AS focusSeconds,
          break_seconds AS breakSeconds,
          movement_label AS movementLabel,
          rep_goal AS repGoal,
          reported_reps AS reportedReps,
          break_outcome AS breakOutcome,
          updated_at AS updatedAt,
          deleted_at AS deletedAt
        FROM activities
        WHERE user_id = ? AND updated_at > ?
        ORDER BY updated_at ASC
        LIMIT 500;
      `,
      args: [userId, since],
    });

    const settingsResult = await db.execute({
      sql: `SELECT settings_json, updated_at FROM settings WHERE user_id = ?;`,
      args: [userId],
    });

    let remoteSettings = null;
    if (settingsResult.rows.length > 0) {
      try {
        remoteSettings = JSON.parse(settingsResult.rows[0].settings_json as string);
      } catch (e) {
        console.warn('Failed parsing settings JSON:', e);
      }
    }

    const activities = actResult.rows.map((row) => ({
      ...row,
      syncStatus: 'synced',
    }));

    return res.json({
      activities,
      settings: remoteSettings,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Sync Pull Error]:', err);
    return res.status(500).json({ error: 'Failed to pull sync records.' });
  }
});

/**
 * POST /api/sync/push
 * Uploads local activities and settings idempotently with batch limit
 */
syncRouter.post('/push', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { activities = [], settings } = req.body;

  // Enforce batch size limit
  if (!Array.isArray(activities) || activities.length > 100) {
    return res.status(400).json({ error: 'Batch size exceeds maximum limit of 100 activities.' });
  }

  const db = getDbClient();
  const syncedIds: string[] = [];
  const serverTimestamp = new Date().toISOString();

  try {
    for (const act of activities) {
      if (!act.id || typeof act.id !== 'string') continue;

      // Upsert using parameterized query with conflict resolution based on updated_at
      await db.execute({
        sql: `
          INSERT INTO activities (
            id, user_id, mode, started_at, completed_at, focus_seconds, break_seconds,
            movement_label, rep_goal, reported_reps, break_outcome, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            mode = excluded.mode,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            focus_seconds = excluded.focus_seconds,
            break_seconds = excluded.break_seconds,
            movement_label = excluded.movement_label,
            rep_goal = excluded.rep_goal,
            reported_reps = excluded.reported_reps,
            break_outcome = excluded.break_outcome,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
          WHERE activities.updated_at <= excluded.updated_at;
        `,
        args: [
          act.id,
          userId, // Scope strictly to authenticated user
          act.mode || 'study_squats',
          act.startedAt || serverTimestamp,
          act.completedAt || serverTimestamp,
          Number(act.focusSeconds) || 0,
          Number(act.breakSeconds) || 0,
          act.movementLabel || 'squats',
          Number(act.repGoal) || 10,
          Number(act.reportedReps) || 0,
          act.breakOutcome || 'pending',
          act.updatedAt || serverTimestamp,
          act.deletedAt || null,
        ],
      });

      syncedIds.push(act.id);
    }

    // Upsert settings if provided
    if (settings && typeof settings === 'object') {
      await db.execute({
        sql: `
          INSERT INTO settings (user_id, settings_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            settings_json = excluded.settings_json,
            updated_at = excluded.updated_at
          WHERE settings.updated_at <= excluded.updated_at;
        `,
        args: [
          userId,
          JSON.stringify(settings),
          settings.updatedAt || serverTimestamp,
        ],
      });
    }

    return res.json({
      syncedIds,
      serverTimestamp,
    });
  } catch (err: any) {
    console.error('[Sync Push Error]:', err);
    return res.status(500).json({ error: 'Failed to push sync records.' });
  }
});

/**
 * DELETE /api/sync/remote
 * Deletes remote records for authenticated user upon explicit confirmation
 */
syncRouter.delete('/remote', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { confirm } = req.body;
  if (confirm !== true) {
    return res.status(400).json({
      error: 'Explicit confirmation required. Send { confirm: true } in the request body.',
    });
  }

  const db = getDbClient();

  try {
    await db.execute({
      sql: `DELETE FROM activities WHERE user_id = ?;`,
      args: [userId],
    });

    await db.execute({
      sql: `DELETE FROM settings WHERE user_id = ?;`,
      args: [userId],
    });

    return res.json({
      success: true,
      message: 'All remote records have been deleted successfully from Turso.',
    });
  } catch (err: any) {
    console.error('[Sync Remote Deletion Error]:', err);
    return res.status(500).json({ error: 'Failed to delete remote records.' });
  }
});
