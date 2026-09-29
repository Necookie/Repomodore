# Repomodore - MVP Design Guide

Reference: **Repomodore Focus and Fitness App Showcase.png** (the previously created concept image). Tagline: **Focus. Rep. Repeat.** This is a visual direction, not a pixel-perfect implementation contract. Design the iOS and Android experience first, then adapt the same visual language to web and larger screens.

## Visual idea

Warm, quiet study desk meets playful gym habit. Light cream canvas, near-black typography, peach/coral actions, generous whitespace, soft rounded cards. The mascot is a friendly **white nerd gym rat** with round black glasses, pink ears and nose, fine whiskers, a gray hoodie, a thin tail, a dark laptop, and a compact dark dumbbell. Preserve its recognizable face, glasses, hoodie, and white fur across poses. The character encourages rather than judges.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#FBF7F2` | Main background |
| Surface | `#FFFFFF` | Cards and timer center |
| Ink | `#20232A` | Main text |
| Muted | `#687078` | Secondary text |
| Accent | `#E86F61` | Primary action and timer progress |
| Accent soft | `#FCE4DF` | Selection and progress track |
| Border | `#E9E2DD` | Dividers |
| Dark panel | `#25262C` | Optional sign-in feature panel |

Use a clean rounded sans-serif such as Inter or a system sans. Headline 32-40px desktop / 28px mobile; countdown 64-88px desktop / 56-68px mobile with tabular numerals; body 15-16px. Aim for 4.5:1 body-text contrast. Buttons are at least 44px high. Radius: 12px controls, 20px cards. Use an 8px spacing rhythm and restrained, diffuse shadows.

## Layout and components

- Mobile primary: top wordmark, single-column timer, bottom tabs for Timer, History, Settings, and thumb-reachable controls. Keep supporting cards below the timer. Tablet and desktop: compact left navigation, central timer panel, slim right rail for Next up and Today.
- Timer screen: Study / Study + Squats segmented control above an oversized circular progress ring. Phase and countdown stay readable without color. Start or Pause is the dominant coral button; Reset is secondary. Show next phase and compact daily totals.
- Study mode: ring and focus context only. No squats illustration competing with the task.
- Combined mode: during focus, right card shows mascot beside a small dumbbell and “Next: 10 squats / 5 min movement break.” During break, swap to mascot squatting, goal and countdown. Keep Done, Skip, and End break separate and explicit.
- History: small statistic cards and a modest seven-day list. Any bars must have labels and numerical totals; no motivational guilt messaging.
- Settings: clear durations and rep target, notification preference, and a data location section labeled “On this device” or “Sync across devices.” Clerk sign-in appears only inside the latter path.

## Mascot poses and asset rules

1. Welcome: rat in gray hoodie, glasses, laptop nearby, dumbbell in paw.
2. Focus: rat leaning over laptop; subtle presence beside the timer, never inside the digits.
3. Movement: rat doing a controlled bodyweight squat; cheerful expression.
4. Break: rat resting with a mug; no implied health claim.

Prefer transparent PNG or SVG artwork exported from an approved original source. Keep each pose in the same palette, outline weight, eye/glasses geometry, and hoodie shape. Use descriptive alt text only when the pose conveys information; decorative repetitions use empty alt text. Respect reduced-motion preference. Do not add an animated mascot to the countdown by default.

## Interaction details

Completion of a focus phase gives a gentle sound/notification if enabled, then the break screen in combined mode. Squat confirmation increments self-reported reps once and leaves the 5-minute break running. Skip records zero. The next study phase waits for Start. Use clear sync status (“Saved on this device”, “Syncing”, “Synced”, “Sync needs retry”) and never make sign-in a barrier to the timer.

## Tone and responsive rules

Short, friendly, non-shaming copy: “Ready to focus?”, “Move for a bit”, “Done with 10?”, “Take the rest of your break.” Never imply the app measured physical activity. At 320px width, no side rail; keep countdown, mode, and primary action above secondary stats. Respect safe areas on iOS and Android. Touch targets are at least 44px. Colors cannot be the only state cue. Support VoiceOver, TalkBack, reduced motion, dynamic text where feasible, and visible keyboard focus on web.
