# Game Design Document
# NANCY DREW: The Last Curtain Call

> **Format:** 2D point-and-click browser game (Phaser 3 + TypeScript + Vite)
> **Platform:** Desktop and mobile browsers, responsive
> **Tone:** Moody, elegant, mysterious — classic Nancy Drew detective adventure
> **Created by:** Carley Beck (@supermodelgamer)

---

## 1. PREMISE

The Monarch Theatre — a grand 1920s playhouse — is scheduled for demolition in 72 hours. Its new owner, real estate developer Roland Ashworth, plans to replace it with luxury condominiums. But the theater's last resident, retired actress Vivian Delacroix, insists the building is haunted by the ghost of Margaux Fontaine, a legendary actress who died on stage in 1928 during the final performance of *The Crimson Veil*.

When Ashworth collapses from a mysterious poisoning on the eve of demolition, Vivian calls Nancy Drew.

As Nancy, the player explores the theater, questions four suspects, collects evidence, solves puzzles, and uncovers two intertwined mysteries — a modern-day poisoning and a century-old murder.

**The twist:** Theater historian Edwin Hale discovered proof that Margaux Fontaine was poisoned by her jealous understudy, Cecilia Drake, who went on to become famous using the role she stole. To stop the demolition and expose the 1928 murder, Edwin has been staging "ghost" sightings using the theater's original special effects — trapdoors, fog machines, hidden passages behind the walls. When Ashworth discovered his scheme, Edwin poisoned him (non-lethally) to buy time. The ghost is a lie built to reveal a truth.

---

## 2. CHARACTERS

### Nancy Drew (player character)
- Never seen on screen (first-person perspective through interactions)
- Voice expressed through dialogue choices and journal entries
- Curious, brave, methodical

### Vivian Delacroix — The Retired Actress
- **Role:** Ally and quest-giver
- **Age:** 70s
- **Location:** Grand Lobby (Chapter 1), Dressing Room (Chapter 2–3)
- **Motive:** Genuinely wants to save the theater. Knew Margaux Fontaine as a child — Margaux was her godmother
- **Secret:** She has a personal stake she downplays — she's Margaux's goddaughter and the theater is the last connection to the woman who inspired her career
- **Key info she provides:** Theater history, suspect introductions, Margaux's story, the night of the poisoning
- **Dialogue unlocks:** learned_about_margaux, learned_about_ashworth, dressing_room_key

### Edwin Hale — The Theater Historian
- **Role:** Hidden antagonist (sympathetic)
- **Age:** 50s
- **Location:** Auditorium (Chapter 1–2), Basement (Chapter 3 — caught)
- **Motive:** Obsessive preservationist. Discovered proof of Margaux's murder and believes exposing it will grant the theater landmark status, saving it from demolition
- **Secret:** He IS the ghost. He's been using the theater's 1920s special effects system (fog machines, trapdoors, a hidden passage network) to stage hauntings. He poisoned Ashworth's tea with a non-lethal compound when Ashworth caught him in the basement
- **Key info he provides:** Theater architecture, the history of *The Crimson Veil*, details about Cecilia Drake, "helpful" theories that subtly misdirect
- **Dialogue unlocks:** learned_about_crimson_veil, learned_about_effects_system, basement_mentioned

### Roland Ashworth — The Developer
- **Role:** Victim / suspect (recovering from poisoning)
- **Age:** 40s
- **Location:** Manager's Office (Chapter 2–3, bedridden)
- **Motive:** Wants to demolish the theater for profit. Not sympathetic, but didn't deserve to be poisoned
- **Secret:** He discovered someone had been living in the basement and using the old effects systems — he was poisoned because he found out too much
- **Key info he provides:** What he saw before collapsing, financial records showing someone's been accessing the theater at night, blueprints with hidden rooms marked
- **Dialogue unlocks:** learned_about_basement_intruder, saw_figure_before_collapse

