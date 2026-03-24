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
- Dialogue appears in a bottom panel with decorative gold art deco frames (not a popup that blocks the room)
- Large NPC portrait (440px, ~40% screen height) displayed beside the dialogue box in an ornate gold frame
- Nancy is never shown (first-person style) — when Nancy speaks, the NPC portrait dims to 50% opacity
- Speaker name in character-specific color on a gold nameplate, text in cream
- Content-aware box sizing: text is measured, box height clamped between 280–380px
- Typewriter text effect with per-character tick sound; click to complete instantly
- Player choices shown as decorative gold-framed buttons (minimum 48px tall)
- Tap anywhere on the dialogue box or "Continue" to advance non-choice lines
- Choices can be gated by: inventory items, flags, or previously triggered events
- Already-asked choices are dimmed with a checkmark and sorted to the bottom
- Key conversations add journal entries and thinking hints automatically
- Dialogue is skippable (skip button in top-right border area)
- Three-tier routing: base dialogue → revisit variant (with gated choices) → done variant (brief dismissal)
- NPCs appear/disappear from rooms based on story progress (showWhen/hideWhen on talk hotspots)

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

Full-screen game viewport with thin gold art-deco frame (6px borders). A floating semi-transparent HUD overlay in the top-right corner shows room name, stats, objective, and audio/settings controls. All overlay panels (evidence, journal, map, suspects, settings) render as full-screen book-style modals on top of the game view.

