# Game Design Document
# NANCY DREW: Mystery at Thornwood Manor

> **Format:** 2D point-and-click browser game (Phaser 3 + TypeScript + Vite)
> **Platform:** Desktop and mobile browsers, responsive
> **Tone:** Moody, elegant, mysterious — classic Nancy Drew detective adventure
> **Created by:** Carley Beck (@supermodelgamer)

---

## 1. PREMISE

Lady Eleanor Thornwood, the reclusive owner of Thornwood Manor, has vanished. The police believe she left voluntarily. Her housekeeper, Mrs. Pembrook, believes otherwise and has called in Nancy Drew.

As Nancy, the player explores the manor, questions three suspects, collects evidence, solves puzzles, and pieces together what really happened — uncovering a decades-old family secret in the process.

**The twist:** Lady Thornwood staged her own disappearance to force the truth about her sister's disinheritance into the open. She's alive, hidden in the sealed east wing, waiting to see which of the people around her would reveal their true nature when they thought no one was watching.

---

## 2. CHARACTERS

### Nancy Drew (player character)
- Never seen on screen (first-person perspective through interactions)
- Voice expressed through dialogue choices and journal entries
- Curious, brave, methodical

### Mrs. Pembrook — The Housekeeper
- **Role:** Ally and information source
- **Location:** Foyer (Chapter 1), Kitchen (Chapter 2–3)
- **Motive:** Genuine loyalty to Lady Thornwood. She knows more than she lets on — she helped Eleanor plan the disappearance but is sworn to secrecy
- **Key info she provides:** Suspect backgrounds, manor history, hints about the safe combination
- **Dialogue unlocks:** learned_about_graves, learned_about_whitfield, kitchen_access

### Mr. Graves — The Nephew
- **Role:** Primary red herring / suspect
- **Location:** Garden Pavilion (Chapter 2), Study (caught snooping)
- **Motive:** Wants the inheritance. Has been pressuring Lady Thornwood to update her will. Genuinely angry but not dangerous
- **Secret:** He's in debt to dangerous people and desperately needs money, but he didn't harm his aunt
- **Key info he provides:** Details about the will, Miss Whitfield's frequent visits, the locked east wing
- **Dialogue unlocks:** learned_about_debt, east_wing_mentioned

### Miss Whitfield — The Solicitor
- **Role:** The actual antagonist (subtle)
- **Location:** Drawing Room (Chapter 2–3)
- **Motive:** Has been embezzling from the Thornwood estate for years through fraudulent legal fees. Lady Thornwood discovered this — it's why she staged the disappearance, to gather proof
- **Secret:** She's been forging Lady Thornwood's signature on financial documents
- **Key info she provides:** Legal details about the estate, misdirection about Mr. Graves
- **Dialogue unlocks:** learned_about_forgery, safe_deposit_clue

### Mr. Chen — The Gardener
- **Role:** Minor character / atmosphere
- **Location:** Garden (Chapter 2)
- **Provides:** Background about the manor, a key item (garden shed key), and a cryptic comment about "the lady who walks at night" (foreshadowing that Eleanor is still in the house)

---

## 3. CHAPTER STRUCTURE

The game is divided into three chapters. Each chapter unlocks new rooms, new dialogue, and new puzzles. Chapter transitions are triggered by completing all required objectives.

### Chapter 1: Arrival
**Rooms:** Foyer, Study
**Goal:** Establish the mystery, meet Mrs. Pembrook, enter the study, open the safe

| Step | Action | Type | Unlocks |
|------|--------|------|---------|
| 1 | Arrive at Foyer, examine environment | Explore | Context |
| 2 | Talk to Mrs. Pembrook | Dialogue | learned_about_graves flag, residents info |
| 3 | Pick up Brass Key from foyer table | Pickup | Study access |
| 4 | Use Brass Key on Study door | Use item | Study room |
| 5 | Examine desk — find financial records | Inspect | Journal: "Suspicious withdrawals" |
| 6 | Examine bookshelf — find pulled-out book | Inspect | Journal: "Art of Deception — pages 8, 23, 42" |
| 7 | Find safe combination note in desk drawer | Pickup | safe_combination item |
| 8 | Open wall safe with combination 8-23-42 | Puzzle (combination) | Faded Photograph, Torn Letter (half 1) |
| 9 | Examine photograph — two women, one crossed out | Inspect | Journal: "Who is the second woman?" |

**Chapter 1 complete when:** Safe opened + photograph examined

