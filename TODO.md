# TODO

## MVP — COMPLETE
- [x] Project scaffolding (Phaser 3 + TypeScript + Vite)
- [x] Title screen with Continue / New Investigation
- [x] All 8 rooms defined with hotspots (124 total, 11-18 per room)
- [x] Inventory system with select/use/describe
- [x] Dialogue system with branching, requiredItem, requiredFlag, triggerEvent
- [x] Save/load system with auto-save on room transitions
- [x] 16 items defined (key items, optional items, red herrings)
- [x] 10 dialogue trees with conditional branches
- [x] 10 puzzles defined with progressive hint system
- [x] 3 endings written into Edwin confrontation dialogue
- [x] Phone call mechanic (Bess/George, Carson Drew, Historical Society)
- [x] Atmospheric/flavor hotspots throughout (50%+ non-critical)
- [x] Conditional hotspots (showWhen flags + chapter gating)
- [x] Red herring items and dead-end inspections
- [x] Blackmoor Manor easter eggs (3 references)
- [x] Puzzle interaction UI (combination dials, text input, sequence buttons)
- [x] Journal/clue board UI with numbered entries
- [x] Item-on-hotspot interaction flow (magnifying glass on mirror, etc.)
- [x] PuzzleScene registered and launchable from locked hotspots
- [x] Progressive hint system (hints revealed after failed attempts)
- [x] Speaker name color coding in dialogue
- [x] Selected item indicator in RoomScene
- [x] Item description panel on hover/select in inventory
- [x] Ghost sighting scripted events (auditorium, dressing room, backstage)
- [x] Chapter progression (5-act milestone system)
- [x] Auto-save + Continue button on TitleScene

## Tier 2 — COMPLETE
- [x] Suspect/character screen (profiles, known facts, Nancy's thoughts)
- [x] Multi-room navigation map (theater floorplan for fast travel)
- [x] Hotspot highlight animations (subtle gold glow pulse)
- [x] Ending epilogue screens (full-screen narrative + credits per ending)

## Tier 2.5 — COMPLETE
- [x] Evidence board puzzle UI (visual corkboard with draggable pieces)
- [x] Chapter transition screens (Night 1 / Day 2 / Night 2)
- [x] Dialogue skip/fast-forward button

## Tier 3 — Polish & Assets (IN PROGRESS)
- [x] Room background art (illustrated, all 8 rooms)
- [x] Character portraits for dialogue panels (all 5 suspects)
- [x] Item icons (21 illustrated PNG assets)
- [x] Custom cursors (gold art deco pointer, spyglass, grab, door, chat, lock, hand)
- [x] Viewfinder frame UI (art deco borders, right info panel with room stats)
- [x] Item cursor system (equip item → cursor becomes that item's icon)
- [x] Used item tracking + USED badge in evidence panel
- [x] Item lore text in evidence detail panel
- [x] Per-room item counter + global clue counter in right panel
- [x] Nancy's inner monologue on suspect profiles (progressive unlock)
- [x] Suspect reveal on first dialogue (triggerEvent on intro nodes)
- [x] Dialogue UI overhaul — decorative gold frames (portrait frame, dialogue box, nameplate, choice buttons)
- [x] Content-aware dialogue box sizing (measures text, clamps between min/max height)
- [x] Large NPC portraits in dialogue (classic Nancy Drew proportions, ~40% screen height)
- [x] Nancy first-person style — no portrait, dimmed NPC portrait when Nancy speaks
- [x] Typewriter text effect with click-to-complete
- [x] Three-tier dialogue routing (base → revisit → done variants per NPC)
- [x] Gated choices in revisit dialogues (requiredFlag/requiredItem carry into revisits)
- [x] Player guidance — thinking journal hints after key events (18 hints)
- [x] Player guidance — item context hints on room entry (9 room+item combos)
- [x] Player guidance — map pulse indicators on rooms with available objectives
- [x] Player guidance — secret passage hint in basement
- [x] hideWhen support for room hotspots (inverse of showWhen)
- [x] showWhen/hideWhen on talk hotspots for dialogue pacing (NPCs appear/disappear based on story progress)
- [ ] Audio ambience and UI sound effects (UISounds stubs exist, no audio files)
- [ ] Mobile touch testing and tap target tuning
- [ ] Hotspot placement tuning (lobby hotspots need repositioning for new viewport)

## Tier 4 — Stretch
- [ ] Multiple save slots
- [ ] Settings menu (audio volume, text speed) — gear button exists but not wired
- [ ] Achievement/discovery tracking
- [ ] Second playthrough variations (new dialogue on replay)
- [ ] Wrap for mobile app if needed
