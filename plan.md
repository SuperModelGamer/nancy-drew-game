# Nancy Drew UI & Reward Improvements Plan

## 1. Add "Puzzles Solved" stat to sidebar
**File:** `UIScene.ts` — `createRightInfoPanel()` and `updateRightPanelStats()`
**Also:** `PuzzleSystem.ts` — add `getSolvedCount()` and `getTotalCount()` methods

- Add a `PUZZLES` label + `"X / Y"` counter between the existing CLUES counter and the PROGRESS bar
- Wire it to PuzzleSystem which already tracks `solvedPuzzles` Set internally but doesn't expose counts
- Update the progress bar calculation to factor in puzzles too

---

## 2. Add vanity reward items for flag-only puzzles
**File:** `items.json` — add new lore items
**File:** `puzzles.json` — change `unlocks` to point to new item IDs

Currently 5 puzzles only grant flags with no tangible reward:
| Puzzle | Current unlock (flag) | New reward item |
|--------|----------------------|-----------------|
| script_cipher | `script_decoded` | `decoded_script_page` — "A page of decoded script revealing Margaux's final monologue" |
| film_puzzle | `film_decoded` | `film_strip_evidence` — "A strip of film showing the poisoning sequence frame by frame" |
| mirror_puzzle | `margaux_accusation` | `cracked_compact_mirror` — "Margaux's compact mirror, cracked the night she died" |
| passage_navigation | `passage_mapped` | `passage_map` — "A hand-drawn map of the theater's hidden passages" |
| tea_analysis | `poison_identified` | `toxicology_report` — "A chemical analysis identifying the poison as belladonna extract" |

Each item gets lore text and `isKeyItem: false` (vanity/evidence). The old flag names become the item IDs so existing `showWhen` conditions still work — OR we keep the flags AND grant items (dual reward). **Approach:** Keep original flags as-is (for gate logic), and add a *separate* `"reward"` field to puzzles.json that grants the vanity item on solve. This avoids breaking any existing `showWhen` conditions.

---

## 3. Keep keys in inventory after use (dimmed, not removed)
**File:** `RoomScene.ts` — lines ~467-482 (item-on-hotspot consumption)
**File:** `UIScene.ts` — evidence panel rendering (item card styling)

Currently: `inv.removeItem(hotspot.requiredItem)` deletes keys when used on navigation hotspots.

**Change:** Remove the `removeItem()` call. The item is already `markUsed()` on the line above, so it stays in inventory but is flagged as used. Then in the Evidence panel item grid, render used items with reduced opacity (~0.45 alpha) and a subtle "USED" badge (this badge already exists in the detail panel but not consistently on grid cards).

---

## 4. Larger, more readable fonts in Evidence / Journal / Items panels
**File:** `UIScene.ts` — panel rendering sections

**Current state:** Uses `'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif` at sizes like 17-22px.

**Changes:**
- Switch `JOURNAL_FONT` to `'Poppins', 'Nunito', sans-serif'` or a warm handwriting-style like `'Patrick Hand', 'Caveat', cursive` — load via Google Fonts in `index.html`
- **Evidence item names:** 17px → 22px
- **Evidence descriptions:** 21px → 26px
- **Evidence lore text:** 18px → 22px
- **Journal entry text:** 22px → 28px
- **Journal page/nav text:** 18px → 22px
- **KEY EVIDENCE badge:** 15px → 18px
- Keep sidebar stats fonts as-is (they're sized correctly for that narrow panel)

---

## 5. Journal: use more of the page before paginating
**File:** `UIScene.ts` — journal panel rendering (~lines 1028-1143)

**Current:** `JOURNAL_ENTRIES_PER_PAGE = 5` — only 5 entries per page regardless of available space, leaving the bottom half of the page empty.

**Change:** Calculate entries per page dynamically based on available content height. Each entry is roughly ~45-55px tall (with the larger font). Measure `contentBottom - contentTop` and divide by estimated entry height to fit as many entries as the page allows. Fall back to a minimum of 5. This should roughly double the entries shown per page on most screens.

---

## Execution Order
1. **Fonts** (4) — load Google Font, update JOURNAL_FONT and sizes
2. **Journal layout** (5) — dynamic entries per page
3. **Keep keys** (3) — remove `removeItem()`, add dimmed styling
4. **Puzzle stats** (1) — expose counts, add sidebar display
5. **Vanity rewards** (2) — add items, add `reward` field to puzzles, grant on solve