### Chapter 2: Investigation
**Rooms:** Foyer, Study, Kitchen, Garden, Garden Pavilion, Drawing Room
**Goal:** Interview all suspects, gather evidence, discover the east wing

| Step | Action | Type | Unlocks |
|------|--------|------|---------|
| 1 | Kitchen unlocks — talk to Mrs. Pembrook again | Dialogue | learned_about_whitfield, kitchen clues |
| 2 | Find recipe box with hidden note | Inspect | Journal: "Mrs. P knows more than she says" |
| 3 | Garden opens — meet Mr. Chen | Dialogue | Garden shed key item |
| 4 | Use garden shed key — find torn letter (half 2) | Use item + Pickup | Complete torn letter |
| 5 | Solve Torn Letter puzzle — keyword "inheritance" | Puzzle (logic) | Journal: "The letter reveals a dispute over inheritance" |
| 6 | Garden Pavilion — confront Mr. Graves | Dialogue | learned_about_debt, east_wing_mentioned |
| 7 | Drawing Room — meet Miss Whitfield | Dialogue | learned_about_forgery (if you have right evidence) |
| 8 | Find forged signature sample on drawing room desk | Inspect + Compare | Journal: "Whitfield's handwriting matches forged documents" |
| 9 | Examine east wing door — locked, need special key | Inspect | Objective: find east wing key |
| 10 | Return to Mrs. Pembrook with evidence about forgery | Dialogue (conditional) | East wing key from Mrs. P |

**Chapter 2 complete when:** East wing key obtained + all three suspects interviewed

### Chapter 3: The Truth
**Rooms:** All previous + East Wing, Lady Thornwood's Hidden Room
**Goal:** Find Lady Thornwood, confront the truth, resolve the mystery

| Step | Action | Type | Unlocks |
|------|--------|------|---------|
| 1 | Use east wing key on east wing door | Use item | East Wing corridor |
| 2 | Navigate dark corridor — find lantern | Pickup | Illuminated east wing |
| 3 | Discover Lady Thornwood's hidden room | Navigate | Final confrontation |
| 4 | Talk to Lady Thornwood | Dialogue | Full reveal of the plot |
| 5 | Final puzzle — arrange evidence on the clue board | Puzzle (logic/arrange) | Case closed |
| 6 | Choose ending: report Whitfield, confront Whitfield privately, or let Lady Thornwood handle it | Choice | Ending variant |
| 7 | Epilogue text based on choice | Narrative | Credits |

---

## 4. ROOMS

Each room is a single static illustrated screen with interactive hotspots. No scrolling — the full room fits the viewport (1280x720 scaled to fit).

### Room List

| Room | Chapter | Background mood | Hotspot count (target) |
|------|---------|----------------|----------------------|
| Foyer | 1 | Grand, dusty, pale light through windows | 5–7 |
| Study | 1–3 | Dark wood, scattered papers, green desk lamp | 5–7 |
| Kitchen | 2–3 | Warm, copper pots, old range, herbs hanging | 4–6 |
| Garden | 2–3 | Overgrown, misty, iron gate, hedge maze edge | 4–6 |
| Garden Pavilion | 2–3 | Crumbling stone, ivy, Mr. Graves' temporary quarters | 3–5 |
| Drawing Room | 2–3 | Formal, velvet chairs, legal documents, cold fireplace | 4–6 |
| East Wing Corridor | 3 | Dark, dusty, cobwebs, locked doors, eerie | 3–4 |
| Hidden Room | 3 | Surprisingly lived-in, candles, Lady Thornwood's refuge | 3–5 |

### Room Data Structure (rooms.json)

Each room entry contains:
```json
{
  "id": "room_id",
  "name": "Display Name",
  "description": "Atmospheric description shown on entry",
  "background": "backgrounds/room_id.png",
  "ambience": "audio/room_id_ambience.mp3",
  "chapter": 1,
  "hotspots": [...]
}
```

### Hotspot Types

| Type | Behavior | Fields |
|------|----------|--------|
| `inspect` | Shows description text. May add journal entry | description, journalEntry? |
| `pickup` | Adds item to inventory. Disappears after use | itemId, onceOnly |
| `locked` | Requires item or puzzle to interact | requiredItem?, puzzleId?, targetRoom? |
| `navigate` | Moves to another room | targetRoom |
| `talk` | Opens dialogue with NPC | dialogueId |
| `use` | Requires a specific selected inventory item | requiredItem, description, triggerEvent? |
| `conditional` | Only appears when a flag is set | showWhen, type (any of above) |

---

## 5. INVENTORY

