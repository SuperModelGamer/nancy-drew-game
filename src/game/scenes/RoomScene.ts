import Phaser from 'phaser';
import roomsData from '../data/rooms.json';
import itemsData from '../data/items.json';
import { InventorySystem } from '../systems/InventorySystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ScriptedEventScene } from './ScriptedEventScene';
import { ChapterSystem } from '../systems/ChapterSystem';
import { Colors, TextColors, FONT, Depths, computeViewfinderLayout } from '../utils/constants';
import { drawRoomBackground } from '../utils/room-backgrounds';
// Tutorial removed — how-to-play is accessible from the start menu
import { Cursors, createGlowSpyglass, createItemCursor } from '../utils/cursors';
import { addAmbientParticles } from '../utils/ambient-particles';
import { drawDecoDivider, DecoColors, DecoTextColors } from '../utils/art-deco';
import { UISounds } from '../utils/sounds';
// AmbientAudioSystem disabled — SFX on clicks/triggers only, music handles atmosphere
import { MusicSystem } from '../systems/MusicSystem';
import { playCurtainClose } from '../utils/transitions';
import { getCinematicForRoom } from './CinematicScene';

interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: 'inspect' | 'pickup' | 'locked' | 'navigate' | 'talk';
  description?: string;
  itemId?: string;
  requiredItem?: string;
  dialogueId?: string;
  /** Alternate dialogue ID used when altDialogueWhen flag is set. */
  altDialogueId?: string;
  /** Flag that switches this hotspot to altDialogueId. */
  altDialogueWhen?: string;
  targetRoom?: string;
  puzzleId?: string;
  onceOnly?: boolean;
  showWhen?: string;
  hideWhen?: string;
  setsFlag?: string;
  /** Texture key for a close-up image shown alongside the inspection description */
  clueImage?: string;
}

interface AltBackground {
  key: string;
  showWhen: string;
  description?: string;
  /** Priority — higher number wins when multiple alternates are active (default 0) */
  priority?: number;
}

interface RoomData {
  id: string;
  name: string;
  description: string;
  background?: string;
  /** Single alt background (legacy support) */
  altBackground?: AltBackground;
  /** Multiple alt backgrounds — checked in priority order, highest active one wins */
  altBackgrounds?: AltBackground[];
  hotspots: Hotspot[];
}

export class RoomScene extends Phaser.Scene {
  private currentRoom!: RoomData;
  private hotspotObjects: Phaser.GameObjects.Container[] = [];
  private descriptionBox: Phaser.GameObjects.Container | null = null;
  private _descriptionClickZone: Phaser.GameObjects.Rectangle | null = null;
  private _descriptionDismissKey: ((event: KeyboardEvent) => void) | null = null;
  private usedHotspots: Set<string> = new Set();
  private selectedItemIndicator!: Phaser.GameObjects.Text;
  private glowCursor: string = Cursors.inspect; // fallback until glow loads
  private phoneRinging = false;

  constructor() {
    super({ key: 'RoomScene' });
  }

  private redirectingToCinematic = false;
  private cameFromCinematic = false;

  init(data: { roomId?: string; skipCinematic?: boolean }): void {
    const roomId = data.roomId || 'lobby';
    this.redirectingToCinematic = false;
    this.cameFromCinematic = !!data.skipCinematic;

    // Check for a cinematic that should play before entering this room
    if (!data.skipCinematic) {
      const cinematic = getCinematicForRoom(roomId);
      if (cinematic) {
        // Stop all audio before handing off to the cinematic scene
        UISounds.stopAll();
        MusicSystem.getInstance().stop();
        // Flag prevents create() from running room setup on a missing currentRoom
        this.redirectingToCinematic = true;
        this.scene.start('CinematicScene', {
          cinematicId: cinematic.id,
          targetRoom: roomId,
        });
        return;
      }
    }

    const rooms = roomsData.rooms as RoomData[];
    this.currentRoom = { ...(rooms.find(r => r.id === roomId) || rooms[0]) };
    // Override description when alt background is active
    const activeAlt = this.getActiveAltBackground();
    if (activeAlt?.description) {
      this.currentRoom.description = activeAlt.description;
    }
    SaveSystem.getInstance().setCurrentRoom(roomId);
    SaveSystem.getInstance().startSession();
    // Auto-save when entering a room
    SaveSystem.getInstance().save();
  }

  create(): void {
    if (this.redirectingToCinematic) return;
    // Set up the camera viewport to exactly fill the game area inside the UI frame.
    // No zoom — the viewport dimensions ARE the game world dimensions.
    const vf = computeViewfinderLayout(1920, 1080);
    this.cameras.main.setViewport(vf.viewportX, vf.viewportY, vf.viewportW, vf.viewportH);
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);

    const gameW = vf.viewportW;   // actual pixel width of the game area
    const gameH = vf.viewportH;   // actual pixel height of the game area

    // Hotspots and room data are authored in 1920×1080 design space.
    // Use uniform (cover) scaling so hotspots align with the cover-scaled background.
    const coverScale = Math.max(gameW / 1920, gameH / 1080);
    this.scaleX = coverScale;
    this.scaleY = coverScale;
    // Offset to center the design space within the viewport (matches bg centering)
    this.bgOffsetX = (gameW - 1920 * coverScale) / 2;
    this.bgOffsetY = (gameH - 1080 * coverScale) / 2;

