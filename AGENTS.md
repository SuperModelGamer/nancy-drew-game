# AGENTS.md

## Project goal
Build a polished mobile-friendly browser-based point-and-click mystery game inspired by classic detective adventures (Nancy Drew style). The game is "The Last Curtain Call" — set in a 1920s theater facing demolition, featuring a dual mystery: a modern poisoning and a century-old murder.

## Current status (March 2026)
The game is **~90% feature complete and fully playable from start to finish** with 3 endings. All engine systems, 8 rooms (124 hotspots), 16 items, 10 dialogues, 10 puzzles, and visual assets (backgrounds, portraits, item icons, cursors) are implemented. See TODO.md for detailed checklist.

**What's working:**
- Complete gameplay loop: explore rooms → collect items → talk to suspects → solve puzzles → confront villain → choose ending
- Viewfinder frame UI with art deco borders, right info panel (room name, item counter, clue counter, settings gear)
- Custom PNG cursors (gold art deco themed) that change contextually by hotspot type and equipped item
- Evidence panel with item images, descriptions, lore, USED badges, discovery counters
- Suspect dossiers with progressive facts, Nancy's inner monologue thoughts
- Evidence board (final puzzle), chapter transitions, scripted ghost events

**What's missing:**
- Audio (no sound files exist; UISounds utility has stubs ready to wire up)
- Settings menu (gear icon exists in right panel but not connected)
- Mobile touch testing
- Hotspot placement for lobby needs tuning (viewport changed, user doing this manually)

## Non-negotiables
- Do not convert this project to Unity
- Keep the project browser-first
- Optimize for both phone and desktop
- Prefer TypeScript
- Keep content data-driven in JSON where reasonable
- Use large tap targets for mobile (minimum 48px)
- Avoid adding unnecessary dependencies
- Preserve clean folder structure
- Do not break existing game logic without replacing it

## Working style
- Explain the plan before major edits
- Make small, reviewable commits
- After code changes, run: `npx tsc --noEmit` (type-check) or `npm run build` (full build)
- If adding a dependency, explain why
- Prefer reusable systems over hardcoded one-off logic
- Before changing more than 5 files, explain your plan first

## Game rules
- Inventory items can gate dialogue and puzzles
- Room interactions should support hover on desktop and tap on mobile
- Dialogue should be skippable
- Save progress locally using localStorage
- Journal entries unlock based on clues found
- Puzzles are validated against answers defined in puzzles.json
- The 72-hour demolition deadline is narrative (chapter-based), not a real-time timer

## Aesthetic goals
- Moody, elegant, mysterious — theater noir
- Clean UI with Georgia/serif typography
- Gold (#c9a84c) accent on dark backgrounds, crimson (#8b1a1a) secondary accent
- Art deco motifs, dramatic shadows, spotlight effects
- Premium detective feel
- Minimal clutter on screen

## Architecture notes
- Scenes: BootScene → TitleScene → RoomScene + UIScene (overlay)
- Systems are singletons accessed via getInstance()
- All game content lives in src/game/data/*.json
- Room hotspots define all interactions (inspect, pickup, locked, navigate, talk)
- UIScene runs as a parallel scene over RoomScene for HUD elements
- 8 rooms total: Grand Lobby, Auditorium, Backstage, Dressing Room, Projection Booth, Manager's Office, Catwalk, Basement

## Key technical details

### Viewfinder layout
The game art is 1920×1080 (16:9). `computeViewfinderLayout()` in `src/game/utils/constants.ts` computes a full-screen viewport with thin 6px borders. The game view fills nearly the entire canvas above the bottom toolbar. A floating semi-transparent HUD overlay in the top-right corner shows room name, stats, objective, and audio/settings controls. UIScene runs as a parallel overlay scene.

### Cursor system
Custom PNG cursors in `src/game/utils/cursors.ts`. Each hotspot type has a dedicated cursor. When an item is equipped, `createItemCursor()` renders the item's Phaser texture to a canvas and generates a CSS cursor data URL.

### Dialogue events
Dialogue nodes can have `triggerEvent` which fires after all lines in the node are shown (even when choices follow). The `DialogueSystem.triggerEvent()` is idempotent — it skips if the event was already fired in the current session. Events set flags via SaveSystem and optionally add journal entries.

### Color constants
All hex colors in `src/game/utils/constants.ts` (Colors for Phaser objects, TextColors for CSS strings). Use these instead of hardcoded hex values.

### Depth layering
Z-depth constants in `Depths` object. Tooltip=100, panels=300-411, dialogue=500, scripted events=600.
