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
import {
  scheduleBackgroundTimerAlarm,
  cancelBackgroundTimerAlarm,
  saveBackgroundTimerSnapshot,
  getBackgroundTimerSnapshot,
  clearBackgroundTimerSnapshot,
  setupAlarmNotificationChannel,
  dismissActiveNotifications,
  showWebNotification,
} from '@/src/services/backgroundTimerService';

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

  // On mount: initialize background notification channel & restore any background timer
  useEffect(() => {
    let isMounted = true;

    async function initBackground() {
      await setupAlarmNotificationChannel();
      const persisted = await getBackgroundTimerSnapshot();
      if (!isMounted || !persisted) return;

      if (persisted.state === 'running_focus' || persisted.state === 'running_break') {
        const { snapshot: restored, completedActivity } = restoreTimerState(
          persisted,
          configRef.current,
          Date.now()
        );
        setSnapshot(restored);

        if (completedActivity) {
          const finishedPhase = persisted.state === 'running_focus' ? 'focus' : 'break';
          onActivityCompletedRef.current?.(completedActivity);
          onPhaseCompletedRef.current?.(finishedPhase);
          await clearBackgroundTimerSnapshot();
          await dismissActiveNotifications();
        } else if (restored.state === 'running_focus' || restored.state === 'running_break') {
          // Re-schedule alarm for remaining duration
          const phase = restored.state === 'running_focus' ? 'focus' : 'break';
          await scheduleBackgroundTimerAlarm(phase, restored.remainingSeconds, restored.repGoal);
        }
      }
    }

    void initBackground();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    configRef.current = config;
    setSnapshot((curr) => {
      if (curr.state === 'idle_focus') {
        return {
          ...curr,
          remainingSeconds: config.focusDurationSeconds,
          totalSeconds: config.focusDurationSeconds,
          repGoal: config.repGoal,
        };
      }
      return curr;
    });
  }, [config.focusDurationSeconds, config.breakDurationSeconds, config.repGoal]);

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

      if (next.state === 'running_break') {
        // Transitioned from Focus to Break: schedule break alarm
        void scheduleBackgroundTimerAlarm('break', next.remainingSeconds, next.repGoal);
        void saveBackgroundTimerSnapshot(next);
      } else {
        // Timer fully ended
        void clearBackgroundTimerSnapshot();
        void cancelBackgroundTimerAlarm();
      }
    }
  }, []);

  // Interval loop for foreground ticking
  useEffect(() => {
    const isRunning =
      snapshot.state === 'running_focus' || snapshot.state === 'running_break';

    if (!isRunning) return;

    const interval = setInterval(handleTick, 500);
    return () => clearInterval(interval);
  }, [snapshot.state, handleTick]);

  // AppState & visibility listener for background/foreground recovery
  useEffect(() => {
    const restoreFromBackground = (isFromWeb: boolean = false) => {
      const current = snapshotRef.current;
      if (current.state !== 'running_focus' && current.state !== 'running_break') {
        return;
      }

      const { snapshot: restored, completedActivity } = restoreTimerState(
        current,
        configRef.current,
        Date.now()
      );
      setSnapshot(restored);

      if (completedActivity) {
        const finishedPhase = current.state === 'running_focus' ? 'focus' : 'break';
        onActivityCompletedRef.current?.(completedActivity);
        onPhaseCompletedRef.current?.(finishedPhase);

        if (isFromWeb) {
          showWebNotification(
            finishedPhase === 'focus' ? '🔔 Focus Complete!' : '🔔 Break Complete!',
            'Timer finished. Tap to silence alarm.'
          );
        }

        void clearBackgroundTimerSnapshot();
        void dismissActiveNotifications();
      } else if (restored.state === 'running_focus' || restored.state === 'running_break') {
        // Re-sync background notification with current remaining time
        const phase = restored.state === 'running_focus' ? 'focus' : 'break';
        void scheduleBackgroundTimerAlarm(phase, restored.remainingSeconds, restored.repGoal);
        void saveBackgroundTimerSnapshot(restored);
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        restoreFromBackground(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    const handleWebVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        restoreFromBackground(true);
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
    setSnapshot((curr) => {
      const next = startFocus(curr, configRef.current, Date.now());
      void scheduleBackgroundTimerAlarm('focus', next.remainingSeconds, next.repGoal);
      void saveBackgroundTimerSnapshot(next);
      return next;
    });
  }, []);

  const handlePause = useCallback(() => {
    setSnapshot((curr) => {
      const next = pauseTimer(curr, Date.now());
      void cancelBackgroundTimerAlarm();
      void saveBackgroundTimerSnapshot(next);
      return next;
    });
  }, []);

  const handleResume = useCallback(() => {
    setSnapshot((curr) => {
      const next = resumeTimer(curr, Date.now());
      const phase = next.state === 'running_focus' ? 'focus' : 'break';
      void scheduleBackgroundTimerAlarm(phase, next.remainingSeconds, next.repGoal);
      void saveBackgroundTimerSnapshot(next);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSnapshot((curr) => {
      const next = resetTimer(curr, configRef.current);
      void cancelBackgroundTimerAlarm();
      void clearBackgroundTimerSnapshot();
      return next;
    });
  }, []);

  const handleModeChange = useCallback((newMode: TimerMode, forceReset?: boolean) => {
    setSnapshot((curr) => {
      if (curr.state !== 'idle_focus' && curr.state !== 'ready_focus' && !forceReset) {
        return curr;
      }
      void cancelBackgroundTimerAlarm();
      void clearBackgroundTimerSnapshot();
      return createInitialSnapshot(newMode, configRef.current);
    });
  }, []);

  const handleBreakResponse = useCallback(
    (action: 'done' | 'skip' | 'other' | 'rest_only', otherName?: string) => {
      setSnapshot((curr) => {
        const next = recordBreakResponse(curr, action, otherName);
        void saveBackgroundTimerSnapshot(next);
        return next;
      });
    },
    []
  );

  const handleEndBreakEarly = useCallback(() => {
    const { snapshot: next, completedActivity } = endBreakEarly(
      snapshotRef.current,
      Date.now(),
      configRef.current
    );
    setSnapshot(next);
    void cancelBackgroundTimerAlarm();
    void clearBackgroundTimerSnapshot();
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
