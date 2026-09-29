import { Colors, Spacing, Radius } from '../src/constants/theme';

describe('Design Tokens & Theme', () => {
  it('defines the correct design tokens from the design guide', () => {
    expect(Colors.canvas).toBe('#FBF7F2');
    expect(Colors.surface).toBe('#FFFFFF');
    expect(Colors.ink).toBe('#20232A');
    expect(Colors.muted).toBe('#687078');
    expect(Colors.accent).toBe('#E86F61');
    expect(Colors.accentSoft).toBe('#FCE4DF');
    expect(Colors.border).toBe('#E9E2DD');
    expect(Colors.darkPanel).toBe('#25262C');
  });

  it('defines consistent 8px spacing rhythm', () => {
    expect(Spacing.sm).toBe(8);
    expect(Spacing.md).toBe(16);
    expect(Spacing.lg).toBe(24);
  });

  it('defines compliant radius specifications', () => {
    expect(Radius.md).toBe(12);
    expect(Radius.lg).toBe(20);
  });
});