### Design Rules
- Maximum 12 item slots
- Items display as icon + name in a bottom panel
- Tap/click an item to "select" it (highlighted border)
- Tap a hotspot with a selected item to attempt "use item on hotspot"
- Key items cannot be discarded
- Some items are consumed on use (e.g., keys), some persist (e.g., magnifying glass)

### Item List

| Item | Found in | Used on | Consumed? | Chapter |
|------|----------|---------|-----------|---------|
| Brass Key | Foyer table | Study door | Yes | 1 |
| Magnifying Glass | Study desk drawer | Various inspect hotspots (enhanced descriptions) | No | 1 |
| Safe Combination | Study desk (hidden) | Wall safe | Yes | 1 |
| Faded Photograph | Wall safe | Dialogue with Mrs. Pembrook (Ch.2) | No | 1 |
| Torn Letter (half 1) | Wall safe | Combined with half 2 | Yes (combines) | 1 |
| Torn Letter (half 2) | Garden shed | Combined with half 1 | Yes (combines) | 2 |
| Complete Letter | Combining both halves | Dialogue with Graves / Whitfield | No | 2 |
| Garden Shed Key | Mr. Chen (dialogue) | Garden shed | Yes | 2 |
| Recipe Box Note | Kitchen recipe box | Dialogue with Mrs. Pembrook | No | 2 |
| Forged Document | Drawing Room desk | Dialogue with Mrs. Pembrook / evidence board | No | 2 |
| East Wing Key | Mrs. Pembrook (Ch.2 finale) | East wing door | Yes | 2 |
| Lantern | East Wing corridor | Illuminates dark areas | No | 3 |
| Lady Thornwood's Journal | Hidden room | Evidence board (final puzzle) | No | 3 |

---

## 6. PUZZLES

Each puzzle has a UI modal that appears over the game. All puzzles are solvable with clues found in-game — no outside knowledge required.

### Puzzle Types

| Type | UI | Input |
|------|-----|-------|
| `combination` | Three rotating number dials | Player sets each dial, submits |
| `logic` | Text input with prompt | Player types a word/phrase |
| `arrange` | Drag-and-drop or tap-to-order | Player arranges items in correct sequence |
| `compare` | Side-by-side view | Player identifies matching elements |

### Puzzle List

| Puzzle | Type | Location | Answer | Clues scattered in |
|--------|------|----------|--------|--------------------|
| Wall Safe | combination | Study | 8-23-42 | Bookshelf, desk, Mrs. Pembrook dialogue |
| Torn Letter | logic | Inventory (combine) | "inheritance" | Both letter halves |
| Signature Match | compare | Drawing Room | Select matching signatures | Forged doc + Lady Thornwood's real signature |
| Evidence Board | arrange | Hidden Room | Correct event timeline | All journal entries |

### Puzzle Feedback
- **Wrong answer:** Gentle shake animation, "That doesn't seem right" text, no penalty
- **Correct answer:** Satisfying unlock animation, gold flash, item/room/flag reward
- **Hints:** After 3 wrong attempts, a subtle hint appears ("Perhaps the book held a clue...")

---

## 7. DIALOGUE SYSTEM

### Design Rules
- Dialogue appears in a bottom panel (not a popup that blocks the room)
- Speaker name in gold, text in cream
- Player choices shown as tappable buttons (minimum 48px tall)
- Tap anywhere on the dialogue box or "Continue" to advance non-choice lines
- Choices can be gated by: inventory items, flags, or previously triggered events
- Greyed-out choices show what you *could* ask if you had the right evidence
- Key conversations add journal entries automatically
- Dialogue is skippable (fast-forward button)

### Dialogue Data Structure (dialogue.json)

```json
{
  "id": "dialogue_id",
  "speaker_portrait": "portraits/character.png",
  "nodes": [
    {
      "id": "node_id",
      "lines": [
        { "speaker": "Character", "text": "Line of dialogue." }
      ],
      "choices": [
        {
          "text": "Choice text shown to player",
          "nextNode": "target_node_id",
          "requiredItem": "item_id",
          "requiredFlag": "flag_name",
          "triggerEvent": "event_flag_to_set",
          "giveItem": "item_id_to_give_player",
          "journalEntry": "Text added to journal"
        }
      ],
      "nextNode": "auto_advance_node_id"
    }
  ]
}
```

### Planned Dialogue Trees