```
┌──────────────────────────────────────────────┐
│                                  ┌─────────┐ │
│                                  │ CH. 1   │ │
│                                  │ LOBBY   │ │
│        [Full-Screen Room]        │ Items   │ │
│     [Hotspot] [Hotspot] [NPC]    │ Clues   │ │
│                                  │ Obj...  │ │
│                                  │ 🔊 ⚙   │ │
│                                  └─────────┘ │
│                                              │
├──────────────────────────────────────────────┤
│  [Evidence]  [Suspects]  [Map]  [Journal]    │
└──────────────────────────────────────────────┘
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

## 11. AUDIO

### Audio Systems (Built)

| System | Status | Details |
|--------|--------|---------|
| **Procedural UI SFX** | Done | 25+ synthesized sound effects via Web Audio API (clicks, chimes, drones, stings) |
| **Ambient Audio System** | Done | Per-room layered audio: primary loop + secondary loop + procedural textures. Crossfades between rooms |
| **Cinematic Audio** | Done | Music, SFX, and VO playback during slide-based cinematics |
| **Dialogue VO** | Done (infrastructure) | Per-line voiceover support in dialogue system. Plays `vo` key from dialogue data |

### Procedural SFX Library (`sounds.ts`)

| Category | Sounds |
|----------|--------|
| **UI Interaction** | click, hover, panelOpen, dialogueTick, mapOpen |
| **Items & Discovery** | itemPickup, keyJingle, drawerOpen, pageTurn, discoveryReveal, photoSnap |
| **Puzzles** | puzzleSolve, wrongAnswer, safeDial, lockTumbler, evidencePlace |
| **Atmosphere** | ghostDrone, ghostDroneLong, ghostWhisper, eerieWhistle, shimmer, suspicionSting |
| **Theater** | curtainPull, spotlightClick, fogMachineHiss, trapDoorCreak, theaterDrone |
| **Cinematic** | gobletClink, bodyThud, phoneRing, doorCreak, heartbeat, lightSurge, poisonBubble |
| **Writing** | journalWrite, typewriterKey |

### Room Ambient Audio Config

| Room | Primary Loop | Secondary Loop | Procedural Layers |
|------|-------------|----------------|-------------------|
| Lobby | Abandoned building echo | — | Low drone (85Hz) |
| Auditorium | Horror ambient | — | Drone (65Hz) + periodic creak |
| Backstage | Abandoned building 2 | Wood creak | Electrical hum |
| Dressing Room | Horror ambient | — | Hum + vanity mirror tick |
| Projection Booth | Electrical hum | — | Projector tick (800Hz) + hum |
| Manager's Office | Abandoned building | Clock tick | Low hum |
| Catwalk | Metal ambience | — | Wind + metal creak |
| Basement | Creepy ambient | Water drip | Low drone (50Hz) + drip |

### Background Music System (Built)

Real MP3 music tracks from royalty-free sources, played via HTML5 Audio with crossfading, looping, and volume control. Each room maps to a specific track. Players can switch tracks from the settings panel (scrollable track selector).

| Track ID | In-Game Name | Description | Source | License |
|----------|-------------|-------------|--------|---------|
| signs_to_nowhere | Grand Lobby | Noir jazz — bass, vibraphone, muted trumpet | Shane Ivers | CC BY 4.0 |
| speakeasy | The Speakeasy | Uptempo 1920s jazz combo | Shane Ivers | CC BY 4.0 |
| mystery_unsolved | The Investigation | Piano, strings, theremin — detective energy | Shane Ivers | CC BY 4.0 |
| lobby_elegant | Chandelier Dreams | Warm, elegant strings and piano | Francisco Alvear (Mixkit) | Mixkit Free |
| gentle_piano | Midnight Theatre | Gentle piano — quiet reflection | Alejandro Magaña (Mixkit) | Mixkit Free |
| crypto | Velvet Curtain | Moody, building tension | Kevin MacLeod | CC BY 3.0 |
| ghost_story | The Empty Stage | Classic haunting atmosphere | Kevin MacLeod | CC BY 3.0 |
| darkest_child | Gaslight | Dark, unsettling — something lurks below | Kevin MacLeod | CC BY 3.0 |
| comfortable_mystery | The Study | Vintage electric piano — surreal, contemplative | Kevin MacLeod | CC BY 3.0 |
| dreamy_flashback | Crimson Veil | Soft, emotional — uncovering the truth | Kevin MacLeod | CC BY 3.0 |

Room-to-track mapping: lobby → signs_to_nowhere, auditorium → lobby_elegant, backstage → mystery_unsolved, dressing_room → comfortable_mystery, projection_booth → ghost_story, managers_office → crypto, catwalk → darkest_child, basement → dreamy_flashback.

### Audio File Needs

| Type | Examples | Format | Directory |
|------|----------|--------|-----------|
| Ambience | Room-specific atmospheric loops | Looping MP3/OGG | `assets/audio/` |
| UI sounds | Real-world versions of procedural SFX (optional upgrade) | Short MP3 | `assets/audio/sfx/` |
| Music | 10 tracks installed, may want more upbeat/lighthearted options | Looping MP3 | `public/music/` |
| Dialogue VO | Per-line voice acting for all 10 dialogue trees | MP3/OGG | `assets/vo/dialogue/` |
| Cinematic VO | Narrator voice for intro/cinematics (18 slides done) | MP3 | `assets/vo/intro/` |

### Dialogue VO Naming Convention

Files: `assets/vo/dialogue/{dialogueId}_{lineNumber}.mp3`

Example: `vivian_intro_01.mp3`, `vivian_intro_02.mp3`, etc.

In `dialogue.json`, add `"vo": "vo_vivian_intro_01"` to any line that has recorded audio. The system gracefully skips missing VO files.

---

## 11b. VISUAL ENHANCEMENT SYSTEMS

### Multi-Perspective Room Backgrounds

Each room supports **multiple alternate backgrounds** that activate based on story progression. This creates a sense that the world is changing as the player investigates.

```json
{
  "altBackgrounds": [
    {
      "key": "bg_lobby_after_ghost",
      "showWhen": "saw_ghost",
      "priority": 1,
      "description": "Updated room description when this background is active."
    },
    {
      "key": "bg_lobby_vivian_gone",
      "showWhen": "chapter_3",
      "priority": 2,
      "description": "Higher priority backgrounds override lower ones."
    }
  ]
}
```

**Rules:**
- Higher `priority` wins when multiple backgrounds are active simultaneously
- Each alt background can override the room's entry description
- Triggered by any valid flag, dialogue event, or `chapter_N` condition
- Falls back to the base background if image files don't exist yet

### Room Alt Background Manifest

| Room | Variant | Trigger | Priority | Visual Change |
|------|---------|---------|----------|--------------|
| **Lobby** | after_ghost | `saw_ghost` | 1 | Chandelier swaying, shadows deeper |
| **Lobby** | vivian_gone | `chapter_3` | 2 | Vivian's chair empty, lobby abandoned |
| **Auditorium** | ghost_aftermath | `saw_ghost` | 1 | Residual fog, flickering ghost light |
| **Auditorium** | lights_on | `chapter_3` | 2 | House lights on, mundane exposed |
| **Backstage** | fog_active | `saw_ghost` | 1 | Fog machine leaking, hazy atmosphere |
| **Backstage** | stella_gone | `stella_confession` | 2 | Workstation cleared, prop rose on chair |
| **Dressing Room** | trunk_open | `margaux_locket` | 1 | Open trunk, lighter mood |
| **Dressing Room** | mirror_revealed | `margaux_accusation` | 2 | C.D. visible on mirror |
| **Dressing Room** | passage_found | `passage_mapped` | 3 | Hidden passage entrance visible |
| **Projection Booth** | diego_working | `annotated_script_found` | 1 | Script spread across desk |
| **Manager's Office** | empty | `ashworth_motive_revealed` | 1 | Ashworth gone, messy cot |
| **Catwalk** | lights_active | `edwins_notebook` | 1 | Lighting sequence cycling on stage |
| **Basement** | discovered | `learned_about_basement_intruder` | 1 | Edwin's presence visible |
| **Basement** | passage_open | `passage_mapped` | 2 | Hidden passage entrance gaping |
| **Basement** | edwin_caught | `case_closed` | 3 | Workshop dark, everything packed up |

### Asset Creation Guide: Alt Backgrounds

Files: `assets/backgrounds/{roomId}_{variant}.png` (1920x1080, PNG)

Each variant should depict the **same room from the same angle** but with visual changes:
- Characters present/absent (e.g., Ashworth in bed vs. empty cot)
- Lighting changes (house lights on vs. ghost light only)
- Environmental changes (fog, open trunk, revealed passage)
- Mood shifts (more/fewer shadows, warmer/cooler palette)

### Puzzle Illustration Backgrounds

Each puzzle modal can display a themed background image behind the UI panel. This adds atmosphere and visual context to puzzle-solving.

Files: `assets/puzzles/{puzzleId}.png` (1920x1080 or larger, PNG)

| Puzzle | Suggested Illustration |
|--------|----------------------|
| trunk_puzzle | Close-up of Margaux's antique trunk with brass fittings |
| script_cipher | The annotated Crimson Veil script pages with red-circled letters |
| lighting_sequence | The catwalk lighting board with colored switches |
| mirror_puzzle | Margaux's vanity mirror with foggy glass and wax traces |
| film_puzzle | Light table with scattered film frames and magnifying glass |
| lockbox_puzzle | Stella's metal lockbox with theatrical symbol dials |
| office_safe_puzzle | Wall safe behind a displaced painting |
| passage_navigation | Blueprint overlay of the theater's hidden passages |
| tea_analysis | Chemistry setup with teacup, reagents, and microscope |
| evidence_board | Cork board with red string, photos, and newspaper clippings |

### Clue Investigation Close-Up Images

Key hotspots can display a close-up image alongside their inspection text. This creates a "zoom-in" detective moment when examining important evidence.

In `rooms.json`, add `"clueImage": "clue_{hotspotId}"` to any inspect/pickup hotspot.

Files: `assets/clues/{hotspotId}.png` (min 600x600, PNG)

| Clue Image | Hotspot | Suggested Content |
|-----------|---------|------------------|
| clue_lobby_chandelier | Chandelier | Close-up of the shiny replacement chain link |
| clue_aud_stage | The Stage | Ghost light burning on the empty stage |
| clue_bs_fog_machine | Fog Machine | Damp nozzle with half-empty reservoir |
| clue_dr_vanity | Margaux's Vanity | Vanity mirror with faded gold letters and lightbulbs |
| clue_mo_blueprints | Blueprints | Red-pen annotations over demolition plans |
| clue_mo_teacup | Teacup | Porcelain cup with metallic residue |
| clue_bm_fog_controls | Fog Machine Controls | Modified remote with handwritten labels |
| clue_bm_trapdoor | Trapdoor Mechanism | Freshly oiled pulleys and counterweights |

### Video Cinematic System

Full-screen video cutscenes can replace or supplement slide-based cinematics. The `VideoCinematicScene` supports:
- MP4/WebM playback with cover-fit scaling
- Optional subtitle tracks with timed display
- Skip button (appears after 1.5s) + Escape key
- Completion callbacks (set flags, add journal entries)
- Graceful fallback — if video file is missing, transitions directly to target scene

```typescript
this.scene.start('VideoCinematicScene', {
  videoKey: 'cinematic_ghost_reveal',
  targetScene: 'RoomScene',
  targetData: { roomId: 'basement', skipCinematic: true },
  subtitles: [
    { time: 0, text: 'The Monarch Theatre, 1928.' },
    { time: 3.5, text: 'On the night of the final performance...' },
  ],
  onComplete: { setFlag: 'saw_full_ghost_reveal' },
});
```

Files: `assets/cinematics/{videoKey}.mp4` (1080p preferred, H.264)

| Video | Trigger | Content |
|-------|---------|---------|
| cinematic_ghost_reveal | Ghost sighting climax | Full ghost sequence with fog, figure, vanish |
| cinematic_confession | Edwin confrontation | Edwin's confession in the basement |
| cinematic_ending_justice | Ending A chosen | Police arrest, theater uncertain |
| cinematic_ending_exposure | Ending B chosen | Press conference, theater saved |
| cinematic_ending_mercy | Ending C chosen | Edwin walks away, Nancy conflicted |

---

## 11c. DIFFICULTY MODES (Future)

### Junior Detective / Senior Detective

The hint infrastructure already supports tiered hint delivery. A difficulty toggle would control:
- **Junior Detective:** Task checklist visible, hints appear after 1 failed attempt, phone calls give more explicit guidance
- **Senior Detective:** No task list, hints appear after 3 failed attempts, phone calls are more cryptic
- Plot and puzzles remain identical across modes

### Second Chance System (Future)

If fail states are ever added (e.g., getting caught by Edwin, time-sensitive events):
- **"The good news is..."** — restart from just before the failure point
- **"The bad news is..."** — brief explanation of what went wrong
- Unlimited uses, no penalty
- Classic Her Interactive pattern beloved by the fanbase

---

## 12. IMPLEMENTATION STATUS

### What's Built

| System | Status | Notes |
|--------|--------|-------|
| Phaser + TS + Vite scaffold | Done | Builds clean |
| BootScene (loading) | Done | Asset preloading with graceful fallback for missing files |
| TitleScene | Done | Title, subtitle, start button, fade |
| RoomScene | Done | Hotspot rendering, all 5 types, room transitions, multi-alt backgrounds |
| UIScene | Done | Full-screen viewport, floating HUD overlay, evidence/journal/settings panels |
| InventorySystem | Done | Add, remove, select, serialize |
| DialogueSystem | Done | Lines, branching choices, conditions, events, per-line VO playback |
| PuzzleSystem | Done | Answer checking, clue retrieval, serialize |
| SaveSystem | Done | Full save/load to localStorage |
| AmbientAudioSystem | Done | Per-room layered audio with crossfade transitions |
| VideoCinematicScene | Done | Full-screen video cutscenes with subtitles and skip |
| rooms.json (all 8 rooms) | Done | 8 rooms, 95+ hotspots, 15 alt backgrounds across all rooms |
| items.json | Done | 16 items (12 key, 3 optional, 1 red herring) |
| dialogue.json | Done | 10 dialogue trees with conditional branches (requiredItem/requiredFlag) |
| puzzles.json | Done | 10 puzzles with progressive hint system |

### Completed Engine Systems

| # | Task | Status |
|---|------|--------|
| 1 | Puzzle interaction UI (combination dials, text input, sequence buttons) | Done |
| 2 | Journal UI (slide-up panel, numbered entries, empty state) | Done |
| 3 | Conditional hotspots (showWhen flags, chapter gating, dialogue events) | Done |
| 4 | Item-on-hotspot interaction (select item → use on hotspot) | Done |
| 5 | Chapter progression (5-act milestone system, auto-advance) | Done |
| 6 | Ghost sighting scripted events (3 encounters: auditorium, dressing room, backstage) | Done |
| 7 | Progressive hint system (hints after failed puzzle attempts) | Done |
| 8 | Auto-save on room transitions + Continue button on TitleScene | Done |
| 9 | Speaker color coding in dialogue | Done |
| 10 | Selected item indicator in RoomScene | Done |
| 11 | Item description panel on hover/select | Done |
| 12 | requiredFlag support in dialogue (hides choices until flag set) | Done |
| 13 | PuzzleScene registered and launchable from locked hotspots | Done |
| 14 | All 8 rooms with 95+ hotspots | Done |
| 15 | 10 dialogue trees with conditional branches | Done |
| 16 | 10 puzzles with clues and hints | Done |
| 17 | 16 items (12 key, 3 optional, 1 red herring) | Done |
| 18 | 3 endings in Edwin confrontation | Done |
| 19 | Suspect/character screen (5 profiles, flag-gated facts, discovery counter) | Done |
| 20 | Multi-room navigation map (theater floorplan, fast travel, chapter-gated basement) | Done |
| 21 | Hotspot glow pulse animations (subtle gold sine wave pulse on all hotspots) | Done |
| 22 | Ending epilogue screens (3 cinematic endings with sequential fade-in, credits) | Done |
| 23 | Suspects button + Map button in UIScene toolbar | Done |
| 24 | Evidence board puzzle UI (draggable corkboard with 6 cards, red string, timeline) | Done |
| 25 | Chapter transition screens (5 cinematic act interstitials with timed fade-ins) | Done |
| 26 | Dialogue skip/fast-forward button (skip to choices or end of node) | Done |
| 27 | EvidenceBoardScene routed from RoomScene (evidence_board puzzle → dedicated scene) | Done |
| 28 | ChapterSystem returns new chapter number, RoomScene launches transition on advance | Done |
| 29 | Dialogue UI overhaul — decorative gold frames (portrait frame, dialogue box, nameplate, choice buttons) | Done |
| 30 | Content-aware dialogue box sizing (text measurement → clamped box height 280–380px) | Done |
| 31 | Large NPC portraits in dialogue (classic Nancy Drew proportions, 440px tall, ~40% screen height) | Done |
| 32 | Nancy first-person style — no portrait shown, dimmed NPC portrait when Nancy speaks | Done |
| 33 | Typewriter text effect with click-to-complete and per-character tick sound | Done |
| 34 | Three-tier dialogue routing: base → revisit → done variants per NPC | Done |
| 35 | Gated choices in revisit dialogues (requiredFlag/requiredItem carry into revisit nodes) | Done |
| 36 | Player guidance — thinking journal hints after 18 key story events | Done |
| 37 | Player guidance — item context hints on room entry (9 room+item combos, thought bubble UI) | Done |
| 38 | Player guidance — map pulse indicators on rooms with available objectives | Done |
| 39 | Player guidance — secret passage guidance in basement | Done |
| 40 | hideWhen support for room hotspots (inverse of showWhen, hides hotspot when flag is set) | Done |
| 41 | showWhen/hideWhen on talk hotspots — NPCs appear/disappear based on story progress | Done |
| 42 | Multi-alt background system (multiple perspectives per room, priority-based) | Done |
| 43 | 15 alt backgrounds across all 8 rooms with story-driven triggers | Done |
| 44 | Puzzle illustration backgrounds (themed images behind puzzle modals) | Done |
| 45 | Clue investigation close-up images (displayed alongside inspect text) | Done |
| 46 | Expanded procedural SFX library (25+ sounds: page turn, safe dial, key jingle, etc.) | Done |
| 47 | Dialogue voiceover infrastructure (per-line VO playback with graceful fallback) | Done |
| 48 | VideoCinematicScene (full-screen video cutscenes with subtitles, skip, fallback) | Done |
| 49 | Asset pipeline: BootScene loads alt backgrounds, puzzle images, clue images, dialogue VO, video cinematics | Done |
| 50 | Background music system — 10 real MP3 tracks with HTML5 Audio, crossfading, room mapping, volume control | Done |
| 51 | Music track selector in Settings panel with scrollable list and live preview | Done |
| 52 | Full-screen game viewport with floating HUD overlay (replaced sidebar panel) | Done |
| 53 | Settings panel: volume sliders, music volume, track selector, text speed, particles, fullscreen, save management | Done |
| 54 | Audio toggle (speaker icon) and settings gear in HUD overlay | Done |
| 55 | Quest hint system — chapter-aware dynamic objective hints in HUD | Done |

### What Needs Building (in priority order)

| # | Task | Scope | Depends on |
|---|------|-------|------------|
| 1 | **Art asset creation** | Alt background images, puzzle illustrations, clue close-ups | Image generation |
| 2 | **Dialogue VO recording** | Voice acting for 10 dialogue trees (~200 lines) | Audio recording |
| 3 | **Video cinematics** | 5 video cutscenes (ghost reveal, confession, 3 endings) | Video production |
| 4 | **Additional upbeat music** | More lighthearted/fun tracks to balance dark moody ones | Audio sourcing |
| 5 | **Hotspot placement tuning** | Lobby hotspots need repositioning for viewfinder viewport | Art assets |
| 6 | **Mobile touch testing** | Tap target tuning, responsive layout QA | Everything |
| 7 | **Difficulty mode toggle** | Junior/Senior Detective switch in settings | UI work |

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

---

## 16. ASSET TRACKER

Complete inventory of all assets — what exists, what needs to be created. Updated as assets are completed.

Legend: ✅ = exists | ❌ = needs creation | 🔧 = procedural fallback exists (works without file)

### 16a. Room Backgrounds (1920×1080 PNG)

| File | Key | Status |
|------|-----|--------|
| `assets/backgrounds/lobby.png` | bg_lobby | ✅ |
| `assets/backgrounds/auditorium.png` | bg_auditorium | ✅ |
| `assets/backgrounds/backstage.png` | bg_backstage | ✅ |
| `assets/backgrounds/dressing_room.png` | bg_dressing_room | ✅ |
| `assets/backgrounds/projection_booth.png` | bg_projection_booth | ✅ |
| `assets/backgrounds/managers_office.png` | bg_managers_office | ✅ |
| `assets/backgrounds/catwalk.png` | bg_catwalk | ✅ |
| `assets/backgrounds/basement.png` | bg_basement | ✅ |

### 16b. Alt Backgrounds (1920×1080 PNG) — Story Progression Variants

| File | Key | Trigger Flag | Status |
|------|-----|-------------|--------|
| `assets/backgrounds/lobby_after_ghost.png` | bg_lobby_after_ghost | saw_ghost | ❌ |
| `assets/backgrounds/lobby_vivian_gone.png` | bg_lobby_vivian_gone | chapter_3 | ❌ |
| `assets/backgrounds/auditorium_ghost_aftermath.png` | bg_auditorium_ghost_aftermath | saw_ghost | ❌ |
| `assets/backgrounds/auditorium_lights_on.png` | bg_auditorium_lights_on | chapter_3 | ❌ |
| `assets/backgrounds/backstage_fog_active.png` | bg_backstage_fog_active | saw_ghost | ❌ |
| `assets/backgrounds/backstage_stella_gone.png` | bg_backstage_stella_gone | stella_confession | ❌ |
| `assets/backgrounds/dressing_room_trunk_open.png` | bg_dressing_room_trunk_open | margaux_locket | ❌ |
| `assets/backgrounds/dressing_room_mirror_revealed.png` | bg_dressing_room_mirror_revealed | margaux_accusation | ❌ |
| `assets/backgrounds/dressing_room_passage_found.png` | bg_dressing_room_passage_found | passage_mapped | ❌ |
| `assets/backgrounds/projection_booth_diego_working.png` | bg_projection_booth_diego_working | annotated_script_found | ❌ |
| `assets/backgrounds/managers_office_empty.png` | bg_managers_office_empty | ashworth_motive_revealed | ✅ |
| `assets/backgrounds/catwalk_lights_active.png` | bg_catwalk_lights_active | edwins_notebook | ❌ |
| `assets/backgrounds/basement_discovered.png` | bg_basement_discovered | learned_about_basement_intruder | ❌ |
| `assets/backgrounds/basement_passage_open.png` | bg_basement_passage_open | passage_mapped | ❌ |
| `assets/backgrounds/basement_edwin_caught.png` | bg_basement_edwin_caught | case_closed | ❌ |

**GPT generation prompts:** See `docs/alt-background-prompts.md`

### 16c. Puzzle Illustration Backgrounds (1920×1080 PNG)

| File | Key | Status |
|------|-----|--------|
| `assets/puzzles/trunk_puzzle.png` | puzzle_trunk_puzzle | ❌ 🔧 |
| `assets/puzzles/script_cipher.png` | puzzle_script_cipher | ❌ 🔧 |
| `assets/puzzles/lighting_sequence.png` | puzzle_lighting_sequence | ❌ 🔧 |
| `assets/puzzles/evidence_board.png` | puzzle_evidence_board | ❌ 🔧 |
| `assets/puzzles/mirror_puzzle.png` | puzzle_mirror_puzzle | ❌ 🔧 |
| `assets/puzzles/film_puzzle.png` | puzzle_film_puzzle | ❌ 🔧 |
| `assets/puzzles/lockbox_puzzle.png` | puzzle_lockbox_puzzle | ❌ 🔧 |
| `assets/puzzles/office_safe_puzzle.png` | puzzle_office_safe_puzzle | ❌ 🔧 |
| `assets/puzzles/passage_navigation.png` | puzzle_passage_navigation | ❌ 🔧 |
| `assets/puzzles/tea_analysis.png` | puzzle_tea_analysis | ❌ 🔧 |

### 16d. Clue Close-Up Images (min 600×600 PNG)

| File | Key | Hotspot | Status |
|------|-----|---------|--------|
| `assets/clues/lobby_chandelier.png` | clue_lobby_chandelier | Chandelier | ❌ 🔧 |
| `assets/clues/lobby_ticket_booth.png` | clue_lobby_ticket_booth | Ticket Booth | ❌ 🔧 |
| `assets/clues/lobby_playbills.png` | clue_lobby_playbills | Playbills | ❌ 🔧 |
| `assets/clues/aud_stage.png` | clue_aud_stage | The Stage | ❌ 🔧 |
| `assets/clues/aud_curtain.png` | clue_aud_curtain | Curtain | ❌ 🔧 |
| `assets/clues/aud_seats.png` | clue_aud_seats | Audience Seats | ❌ 🔧 |
| `assets/clues/bs_fog_machine.png` | clue_bs_fog_machine | Fog Machine | ❌ 🔧 |
| `assets/clues/bs_rigging.png` | clue_bs_rigging | Rigging | ❌ 🔧 |
| `assets/clues/bs_costume_rack.png` | clue_bs_costume_rack | Costume Rack | ❌ 🔧 |
| `assets/clues/dr_vanity.png` | clue_dr_vanity | Margaux's Vanity | ❌ 🔧 |
| `assets/clues/dr_mirror.png` | clue_dr_mirror | Mirror | ❌ 🔧 |
| `assets/clues/dr_trunk.png` | clue_dr_trunk | Trunk | ❌ 🔧 |
| `assets/clues/dr_flowers.png` | clue_dr_flowers | Flowers | ❌ 🔧 |
| `assets/clues/pb_projector.png` | clue_pb_projector | Projector | ❌ 🔧 |
| `assets/clues/pb_film.png` | clue_pb_film | Film Frames | ❌ 🔧 |
| `assets/clues/pb_scratches.png` | clue_pb_scratches | Scratches | ❌ 🔧 |
| `assets/clues/mo_desk.png` | clue_mo_desk | Desk | ❌ 🔧 |
| `assets/clues/mo_blueprints.png` | clue_mo_blueprints | Blueprints | ❌ 🔧 |
| `assets/clues/mo_teacup.png` | clue_mo_teacup | Teacup | ❌ 🔧 |
| `assets/clues/mo_safe.png` | clue_mo_safe | Safe | ❌ 🔧 |
| `assets/clues/cw_lights.png` | clue_cw_lights | Lighting Rig | ❌ 🔧 |
| `assets/clues/cw_railing.png` | clue_cw_railing | Railing | ❌ 🔧 |
| `assets/clues/cw_notebook.png` | clue_cw_notebook | Notebook | ❌ 🔧 |
| `assets/clues/bm_trapdoor.png` | clue_bm_trapdoor | Trapdoor | ❌ 🔧 |
| `assets/clues/bm_fog_controls.png` | clue_bm_fog_controls | Fog Controls | ❌ 🔧 |
| `assets/clues/bm_costume.png` | clue_bm_costume | Ghost Costume | ❌ 🔧 |
| `assets/clues/bm_passage.png` | clue_bm_passage | Passage | ❌ 🔧 |

### 16e. Character Portraits (PNG)

| File | Key | Status |
|------|-----|--------|
| `assets/portraits/vivian.png` | portrait_vivian | ✅ |
| `assets/portraits/edwin.png` | portrait_edwin | ✅ |
| `assets/portraits/ashworth.png` | portrait_ashworth | ✅ |
| `assets/portraits/stella.png` | portrait_stella | ✅ |
| `assets/portraits/diego.png` | portrait_diego | ✅ |

### 16f. Item Icons (PNG)

| File | Key | Item | Status |
|------|-----|------|--------|
| `assets/items/nicekey.png` | item_icon_master_key | Master Key | ✅ |
| `assets/items/mglass.png` | item_icon_magnifying_glass | Magnifying Glass | ✅ |
| `assets/items/1928page.png` | item_icon_playbill_1928 | 1928 Playbill | ✅ |
| `assets/items/stageeffects.png` | item_icon_effects_manual | Effects Manual | ✅ |
| `assets/items/leatherbook.png` | item_icon_margaux_diary | Margaux's Diary | ✅ |
| `assets/items/Scroll.png` | item_icon_annotated_script | Annotated Script | ✅ |
| `assets/items/Teacup.png` | item_icon_poisoned_teacup | Poisoned Teacup | ✅ |
| `assets/items/Page3.png` | item_icon_blueprints | Blueprints | ✅ |
| `assets/items/Key.png` | item_icon_basement_key | Basement Key | ✅ |
| `assets/items/EH Book.png` | item_icon_edwins_notebook | Edwin's Notebook | ✅ |
| `assets/items/Machine.png` | item_icon_fog_machine_part | Fog Machine Part | ✅ |
| `assets/items/Letter.png` | item_icon_cecilia_letter | Cecilia's Letter | ✅ |
| `assets/items/Clipboard.png` | item_icon_stella_records | Stella's Records | ✅ |
| `assets/items/Briefcase.png` | item_icon_ashworth_files | Ashworth Files | ✅ |
| `assets/items/Page.png` | item_icon_chemical_receipt | Chemical Receipt | ✅ |
| `assets/items/Locket.png` | item_icon_margaux_locket | Margaux's Locket | ✅ |

### 16g. UI Components (PNG)

| File | Key | Status |
|------|-----|--------|
| `assets/ui/toolbar-bg.png` | ui_toolbar_bg | ✅ |
| `assets/ui/toolbar-btn.png` | ui_toolbar_btn | ✅ |
| `assets/ui/close-btn.png` | ui_close_btn | ✅ |
| `assets/ui/dossier-bg.png` | ui_dossier_bg | ✅ |
| `assets/ui/dossier-header.png` | ui_dossier_header | ✅ |
| `assets/ui/tabs.png` | ui_tabs | ✅ |
| `assets/ui/frame.png` | ui_portrait_frame | ✅ |
| `assets/ui/info-card-bg.png` | ui_info_card_bg | ✅ |
| `assets/ui/facts-panel-bg.png` | ui_facts_panel_bg | ✅ |
| `assets/ui/facts-panel-bg-alt.png` | ui_facts_panel_bg_alt | ✅ |
| `assets/ui/progress-fill.png` | ui_progress_fill | ✅ |
| `assets/ui/progress-track.png` | ui_progress_track | ✅ |
| `assets/ui/knob.png` | ui_knob | ✅ |
| `assets/ui/chip-bg.png` | ui_chip_bg | ✅ |
| `assets/ui/bullet-discovered.png` | ui_bullet_discovered | ✅ |
| `assets/ui/bullet-undiscovered.png` | ui_bullet_undiscovered | ✅ |
| `assets/ui/divider-gold.png` | ui_divider_gold | ✅ |
| `assets/ui/dialogue/dialogue-box.png` | dlg_box | ✅ |
| `assets/ui/dialogue/nameplate.png` | dlg_nameplate | ✅ |
| `assets/ui/dialogue/choice-btn.png` | dlg_choice_btn | ✅ |
| `assets/ui/dialogue/continue-arrow.png` | dlg_continue_arrow | ✅ |
| `assets/ui/map/*.png` | map_{room} (×8) | ✅ |
| `assets/cover.png` | cover | ✅ |
| `assets/title.png` | title_graphic | ✅ |
| `assets/continue.png` | btn_continue | ✅ |
| `assets/New case.png` | btn_new_case | ✅ |
| `assets/howto.png` | btn_howto | ✅ |
| `assets/settings.png` | btn_settings | ✅ |

### 16h. Intro / Cinematic Images (PNG)

| File | Key | Status |
|------|-----|--------|
| `assets/intro/intro_stage_1928.png` | intro_stage_1928 | ✅ |
| `assets/intro/intro_goblet.png` | intro_goblet | ✅ |
| `assets/intro/intro_stage_empty.png` | intro_stage_empty | ✅ |
| `assets/intro/intro_exterior.png` | intro_exterior | ✅ |
| `assets/intro/intro_lobby_dark.png` | intro_lobby_dark | ✅ |
| `assets/intro/intro_ghost.png` | intro_ghost | ✅ |
| `assets/intro/intro_phone.png` | intro_phone | ✅ |
| `assets/intro/intro_doors.png` | intro_doors | ✅ |
| `assets/intro/intro_newspaper.png` | intro_newspaper | ✅ |
| `assets/intro/intro_marquee_lights.png` | intro_marquee_lights | ✅ |
| `assets/intro/intro_backstage.png` | intro_backstage | ✅ |
| `assets/intro/intro_poison_bottle.png` | intro_poison_bottle | ✅ |
| `assets/intro/intro_demolition.png` | intro_demolition | ✅ |
| `assets/intro/intro_ghost_stage.png` | intro_ghost_stage | ✅ |
| `assets/intro/intro_nancy_car.png` | intro_nancy_car | ✅ |
| `assets/cinematics/ghost-fog.png` | cine_ghost_fog | ✅ |
| `assets/cinematics/ghost-figure.png` | cine_ghost_figure | ✅ |
| `assets/cinematics/ghost-face.png` | cine_ghost_face | ✅ |
| `assets/cinematics/ghost-empty-stage.png` | cine_ghost_empty | ✅ |

### 16i. Video Cinematics (MP4, 1080p H.264)

| File | Key | Content | Status |
|------|-----|---------|--------|
| `assets/cinematics/Monarch.mp4` | intro_monarch_video | Intro theater establishing shot | ✅ |
| `assets/cinematics/cinematic_ghost_reveal.mp4` | cinematic_ghost_reveal | Ghost sighting climax | ❌ 🔧 |
| `assets/cinematics/cinematic_confession.mp4` | cinematic_confession | Edwin's basement confession | ❌ 🔧 |
| `assets/cinematics/cinematic_ending_justice.mp4` | cinematic_ending_justice | Ending A — police arrest | ❌ 🔧 |
| `assets/cinematics/cinematic_ending_exposure.mp4` | cinematic_ending_exposure | Ending B — press conference | ❌ 🔧 |
| `assets/cinematics/cinematic_ending_mercy.mp4` | cinematic_ending_mercy | Ending C — Edwin walks away | ❌ 🔧 |

### 16j. Audio — Ambient / Room Soundscapes

| File | Key | Room | Status |
|------|-----|------|--------|
| `assets/audio/ambient_horror.ogg` | ambient_theater | General theater | ✅ |
| `assets/audio/abandoned_building.mp3` | amb_lobby | Lobby | ✅ |
| `assets/audio/horror_ambient.mp3` | amb_auditorium | Auditorium | ✅ |
| `assets/audio/wood_creak.ogg` | amb_backstage | Backstage | ✅ |
| `assets/audio/clock_tick.ogg` | amb_dressing_room | Dressing Room | ✅ |
| `assets/audio/electrical_hum.wav` | amb_projection_booth | Projection Booth | ✅ |
| `assets/audio/abandoned_building2.mp3` | amb_managers_office | Manager's Office | ✅ |
| `assets/audio/metal_ambience.wav` | amb_catwalk | Catwalk | ✅ |
| `assets/audio/water_drip.wav` | amb_basement | Basement | ✅ |
| `assets/audio/machinery_hum.ogg` | amb_basement_alt | Basement (alt) | ✅ |
| `assets/audio/creepy_ambient.mp3` | cine_ambient_ghost | Cinematic ghost audio | ✅ |
| `assets/audio/ghost_whisper.wav` | sfx_ghost_whisper | Ghost whisper SFX | ✅ |

### 16k. Audio — Sound Effects

| Sound | Source | Status |
|-------|--------|--------|
| click, success, fail, pickup, unlock | Procedural (Web Audio API) | ✅ 🔧 |
| doorOpen, doorClose, ghostWhisper, paperRustle, drawerSlide | Procedural | ✅ 🔧 |
| chapterGong, suspense, dialogueOpen, dialogueClose | Procedural | ✅ 🔧 |
| pageTurn, safeDial, keyJingle, curtainPull, drawerOpen | Procedural | ✅ 🔧 |
| evidencePlace, suspicionSting, journalWrite, photoSnap | Procedural | ✅ 🔧 |
| discoveryReveal, typewriterKey, lockTumbler, mapOpen | Procedural | ✅ 🔧 |
| fogMachineHiss, spotlightClick, trapDoorCreak, poisonBubble | Procedural | ✅ 🔧 |
| sfx_goblet | File-based | ❌ 🔧 |
| sfx_thud | File-based | ❌ 🔧 |
| sfx_phone_ring | File-based | ❌ 🔧 |
| sfx_heartbeat | File-based | ❌ 🔧 |

### 16l. Audio — Music (10 tracks, 66MB total in `public/music/`)

| File | Track Name | Room | License | Status |
|------|-----------|------|---------|--------|
| `public/music/signs_to_nowhere.mp3` | Grand Lobby | Lobby | CC BY 4.0 (Shane Ivers) | ✅ |
| `public/music/speakeasy.mp3` | The Speakeasy | — (selectable) | CC BY 4.0 (Shane Ivers) | ✅ |
| `public/music/mystery_unsolved.mp3` | The Investigation | Backstage | CC BY 4.0 (Shane Ivers) | ✅ |
| `public/music/lobby_elegant.mp3` | Chandelier Dreams | Auditorium | Mixkit Free (Francisco Alvear) | ✅ |
| `public/music/gentle_piano.mp3` | Midnight Theatre | — (selectable) | Mixkit Free (Alejandro Magaña) | ✅ |
| `public/music/crypto.mp3` | Velvet Curtain | Manager's Office | CC BY 3.0 (Kevin MacLeod) | ✅ |
| `public/music/ghost_story.mp3` | The Empty Stage | Projection Booth | CC BY 3.0 (Kevin MacLeod) | ✅ |
| `public/music/darkest_child.mp3` | Gaslight | Catwalk | CC BY 3.0 (Kevin MacLeod) | ✅ |
| `public/music/comfortable_mystery.mp3` | The Study | Dressing Room | CC BY 3.0 (Kevin MacLeod) | ✅ |
| `public/music/dreamy_flashback.mp3` | Crimson Veil | Basement | CC BY 3.0 (Kevin MacLeod) | ✅ |

### 16m. Audio — Voice Over

| Category | Files | Status |
|----------|-------|--------|
| Intro narration (18 slides) | `assets/vo/intro/vo_intro_01–18.mp3` | ✅ |
| Dialogue: vivian_intro (up to 20 lines) | `assets/vo/dialogue/vivian_intro_01–20.mp3` | ❌ |
| Dialogue: vivian_diary | `assets/vo/dialogue/vivian_diary_01–20.mp3` | ❌ |
| Dialogue: vivian_locket | `assets/vo/dialogue/vivian_locket_01–20.mp3` | ❌ |
| Dialogue: edwin_auditorium | `assets/vo/dialogue/edwin_auditorium_01–20.mp3` | ❌ |
| Dialogue: edwin_confronted | `assets/vo/dialogue/edwin_confronted_01–20.mp3` | ❌ |
| Dialogue: ashworth_office | `assets/vo/dialogue/ashworth_office_01–20.mp3` | ❌ |
| Dialogue: stella_backstage | `assets/vo/dialogue/stella_backstage_01–20.mp3` | ❌ |
| Dialogue: stella_passages | `assets/vo/dialogue/stella_passages_01–20.mp3` | ❌ |
| Dialogue: diego_booth | `assets/vo/dialogue/diego_booth_01–20.mp3` | ❌ |
| Dialogue: phone_calls | `assets/vo/dialogue/phone_calls_01–20.mp3` | ❌ |

### 16n. Asset Summary

| Category | Total | Exists | Missing | Has Fallback |
|----------|-------|--------|---------|-------------|
| Room backgrounds | 8 | 8 | 0 | — |
| Alt backgrounds | 15 | 1 | 14 | Yes (base bg) |
| Puzzle illustrations | 10 | 0 | 10 | Yes (dark overlay) |
| Clue close-ups | 27 | 0 | 27 | Yes (text only) |
| Character portraits | 5 | 5 | 0 | — |
| Item icons | 16 | 16 | 0 | — |
| UI components | 25+ | 25+ | 0 | — |
| Intro/cinematic images | 19 | 19 | 0 | — |
| Video cinematics | 6 | 1 | 5 | Yes (slides) |
| Ambient audio | 12 | 12 | 0 | — |
| SFX (procedural) | 25+ | 25+ | 0 | — |
| SFX (file-based) | 4 | 0 | 4 | Yes (procedural) |
| Music tracks | 10 | 10 | 0 | — |
| Intro VO | 18 | 18 | 0 | — |
| Dialogue VO | ~200 lines | 0 | ~200 | Yes (text only) |
| **TOTALS** | **~395** | **~140** | **~255** | — |

### Priority Creation Order

1. **Alt backgrounds (14)** — Biggest visual impact for story progression feel
2. **Clue close-ups (8 priority + 19 others)** — Enhances detective investigation moments
3. **Puzzle illustrations (10)** — Improves puzzle atmosphere
4. **Video cinematics (5)** — Premium polish for key story moments
5. **Dialogue VO (~200 lines)** — Full voice acting pass
6. **Additional upbeat music tracks** — Balance the moody tracks with fun/lighthearted options
7. **File-based SFX (4)** — Minor, procedural fallbacks work well

---

*This document is the single source of truth for The Last Curtain Call. Update it as the game evolves. Every room, item, puzzle, and character is defined here. If it's not in the GDD, it's not in the game.*