### Stella Morrow — The Stage Manager
- **Role:** Red herring / information source
- **Age:** 30s
- **Location:** Backstage (Chapter 1–2), Catwalk (Chapter 3)
- **Motive:** Has keys to every room. Practical, no-nonsense. Seems suspicious because she's been secretly selling valuable theater props and artifacts to fund her mother's medical bills
- **Secret:** She's been stealing and selling props — but she's not the ghost or the poisoner. She's terrified the investigation will expose her theft
- **Key info she provides:** Backstage access, technical theater knowledge, who had access to what and when, the old effects manual
- **Dialogue unlocks:** learned_about_missing_props, effects_manual_location, catwalk_access

### Diego Reyes — The Playwright
- **Role:** Minor character / clue source
- **Age:** 20s
- **Location:** Projection Booth (Chapter 2)
- **Provides:** Found the original annotated script of *The Crimson Veil* with strange margin notes (which encode the truth about Margaux's murder). Renting rehearsal space. Heard noises from the basement at night. Offers a fresh outsider perspective
- **Dialogue unlocks:** annotated_script_found, heard_basement_noises

---

## 3. CHAPTER STRUCTURE

The game is divided into three chapters. Each chapter unlocks new rooms, new dialogue, and new puzzles. Chapter transitions are triggered by completing all required objectives.

### Chapter 1: Opening Night
**Rooms:** Grand Lobby, Auditorium, Backstage
**Goal:** Arrive at the theater, meet the cast, witness a "ghost" sighting, gather initial clues

| Step | Action | Type | Unlocks |
|------|--------|------|---------|
| 1 | Arrive at Grand Lobby, examine environment | Explore | Context |
| 2 | Talk to Vivian Delacroix | Dialogue | learned_about_margaux, learned_about_ashworth |
| 3 | Pick up Vivian's master key from lobby desk | Pickup | Auditorium access |
| 4 | Enter Auditorium — examine the stage | Inspect | Journal: "The stage where Margaux fell" |
| 5 | Talk to Edwin Hale in the audience seats | Dialogue | learned_about_crimson_veil |
| 6 | Ghost event: lights flicker, fog rolls across stage, a figure appears and vanishes | Scripted | Journal: "The ghost of Margaux Fontaine?" |
| 7 | Go Backstage — meet Stella Morrow | Dialogue | learned_about_missing_props, effects_manual_location |
| 8 | Find the old effects manual on the tech shelf | Pickup | effects_manual item |
| 9 | Examine the fog machine backstage — recently used | Inspect | Journal: "Someone ran this fog machine tonight" |

**Chapter 1 complete when:** Ghost witnessed + effects manual found + all three NPCs talked to

### Chapter 2: Intermission
**Rooms:** All Chapter 1 + Dressing Room, Projection Booth, Manager's Office
**Goal:** Investigate the poisoning, discover hidden passages, find proof of the 1928 murder

| Step | Action | Type | Unlocks |
|------|--------|------|---------|
| 1 | Dressing Room unlocks — examine Margaux's preserved vanity | Inspect | Journal: "Margaux's dressing room, untouched since 1928" |
| 2 | Find Margaux's personal diary in the vanity drawer | Pickup | margaux_diary item |
| 3 | Read diary — she suspected someone was poisoning her | Inspect | Journal: "Margaux knew. She was being poisoned slowly" |
| 4 | Talk to Vivian about the diary | Dialogue | Deeper history, Cecilia Drake named |
| 5 | Projection Booth — meet Diego Reyes | Dialogue | annotated_script_found |
| 6 | Examine the annotated script — margin notes in code | Pickup + Inspect | annotated_script item |
| 7 | Solve Script Cipher puzzle — decode the margin notes | Puzzle (logic) | Journal: "The annotations spell out: 'Cecilia changed the prop goblet for a real one'" |
| 8 | Manager's Office — talk to bedridden Ashworth | Dialogue | learned_about_basement_intruder, blueprints |
| 9 | Examine blueprints on Ashworth's desk — hidden passages marked | Inspect | Journal: "The theater has a network of hidden passages behind the walls" |
| 10 | Find Ashworth's teacup — residue inside | Pickup | poisoned_teacup item |
| 11 | Talk to Stella about hidden passages | Dialogue (conditional, need blueprints) | catwalk_access, basement key location |
| 12 | Return to Backstage — find basement key hidden in the lighting panel | Pickup | basement_key item |

**Chapter 2 complete when:** Script cipher solved + Ashworth interviewed + basement key obtained

### Chapter 3: Final Act
**Rooms:** All previous + Catwalk, Basement
**Goal:** Descend into the basement, unmask the ghost, confront the truth, resolve both mysteries

| Step | Action | Type | Unlocks |
|------|--------|------|---------|
| 1 | Catwalk — examine the lighting rig, find Edwin's notebook | Pickup | edwins_notebook item |
| 2 | Read notebook — Edwin's research into Margaux's murder, his plan to save the theater | Inspect | Journal: "Edwin Hale has been investigating Margaux's death for years" |
| 3 | Use basement key on basement door (Backstage) | Use item | Basement room |
| 4 | Basement — discover the ghost setup (fog machine controls, trapdoor mechanism, costume) | Explore | Journal: "This is how the ghost was made" |
| 5 | Confront Edwin Hale in the basement | Dialogue | Full confession — he staged everything, he poisoned Ashworth |
| 6 | Final puzzle — Evidence Board: connect the clues to prove both cases | Puzzle (arrange) | Case closed |
| 7 | Choose ending | Choice | Ending variant |
| 8 | Epilogue text based on choice | Narrative | Credits |

---

## 4. ROOMS

Each room is a single static illustrated screen with interactive hotspots. No scrolling — the full room fits the viewport (1280x720 scaled to fit).

### Room List

| Room | Chapter | Background mood | Hotspot count (target) |
|------|---------|----------------|----------------------|
| Grand Lobby | 1 | Faded opulence, marble floors, dusty chandelier, torn movie posters, ticket booth | 5–7 |
| Auditorium | 1–3 | Vast dark space, rows of velvet seats, grand stage with crimson curtain, balcony shadows | 5–7 |
| Backstage | 1–3 | Cluttered, costume racks, prop tables, rigging ropes, industrial lighting, fog machine | 5–7 |
| Dressing Room | 2–3 | Margaux's preserved vanity with lightbulb mirror, costumes on hooks, dried flowers, old playbills | 4–6 |
| Projection Booth | 2 | Cramped, old projectors, film canisters, Diego's scattered papers, flickering monitors | 4–6 |
| Manager's Office | 2–3 | Ashworth's temporary setup, blueprints on desk, modern laptop amid old furniture, cot in corner | 4–6 |
| Catwalk | 3 | Precarious metal walkway above the stage, lighting rigs, vertiginous view down, shadows | 3–5 |
| Basement | 3 | Under the stage — trapdoor mechanisms, old set pieces, fog machine controls, hidden passage entrance, Edwin's workshop | 4–6 |

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
| Master Key | Grand Lobby desk | Auditorium door | Yes | 1 |
| Magnifying Glass | Grand Lobby desk | Vanity mirror, film frames (reveals hidden details) | No | 1 |
| 1928 Playbill | Auditorium seat pocket | Reference, trunk combo clue, evidence board | No | 1 |
| Effects Manual | Backstage shelf | Reference for puzzles / dialogue conditionals | No | 1 |
| Margaux's Diary | Dressing Room vanity | Dialogue with Vivian/Edwin, evidence board | No | 2 |
| Annotated Script | Projection Booth | Script Cipher puzzle, evidence board | No | 2 |
| Poisoned Teacup | Manager's Office | Poison identification puzzle, evidence board | No | 2 |
| Blueprints | Manager's Office (conditional) | Passage navigation puzzle, dialogue with Stella | No | 2 |
| Basement Key | Backstage lighting panel (conditional) | Basement door | Yes | 2 |
| Margaux's Locket | Dressing Room trunk (puzzle reward) | Dialogue with Vivian (emotional reveal) | No | 2 |
| Stella's Records | Backstage lockbox (puzzle reward) | Confrontation with Stella | No | 2 |
| Ashworth's Files | Office safe (puzzle reward) | Confrontation with Ashworth | No | 2 |
| Chemical Receipt | Lobby coat check | Red herring / supplementary evidence | No | 1 |
| Edwin's Notebook | Catwalk (lighting puzzle reward) | Evidence board | No | 3 |
| Fog Machine Part | Basement | Evidence board | No | 3 |
| Cecilia's Letters | Basement alcove | Evidence board — proves 1928 murder | No | 3 |

---

## 6. PUZZLES

Each puzzle has a UI modal that appears over the game. All puzzles are solvable with clues found in-game — no outside knowledge required.

### Puzzle Types

| Type | UI | Input |
|------|-----|-------|
| `combination` | Three rotating number dials | Player sets each dial, submits |
| `logic` | Text input with prompt | Player types a word/phrase |
| `sequence` | Tap-to-order items | Player arranges items in correct sequence |
| `compare` | Side-by-side view | Player identifies matching elements |

### Puzzle List

| Puzzle | Type | Location | Answer | Clues scattered in |
|--------|------|----------|--------|--------------------|
| Dressing Room Trunk | combination | Dressing Room | 10-31-28 | Playbill date (Oct 31 1928), diary entry, Vivian dialogue |
| Script Cipher | logic | Projection Booth (annotated script) | "goblet" | Margin notes, effects manual, Diego's observations |
| Vanity Mirror | logic | Dressing Room (requires magnifying glass) | "cd" | Mirror wax message, wall photos, playbill understudy listing |
| Film Frames | sequence | Projection Booth (requires magnifying glass) | toast-drink-collapse-understudy | Script stage directions, playbill, diary entries |
| Stella's Lockbox | combination | Backstage | 4200 | Call board inventory notice ($4,200 missing), Stella's dialogue |
| Office Wall Safe | combination | Manager's Office | 1928 | Ashworth's ghost book, heritage filing, playbills everywhere |
| Lighting Sequence | sequence | Catwalk | red-blue-white-red | Effects manual, annotated script symbols, Edwin's seat note |
| Hidden Passage | logic | Basement (requires blueprints) | "dressing room" | Blueprints, heating vent in dressing room, passage entrance |
| Poison Identification | logic | Inventory (requires teacup + alchemy book) | "antimony" | Alchemy book annotations, diary symptoms, basement chemicals |
| Evidence Board | sequence | Basement (final) | cecilia-goblet-margaux-edwin-ghost-ashworth | All journal entries and collected evidence |

### Puzzle Feedback
- **Wrong answer:** Gentle shake animation, "That doesn't seem right" text, no penalty
- **Correct answer:** Satisfying unlock animation, gold flash, item/room/flag reward
- **Hints:** After 3 wrong attempts, a subtle hint appears ("The playbill might hold the answer...")

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
| vivian_intro | Vivian Delacroix | 1 | 6 | learned_about_margaux, learned_about_ashworth |
| vivian_diary | Vivian Delacroix | 2 | 5 | learned_about_cecilia, learned_about_hale_family (conditional on diary) |
| vivian_locket | Vivian Delacroix | 2 | 3 | vivian_full_trust (conditional on locket item) |
| edwin_auditorium | Edwin Hale | 1 | 7 | learned_about_crimson_veil, conditional branches for diary/effects manual/grandfather |
| edwin_confronted | Edwin Hale | 3 | 8 | Full confession, 3 ending choices, conditional grandfather branch |
| ashworth_office | Roland Ashworth | 2 | 7 | learned_about_basement_intruder, conditional branches for poison ID/insurance files |
| stella_backstage | Stella Morrow | 1–2 | 8 | learned_about_missing_props, effects_manual_location, stella_confession, basement_key_location (conditional on lockbox/note) |
| stella_passages | Stella Morrow | 2 | 2 | catwalk_access (conditional on blueprints item) |
| diego_booth | Diego Reyes | 2 | 6 | annotated_script_found, heard_basement_noises, cipher_discussed (conditional on script_decoded) |
| phone_calls | Various (Bess/George, Carson, Historical Society) | 1–3 | 5 | called_friends, called_dad, called_historical_society |

---

## 8. JOURNAL / CLUE BOARD

### Journal
- Accessed via "Journal" button in the UI bar
- Entries are added automatically when key inspections or dialogue events occur
- Each entry has: timestamp (in-game), short title, description
- Entries are organized by chapter
- New entries flash the Journal button gold briefly

### Evidence Board (Chapter 3 — Final Puzzle)
- Visual board where collected evidence is arranged
- Player places journal entries / items in chronological order to connect both mysteries
- Two timelines must be solved: the 1928 murder AND the modern-day poisoning
- Completing the board triggers the final confrontation with Edwin
- This IS the final puzzle — it proves Nancy has pieced both stories together

### Journal Entry Examples

| Trigger | Title | Text |
|---------|-------|------|
| Enter Auditorium | The Stage | "The grand stage of the Monarch Theatre. This is where Margaux Fontaine collapsed during the final act of The Crimson Veil, October 31, 1928." |
| Ghost sighting | The Ghost | "Fog rolled across the stage and a pale figure appeared in the spotlight — then vanished. Is the Monarch truly haunted?" |
| Examine fog machine | Recent Activity | "The fog machine backstage was recently used. The fluid reservoir is half-empty and the nozzle is still damp." |
| Read Margaux's diary | Margaux Knew | "Margaux's diary reveals she suspected someone was slowly poisoning her in the weeks before her death. She wrote: 'The tea tastes wrong again.'" |
| Solve script cipher | The Goblet | "The coded margin notes in the original script spell out a message: 'Cecilia changed the prop goblet for a real one.' Margaux drank real poison on stage." |
| Find Edwin's notebook | The Historian's Obsession | "Edwin Hale has spent years researching Margaux's death. His notebook contains detailed evidence — and a plan to 'make the ghost real enough to save the theater.'" |

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
- **Palette:** Deep navy (#0a0a1a, #1a1a2e), warm gold (#c9a84c), cream (#e0d5c0), crimson accent (#8b1a1a), muted tones
- **Typography:** Georgia or similar serif for all game text
- **Hotspots:** Subtle gold outline with low-opacity fill, brightens on hover/focus
- **Animations:** Fade transitions between rooms (400–500ms), gentle tweens on UI elements
- **No pixel art** — this is an illustrated, "premium" detective game aesthetic
- **Theater aesthetic:** Art deco motifs, velvet textures, spotlight effects, dramatic shadows

---

## 11. AUDIO (future)

| Type | Examples | Format |
|------|----------|--------|
| Ambience | Empty theater echo, distant creaking, wind through old building, rain on roof | Looping MP3 |
| UI sounds | Button click, item pickup, puzzle unlock, journal open | Short MP3 |
| Music | Title theme (dramatic piano), investigation theme (tension strings), ghost theme (eerie), resolution | Looping MP3 |
| Theater sounds | Curtain movement, spotlight hum, audience ghost whispers, old projector whir | Context MP3 |

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
| rooms.json (all 8 rooms) | Done | 8 rooms, 95+ hotspots incl. atmospheric/conditional |
| items.json | Done | 16 items (12 key, 3 optional, 1 red herring) |
| dialogue.json | Done | 10 dialogue trees with conditional branches (requiredItem/requiredFlag) |
| puzzles.json | Done | 10 puzzles with progressive hint system |

### What Needs Building (in priority order)

| # | Task | Scope | Depends on |
|---|------|-------|------------|
| 1 | **Puzzle interaction UI** | Modal overlay with combination dial / text input | PuzzleSystem |
| 2 | **Journal UI** | Slide-up panel listing journal entries by chapter | SaveSystem |
| 3 | **Conditional hotspots** | Hotspots that appear/disappear based on flags | RoomScene |
| 4 | **Item-on-hotspot interaction** | Select inventory item, tap hotspot to "use" | InventorySystem + RoomScene |
| 5 | **Chapter progression** | Chapter flag gating room access + new dialogue | SaveSystem + rooms.json |
| 6 | **Ghost sighting scripted event** | Fog + spotlight + figure animation in Auditorium | RoomScene + chapter trigger |
| 7 | ~~Backstage room + data~~ | ~~Done — room, hotspots, Stella dialogue~~ | rooms.json, dialogue.json |
| 8 | ~~Dressing Room + Projection Booth~~ | ~~Done — rooms, puzzles, Diego dialogue~~ | rooms.json, dialogue.json |
| 9 | ~~Manager's Office~~ | ~~Done — room, Ashworth dialogue, puzzles~~ | rooms.json, dialogue.json |
| 10 | ~~Catwalk + Basement~~ | ~~Done — rooms, Edwin confrontation~~ | rooms.json, dialogue.json |
| 11 | **Evidence board puzzle UI** | Dual-timeline arrangement puzzle with visual board | PuzzleSystem |
| 12 | ~~Ending sequences~~ | ~~Done — 3 endings in Edwin confrontation dialogue~~ | dialogue.json |
| 13 | **Room background art** | Illustrated backgrounds for all 8 rooms | Asset pipeline |
| 14 | **Character portraits** | Portrait art for dialogue panels | Asset pipeline |
| 15 | **Audio integration** | Ambience + UI sounds | Phaser audio |
| 16 | **Polish pass** | Animations, transitions, edge cases, mobile QA | Everything |

---

## 13. THE THREE ENDINGS

After completing the Evidence Board, Nancy confronts Edwin. The player makes a final choice:

### Ending A: Justice
**Choice:** "I'm calling the police. You poisoned someone, Edwin."
- Edwin is arrested. The 1928 murder evidence is turned over to historians. The theater's fate is uncertain — the landmark petition is filed but may not save it in time. Ashworth recovers and likely proceeds with demolition.
- **Tone:** Bittersweet. Justice is served, but the theater may still fall. Nancy upholds the law.
- **Final line:** *"Sometimes the truth isn't enough to save what we love. But it's always enough to matter."*

### Ending B: Exposure
**Choice:** "Let's go public. The 1928 murder, the cover-up — all of it. Together."
- Nancy and Edwin hold a press conference. The story goes viral. Public pressure forces a landmark designation hearing. Edwin faces charges for the poisoning but becomes a folk hero. The theater is likely saved.
- **Tone:** Hopeful but complex. Edwin did wrong, but the greater truth prevails. Nancy bends the rules.
- **Final line:** *"The Monarch's lights came on for the first time in years. Not for a ghost — for the woman who deserved to be remembered."*

### Ending C: Mercy
**Choice:** "Walk away, Edwin. Disappear. I'll make sure Margaux's story gets told."
- Nancy lets Edwin go. She anonymously leaks the 1928 murder evidence to the press. The theater is saved, Margaux's name is cleared, but Ashworth's poisoning is never solved. Nancy compromises her principles.
- **Tone:** Morally grey. The theater is saved and the old wrong is righted, but a new wrong goes unpunished.
- **Final line:** *"I told myself it was the right call. I still tell myself that. Most days, I believe it."*

---

## 14. DESIGN PRINCIPLES

These are non-negotiable rules that every contributor (human or AI agent) must follow:

1. **Every puzzle is solvable from in-game clues.** No outside knowledge, no moon logic.
2. **Every item has a clear use.** No red herring inventory items. If it's in inventory, it matters.
3. **Every conversation reveals something.** No filler dialogue. Every NPC line either builds character, delivers a clue, or advances the plot.
4. **The player should never be stuck without knowing what to do next.** Journal entries serve as implicit task tracking. If stuck, re-read the journal.
5. **Mobile is not an afterthought.** Every interaction must work with a finger on a phone screen.
6. **Keep it moody, not scary.** This is elegant mystery, not horror. Tension through atmosphere and story, never jump scares.
7. **Data-driven content.** Rooms, items, dialogue, and puzzles live in JSON. Adding content should not require touching game engine code.
8. **Small, testable milestones.** Each task on the build list should result in something the player can see or do.
9. **The 72-hour ticking clock is atmospheric, not mechanical.** We don't show a literal countdown — chapter transitions imply time passing (Night 1, Day 2, Night 2). The urgency is narrative, not gamified.
10. **Both mysteries matter equally.** The 1928 murder isn't just backstory — it's the emotional core. The modern poisoning is the hook. Neither should overshadow the other.

---

## 15. AGENT WORKFLOW

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

*This document is the single source of truth for The Last Curtain Call. Update it as the game evolves. Every room, item, puzzle, and character is defined here. If it's not in the GDD, it's not in the game.*
