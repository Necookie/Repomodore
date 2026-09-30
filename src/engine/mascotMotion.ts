/** Decorative choreography only. This module never reads or writes activity records. */
export const SQUAT_CYCLE_MS = 6200;
export const SQUAT_DEMO_MS = SQUAT_CYCLE_MS * 2;

export interface SquatFrame {
  depth: number;
  cue: 'Ready' | 'Lower slowly' | 'Hold gently' | 'Stand tall' | 'Your turn';
  repetition: 1 | 2;
  complete: boolean;
}

const ease = (value: number) => (1 - Math.cos(Math.PI * value)) / 2;

export function getSquatFrame(elapsedMs: number): SquatFrame {
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed >= SQUAT_DEMO_MS) {
    return { depth: 0, cue: 'Your turn', repetition: 2, complete: true };
  }
  const time = elapsed % SQUAT_CYCLE_MS;
  const repetition = elapsed < SQUAT_CYCLE_MS ? 1 : 2;
  if (time < 800) return { depth: 0, cue: 'Ready', repetition, complete: false };
  if (time < 2600) return { depth: ease((time - 800) / 1800), cue: 'Lower slowly', repetition, complete: false };
  if (time < 3350) return { depth: 1, cue: 'Hold gently', repetition, complete: false };
  if (time < 5150) return { depth: 1 - ease((time - 3350) / 1800), cue: 'Stand tall', repetition, complete: false };
  return { depth: 0, cue: 'Stand tall', repetition, complete: false };
}