| ID | Character | Chapter | Nodes (est.) | Key unlocks |
|----|-----------|---------|-------------|-------------|
| housekeeper_intro | Mrs. Pembrook | 1 | 5 | learned_about_graves |
| housekeeper_ch2 | Mrs. Pembrook | 2 | 8 | kitchen_access, east_wing_key (conditional) |
| housekeeper_evidence | Mrs. Pembrook | 2 | 4 | east_wing_key (requires forged_document) |
| graves_pavilion | Mr. Graves | 2 | 7 | learned_about_debt, east_wing_mentioned |
| graves_confronted | Mr. Graves | 3 | 4 | Confession about money troubles |
| whitfield_intro | Miss Whitfield | 2 | 6 | Misdirection about Graves |
| whitfield_evidence | Miss Whitfield | 2–3 | 5 | Defensive behavior (requires complete_letter) |
| chen_garden | Mr. Chen | 2 | 4 | garden_shed_key, "lady who walks at night" hint |
| thornwood_reveal | Lady Thornwood | 3 | 10 | Full story reveal, ending choice |

---

## 8. JOURNAL / CLUE BOARD

### Journal
- Accessed via "Journal" button in the UI bar
- Entries are added automatically when key inspections or dialogue events occur
- Each entry has: timestamp (in-game), short title, description
- Entries are organized by chapter
- New entries flash the Journal button gold briefly

### Clue Board (Chapter 3 — Final Puzzle)
- Visual board where collected evidence is arranged
- Player places journal entries / items in chronological order
- Completing the board triggers the final confrontation
- This IS the final puzzle — it proves Nancy has pieced the whole story together

### Journal Entry Examples

| Trigger | Title | Text |
|---------|-------|------|
| Examine foyer table | Unfinished Letter | "A half-finished letter on the foyer table, addressed to 'E.W.' The ink was still wet." |
| Open safe | The Safe's Contents | "The wall safe contained a faded photograph and half a torn letter. Who is the crossed-out woman?" |
| Talk to Graves about debt | Graves' Debt | "Mr. Graves is in serious financial trouble. He needs the inheritance — but is that motive enough?" |
| Find forged signature | The Forgery | "Miss Whitfield's handwriting matches the forged documents. She's been stealing from the estate." |
| Find Lady Thornwood | Lady Thornwood Lives | "She's been here the whole time — hiding in the east wing, watching and waiting." |

---

## 9. SAVE SYSTEM

- Auto-save on room transitions and after major events (puzzle solved, chapter change)
- Manual save via pause menu
- Single save slot for MVP (multiple slots later)
- Saved to localStorage under key `nancy-drew-save`
- Save data includes: current room, chapter, inventory, dialogue flags, solved puzzles, journal entries, game flags

---

## 10. UI / UX

### Screen Layout (during gameplay)

```
┌──────────────────────────────────────┐
│  Room Name                           │
│                                      │
│                                      │
│         [Room Background]            │
│      [Hotspot] [Hotspot] [NPC]       │
│                                      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ [Items]              [Journal] [⚙]  │
└──────────────────────────────────────┘
```

### Mobile Considerations
- All tap targets minimum 48x48px
- Inventory panel slides up from bottom, doesn't obscure critical hotspots
- Dialogue choices are full-width buttons with generous padding
- No hover-dependent interactions — everything works on tap
- Landscape orientation preferred, portrait should still be playable
- Font sizes never below 14px on mobile

