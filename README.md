# Nancy Drew Mystery Game

A mobile-friendly 2D point-and-click mystery game for browser, designed to work on desktop and phone.

## About

*The Last Curtain Call* — The Monarch Theatre is haunted. Or so they say. When a real estate developer is poisoned on the eve of demolition, retired actress Vivian Delacroix calls Nancy Drew to investigate. As Nancy, explore the grand 1920s theater, question suspects, collect evidence, and uncover two intertwined mysteries — a modern-day poisoning and a century-old murder.

72 hours until demolition. The ghost has a secret. The truth is buried beneath the stage.

## Stack

- **Phaser 3** — 2D game framework
- **TypeScript** — type-safe game logic
- **Vite** — fast dev server and bundler

## Core Features

- Static illustrated rooms with clickable/tappable hotspots
- Inventory system for collecting and using evidence
- Branching dialogue with suspects
- Journal / clue board that tracks discoveries
- Puzzle progression gated by clues and items
- Save/load via local storage
- Responsive — works on desktop and phone browsers
- Three distinct endings based on player choice

## Commands

```bash
npm install
npm run dev      # Start dev server on localhost:3000
npm run build    # Type-check and production build
npm run preview  # Preview production build
```

## Project Structure

```
src/
  main.ts                    # Phaser game config and entry point
  game/
    scenes/
      BootScene.ts           # Asset loading
      TitleScene.ts          # Title/menu screen
      RoomScene.ts           # Main gameplay — room exploration
      UIScene.ts             # HUD overlay (inventory, journal)
    systems/
      InventorySystem.ts     # Item collection and usage
      DialogueSystem.ts      # Branching conversation engine
      PuzzleSystem.ts        # Puzzle logic and validation
      SaveSystem.ts          # LocalStorage persistence
    data/
      rooms.json             # Room layouts and hotspot definitions
      items.json             # Item definitions
      dialogue.json          # Dialogue trees
      puzzles.json           # Puzzle definitions and solutions
```

## Current Priorities

1. First playable room chain (Lobby → Auditorium → Backstage)
2. Inventory pickup and use-on-hotspot flow
3. Dialogue modal with branching choices
4. Clue journal UI
5. Puzzle unlock chain across rooms

## Credits

- Created by Carley Beck (@supermodelgamer)
- AI Assistance by Raven
