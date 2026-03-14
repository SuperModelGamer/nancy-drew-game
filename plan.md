# Dialogue Pacing & Progression Overhaul — COMPLETED

## Problems Identified

### 1. Talk hotspots never disappear
No `hideWhen` support exists in RoomScene. Once a character is accessible, they're clickable forever — even after all meaningful dialogue is exhausted. Revisit variants loop infinitely.

### 2. Revisit variants break progressive choice gating
Edwin's main dialogue has flag-gated choices (grandfather: `learned_about_hale_family`, props: `learned_about_missing_props`). But once `edwin_auditorium` fires, the revisit variant takes over — which does NOT include those gated choices. So the player can never access them after the first conversation. Same issue with Stella's gated choices (threatening note, lockbox, crimson veil context).

### 3. No pacing between characters
Vivian, Edwin, and Stella are all talkable from the very first minute with no story gate. The player can dump 114 lines of dialogue in one sitting before exploring anything.

### 4. Phone remains clickable after all calls made
No mechanism to hide the phone after completing all available conversations.

---

## Implementation Plan

### Step 1: Add `hideWhen` support to RoomScene
- Add `hideWhen?: string` to the Hotspot interface
- In `createHotspots()`, add a check: if `hideWhen` is set and the flag/event is active, skip the hotspot (mirror the existing `showWhen` logic but inverted)

### Step 2: Add gated choices to revisit dialogues
The key bug: progressively-gated choices only exist in the original dialogue but the revisit dialogue replaces it entirely. Fix by copying the gated choice branches into the revisit start nodes:

**`edwin_auditorium_revisit`** — add to start choices:
- "Your grandfather was James Hale" (requiredFlag: `learned_about_hale_family`) → copy `grandfather` node
- "Stella says props have been going missing" (requiredFlag: `learned_about_missing_props`) → copy `edwin_on_props` node
- "I found Margaux's diary" (requiredItem: `margaux_diary`) → copy `diary_reaction` node
- "The effects manual describes systems that could fake all of that" (requiredItem: `effects_manual`) → copy `effects_challenge` node

**`stella_backstage_revisit`** — add to start choices:
- "I found your note" (requiredFlag: `saw_threatening_note`) → copy `confronted_note` + `stella_reveals_edwin` nodes
- "Edwin told me about The Crimson Veil" (requiredFlag: `learned_about_crimson_veil`) → copy `stella_on_ghost` node
- "I found your lockbox" (requiredItem: `stella_records`) → copy `lockbox_confronted` + `stella_reveals_edwin` nodes

### Step 3: Add showWhen/hideWhen to talk hotspots in rooms.json

**Vivian (Lobby):**
- No showWhen (available from start, she's the first contact)
- hideWhen: `vivian_intro` → disappears after intro conversation
- She reappears through item-triggered dialogues (vivian_diary, vivian_locket)

**Edwin (Auditorium):**
- showWhen: `vivian_intro` → only appears after meeting Vivian (she introduces him)
- hideWhen: `edwin_personal_revealed` → disappears after grandfather revelation

**Stella (Backstage):**
- showWhen: `vivian_intro` → only appears after meeting Vivian
- hideWhen: `basement_key_location` → disappears after revealing basement key location

**Diego (Projection Booth):**
- Already gated behind chapter_2 room access
- hideWhen: `cipher_discussed` → disappears after cipher solved

**Ashworth (Manager's Office):**
- Already gated behind chapter_2 room access
- hideWhen: `ashworth_motive_revealed` → disappears after insurance confrontation

**Edwin (Basement):**
- Already gated behind chapter_4 room access
- No hideWhen (final confrontation — game ends after)

**Phone (Lobby):**
- No showWhen (always available)
- hideWhen: `called_ned` → disappears after last progressively-gated call is available and made (Ned requires `heard_basement_noises`, so by the time Ned is called, all other calls are accessible)

### Step 4: Gate some revisit content behind story milestones
In revisit dialogues, add `requiredFlag` to some choices that reference events the player may not have experienced yet. This prevents characters from referencing things out of order.

---

## Execution Order — ALL COMPLETE
1. ~~Add `hideWhen` to Hotspot interface and RoomScene filtering logic~~ ✓
2. ~~Update rooms.json with showWhen/hideWhen on all talk hotspots~~ ✓
3. ~~Add gated choices + nodes to edwin_auditorium_revisit~~ ✓
4. ~~Add gated choices + nodes to stella_backstage_revisit~~ ✓
5. ~~Test and commit~~ ✓