### Visual Style
- **Palette:** Deep navy (#0a0a1a, #1a1a2e), warm gold (#c9a84c), cream (#e0d5c0), muted tones
- **Typography:** Georgia or similar serif for all game text
- **Hotspots:** Subtle gold outline with low-opacity fill, brightens on hover/focus
- **Animations:** Fade transitions between rooms (400–500ms), gentle tweens on UI elements
- **No pixel art** — this is an illustrated, "premium" detective game aesthetic

---

## 11. AUDIO (future)

| Type | Examples | Format |
|------|----------|--------|
| Ambience | Rain, clock ticking, fire crackling, garden birds | Looping MP3 |
| UI sounds | Button click, item pickup, puzzle unlock, journal open | Short MP3 |
| Music | Title theme, investigation theme, tension theme, resolution | Looping MP3 |

Audio is **not required for MVP** but the system should support it from the start (Phaser's audio manager handles this natively).

---

## 12. IMPLEMENTATION STATUS

### What's Built

| System | Status | Notes |
|--------|--------|-------|
| Phaser + TS + Vite scaffold | Done | Builds clean |
| BootScene (loading) | Done | Minimal — ready for asset preloading |
| TitleScene | Done | Title, subtitle, start button, fade |
| RoomScene | Done | Hotspot rendering, all 5 types, room transitions |
| UIScene | Done | Inventory panel, journal button (placeholder) |
| InventorySystem | Done | Add, remove, select, serialize |
| DialogueSystem | Done | Lines, branching choices, conditions, events |
| PuzzleSystem | Done | Answer checking, clue retrieval, serialize |
| SaveSystem | Done | Full save/load to localStorage |
| rooms.json (Foyer, Study) | Done | 2 rooms, 9 hotspots |
| items.json | Done | 5 items |
| dialogue.json | Done | 1 dialogue tree (Mrs. Pembrook intro) |
| puzzles.json | Done | 2 puzzles defined |

### What Needs Building (in priority order)

| # | Task | Scope | Depends on |
|---|------|-------|------------|
| 1 | **Puzzle interaction UI** | Modal overlay with combination dial / text input | PuzzleSystem |
| 2 | **Journal UI** | Slide-up panel listing journal entries by chapter | SaveSystem |
| 3 | **Conditional hotspots** | Hotspots that appear/disappear based on flags | RoomScene |
| 4 | **Item-on-hotspot interaction** | Select inventory item, tap hotspot to "use" | InventorySystem + RoomScene |
| 5 | **Chapter progression** | Chapter flag gating room access + new dialogue | SaveSystem + rooms.json |
| 6 | **Kitchen room + data** | Room, hotspots, Mrs. Pembrook Ch.2 dialogue | rooms.json, dialogue.json |
| 7 | **Garden + Pavilion rooms** | Rooms, Mr. Chen + Mr. Graves dialogues | rooms.json, dialogue.json |
| 8 | **Drawing Room** | Room, Miss Whitfield dialogue, forged document | rooms.json, dialogue.json |
| 9 | **East Wing + Hidden Room** | Final rooms, Lady Thornwood dialogue | rooms.json, dialogue.json |
| 10 | **Evidence board puzzle** | Drag-and-drop / tap-to-order final puzzle UI | PuzzleSystem |
| 11 | **Ending sequences** | 3 ending variants based on player choice | Narrative text |
| 12 | **Room background art** | Illustrated backgrounds for all 8 rooms | Asset pipeline |
| 13 | **Character portraits** | Portrait art for dialogue panels | Asset pipeline |
| 14 | **Audio integration** | Ambience + UI sounds | Phaser audio |
| 15 | **Polish pass** | Animations, transitions, edge cases, mobile QA | Everything |

---

## 13. DESIGN PRINCIPLES

These are non-negotiable rules that every contributor (human or AI agent) must follow:

1. **Every puzzle is solvable from in-game clues.** No outside knowledge, no moon logic.
2. **Every item has a clear use.** No red herring inventory items. If it's in inventory, it matters.
3. **Every conversation reveals something.** No filler dialogue. Every NPC line either builds character, delivers a clue, or advances the plot.
4. **The player should never be stuck without knowing what to do next.** Journal entries serve as implicit task tracking. If stuck, re-read the journal.
5. **Mobile is not an afterthought.** Every interaction must work with a finger on a phone screen.
6. **Keep it moody, not scary.** This is elegant mystery, not horror. Tension through atmosphere and story, never jump scares.
7. **Data-driven content.** Rooms, items, dialogue, and puzzles live in JSON. Adding content should not require touching game engine code.
8. **Small, testable milestones.** Each task on the build list should result in something the player can see or do.

---

## 14. AGENT WORKFLOW

When assigning tasks to an AI coding agent (Codex, Claude, etc.), follow this sequence:

1. **Reference this GDD** — point the agent to `GAME_DESIGN.md`
2. **Give one task from Section 12's build list** — don't batch tasks
3. **Require a build check** — agent must run `npm run build` after changes
4. **Require a summary** — agent must list every file changed and why
5. **Review before merging** — check that the change matches the GDD

### Example agent prompt:
```
Read GAME_DESIGN.md section 6 (Puzzles) and section 12 (build list).

Implement task #1: Puzzle interaction UI.

Build a modal overlay that appears when the player interacts with a puzzle-type
hotspot. For "combination" type, show three number dials. For "logic" type,
show a text input. Validate against PuzzleSystem.checkAnswer(). On success,
award the item defined in puzzles.json "unlocks" field and close the modal.
On failure, show feedback. Keep it mobile-friendly.

Run npm run build when done. Summarize all changes.
```

---

*This document is the single source of truth for Mystery at Thornwood Manor. Update it as the game evolves. Every room, item, puzzle, and character is defined here. If it's not in the GDD, it's not in the game.*
