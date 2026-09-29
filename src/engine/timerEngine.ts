export type TimerMode = 'study' | 'study_squats';

export type TimerState =
  | 'idle_focus'
  | 'running_focus'
  | 'paused_focus'
  | 'running_break'
  | 'paused_break'
  | 'ready_focus';

export type BreakOutcome = 'pending' | 'done' | 'skipped' | 'rest_only';

export type MovementLabel = 'squats' | 'other' | 'rest_only';

export interface TimerConfig {
  focusDurationSeconds: number; // 60 to 180 * 60 (default 45 * 60)
  breakDurationSeconds: number; // 60 to 60 * 60 (default 5 * 60)
  repGoal: number; // 1 to 100 (default 10)
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_CONFIG: TimerConfig = {
  focusDurationSeconds: 45 * 60,
  breakDurationSeconds: 5 * 60,
  repGoal: 10,
  soundEnabled: true,
  notificationsEnabled: false,
};

export interface CompletedActivityEvent {
  id: string;
  mode: TimerMode;
  startedAt: string;
  completedAt: string;
  focusSeconds: number;
  breakSeconds: number;
  movementLabel: MovementLabel;
  repGoal: number;
  reportedReps: number;
  breakOutcome: BreakOutcome;
}

export interface TimerSnapshot {
  state: TimerState;
  mode: TimerMode;
  remainingSeconds: number;
  totalSeconds: number;
  deadlineTimestamp: number | null; // epoch ms
  startedAt: string | null;
  repGoal: number;
  reportedReps: number;
  breakOutcome: BreakOutcome;
  movementLabel: MovementLabel;
  activeRecordId: string | null;
}

function generateUUID(): string {
  // Simple RFC4122 v4 UUID generator for cross-platform stability
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createInitialSnapshot(
  mode: TimerMode = 'study_squats',
  config: TimerConfig = DEFAULT_CONFIG
): TimerSnapshot {
  return {
    state: 'idle_focus',
    mode,
    remainingSeconds: config.focusDurationSeconds,
    totalSeconds: config.focusDurationSeconds,
    deadlineTimestamp: null,
    startedAt: null,
    repGoal: config.repGoal,
    reportedReps: 0,
    breakOutcome: 'pending',
    movementLabel: 'squats',
    activeRecordId: null,
  };
}

export function calculateRemainingSeconds(
  deadlineTimestamp: number | null,
  fallbackRemaining: number,
  now: number = Date.now()
): number {
  if (deadlineTimestamp === null) {
    return Math.max(0, fallbackRemaining);
  }
  const diffMs = deadlineTimestamp - now;
  return Math.max(0, Math.round(diffMs / 1000));
}

export function startFocus(
  current: TimerSnapshot,
  config: TimerConfig,
  now: number = Date.now()
): TimerSnapshot {
  const duration = config.focusDurationSeconds;
  return {
    ...current,
    state: 'running_focus',
    remainingSeconds: duration,
    totalSeconds: duration,
    deadlineTimestamp: now + duration * 1000,
    startedAt: new Date(now).toISOString(),
    repGoal: config.repGoal,
    reportedReps: 0,
    breakOutcome: 'pending',
    movementLabel: 'squats',
    activeRecordId: generateUUID(),
  };
}

export function pauseTimer(
  current: TimerSnapshot,
  now: number = Date.now()
): TimerSnapshot {
  if (current.state !== 'running_focus' && current.state !== 'running_break') {
    return current;
  }
  const remaining = calculateRemainingSeconds(current.deadlineTimestamp, current.remainingSeconds, now);
  const nextState: TimerState = current.state === 'running_focus' ? 'paused_focus' : 'paused_break';

  return {
    ...current,
    state: nextState,
    remainingSeconds: remaining,
    deadlineTimestamp: null,
  };
}

export function resumeTimer(
  current: TimerSnapshot,
  now: number = Date.now()
): TimerSnapshot {
  if (current.state !== 'paused_focus' && current.state !== 'paused_break') {
    return current;
  }
  const nextState: TimerState = current.state === 'paused_focus' ? 'running_focus' : 'running_break';
  const remaining = Math.max(1, current.remainingSeconds);

  return {
    ...current,
    state: nextState,
    remainingSeconds: remaining,
    deadlineTimestamp: now + remaining * 1000,
  };
}

export function resetTimer(
  current: TimerSnapshot,
  config: TimerConfig
): TimerSnapshot {
  return createInitialSnapshot(current.mode, config);
}

export function recordBreakResponse(
  current: TimerSnapshot,
  action: 'done' | 'skip' | 'other' | 'rest_only',
  otherMovementName?: string
): TimerSnapshot {
  // Only allow updating response once or transitioning while break is active
  if (current.state !== 'running_break' && current.state !== 'paused_break') {
    return current;
  }

  // Prevent duplicate taps if already reported
  if (current.breakOutcome !== 'pending') {
    return current;
  }

  switch (action) {
    case 'done':
      return {
        ...current,
        breakOutcome: 'done',
        reportedReps: current.repGoal,
        movementLabel: 'squats',
      };
    case 'skip':
      return {
        ...current,
        breakOutcome: 'skipped',
        reportedReps: 0,
        movementLabel: 'squats',
      };
    case 'rest_only':
      return {
        ...current,
        breakOutcome: 'rest_only',
        reportedReps: 0,
        movementLabel: 'rest_only',
      };
    case 'other':
      return {
        ...current,
        breakOutcome: 'done',
        reportedReps: current.repGoal,
        movementLabel: 'other',
      };
    default:
      return current;
  }
}

export function endBreakEarly(
  current: TimerSnapshot,
  now: number = Date.now()
): { snapshot: TimerSnapshot; completedActivity: CompletedActivityEvent | null } {
  if (current.state !== 'running_break' && current.state !== 'paused_break') {
    return { snapshot: current, completedActivity: null };
  }

  const completedAt = new Date(now).toISOString();
  const outcome: BreakOutcome = current.breakOutcome === 'pending' ? 'skipped' : current.breakOutcome;
  const reportedReps = outcome === 'done' ? current.repGoal : 0;

  const activity: CompletedActivityEvent | null = current.activeRecordId
    ? {
        id: current.activeRecordId,
        mode: current.mode,
        startedAt: current.startedAt || completedAt,
        completedAt,
        focusSeconds: current.totalSeconds, // focus was completed
        breakSeconds: current.totalSeconds - current.remainingSeconds,
        movementLabel: current.movementLabel,
        repGoal: current.repGoal,
        reportedReps,
        breakOutcome: outcome,
      }
    : null;

  return {
    snapshot: {
      ...current,
      state: 'ready_focus',
      remainingSeconds: 0,
      deadlineTimestamp: null,
      breakOutcome: outcome,
      reportedReps,
    },
    completedActivity: activity,
  };
}

export interface TickResult {
  snapshot: TimerSnapshot;
  completedActivity: CompletedActivityEvent | null;
  phaseCompleted: 'focus' | 'break' | null;
}

export function tickTimer(
  current: TimerSnapshot,
  config: TimerConfig,
  now: number = Date.now()
): TickResult {
  if (current.state !== 'running_focus' && current.state !== 'running_break') {
    return { snapshot: current, completedActivity: null, phaseCompleted: null };
  }

  const remaining = calculateRemainingSeconds(current.deadlineTimestamp, current.remainingSeconds, now);

  if (remaining > 0) {
    return {
      snapshot: { ...current, remainingSeconds: remaining },
      completedActivity: null,
      phaseCompleted: null,
    };
  }

  // Phase expired!
  const completedAt = new Date(now).toISOString();

  if (current.state === 'running_focus') {
    if (current.mode === 'study') {
      // Study mode: Focus completed -> ready_focus (no break)
      const activity: CompletedActivityEvent = {
        id: current.activeRecordId || generateUUID(),
        mode: 'study',
        startedAt: current.startedAt || completedAt,
        completedAt,
        focusSeconds: config.focusDurationSeconds,
        breakSeconds: 0,
        movementLabel: 'rest_only',
        repGoal: 0,
        reportedReps: 0,
        breakOutcome: 'rest_only',
      };

      return {
        snapshot: {
          ...current,
          state: 'ready_focus',
          remainingSeconds: 0,
          deadlineTimestamp: null,
        },
        completedActivity: activity,
        phaseCompleted: 'focus',
      };
    } else {
      // Study + Squats mode: Focus completed -> transition to running_break
      const breakDuration = config.breakDurationSeconds;
      return {
        snapshot: {
          ...current,
          state: 'running_break',
          remainingSeconds: breakDuration,
          totalSeconds: breakDuration,
          deadlineTimestamp: now + breakDuration * 1000,
          breakOutcome: 'pending',
          reportedReps: 0,
        },
        completedActivity: null, // Full record emitted at break completion or updated
        phaseCompleted: 'focus',
      };
    }
  }

  if (current.state === 'running_break') {
    // Break expired!
    const outcome: BreakOutcome = current.breakOutcome === 'pending' ? 'skipped' : current.breakOutcome;
    const reportedReps = outcome === 'done' ? current.repGoal : 0;

    const activity: CompletedActivityEvent = {
      id: current.activeRecordId || generateUUID(),
      mode: 'study_squats',
      startedAt: current.startedAt || completedAt,
      completedAt,
      focusSeconds: config.focusDurationSeconds,
      breakSeconds: config.breakDurationSeconds,
      movementLabel: current.movementLabel,
      repGoal: current.repGoal,
      reportedReps,
      breakOutcome: outcome,
    };

    return {
      snapshot: {
        ...current,
        state: 'ready_focus',
        remainingSeconds: 0,
        deadlineTimestamp: null,
        breakOutcome: outcome,
        reportedReps,
      },
      completedActivity: activity,
      phaseCompleted: 'break',
    };
  }

  return { snapshot: current, completedActivity: null, phaseCompleted: null };
}

export function restoreTimerState(
  persisted: TimerSnapshot,
  config: TimerConfig,
  now: number = Date.now()
): { snapshot: TimerSnapshot; completedActivity: CompletedActivityEvent | null } {
  // If timer was paused or idle, just return persisted state with recomputed bounds
  if (persisted.state !== 'running_focus' && persisted.state !== 'running_break') {
    return { snapshot: persisted, completedActivity: null };
  }

  if (!persisted.deadlineTimestamp) {
    return { snapshot: persisted, completedActivity: null };
  }

  const remaining = calculateRemainingSeconds(persisted.deadlineTimestamp, persisted.remainingSeconds, now);
  if (remaining > 0) {
    return {
      snapshot: { ...persisted, remainingSeconds: remaining },
      completedActivity: null,
    };
  }

  // Timer expired while away!
  // Determine if it was running_focus or running_break
  const completedAt = new Date(persisted.deadlineTimestamp).toISOString();

  if (persisted.state === 'running_focus') {
    if (persisted.mode === 'study') {
      const activity: CompletedActivityEvent = {
        id: persisted.activeRecordId || generateUUID(),
        mode: 'study',
        startedAt: persisted.startedAt || completedAt,
        completedAt,
        focusSeconds: config.focusDurationSeconds,
        breakSeconds: 0,
        movementLabel: 'rest_only',
        repGoal: 0,
        reportedReps: 0,
        breakOutcome: 'rest_only',
      };
      return {
        snapshot: {
          ...persisted,
          state: 'ready_focus',
          remainingSeconds: 0,
          deadlineTimestamp: null,
        },
        completedActivity: activity,
      };
    } else {
      // In Study + Squats, focus ended at deadlineTimestamp.
      // Check if break window is also past:
      const breakDeadline = persisted.deadlineTimestamp + config.breakDurationSeconds * 1000;
      if (now < breakDeadline) {
        // Break is still running!
        const breakRemaining = Math.round((breakDeadline - now) / 1000);
        return {
          snapshot: {
            ...persisted,
            state: 'running_break',
            remainingSeconds: breakRemaining,
            totalSeconds: config.breakDurationSeconds,
            deadlineTimestamp: breakDeadline,
            breakOutcome: 'pending',
            reportedReps: 0,
          },
          completedActivity: null,
        };
      } else {
        // Both focus and break expired while away. Never fabricate repeated cycles!
        const breakCompletedAt = new Date(breakDeadline).toISOString();
        const activity: CompletedActivityEvent = {
          id: persisted.activeRecordId || generateUUID(),
          mode: 'study_squats',
          startedAt: persisted.startedAt || completedAt,
          completedAt: breakCompletedAt,
          focusSeconds: config.focusDurationSeconds,
          breakSeconds: config.breakDurationSeconds,
          movementLabel: persisted.movementLabel,
          repGoal: persisted.repGoal,
          reportedReps: 0,
          breakOutcome: 'skipped',
        };
        return {
          snapshot: {
            ...persisted,
            state: 'ready_focus',
            remainingSeconds: 0,
            deadlineTimestamp: null,
            breakOutcome: 'skipped',
            reportedReps: 0,
          },
          completedActivity: activity,
        };
      }
    }
  }

  if (persisted.state === 'running_break') {
    const activity: CompletedActivityEvent = {
      id: persisted.activeRecordId || generateUUID(),
      mode: 'study_squats',
      startedAt: persisted.startedAt || completedAt,
      completedAt,
      focusSeconds: config.focusDurationSeconds,
      breakSeconds: config.breakDurationSeconds,
      movementLabel: persisted.movementLabel,
      repGoal: persisted.repGoal,
      reportedReps: persisted.breakOutcome === 'done' ? persisted.repGoal : 0,
      breakOutcome: persisted.breakOutcome === 'pending' ? 'skipped' : persisted.breakOutcome,
    };
    return {
      snapshot: {
        ...persisted,
        state: 'ready_focus',
        remainingSeconds: 0,
        deadlineTimestamp: null,
      },
      completedActivity: activity,
    };
  }

  return { snapshot: persisted, completedActivity: null };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
