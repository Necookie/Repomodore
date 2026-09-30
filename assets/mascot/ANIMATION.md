# Mascot animation assets

The shared components use the original focus and resting art plus `assets/mascot/squat-standing.png`, generated with the built-in image generation tool on 2026-09-29. The original squat art was the identity reference. Original asset files were preserved.

## Final generation prompt

Use case: identity-preserve. Asset type: production animation key art for the existing Repomodore mascot. Input image 1 is identity and linework reference. Create ONE full-body mascot standing upright ready to perform a bodyweight squat. Preserve this exact white mouse character, big pink ears, round black glasses, small dark eyes, pink nose, white fur tufts, gray zip hoodie, black/dark charcoal trousers, bare pink mouse feet, pink tail, thick expressive near-black hand-drawn outlines and subtle warm illustration shading. Three-quarter view facing slightly to viewer right, same head angle and expression as reference. Both hands held together in front of the chest like the reference. Feet wide apart at shoulder width, flat and planted, toes angled slightly outward. Upright straight legs, hoodie waist clearly above hips. Full entire character visible, centered with generous transparent padding. Calm friendly expression. No motion lines, no ground shadow, no props, no text, no duplicated characters, no panels. Genuinely transparent background. Keep character recognizable as exactly the same mascot, not a redesign.

## Playback

`SquatDemonstration` clips the generated art at render time: the face/hoodie move as one rigid piece, the original feet stay planted, and shaded trouser paths articulate through the hips and knees. No source bitmap pixels are modified. The entire character is never scaled to simulate squatting.

Each 6.2-second cycle has 0.8 seconds standing, 1.8 seconds lowering, 0.75 seconds holding, 1.8 seconds rising, and 1.05 seconds standing. Exactly two cycles play, then the figure settles at standing. Replay resets only the decorative clock. Only the existing response buttons can record reps.

Pause freezes the demonstration pose. Native app background state and web page visibility stop the decorative clock. Reduced motion shows the still standing pose and a written movement sequence; system settings take precedence over preview controls. Focus motion is optional and intentionally very small. Done briefly shows two accent sparkles around the resting mascot; Skip and Rest Only go straight to rest.

## Review

Run the development web server and open `/mascot-preview`. The page uses the same shared production components, contains no persistence calls, and redirects home outside development. Poses shows standing, halfway, and squat depth side by side. Check Replay, Pause Break, Done, Skip, Rest Only, focus motion toggle, and reduced motion. The timer engine remains the authority for actual session timing and recorded activity.
