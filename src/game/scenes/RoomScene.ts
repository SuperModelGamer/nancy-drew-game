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
import { AmbientAudioSystem } from '../systems/AmbientAudioSystem';
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
  targetRoom?: string;
  puzzleId?: string;
  onceOnly?: boolean;
  showWhen?: string;
}

interface RoomData {
  id: string;
  name: string;
  description: string;
  background?: string;
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

  constructor() {
    super({ key: 'RoomScene' });
  }

  private redirectingToCinematic = false;

  init(data: { roomId?: string; skipCinematic?: boolean }): void {
    const roomId = data.roomId || 'lobby';
    this.redirectingToCinematic = false;

    // Check for a cinematic that should play before entering this room
    if (!data.skipCinematic) {
      const cinematic = getCinematicForRoom(roomId);
      if (cinematic) {
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
    this.currentRoom = rooms.find(r => r.id === roomId) || rooms[0];
    SaveSystem.getInstance().setCurrentRoom(roomId);
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

    // Hotspots and room data are authored in 1920×1080 space — compute scale factors
    this.scaleX = gameW / 1920;
    this.scaleY = gameH / 1080;

    // Room background — cover the viewport while preserving aspect ratio
    const bgKey = `bg_${this.currentRoom.id}`;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(gameW / 2, gameH / 2, bgKey);
      const scaleX = gameW / bg.width;
      const scaleY = gameH / bg.height;
      const coverScale = Math.max(scaleX, scaleY);
      bg.setScale(coverScale);
    } else {
      drawRoomBackground(this, this.currentRoom.id);
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
      });
    } else {
      // Already visited — go straight to explore cursor
      this.input.setDefaultCursor(this.getExploreCursor());
    }

    // Create hotspots (filtered by showWhen)
    this.createHotspots();

    // Selected item indicator (top-right)
    this.selectedItemIndicator = this.add.text(gameW - 20, 20, '', {
      fontFamily: FONT,
      fontSize: '20px',
      color: TextColors.gold,
      fontStyle: 'italic',
    }).setOrigin(1, 0).setDepth(90);
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

    // Curtain open reveal
    this.playCurtainOpen(() => {
      this.checkScriptedEvents();
    });

    // Start room-specific ambient audio
    const ambientAudio = AmbientAudioSystem.getInstance();
    ambientAudio.setScene(this);
    ambientAudio.enterRoom(this.currentRoom.id);

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

  // Scale factor from the original 1920×1080 coordinate space to the actual viewport
  private scaleX = 1;
  private scaleY = 1;

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

      // Skip already-used onceOnly hotspots
      if (hotspot.onceOnly && (this.usedHotspots.has(hotspot.id) || SaveSystem.getInstance().getFlag('used_hotspot_' + hotspot.id))) {
        continue;
      }

      // Skip solved puzzle hotspots
      if (hotspot.puzzleId && PuzzleSystem.getInstance().isSolved(hotspot.puzzleId)) {
        continue;
      }

      // Scale from 1920×1080 design coordinates to actual viewport
      const hx = hotspot.x * this.scaleX;
      const hy = hotspot.y * this.scaleY;
      const container = this.add.container(hx, hy);

      // Hotspot clickable area - minimum 48px for mobile tap targets
      const w = Math.max(hotspot.width * this.scaleX, 48);
      const h = Math.max(hotspot.height * this.scaleY, 48);

