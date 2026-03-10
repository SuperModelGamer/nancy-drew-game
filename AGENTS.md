# AGENTS.md

## Project goal
Build a polished mobile-friendly browser-based point-and-click mystery game inspired by classic detective adventures (Nancy Drew style).

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
- After code changes, run:
  - npm run build
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

## Aesthetic goals
- Moody, elegant, mysterious
- Clean UI with Georgia/serif typography
- Gold (#c9a84c) accent on dark backgrounds
- Premium detective feel
- Minimal clutter on screen

## Architecture notes
- Scenes: BootScene → TitleScene → RoomScene + UIScene (overlay)
- Systems are singletons accessed via getInstance()
- All game content lives in src/game/data/*.json
- Room hotspots define all interactions (inspect, pickup, locked, navigate, talk)
- UIScene runs as a parallel scene over RoomScene for HUD elements
