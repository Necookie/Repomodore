import {
  createInitialSnapshot,
  startFocus,
  pauseTimer,
  resumeTimer,
  resetTimer,
  recordBreakResponse,
  endBreakEarly,
  tickTimer,
  restoreTimerState,
  TimerConfig,
} from '../src/engine/timerEngine';

describe('Timer Engine', () => {
  const testConfig: TimerConfig = {
    focusDurationSeconds: 10,
    breakDurationSeconds: 5,
    repGoal: 10,
    soundEnabled: true,
    notificationsEnabled: false,
  };

  const baseTime = 1700000000000;

  it('starts in idle_focus state with configured duration', () => {
    const timer = createInitialSnapshot('study_squats', testConfig);
    expect(timer.state).toBe('idle_focus');
    expect(timer.remainingSeconds).toBe(10);
    expect(timer.deadlineTimestamp).toBeNull();
  });

  it('starts focus with accurate wall-clock deadline', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);

    expect(started.state).toBe('running_focus');
    expect(started.remainingSeconds).toBe(10);
    expect(started.deadlineTimestamp).toBe(baseTime + 10 * 1000);
    expect(started.activeRecordId).toBeDefined();
  });

  it('pauses and freezes remaining duration', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);

    // 4 seconds elapse
    const paused = pauseTimer(started, baseTime + 4000);
    expect(paused.state).toBe('paused_focus');
    expect(paused.remainingSeconds).toBe(6);
    expect(paused.deadlineTimestamp).toBeNull();
  });

  it('resumes with new deadline based on remaining duration', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);
    const paused = pauseTimer(started, baseTime + 4000); // 6s left

    // 10 seconds later, user resumes
    const resumed = resumeTimer(paused, baseTime + 14000);
    expect(resumed.state).toBe('running_focus');
    expect(resumed.remainingSeconds).toBe(6);
    expect(resumed.deadlineTimestamp).toBe(baseTime + 14000 + 6000);
  });

  it('completes Study mode focus and lands in ready_focus with no break', () => {
    const initial = createInitialSnapshot('study', testConfig);
    const started = startFocus(initial, testConfig, baseTime);

    // Tick at 10s expiration
    const result = tickTimer(started, testConfig, baseTime + 10000);
    expect(result.snapshot.state).toBe('ready_focus');
    expect(result.snapshot.remainingSeconds).toBe(0);
    expect(result.completedActivity).not.toBeNull();
    expect(result.completedActivity?.mode).toBe('study');
    expect(result.completedActivity?.focusSeconds).toBe(10);
    expect(result.completedActivity?.breakSeconds).toBe(0);
  });

  it('completes Study + Squats focus and transitions to running_break', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);

    // Tick at 10s expiration
    const result = tickTimer(started, testConfig, baseTime + 10000);
    expect(result.snapshot.state).toBe('running_break');
    expect(result.snapshot.remainingSeconds).toBe(5); // break duration
    expect(result.snapshot.deadlineTimestamp).toBe(baseTime + 10000 + 5000);
    expect(result.snapshot.breakOutcome).toBe('pending');
  });

  it('records Done once and prevents duplicate reps on double tap', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);
    const inBreak = tickTimer(started, testConfig, baseTime + 10000).snapshot;

    // Tap Done
    const doneOnce = recordBreakResponse(inBreak, 'done');
    expect(doneOnce.reportedReps).toBe(10);
    expect(doneOnce.breakOutcome).toBe('done');
    expect(doneOnce.state).toBe('running_break'); // Break keeps running!

    // Tap Done second time (double tap)
    const doneTwice = recordBreakResponse(doneOnce, 'done');
    expect(doneTwice.reportedReps).toBe(10); // Still 10, no duplication
  });

  it('records Skip as zero reps while break continues running', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);
    const inBreak = tickTimer(started, testConfig, baseTime + 10000).snapshot;

    const skipped = recordBreakResponse(inBreak, 'skip');
    expect(skipped.reportedReps).toBe(0);
    expect(skipped.breakOutcome).toBe('skipped');
    expect(skipped.state).toBe('running_break');
  });

  it('completes break when countdown expires and defaults pending to skipped', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);
    const inBreak = tickTimer(started, testConfig, baseTime + 10000).snapshot;

    // Break expires with no user input
    const result = tickTimer(inBreak, testConfig, baseTime + 15000);
    expect(result.snapshot.state).toBe('ready_focus');
    expect(result.completedActivity?.breakOutcome).toBe('skipped');
    expect(result.completedActivity?.reportedReps).toBe(0);
  });

  it('restores remaining time accurately after backgrounding/sleep', () => {
    const initial = createInitialSnapshot('study', testConfig);
    const started = startFocus(initial, testConfig, baseTime);

    // App backgrounded, 3 seconds elapsed
    const restored = restoreTimerState(started, testConfig, baseTime + 3000);
    expect(restored.snapshot.state).toBe('running_focus');
    expect(restored.snapshot.remainingSeconds).toBe(7);
  });

  it('recovers cleanly when phase expired during background without fabricating loops', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);

    // App left in background for 2 hours (7200 seconds)
    const restored = restoreTimerState(started, testConfig, baseTime + 7200000);

    // Must land in ready_focus and record exactly 1 session, never multiple fabricated cycles!
    expect(restored.snapshot.state).toBe('ready_focus');
    expect(restored.completedActivity).not.toBeNull();
    expect(restored.completedActivity?.focusSeconds).toBe(10);
  });

  it('ends break early and lands in ready_focus with recorded activity', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);
    const inBreak = tickTimer(started, testConfig, baseTime + 10000).snapshot;

    const { snapshot, completedActivity } = endBreakEarly(inBreak, baseTime + 12000);
    expect(snapshot.state).toBe('ready_focus');
    expect(snapshot.remainingSeconds).toBe(0);
    expect(completedActivity).not.toBeNull();
    expect(completedActivity?.breakOutcome).toBe('skipped');
  });

  it('resets timer cleanly back to initial snapshot', () => {
    const initial = createInitialSnapshot('study_squats', testConfig);
    const started = startFocus(initial, testConfig, baseTime);
    const reset = resetTimer(started, testConfig);

    expect(reset.state).toBe('idle_focus');
    expect(reset.remainingSeconds).toBe(testConfig.focusDurationSeconds);
    expect(reset.deadlineTimestamp).toBeNull();
  });
});