      // Nancy Drew style: invisible hitbox, no colored overlay
      const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0);
      bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

      // Subtle shimmer edge that appears on hover (initially invisible)
      const shimmer = this.add.rectangle(0, 0, w + 4, h + 4, 0x000000, 0);
      shimmer.setStrokeStyle(1.5, Colors.gold, 0);

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

      container.add([shimmer, bg, label]);
      container.setSize(w, h);

      // Get cursor for this hotspot type
      const hoverCursor = this.getHotspotCursor(hotspot.type);

      // Hover: change cursor by type, show label, subtle gold edge shimmer
      bg.on('pointerover', () => {
        // Show shimmer edge
        shimmer.setStrokeStyle(1.5, Colors.gold, 0.35);
        this.tweens.add({ targets: label, alpha: 1, duration: 180 });
        // Always show the hotspot-type cursor (talk bubble, grab hand, etc.)
        this.input.setDefaultCursor(hoverCursor);
      });

      bg.on('pointerout', () => {
        shimmer.setStrokeStyle(1.5, Colors.gold, 0);
        this.tweens.add({ targets: label, alpha: 0, duration: 180 });
        // Restore default cursor (spyglass if exploring, or equipped item)
        const equippedCursor = this.getEquippedItemCursor();
        this.input.setDefaultCursor(equippedCursor || this.getExploreCursor());
      });

      // Click/tap handler with sparkle feedback and sound
      bg.on('pointerdown', () => {
        UISounds.click();
        this.playClickSparkle(hx, hy, Colors.gold);
        this.handleHotspot(hotspot);
      });

      this.hotspotObjects.push(container);
    }
  }

  private checkChapterCondition(condition: string): boolean {
    const match = condition.match(/^chapter_(\d+)$/);
    if (!match) return false;
    const requiredChapter = parseInt(match[1], 10);
    return SaveSystem.getInstance().getChapter() >= requiredChapter;
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

    switch (hotspot.type) {
      case 'inspect':
        this.showDescription(hotspot.description || 'Nothing noteworthy.');
        if (hotspot.onceOnly) {
          this.usedHotspots.add(hotspot.id);
          SaveSystem.getInstance().setFlag('used_hotspot_' + hotspot.id, true);
        }
        break;

      case 'pickup':
        if (hotspot.itemId) {
          const inventory = InventorySystem.getInstance();
          if (inventory.hasItem(hotspot.itemId)) {
            this.showDescription('You already have this.');
          } else {
            inventory.addItem(hotspot.itemId);
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
          const dialogue = DialogueSystem.getInstance();
          dialogue.startDialogue(hotspot.dialogueId, this);
        }
        break;
    }
  }

  private handleLockedHotspot(hotspot: Hotspot, selectedItem: string | null): void {
    const inv = InventorySystem.getInstance();

    // Puzzle hotspots
    if (hotspot.puzzleId) {
      // Some puzzle hotspots require a specific item (e.g., magnifying glass)
      if (hotspot.requiredItem) {
        if (selectedItem === hotspot.requiredItem || inv.hasItem(hotspot.requiredItem)) {
          // Show the description first, then open puzzle
          if (hotspot.description) {
            this.showDescription(hotspot.description);
          }
          this.time.delayedCall(hotspot.description ? 1500 : 0, () => {
            this.openPuzzle(hotspot.puzzleId!);
          });
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
      if (selectedItem === hotspot.requiredItem) {
        // Use the selected item on this hotspot
        this.showDescription(hotspot.description || 'Unlocked!');
        this.usedHotspots.add(hotspot.id);
        SaveSystem.getInstance().setFlag('used_hotspot_' + hotspot.id, true);
        // Mark item as used and deselect — cursor reverts to magnifying glass
        inv.markUsed(hotspot.requiredItem);
        inv.selectItem(null);
        // Consume key items that are used to unlock
        if (hotspot.targetRoom) {
          inv.removeItem(hotspot.requiredItem);
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
      this.selectedItemIndicator.setText(`Using: ${selected}`);
      this.selectedItemIndicator.setAlpha(1);
    } else {
      this.selectedItemIndicator.setText('');
    }
  }

  private showDescription(text: string): void {
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

    // Decorative divider above text
    drawDecoDivider(gfx, width / 2, height * 0.45 - 20, width * 0.35, DecoColors.gold, 0.5);

    // Description text — centered, cream/light italic with glow shadow
    const maxTextW = Math.min(width * 0.65, 800);
    const textObj = this.add.text(width / 2, height * 0.5, text, {
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
    drawDecoDivider(gfx, width / 2, dividerBelowY, width * 0.35, DecoColors.gold, 0.5);

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
    const { width, height } = this.cameras.main.worldView;
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
    UISounds.doorTransition();
    SaveSystem.getInstance().setCurrentRoom(roomId);
    SaveSystem.getInstance().save();
    playCurtainClose(this, () => {
      this.scene.restart({ roomId });
    });
  }
}