    // Room background — cover the viewport while preserving aspect ratio
    // Check for alternate background based on game state (supports multiple alternates)
    let bgKey = `bg_${this.currentRoom.id}`;
    const activeAlt = this.getActiveAltBackground();
    if (activeAlt && this.textures.exists(activeAlt.key)) {
      bgKey = activeAlt.key;
    }
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(gameW / 2, gameH / 2, bgKey);
      const scaleX = gameW / bg.width;
      const scaleY = gameH / bg.height;
      const coverScale = Math.max(scaleX, scaleY);
      bg.setScale(coverScale);
    } else {
      drawRoomBackground(this, this.currentRoom.id);
    }

    // Ensure UIScene always renders above the room
    if (this.scene.isActive('UIScene')) {
      this.scene.bringToTop('UIScene');
    }

    // Ambient atmosphere particles
    addAmbientParticles(this, this.currentRoom.id);

    // ─── Room Entry Announcement (centered, click-to-continue) ───
    // Pointer cursor during intro, explore cursor after dismissal
    const roomId = this.currentRoom.id;
    const visitedFlag = `visited_room_${roomId}`;
    if (!SaveSystem.getInstance().getFlag(visitedFlag)) {
      SaveSystem.getInstance().setFlag(visitedFlag, true);
      this.showRoomAnnouncement(gameW, gameH, () => {
        this.input.setDefaultCursor(this.getExploreCursor());
        // Create hotspots only after announcement is dismissed
        // so the dismiss click doesn't trigger hotspots underneath
        this.createHotspots();
      });
    } else {
      // Already visited — go straight to explore cursor
      this.input.setDefaultCursor(this.getExploreCursor());
      // Create hotspots immediately for revisited rooms
      this.createHotspots();
    }

    // Selected item indicator (top-left, avoids HUD overlay in top-right)
    this.selectedItemIndicator = this.add.text(20, 20, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
      fontStyle: 'italic',
    }).setOrigin(0, 0).setDepth(90);
    this.updateSelectedItemIndicator();

    // Listen for inventory selection changes
    InventorySystem.getInstance().onChange(() => {
      this.updateSelectedItemIndicator();
      // Update scene cursor to reflect equipped item
      const equippedCursor = this.getEquippedItemCursor();
      this.input.setDefaultCursor(equippedCursor || this.getExploreCursor());
    });

    // Check chapter progression — show transition if advanced
    const newChapter = ChapterSystem.getInstance().checkProgression();
    if (newChapter) {
      this.scene.launch('ChapterTransitionScene', { chapter: newChapter });
    }

    // Auto-save on room entry
    SaveSystem.getInstance().save();

    // Start with pointer during room intro — switches to magnifying glass after dismissal
    this.input.setDefaultCursor(Cursors.default);

    // Pre-generate the glowing spyglass cursor for hotspot hover
    createGlowSpyglass().then((cursor) => {
      this.glowCursor = cursor;
    });

    // Skip the curtain animation if we just came from a cinematic cutscene
    if (this.cameFromCinematic) {
      this.input.setDefaultCursor(this.getExploreCursor());
      this.checkScriptedEvents();
      this.checkItemContextHints();
    } else {
      this.playCurtainOpen(() => {
        this.checkScriptedEvents();
        this.checkItemContextHints();
      });
    }

    // Ambient audio disabled — music system handles atmosphere

    // Play background music — each room has a default track, but if the player
    // manually chose a track from settings, respect that override.
    const music = MusicSystem.getInstance();
    if (UISounds.getMusicOverride()) {
      // Player chose a specific track — play it if not already playing
      if (!music.isPlaying()) {
        music.play(UISounds.getMusicTrack());
      }
    } else {
      // Use room-specific default track
      const ROOM_MUSIC: Record<string, string> = {
        lobby: 'signs_to_nowhere',           // noir jazz — welcoming but mysterious
        auditorium: 'lobby_elegant',          // warm elegant strings
        backstage: 'darkest_child',             // dark, unsettling — gaslight
        dressing_room: 'comfortable_mystery', // contemplative vintage piano
        projection_booth: 'ghost_story',      // haunting atmosphere
        managers_office: 'crypto',            // moody building tension
        catwalk: 'mystery_unsolved',            // investigation energy
        basement: 'dreamy_flashback',         // emotional revelation
      };
      const targetTrack = ROOM_MUSIC[this.currentRoom.id] || 'signs_to_nowhere';
      if (!music.isPlaying() || music.getCurrentTrack()?.id !== targetTrack) {
        music.play(targetTrack);
      }
    }

    // Ambient phone ringing in lobby — starts after talking to Vivian, stops on pickup
    this.phoneRinging = false;
    if (this.currentRoom.id === 'lobby') {
      const save = SaveSystem.getInstance();
      const talkedToVivian = save.getFlag('vivian_intro');
      const phoneAnswered = save.getFlag('used_hotspot_lobby_phone');
      const phoneDone = save.getFlag('called_ned');
      if (talkedToVivian && !phoneAnswered && !phoneDone) {
        // Delay the first ring so it feels like it starts after you arrive
        this.time.delayedCall(1500, () => {
          if (!this.phoneRinging && !save.getFlag('used_hotspot_lobby_phone')) {
            this.phoneRinging = true;
            UISounds.phoneRingStart();
          }
        });
      }

      // Also listen for vivian_intro completing mid-scene (first playthrough)
      const checkPhoneAfterIntro = () => {
        if (save.getFlag('vivian_intro') && !save.getFlag('used_hotspot_lobby_phone') && !this.phoneRinging) {
          this.time.delayedCall(2000, () => {
            if (!this.phoneRinging && !save.getFlag('used_hotspot_lobby_phone')) {
              this.phoneRinging = true;
              UISounds.phoneRingStart();
            }
          });
        }
      };
      save.onChange(checkPhoneAfterIntro);
      this.events.once('shutdown', () => save.offChange(checkPhoneAfterIntro));
    }

    // Stop phone ringing on scene shutdown (room transition)
    this.events.once('shutdown', () => {
      if (this.phoneRinging) {
        UISounds.phoneRingStop();
        this.phoneRinging = false;
      }
    });

    // Hotspot editor toggle (Shift+Q)
    this.input.keyboard!.on('keydown-Q', (event: KeyboardEvent) => {
      if (!event.shiftKey) return;
      if (this.scene.isActive('HotspotEditorScene')) {
        this.scene.stop('HotspotEditorScene');
      } else {
        this.scene.launch('HotspotEditorScene', { roomId: this.currentRoom.id });
      }
    });

    // Debug: Shift+U = unlock all rooms + max chapter (for hotspot editing)
    this.input.keyboard!.on('keydown-U', (event: KeyboardEvent) => {
      if (!event.shiftKey) return;
      const save = SaveSystem.getInstance();
      const allRooms = (roomsData.rooms as RoomData[]).map(r => r.id);
      for (const id of allRooms) {
        save.discoverRoom(id);
      }
      save.setChapter(5);
      save.save();
      console.log('%c[DEBUG] All rooms unlocked, chapter set to 5', 'color: #00ff88; font-weight: bold');
      // Show confirmation toast
      const toast = this.add.text(this.cameras.main.worldView.width / 2, 60, 'All rooms unlocked!', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#00ff88',
        backgroundColor: '#000000cc',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setDepth(999);
      this.tweens.add({
        targets: toast,
        alpha: 0,
        delay: 2000,
        duration: 500,
        onComplete: () => toast.destroy(),
      });
    });
  }

  private checkScriptedEvents(): void {
    const event = ScriptedEventScene.getTriggerable(this.currentRoom.id);
    if (event) {
      this.time.delayedCall(1500, () => {
        this.scene.launch('ScriptedEventScene', { eventId: event.id });
      });
    }
  }

  // Item-to-character context hints: when the player enters a room with a character
  // and has a relevant item in inventory, show a brief Nancy thought bubble.
  private static ITEM_CONTEXT_HINTS: { roomId: string; itemId: string; flag?: string; hint: string }[] = [
    { roomId: 'lobby', itemId: 'margaux_diary', hint: 'I have Margaux\'s diary. Vivian would want to see this — she was Margaux\'s goddaughter.' },
    { roomId: 'lobby', itemId: 'margaux_locket', hint: 'This locket from Margaux\'s trunk... Vivian might recognize the photo inside.' },
    { roomId: 'auditorium', itemId: 'margaux_diary', hint: 'I should show Edwin this diary. He\'s spent fifteen years researching Margaux — he\'d want to see her own words.' },
    { roomId: 'auditorium', itemId: 'effects_manual', hint: 'I found the effects manual. Edwin seemed awfully knowledgeable about stage effects — I wonder how he\'d react if I brought it up.' },
    { roomId: 'backstage', itemId: 'stella_records', hint: 'These lockbox records show $4,200 in prop sales. Stella has some explaining to do.' },
    { roomId: 'backstage', itemId: 'blueprints', hint: 'These blueprints show hidden passages throughout the theater. Stella knows this building — she might recognize them.' },
    { roomId: 'projection_booth', itemId: 'annotated_script', flag: 'script_decoded', hint: 'I decoded the cipher — G-O-B-L-E-T. Diego will want to hear about this.' },
    { roomId: 'managers_office', itemId: 'ashworth_files', hint: 'These insurance documents show the demolition is worth $2.3 million. Time to confront Ashworth about his real motive.' },
    { roomId: 'basement', itemId: 'blueprints', hint: 'Edwin\'s annotations on these blueprints show a passage network beneath the stage. There should be an entrance down here somewhere.' },
  ];

  private checkItemContextHints(): void {
    if (DialogueSystem.getInstance().isActive()) return;
    const inventory = InventorySystem.getInstance();
    const save = SaveSystem.getInstance();

    for (const ctx of RoomScene.ITEM_CONTEXT_HINTS) {
      if (ctx.roomId !== this.currentRoom.id) continue;
      if (!inventory.hasItem(ctx.itemId)) continue;
      // Don't show hint if already acted on it (flag is set)
      if (ctx.flag && (save.getFlag(ctx.flag) || DialogueSystem.getInstance().hasTriggeredEvent(ctx.flag))) continue;
      // Don't show the same hint twice per session
      const hintFlag = `hint_shown_${ctx.roomId}_${ctx.itemId}`;
      if (save.getFlag(hintFlag)) continue;
      save.setFlag(hintFlag, true);

      // Show the hint after a brief delay so it doesn't compete with room announcement
      this.time.delayedCall(2000, () => {
        if (!DialogueSystem.getInstance().isActive()) {
          this.showThoughtBubble(ctx.hint);
        }
      });
      break; // Only show one hint per room entry
    }
  }

  private showThoughtBubble(text: string): void {
    // Use the same description box style as hotspot clues for consistency
    this.showDescription(text);
  }

  // Uniform cover scale + offset from 1920×1080 design space to viewport
  private scaleX = 1;
  private scaleY = 1;
  private bgOffsetX = 0;
  private bgOffsetY = 0;

  private createHotspots(): void {
    this.hotspotObjects.forEach(h => h.destroy());
    this.hotspotObjects = [];

    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();

    for (const hotspot of this.currentRoom.hotspots) {
      // Check showWhen condition
      if (hotspot.showWhen) {
        const flagSet = save.getFlag(hotspot.showWhen);
        const eventTriggered = dialogue.hasTriggeredEvent(hotspot.showWhen);
        const chapterMatch = hotspot.showWhen.startsWith('chapter_') &&
          this.checkChapterCondition(hotspot.showWhen);

        if (!flagSet && !eventTriggered && !chapterMatch) {
          continue; // Skip this hotspot — condition not met
        }
      }

      // Check hideWhen condition — hide hotspot once flag/event is set
      if (hotspot.hideWhen) {
        const hideFlag = save.getFlag(hotspot.hideWhen);
        const hideEvent = dialogue.hasTriggeredEvent(hotspot.hideWhen);
        if (hideFlag || hideEvent) {
          continue;
        }
      }

      // Skip already-used onceOnly hotspots
      if (hotspot.onceOnly && (this.usedHotspots.has(hotspot.id) || SaveSystem.getInstance().getFlag('used_hotspot_' + hotspot.id))) {
        continue;
      }

      // Skip solved puzzle hotspots
      if (hotspot.puzzleId && PuzzleSystem.getInstance().isSolved(hotspot.puzzleId)) {
        continue;
      }

      // Scale from 1920×1080 design coordinates to actual viewport (uniform cover scale)
      const hx = hotspot.x * this.scaleX + this.bgOffsetX;
      const hy = hotspot.y * this.scaleY + this.bgOffsetY;
      const container = this.add.container(hx, hy);

      // Hotspot clickable area - minimum 48px for mobile tap targets
      const w = Math.max(hotspot.width * this.scaleX, 48);
      const h = Math.max(hotspot.height * this.scaleY, 48);

      // Nancy Drew style: invisible hitbox, no colored overlay
      const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0);
      bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

      // Subtle glow effect on hover (no visible box outline)

      // Label: larger, high-contrast, with glow — hidden until hover
      const label = this.add.text(0, -(h / 2) - 12, hotspot.label, {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffe8a0',
        fontStyle: 'bold',
        align: 'center',
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#000000',
          blur: 8,
          fill: true,
        },
        backgroundColor: '#0a0a1280',
        padding: { x: 14, y: 6 },
      });
      label.setOrigin(0.5, 1);
      label.setAlpha(0);

      // Clamp label so it doesn't get cut off at viewport edges
      const viewW = this.cameras.main.width;
      const viewH = this.cameras.main.height;
      const labelW = label.width;
      const labelH = label.height;
      const margin = 8;
      // Left edge: label center (hx + localX) - labelW/2 >= margin
      // Right edge: label center (hx + localX) + labelW/2 <= viewW - margin
      let labelLocalX = 0;
      const leftOverflow = margin - (hx + labelLocalX - labelW / 2);
      const rightOverflow = (hx + labelLocalX + labelW / 2) - (viewW - margin);
      if (leftOverflow > 0) labelLocalX += leftOverflow;
      if (rightOverflow > 0) labelLocalX -= rightOverflow;
      // Vertical: if label goes above viewport, push it below the hotspot
      const labelTopWorld = hy + (-(h / 2) - 12) - labelH;
      if (labelTopWorld < margin) {
        label.setY(h / 2 + 12);
        label.setOrigin(0.5, 0);
      }
      label.setX(labelLocalX);

      container.add([bg, label]);
      container.setSize(w, h);

      // Tutorial glow for phone hotspot — guide new players to answer the ringing phone
      if (hotspot.id === 'lobby_phone' && !save.getFlag('phone_glow_shown')) {
        const glowRadius = Math.max(w, h) * 0.8;
        const glow = this.add.circle(0, 0, glowRadius, 0xc9a84c, 0.12);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        container.add(glow);
        container.sendToBack(glow);

        // Pulsing glow ring
        const ring = this.add.circle(0, 0, glowRadius * 0.7);
        ring.setStrokeStyle(2, 0xe8c55a, 0.4);
        ring.setFillStyle(0x000000, 0);
        container.add(ring);
        container.sendToBack(ring);

        this.tweens.add({
          targets: glow,
          alpha: { from: 0.08, to: 0.25 },
          scaleX: { from: 0.9, to: 1.1 },
          scaleY: { from: 0.9, to: 1.1 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: ring,
          alpha: { from: 0.2, to: 0.5 },
          scaleX: { from: 0.95, to: 1.05 },
          scaleY: { from: 0.95, to: 1.05 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: 200,
        });

        // Remove glow on first click
        bg.once('pointerdown', () => {
          save.setFlag('phone_glow_shown', true);
          this.tweens.killTweensOf(glow);
          this.tweens.killTweensOf(ring);
          this.tweens.add({
            targets: [glow, ring],
            alpha: 0,
            duration: 300,
            onComplete: () => { glow.destroy(); ring.destroy(); },
          });
        });
      }

      // Get cursor for this hotspot type
      const hoverCursor = this.getHotspotCursor(hotspot.type);

      // Hover: change cursor by type, show label, subtle gold edge shimmer
      bg.on('pointerover', () => {
        this.tweens.add({ targets: label, alpha: 1, duration: 180 });
        this.input.setDefaultCursor(hoverCursor);
      });

      bg.on('pointerout', () => {
        this.tweens.add({ targets: label, alpha: 0, duration: 180 });
        // Restore default cursor (spyglass if exploring, or equipped item)
        const equippedCursor = this.getEquippedItemCursor();
        this.input.setDefaultCursor(equippedCursor || this.getExploreCursor());
      });

      // Click/tap handler with sparkle feedback and sound
      bg.on('pointerdown', () => {
        this.playClickSparkle(hx, hy, Colors.gold);
        this.handleHotspot(hotspot);
      });

      this.hotspotObjects.push(container);
    }
  }

  /** Resolve the highest-priority active alt background for the current room. */
  private getActiveAltBackground(): AltBackground | null {
    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();
    const isActive = (flag: string) =>
      save.getFlag(flag) || dialogue.hasTriggeredEvent(flag) ||
      (flag.startsWith('chapter_') && this.checkChapterCondition(flag));

    // Collect all alt background candidates (legacy single + array)
    const candidates: AltBackground[] = [];
    if (this.currentRoom.altBackground) candidates.push(this.currentRoom.altBackground);
    if (this.currentRoom.altBackgrounds) candidates.push(...this.currentRoom.altBackgrounds);

    // Filter to active ones, sort by priority descending
    const active = candidates
      .filter(alt => isActive(alt.showWhen))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return active[0] ?? null;
  }

  private checkChapterCondition(condition: string): boolean {
    const match = condition.match(/^chapter_(\d+)$/);
    if (!match) return false;
    const requiredChapter = parseInt(match[1], 10);
    return SaveSystem.getInstance().getChapter() >= requiredChapter;
  }

  private hideAllHotspotLabels(): void {
    for (const container of this.hotspotObjects) {
      container.each((child: Phaser.GameObjects.GameObject) => {
        if (child instanceof Phaser.GameObjects.Text) {
          (child as Phaser.GameObjects.Text).setAlpha(0);
        }
      });
    }
  }

  private dismissDescriptionBox(): void {
    if (this._descriptionClickZone) {
      this._descriptionClickZone.destroy();
      this._descriptionClickZone = null;
    }
    if (this.descriptionBox) {
      this.descriptionBox.destroy();
      this.descriptionBox = null;
    }
    if (this._descriptionDismissKey) {
      this.input.keyboard!.off('keydown', this._descriptionDismissKey);
      this._descriptionDismissKey = null;
    }
  }

  private handleHotspot(hotspot: Hotspot): void {
    // Don't handle if dialogue is active
    if (DialogueSystem.getInstance().isActive()) return;

    // Dismiss any open description box before handling a new hotspot
    this.dismissDescriptionBox();

    if (hotspot.onceOnly && this.usedHotspots.has(hotspot.id)) {
      this.showDescription('Nothing else to find here.');
      return;
    }

    // Check for item-on-hotspot interaction
    const selectedItem = InventorySystem.getInstance().getSelectedItem();

    // Set evidence flag if hotspot defines one (for any interaction type)
    if (hotspot.setsFlag) {
      SaveSystem.getInstance().setFlag(hotspot.setsFlag, true);
    }

    // Play contextual SFX based on hotspot label/type
    this.playHotspotSFX(hotspot);

    switch (hotspot.type) {
      case 'inspect':
        this.showDescription(hotspot.description || 'Nothing noteworthy.', undefined, hotspot.clueImage);
        // Always mark as examined so clue counter tracks it
        SaveSystem.getInstance().setFlag('used_hotspot_' + hotspot.id, true);
        if (hotspot.onceOnly) {
          this.usedHotspots.add(hotspot.id);
          this.createHotspots();
        }
        break;

      case 'pickup':
        if (hotspot.itemId) {
          const inventory = InventorySystem.getInstance();
          if (inventory.hasItem(hotspot.itemId)) {
            this.showDescription('You already have this.');
          } else {
            inventory.addItem(hotspot.itemId);
            inventory.selectItem(hotspot.itemId);
            UISounds.itemPickup();
            this.showPickupToast(hotspot.label);
            this.usedHotspots.add(hotspot.id);
            SaveSystem.getInstance().setFlag('used_hotspot_' + hotspot.id, true);
            this.events.emit('item-picked-up', hotspot.itemId);
            // Add journal entry for key evidence pickups
            const item = itemsData.items.find(i => i.id === hotspot.itemId);
            if (item) {
              SaveSystem.getInstance().addJournalEntry(`Found ${item.name} in the ${this.currentRoom.name}.`);
            }
            // Refresh hotspots so the picked-up item disappears immediately
            this.createHotspots();
          }
        }
        break;

      case 'locked':
        this.handleLockedHotspot(hotspot, selectedItem);
        break;

      case 'navigate':
        if (hotspot.targetRoom) {
          // Clear equipped item when navigating
          if (selectedItem) {
            InventorySystem.getInstance().selectItem(null);
          }
          this.navigateToRoom(hotspot.targetRoom);
        }
        break;

      case 'talk':
        if (hotspot.dialogueId) {
          // Stop ambient phone ringing when picking up the phone
          if (this.phoneRinging && /phone/i.test(hotspot.label || '')) {
            UISounds.phoneRingStop();
            this.phoneRinging = false;
          }
          // Mark as examined so clue counter tracks it
          SaveSystem.getInstance().setFlag('used_hotspot_' + hotspot.id, true);
          // Hide all hotspot labels so they don't show through the dialogue overlay
          this.hideAllHotspotLabels();
          const dialogue = DialogueSystem.getInstance();
          const useAlt = hotspot.altDialogueId && hotspot.altDialogueWhen &&
            SaveSystem.getInstance().getFlag(hotspot.altDialogueWhen);
          dialogue.startDialogue(useAlt ? hotspot.altDialogueId! : hotspot.dialogueId, this);
          // Refresh hotspots after dialogue ends (events may unlock new hotspots)
          const checkDialogueEnd = this.time.addEvent({
            delay: 250,
            loop: true,
            callback: () => {
              if (!dialogue.isActive()) {
                checkDialogueEnd.destroy();
                this.createHotspots();
              }
            },
          });
        }
        break;
    }
  }

  /** Play a contextual sound effect based on the hotspot label and type. */
  private playHotspotSFX(hotspot: Hotspot): void {
    // Navigate hotspots use door sound (played in navigateToRoom), skip here
    if (hotspot.type === 'navigate') return;
    // Pickup has its own sound in the handler
    if (hotspot.type === 'pickup') return;

    const label = (hotspot.label || '').toLowerCase();

    // Match label keywords to appropriate SFX
    if (/drawer/i.test(label)) { UISounds.drawerOpen(); return; }
    if (/door|trapdoor/i.test(label)) { UISounds.doorCreak(); return; }
    if (/curtain/i.test(label)) { UISounds.curtainPull(); return; }
    if (/cabinet|filing/i.test(label)) { UISounds.drawerOpen(); return; }
    if (/desk|table/i.test(label)) { UISounds.drawerOpen(); return; }
    if (/book|journal|diary|script|letter|note|ledger|pamphlet|playbill|poem/i.test(label)) { UISounds.pageTurn(); return; }
    if (/safe|lock|padlock/i.test(label)) { UISounds.safeDial(); return; }
    if (/key/i.test(label)) { UISounds.keyJingle(); return; }
    if (/lamp|light|spotlight|switch/i.test(label)) { UISounds.spotlightClick(); return; }
    if (/phone/i.test(label)) { UISounds.click(); return; } // picking up receiver
    if (/photo|portrait|picture|painting/i.test(label)) { UISounds.photoSnap(); return; }
    if (/fog|machine|pipe/i.test(label)) { UISounds.fogMachineHiss(); return; }
    if (/map/i.test(label)) { UISounds.mapOpen(); return; }
    if (/goblet|glass|cup|bottle|vial|poison/i.test(label)) { UISounds.gobletClink(); return; }

    // Default: no sound for unmatched inspect hotspots (no more click-on-everything)
  }

  private handleLockedHotspot(hotspot: Hotspot, selectedItem: string | null): void {
    const inv = InventorySystem.getInstance();

    // Puzzle hotspots
    if (hotspot.puzzleId) {
      // Some puzzle hotspots require a specific item (e.g., magnifying glass)
      if (hotspot.requiredItem) {
        if (selectedItem === hotspot.requiredItem || inv.hasItem(hotspot.requiredItem)) {
          // Show the description first, then open puzzle only after player dismisses it
          if (hotspot.description) {
            this.showDescription(hotspot.description, () => {
              this.openPuzzle(hotspot.puzzleId!);
            });
          } else {
            this.openPuzzle(hotspot.puzzleId!);
          }
        } else {
          this.showDescription('You need something specific to examine this more closely.');
        }
      } else {
        // No item required — just open the puzzle
        this.openPuzzle(hotspot.puzzleId);
      }
      return;
    }

    // Item-on-hotspot: if player has selected the required item, use it
    if (hotspot.requiredItem) {
      // Already unlocked on a previous visit — just navigate
      const alreadyUnlocked = SaveSystem.getInstance().getFlag('used_hotspot_' + hotspot.id);
      if (alreadyUnlocked && hotspot.targetRoom) {
        this.navigateToRoom(hotspot.targetRoom);
        return;
      }
      if (selectedItem === hotspot.requiredItem) {
        // Use the selected item on this hotspot
        this.showDescription(hotspot.description || 'Unlocked!');
        this.usedHotspots.add(hotspot.id);
        SaveSystem.getInstance().setFlag('used_hotspot_' + hotspot.id, true);
        // Mark item as used and deselect — cursor reverts to magnifying glass
        inv.markUsed(hotspot.requiredItem);
        inv.selectItem(null);
        // Keep item in evidence journal but mark as used
        if (hotspot.targetRoom) {
          this.time.delayedCall(1000, () => {
            this.navigateToRoom(hotspot.targetRoom!);
          });
        }
      } else if (inv.hasItem(hotspot.requiredItem)) {
        // Has the item but hasn't selected it
        this.showDescription(`This seems to need something from your inventory. Try selecting an item first.`);
      } else {
        this.showDescription('It\'s locked. You need something to open this.');
      }
      return;
    }

    // Fallback for locked without requiredItem
    this.showDescription(hotspot.description || 'It\'s locked.');
  }

  private openPuzzle(puzzleId: string): void {
    if (PuzzleSystem.getInstance().isSolved(puzzleId)) {
      this.showDescription('You\'ve already solved this.');
      return;
    }

    const onSolved = () => {
      this.createHotspots();
      const puzzle = PuzzleSystem.getInstance().getPuzzle(puzzleId);
      if (puzzle?.unlocks) {
        SaveSystem.getInstance().setFlag(puzzle.unlocks, true);
        // If the unlock matches an item ID, grant it to inventory
        const isItem = (itemsData.items as { id: string }[]).some(i => i.id === puzzle.unlocks);
        if (isItem) {
          InventorySystem.getInstance().addItem(puzzle.unlocks!);
          this.showPickupToast(
            (itemsData.items as { id: string; name: string }[]).find(i => i.id === puzzle.unlocks)?.name || puzzle.unlocks!
          );
        }
      }
    };

    // Route evidence board to its dedicated scene
    if (puzzleId === 'evidence_board') {
      this.scene.launch('EvidenceBoardScene', { onSolved });
    } else {
      this.scene.launch('PuzzleScene', { puzzleId, onSolved });
    }
  }

  private updateSelectedItemIndicator(): void {
    const selected = InventorySystem.getInstance().getSelectedItem();
    if (selected) {
      const item = itemsData.items.find(i => i.id === selected);
      const displayName = item?.name || selected;
      this.selectedItemIndicator.setText(`Using: ${displayName}`);
      this.selectedItemIndicator.setAlpha(0.7);
    } else {
      this.selectedItemIndicator.setText('');
    }
  }

  private showDescription(text: string, onDismiss?: () => void, imageKey?: string): void {
    const { width, height } = this.cameras.main.worldView;

    // Destroy previous description box and clean up its listeners
    this.dismissDescriptionBox();

    // ── Full-screen click catcher ──
    const clickZone = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    clickZone.setDepth(Depths.descriptionBox);
    clickZone.setInteractive();
    this._descriptionClickZone = clickZone;

    // Visual container (sits on top of the overlay)
    const container = this.add.container(0, 0);
    container.setDepth(Depths.descriptionBox + 1);
    this.descriptionBox = container;

    const gfx = this.add.graphics();
    container.add(gfx);

    // ── Clue investigation image (displayed left of text when available) ──
    const hasImage = imageKey && this.textures.exists(imageKey);
    const imageWidth = hasImage ? Math.min(width * 0.3, 380) : 0;
    const contentCenterX = hasImage ? width / 2 + imageWidth / 2 + 10 : width / 2;
    const imageCenterX = hasImage ? width / 2 - (width * 0.65 - imageWidth) / 2 - 10 : 0;

    if (hasImage) {
      const img = this.add.image(imageCenterX, height * 0.48, imageKey!);
      // Scale to fit the allocated width while maintaining aspect ratio
      const imgScale = Math.min(imageWidth / img.width, (height * 0.5) / img.height);
      img.setScale(imgScale);
      // Gold frame border around the image
      const frameW = img.width * imgScale + 8;
      const frameH = img.height * imgScale + 8;
      const frame = this.add.rectangle(imageCenterX, height * 0.48, frameW, frameH);
      frame.setStrokeStyle(2, Colors.gold, 0.6);
      frame.setFillStyle(0x000000, 0);
      container.add([frame, img]);
    }

    // Decorative divider above text
    drawDecoDivider(gfx, contentCenterX, height * 0.45 - 20, width * 0.35, DecoColors.gold, 0.5);

    // Description text — centered, cream/light italic with glow shadow
    const maxTextW = hasImage ? Math.min(width * 0.35, 500) : Math.min(width * 0.65, 800);
    const textObj = this.add.text(contentCenterX, height * 0.5, text, {
      fontFamily: FONT,
      fontSize: '26px',
      color: DecoTextColors.cream,
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: maxTextW },
      lineSpacing: 6,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#000000',
        blur: 8,
        fill: true,
      },
    });
    textObj.setOrigin(0.5);
    container.add(textObj);

    // Decorative divider below text
    const dividerBelowY = textObj.y + textObj.height / 2 + 20;
    drawDecoDivider(gfx, contentCenterX, dividerBelowY, width * 0.35, DecoColors.gold, 0.5);

    // Fade in
    clickZone.setAlpha(0);
    container.setAlpha(0);
    this.tweens.add({ targets: [clickZone, container], alpha: 1, duration: 400, ease: 'Power2' });

    // Dismiss handler
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      this.input.keyboard!.off('keydown', dismissKey);
      this._descriptionDismissKey = null;
      this.tweens.add({
        targets: [clickZone, container],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          clickZone.destroy();
          container.destroy();
          this._descriptionClickZone = null;
          this.descriptionBox = null;
          if (onDismiss) onDismiss();
        },
      });
    };
    const dismissKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'Escape') {
        dismiss();
      }
    };
    this._descriptionDismissKey = dismissKey;

    // Arm dismiss after a short delay so the click that opened this doesn't close it
    this.time.delayedCall(150, () => {
      if (!dismissed) {
        clickZone.on('pointerdown', dismiss);
        this.input.keyboard!.on('keydown', dismissKey);
      }
    });
  }

  private showPickupToast(label: string): void {
    const { width, height } = this.cameras.main.worldView;
    const container = this.add.container(0, 0);
    container.setDepth(Depths.descriptionBox);

    const text = `✦  ${label}  ✦`;
    const textObj = this.add.text(width / 2, height * 0.35, text, {
      fontFamily: FONT,
      fontSize: '28px',
      color: TextColors.gold,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    const padX = 50, padY = 20;
    const bgW = textObj.width + padX * 2;
    const bgH = textObj.height + padY * 2;
    const bg = this.add.rectangle(width / 2, height * 0.35, bgW, bgH, 0x1a1020, 0.96);
    bg.setStrokeStyle(2, Colors.gold, 0.7);

    // Glow effect behind the panel
    const glow = this.add.rectangle(width / 2, height * 0.35, bgW + 20, bgH + 20, Colors.gold, 0.08);
    container.add([glow, bg, textObj]);

    // Animate: slide up and fade in, then auto-dismiss
    container.setAlpha(0);
    container.y = 30;
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: 0,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for a moment, then fade out
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: container,
            alpha: 0,
            y: -20,
            duration: 400,
            ease: 'Sine.easeIn',
            onComplete: () => container.destroy(),
          });
        });
      },
    });

    // Pulsing glow
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.2 },
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 600,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
  }


  /** Default explore cursor: spyglass if player has the magnifying glass item, otherwise standard pointer */
  private getExploreCursor(): string {
    return InventorySystem.getInstance().hasItem('magnifying_glass')
      ? this.glowCursor
      : Cursors.default;
  }

  /** Return the appropriate cursor for a hotspot type — Nancy Drew style */
  private getHotspotCursor(type: string): string {
    switch (type) {
      case 'inspect': return this.glowCursor; // glowing spyglass
      case 'pickup': return Cursors.pickup;    // grabbing hand
      case 'navigate': return Cursors.navigate; // door with arrow
      case 'talk': return Cursors.talk;         // speech bubble
      case 'locked': return Cursors.locked;     // padlock
      default: return this.glowCursor;
    }
  }

  /** If an inventory item is equipped/selected, return a cursor for it.
   *  The magnifying glass item gets the glowing spyglass; other items
   *  use the item's actual PNG asset as a cursor. Returns null if nothing equipped. */
  private getEquippedItemCursor(): string | null {
    const selected = InventorySystem.getInstance().getSelectedItem();
    if (!selected) return null;
    if (selected === 'magnifying_glass') return this.glowCursor;
    // Use the item's actual image asset as the cursor
    const textureKey = `item_icon_${selected}`;
    return createItemCursor(this, textureKey);
  }

  private playClickSparkle(x: number, y: number, color: number): void {
    // Create 5 small sparkle dots that burst outward and fade — subtle, gold-only
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 18 + Math.random() * 12;
      const spark = this.add.circle(x, y, 2.5, color, 0.6);
      spark.setDepth(Depths.tooltip + 1);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 400,
        ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private playCurtainOpen(onComplete: () => void): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const curtainColor = 0x4a0a0a; // deep crimson

    const left = this.add.rectangle(width / 4, height / 2, width / 2, height, curtainColor, 1);
    const right = this.add.rectangle(width * 3 / 4, height / 2, width / 2, height, curtainColor, 1);
    left.setDepth(Depths.scriptedEvent + 10);
    right.setDepth(Depths.scriptedEvent + 10);

    // Gold fringe line at inner edge
    const fringeL = this.add.rectangle(width / 2 - 1, height / 2, 3, height, Colors.gold, 0.6);
    const fringeR = this.add.rectangle(width / 2 + 1, height / 2, 3, height, Colors.gold, 0.6);
    fringeL.setDepth(Depths.scriptedEvent + 11);
    fringeR.setDepth(Depths.scriptedEvent + 11);

    this.tweens.add({
      targets: [left, fringeL],
      x: `-=${width / 2 + 10}`,
      duration: 600,
      ease: 'Power2',
      delay: 100,
      onComplete: () => { left.destroy(); fringeL.destroy(); },
    });
    this.tweens.add({
      targets: [right, fringeR],
      x: `+=${width / 2 + 10}`,
      duration: 600,
      ease: 'Power2',
      delay: 100,
      onComplete: () => { right.destroy(); fringeR.destroy(); onComplete(); },
    });
  }


  private showRoomAnnouncement(width: number, height: number, onDismiss?: () => void): void {
    const container = this.add.container(0, 0);
    container.setDepth(Depths.scriptedEvent - 1);

    // Full-screen dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    container.add(overlay);

    // Decorative elements
    const gfx = this.add.graphics();
    container.add(gfx);

    // Room name — large, centered, gold
    const roomName = this.add.text(width / 2, height * 0.45, this.currentRoom.name.toUpperCase(), {
      fontFamily: FONT,
      fontSize: '54px',
      color: DecoTextColors.goldBright,
      fontStyle: 'bold',
      letterSpacing: 6,
      align: 'center',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#c9a84c',
        blur: 10,
        fill: true,
      },
    }).setOrigin(0.5);
    container.add(roomName);

    // Decorative divider above name
    drawDecoDivider(gfx, width / 2, height * 0.45 - 32, width * 0.4, DecoColors.gold, 0.5);

    // Decorative divider below name
    drawDecoDivider(gfx, width / 2, height * 0.45 + 32, width * 0.4, DecoColors.gold, 0.5);

    // Room description — readable size, centered below
    const desc = this.add.text(width / 2, height * 0.58, this.currentRoom.description, {
      fontFamily: FONT,
      fontSize: '26px',
      color: DecoTextColors.cream,
      fontStyle: 'italic',
      wordWrap: { width: width * 0.65 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);
    container.add(desc);

    // Places to check count — helps player know scope of investigation in this room
    const placesToCheck = this.currentRoom.hotspots.filter(hs => {
      const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
      if (!isClueType) return false;
      // Respect showWhen gates
      if (hs.showWhen) {
        const save = SaveSystem.getInstance();
        const dialogue = DialogueSystem.getInstance();
        const flagSet = save.getFlag(hs.showWhen);
        const eventTriggered = dialogue.hasTriggeredEvent(hs.showWhen);
        if (!flagSet && !eventTriggered) return false;
      }
      // Respect hideWhen gates
      if (hs.hideWhen) {
        const save = SaveSystem.getInstance();
        const dialogue = DialogueSystem.getInstance();
        if (save.getFlag(hs.hideWhen) || dialogue.hasTriggeredEvent(hs.hideWhen)) return false;
      }
      return true;
    }).length;

    if (placesToCheck > 0) {
      const clueHintY = desc.y + desc.height / 2 + 30;
      const clueHint = this.add.text(width / 2, clueHintY, `${placesToCheck} places to investigate`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: TextColors.gold,
        fontStyle: 'bold',
        letterSpacing: 3,
        align: 'center',
      }).setOrigin(0.5);
      container.add(clueHint);
    }

    // Fade in
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });

    // Dismiss logic
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      this.input.off('pointerdown', dismiss);
      this.input.keyboard!.off('keydown', dismissKey);
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          container.destroy();
          if (onDismiss) onDismiss();
        },
      });
    };

    this.input.on('pointerdown', dismiss);

    const dismissKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'Escape') {
        dismiss();
      }
    };
    this.input.keyboard!.on('keydown', dismissKey);
  }

  private navigateToRoom(roomId: string): void {
    // Stop all SFX so they don't bleed into the next room
    UISounds.stopAll();
    UISounds.doorTransition();
    // Track leaving the lobby after intro for revisit dialogue gating
    if (this.currentRoom?.id === 'lobby' && SaveSystem.getInstance().getFlag('vivian_intro')) {
      SaveSystem.getInstance().setFlag('left_lobby_after_intro', true);
    }
    SaveSystem.getInstance().setCurrentRoom(roomId);
    SaveSystem.getInstance().save();
    playCurtainClose(this, () => {
      this.scene.restart({ roomId });
    });
  }
}
