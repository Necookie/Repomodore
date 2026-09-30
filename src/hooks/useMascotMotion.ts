import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';

/** Honor both the OS motion preference and native/web foreground state. */
export function useMotionPreference(reduceMotionOverride?: boolean) {
  // Start still until the accessibility preference has been read.
  const [systemReduced, setSystemReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setSystemReduced(value);
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const onVisibility = () => setForeground(document.visibilityState === 'visible');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisibility();
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, []);
  return { reducedMotion: reduceMotionOverride === true || systemReduced, foreground };
}

/** Advances only while visible and playing, preserving the pose while paused. */
export function useMotionClock(playing: boolean, duration: number, replayKey: number | string = 0) {
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    elapsedRef.current = 0;
    setElapsed(0);
  }, [replayKey]);
  useEffect(() => {
    if (!playing || elapsedRef.current >= duration) return;
    let last: number | undefined;
    let frame: number;
    const tick = (now: number) => {
      if (last !== undefined) {
        elapsedRef.current = Math.min(duration, elapsedRef.current + Math.min(64, now - last));
        setElapsed(elapsedRef.current);
      }
      last = now;
      if (elapsedRef.current < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration, replayKey]);
  return elapsed;
}
