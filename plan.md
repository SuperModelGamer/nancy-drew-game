# Dialogue System UI Fix Plan

## Issues Found

### Bug 1: Speaker nameplate text animation end position mismatch
**File:** `DialogueSystem.ts:402-434`
- Speaker text is created at `nameplateY + npTextOffsetY` (line 402)
- But the entrance animation tweens to `y: nameplateY` (line 432), losing the `npTextOffsetY` correction
- After animation completes, the text sits 2px higher than intended

**Fix:** Change the animation tween to use `nameplateY + npTextOffsetY` as the target y.

### Bug 2: Choice hover-out resets dimmed choices to bright gold
**File:** `DialogueSystem.ts:675`
- On `pointerout`, text color is always reset to `TextColors.gold`
- Already-asked choices should reset to `'#8a7a5a'` (dimmed), not bright gold
- This makes dimmed choices flash bright after hovering

**Fix:** Capture the original `textColor` in the closure and reset to that on pointerout.

### Issue 3: Dialogue text is top-aligned instead of vertically centered
**File:** `DialogueSystem.ts:288-308`
- Text is positioned at `textTop = innerTop` with origin (0, 0) — starts at top of inner area
- Short lines sit at the very top of the box, looking unbalanced within the golden border
- Text should be vertically centered within the inner content area

**Fix:** Position text at the vertical center of the inner area using origin (0, 0.5).

### Issue 4: Skip button can overlap with dialogue text
**File:** `DialogueSystem.ts:275-306`
- The skip button at `innerTop + 2` (top-right) occupies the same space as text
- Long first lines could render behind the skip button

**Fix:** With vertical centering, this becomes less of an issue. Add a small right-side exclusion zone for the skip button area as extra safety.

## Implementation Steps

1. Fix Bug 1: Speaker text animation target y
2. Fix Bug 2: Choice hover-out color preservation
3. Fix Issue 3: Vertically center dialogue text within golden border
4. Fix Issue 4: Ensure skip button doesn't overlap text
5. Commit and push
