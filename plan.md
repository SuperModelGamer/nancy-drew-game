# Suspect Dossier UI Redesign

## Problems

1. **Poor text contrast** — Light text on dark navy backgrounds is hard to read, especially the italic Nancy's Thoughts and muted "Undiscovered" placeholders
2. **Font sizes too small** — 21px body text on 1920x1080 is undersized for a detective game where reading is the primary activity
3. **Navy-on-navy kills contrast** — Card backgrounds (0x0e0d16) on panel background (navyMid) are nearly indistinguishable
4. **Case file feel is missing** — Classic Nancy Drew suspects screens look like actual paper dossiers/case files, not dark tech UIs
5. **Cramped layout** — Facts and thoughts compete for space in the right column with small margins
6. **Suspect tabs are small** — Hard to distinguish at 81px tall with 21px names

## Design Direction

Switch from dark navy tech panel → **warm paper dossier / case file aesthetic** that matches the game's 1920s theater theme. Think manila folder, aged paper, typed/handwritten notes.

## Implementation Plan

### Step 1: Paper dossier backgrounds
- **Main panel**: Replace navy fill with warm paper/parchment color (`0xF0E6CC` cream, matching the existing `BOOK_PAPER` constant used elsewhere)
- **Detail cards**: Use slightly darker parchment (`0xE8DCC0`) instead of `0x0e0d16`
- **Header bar**: Keep dark navy for contrast, but make it narrower

### Step 2: Increase font sizes for readability
- Facts text: 21px → 26px
- Nancy's Thoughts: 19px → 24px
- Name: 30px → 36px
- Role: 21px → 24px
- Info chips: 21px → 24px
- Section headers (KNOWN FACTS, NANCY'S THOUGHTS): 21px → 24px
- Tab names: 21px → 24px

### Step 3: Fix text colors for paper background
- Facts text: Change from light (#e0d5c0) → dark ink (#2a1a0a, matching `BOOK_INK`)
- Nancy's Thoughts: Change from #a0b4c4 → dark blue-gray (#3a4a5a)
- Section headers: Keep gold but darken slightly for paper contrast
- Undiscovered placeholders: Medium gray (#8a7a6a) instead of near-invisible muted
- Bullets: Dark ink instead of suspect color for readability

### Step 4: Improve suspect tabs
- Increase tab height: 81px → 100px
- Increase name font: 21px → 24px
- Increase portrait icon: 54px → 64px
- Stronger selected state: thicker border, brighter accent

### Step 5: Better layout spacing
- Increase fact row min height: 54px → 60px
- Increase padding between sections: 36px → 48px
- Add more breathing room around Nancy's Thoughts quote
- Increase progress bar size and label

### Step 6: Visual polish
- Add subtle paper texture effect (light noise/grain via alpha rectangles)
- Gold dividers between sections (thicker, more visible)
- Stronger card borders for left/right columns
- Discovery progress: larger bar, bolder text

---

## Execution Order
1. Change backgrounds to paper/parchment palette
2. Update all text colors for dark-on-light contrast
3. Increase all font sizes
4. Resize tabs and improve selected state
5. Adjust spacing and padding
6. Polish dividers and visual accents
