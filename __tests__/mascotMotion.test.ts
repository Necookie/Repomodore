import { getSquatFrame, SQUAT_CYCLE_MS, SQUAT_DEMO_MS } from '../src/engine/mascotMotion';

describe('mascot demonstration', () => {
  it('lowers, holds, rises and returns to standing for each of two squats', () => {
    for (const start of [0, SQUAT_CYCLE_MS]) {
      expect(getSquatFrame(start).depth).toBe(0);
      expect(getSquatFrame(start + 1700).depth).toBeCloseTo(0.5);
      expect(getSquatFrame(start + 2900)).toMatchObject({ depth: 1, cue: 'Hold gently' });
      expect(getSquatFrame(start + 4250).depth).toBeCloseTo(0.5);
      expect(getSquatFrame(start + 5500).depth).toBe(0);
    }
  });

  it('finishes exactly two demonstrations and stays still indefinitely', () => {
    expect(getSquatFrame(SQUAT_CYCLE_MS).repetition).toBe(2);
    expect(getSquatFrame(SQUAT_DEMO_MS)).toEqual({ depth: 0, cue: 'Your turn', repetition: 2, complete: true });
    expect(getSquatFrame(SQUAT_DEMO_MS * 100)).toEqual(getSquatFrame(SQUAT_DEMO_MS));
  });

  it('keeps every pose within a natural range and is continuous at phase boundaries', () => {
    for (let ms = 0; ms <= SQUAT_DEMO_MS; ms += 25) {
      expect(getSquatFrame(ms).depth).toBeGreaterThanOrEqual(0);
      expect(getSquatFrame(ms).depth).toBeLessThanOrEqual(1);
    }
    for (const boundary of [800, 2600, 3350, 5150, 6200, 12400]) {
      expect(Math.abs(getSquatFrame(boundary - 1).depth - getSquatFrame(boundary).depth)).toBeLessThan(0.001);
    }
  });
});
