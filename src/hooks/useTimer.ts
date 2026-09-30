import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  TimerSnapshot,
  TimerConfig,
  DEFAULT_CONFIG,
  createInitialSnapshot,
  startFocus,
  pauseTimer,
  resumeTimer,
  resetTimer,
  recordBreakResponse,
  endBreakEarly,
  tickTimer,
  restoreTimerState,
  CompletedActivityEvent,
  TimerMode,
} from '@/src/engine/timerEngine';

interface UseTimerOptions {
  config?: TimerConfig;
  onActivityCompleted?: (activity: CompletedActivityEvent) => void;
  onPhaseCompleted?: (phase: 'focus' | 'break') => void;
}

export function useTimer({
  config = DEFAULT_CONFIG,
  onActivityCompleted,
  onPhaseCompleted,
}: UseTimerOptions = {}) {
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() =>
    createInitialSnapshot('study_squats', config)
  );

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const configRef = useRef(config);
  configRef.current = config;

  const onActivityCompletedRef = useRef(onActivityCompleted);
  onActivityCompletedRef.current = onActivityCompleted;

  const onPhaseCompletedRef = useRef(onPhaseCompleted);
  onPhaseCompletedRef.current = onPhaseCompleted;

  // Handle tick
  const handleTick = useCallback(() => {
    const current = snapshotRef.current;
    if (current.state !== 'running_focus' && current.state !== 'running_break') {
      return;
    }

    const { snapshot: next, completedActivity, phaseCompleted } = tickTimer(
      current,
      configRef.current,
      Date.now()
    );

    setSnapshot(next);

    if (completedActivity) {
      onActivityCompletedRef.current?.(completedActivity);
    }
    if (phaseCompleted) {
      onPhaseCompletedRef.current?.(phaseCompleted);
    }
  }, []);

  // Interval loop for foreground ticking
  useEffect(() => {
    const isRunning =
      snapshot.state === 'running_focus' || snapshot.state === 'running_break';

    if (!isRunning) return;

    // Run tick immediately then every 500ms
    const interval = setInterval(handleTick, 500);
    return () => clearInterval(interval);
  }, [snapshot.state, handleTick]);

  // AppState listener for background/foreground recovery
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App returned to foreground: restore accurate wall-clock time
        const current = snapshotRef.current;
        const { snapshot: restored, completedActivity } = restoreTimerState(
          current,
          configRef.current,
          Date.now()
        );
        setSnapshot(restored);

        if (completedActivity) {
          onActivityCompletedRef.current?.(completedActivity);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Also attach window focus listener for web browsers
    const handleWebVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const current = snapshotRef.current;
        const { snapshot: restored, completedActivity } = restoreTimerState(
          current,
          configRef.current,
          Date.now()
        );
        setSnapshot(restored);

        if (completedActivity) {
          onActivityCompletedRef.current?.(completedActivity);
        }
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleWebVisibilityChange);
      window.addEventListener('focus', handleWebVisibilityChange);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleWebVisibilityChange);
        window.removeEventListener('focus', handleWebVisibilityChange);
      }
    };
  }, []);

  // Actions
  const handleStart = useCallback(() => {
    setSnapshot((curr) => startFocus(curr, configRef.current, Date.now()));
  }, []);

  const handlePause = useCallback(() => {
    setSnapshot((curr) => pauseTimer(curr, Date.now()));
  }, []);

  const handleResume = useCallback(() => {
    setSnapshot((curr) => resumeTimer(curr, Date.now()));
  }, []);

  const handleReset = useCallback(() => {
    setSnapshot((curr) => resetTimer(curr, configRef.current));
  }, []);

  const handleModeChange = useCallback((newMode: TimerMode, forceReset?: boolean) => {
    setSnapshot((curr) => {
      if (curr.state !== 'idle_focus' && curr.state !== 'ready_focus' && !forceReset) {
        return curr; // don't change mode while running without explicit reset
      }
      return createInitialSnapshot(newMode, configRef.current);
    });
  }, []);

  const handleBreakResponse = useCallback(
    (action: 'done' | 'skip' | 'other' | 'rest_only', otherName?: string) => {
      setSnapshot((curr) => recordBreakResponse(curr, action, otherName));
    },
    []
  );

  const handleEndBreakEarly = useCallback(() => {
    const { snapshot: next, completedActivity } = endBreakEarly(
      snapshotRef.current,
      Date.now()
    );
    setSnapshot(next);
    if (completedActivity) {
      onActivityCompletedRef.current?.(completedActivity);
    }
  }, []);

  return {
    snapshot,
    setSnapshot,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    reset: handleReset,
    setMode: handleModeChange,
    recordBreakResponse: handleBreakResponse,
    endBreakEarly: handleEndBreakEarly,
  };
}
