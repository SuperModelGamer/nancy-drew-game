import Phaser from 'phaser';
import roomsData from '../data/rooms.json';
import { InventorySystem } from '../systems/InventorySystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ScriptedEventScene } from './ScriptedEventScene';
import { ChapterSystem } from '../systems/ChapterSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { drawRoomBackground } from '../utils/room-backgrounds';
import { showTutorialIfNeeded } from '../utils/tutorial';
import { Cursors, CursorType, HAND_CURSOR } from '../utils/cursors';
import { addAmbientParticles } from '../utils/ambient-particles';
import { drawDecoDivider, DecoColors, DecoTextColors } from '../utils/art-deco';
import itemsData from '../data/items.json';
import { UISounds } from '../utils/sounds';

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
  private tooltipText!: Phaser.GameObjects.Text;
  private descriptionBox!: Phaser.GameObjects.Container;
  private usedHotspots: Set<string> = new Set();
  private selectedItemIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RoomScene' });
  }

  init(data: { roomId?: string }): void {
    const roomId = data.roomId || 'lobby';
    const rooms = roomsData.rooms as RoomData[];
    this.currentRoom = rooms.find(r => r.id === roomId) || rooms[0];
    SaveSystem.getInstance().setCurrentRoom(roomId);
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Room background - use real image if available, fall back to procedural art
    const bgKey = `bg_${this.currentRoom.id}`;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      bg.setDisplaySize(width, height);
    } else {
      drawRoomBackground(this, this.currentRoom.id);
    }

    // Ambient atmosphere particles
    addAmbientParticles(this, this.currentRoom.id);

    // ─── Room Entry Announcement (centered, click-to-continue) ───
    this.showRoomAnnouncement(width, height);

    // Create hotspots (filtered by showWhen)
    this.createHotspots();

    // Tooltip for hover
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.white,
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    this.tooltipText.setVisible(false);
    this.tooltipText.setDepth(Depths.tooltip);

    // Description box (hidden)
    this.descriptionBox = this.createDescriptionBox();
    this.descriptionBox.setVisible(false);
    this.descriptionBox.setDepth(Depths.descriptionBox);

    // Selected item indicator (top-right)
    this.selectedItemIndicator = this.add.text(width - 20, 20, '', {
      fontFamily: FONT,
      fontSize: '13px',
      color: TextColors.gold,
      fontStyle: 'italic',
    }).setOrigin(1, 0).setDepth(90);
    this.updateSelectedItemIndicator();

    // Listen for inventory selection changes
    InventorySystem.getInstance().onChange(() => this.updateSelectedItemIndicator());

    // Check chapter progression — show transition if advanced
    const newChapter = ChapterSystem.getInstance().checkProgression();
    if (newChapter) {
      this.scene.launch('ChapterTransitionScene', { chapter: newChapter });
    }

    // Auto-save on room entry
    SaveSystem.getInstance().save();

    // Set default magnifying glass cursor
    this.input.setDefaultCursor(Cursors.default);

    // Curtain open reveal
    this.playCurtainOpen(() => {
      this.checkScriptedEvents();
      showTutorialIfNeeded(this);
    });

    // Hotspot editor toggle (backtick key)
    this.input.keyboard!.on('keydown-BACKQUOTE', () => {
      if (this.scene.isActive('HotspotEditorScene')) {
        this.scene.stop('HotspotEditorScene');
      } else {
        this.scene.launch('HotspotEditorScene', { roomId: this.currentRoom.id });
      }
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

      const container = this.add.container(hotspot.x, hotspot.y);

      // Hotspot clickable area - minimum 48px for mobile tap targets
      const w = Math.max(hotspot.width, 48);
      const h = Math.max(hotspot.height, 48);

      // Color by hotspot type
      const hotspotColor = this.getHotspotColor(hotspot.type);

      const bg = this.add.rectangle(0, 0, w, h, hotspotColor, 0.15);
      bg.setStrokeStyle(1, hotspotColor, 0.4);
      const hotspotCursor = Cursors[hotspot.type as CursorType] || Cursors.default;
      bg.setInteractive({ cursor: hotspotCursor });

      // Label starts hidden, fades in on hover
      const label = this.add.text(0, h / 2 + 10, hotspot.label, {
        fontFamily: FONT,
        fontSize: '14px',
        color: TextColors.gold,
        align: 'center',
      });
      label.setOrigin(0.5, 0);
      label.setAlpha(0);

      container.add([bg, label]);
      container.setSize(w, h);

      // Subtle glow pulse animation (color matches type)
      this.tweens.add({
        targets: bg,
        alpha: { from: 0.15, to: 0.35 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Hover feedback (desktop) — cursor changes by hotspot type, label fades in
      const cursorType: CursorType = hotspot.type as CursorType;
      bg.on('pointerover', () => {
        bg.setFillStyle(hotspotColor, 0.3);
        bg.setStrokeStyle(2, hotspotColor, 0.7);
        this.tweens.add({ targets: label, alpha: 1, duration: 200 });
        this.tooltipText.setText(hotspot.label);
        this.tooltipText.setVisible(true);
        this.input.setDefaultCursor(Cursors[cursorType] || Cursors.default);
      });

      bg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        this.tooltipText.setPosition(pointer.x + 15, pointer.y - 10);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(hotspotColor, 0.15);
        bg.setStrokeStyle(1, hotspotColor, 0.4);
        this.tweens.add({ targets: label, alpha: 0, duration: 200 });
        this.tooltipText.setVisible(false);
        this.input.setDefaultCursor(Cursors.default);
      });

      // Click/tap handler with sparkle feedback and sound
      bg.on('pointerdown', () => {
        UISounds.click();
        this.playClickSparkle(hotspot.x, hotspot.y, hotspotColor);
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

  private handleHotspot(hotspot: Hotspot): void {
    // Don't handle if dialogue is active
    if (DialogueSystem.getInstance().isActive()) return;

    if (hotspot.onceOnly && this.usedHotspots.has(hotspot.id)) {
      this.showDescription('Nothing else to find here.');
      return;
    }

    // Check for item-on-hotspot interaction
    const selectedItem = InventorySystem.getInstance().getSelectedItem();

    switch (hotspot.type) {
      case 'inspect':
        this.showDescription(hotspot.description || 'Nothing noteworthy.');
        if (hotspot.onceOnly) this.usedHotspots.add(hotspot.id);
        break;

      case 'pickup':
        if (hotspot.itemId) {
          const inventory = InventorySystem.getInstance();
          if (inventory.hasItem(hotspot.itemId)) {
            this.showDescription('You already have this.');
          } else {
            inventory.addItem(hotspot.itemId);
            UISounds.itemPickup();
            this.showDescription(`Picked up: ${hotspot.label}`);
            this.usedHotspots.add(hotspot.id);
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
        // Consume key items that are used to unlock
        if (hotspot.targetRoom) {
          inv.removeItem(hotspot.requiredItem);
          inv.selectItem(null);
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
    const { width, height } = this.cameras.main;

    // Update and show the description box
    const textObj = this.descriptionBox.getAt(1) as Phaser.GameObjects.Text;
    textObj.setText(text);

    // Resize background to fit text
    const bg = this.descriptionBox.getAt(0) as Phaser.GameObjects.Rectangle;
    const textHeight = textObj.height;
    bg.setSize(width * 0.8, Math.max(50, textHeight + 30));

    // Position above the toolbar bar (52px bar + 10px margin)
    this.descriptionBox.setPosition(width / 2, height - 90);
    this.descriptionBox.setVisible(true);
    this.descriptionBox.setAlpha(0);

    this.tweens.add({
      targets: this.descriptionBox,
      alpha: 1,
      duration: 200,
    });

    // Auto-hide based on text length
    const displayTime = Math.max(3000, text.length * 40);
    this.time.delayedCall(displayTime, () => {
      this.tweens.add({
        targets: this.descriptionBox,
        alpha: 0,
        duration: 300,
        onComplete: () => this.descriptionBox.setVisible(false),
      });
    });
  }

  private createDescriptionBox(): Phaser.GameObjects.Container {
    const { width } = this.cameras.main;
    const container = this.add.container(width / 2, 0);

    const bg = this.add.rectangle(0, 0, width * 0.8, 50, 0x000000, 0.85);
    bg.setStrokeStyle(1, Colors.gold, 0.5);

    const text = this.add.text(0, 0, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TextColors.light,
      align: 'center',
      wordWrap: { width: width * 0.75 },
      lineSpacing: 3,
    });
    text.setOrigin(0.5);

    container.add([bg, text]);
    return container;
  }

  private getHotspotColor(type: string): number {
    switch (type) {
      case 'inspect': return Colors.hotspotInspect;
      case 'pickup': return Colors.hotspotPickup;
      case 'navigate': return Colors.hotspotNavigate;
      case 'talk': return Colors.hotspotTalk;
      case 'locked': return Colors.hotspotLocked;
      default: return Colors.gold;
    }
  }

  private playClickSparkle(x: number, y: number, color: number): void {
    // Create 6 small sparkle dots that burst outward and fade
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spark = this.add.circle(x, y, 3, color, 0.8);
      spark.setDepth(Depths.tooltip + 1);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 25,
        y: y + Math.sin(angle) * 25,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 350,
        ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private playCurtainOpen(onComplete: () => void): void {
    const { width, height } = this.cameras.main;
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

  private playCurtainClose(onComplete: () => void): void {
    const { width, height } = this.cameras.main;
    const curtainColor = 0x4a0a0a;

    const left = this.add.rectangle(-width / 4, height / 2, width / 2, height, curtainColor, 1);
    const right = this.add.rectangle(width + width / 4, height / 2, width / 2, height, curtainColor, 1);
    left.setDepth(Depths.scriptedEvent + 10);
    right.setDepth(Depths.scriptedEvent + 10);

    const fringeL = this.add.rectangle(-width / 4 + width / 4, height / 2, 3, height, Colors.gold, 0.6);
    const fringeR = this.add.rectangle(width + width / 4 - width / 4, height / 2, 3, height, Colors.gold, 0.6);
    fringeL.setDepth(Depths.scriptedEvent + 11);
    fringeR.setDepth(Depths.scriptedEvent + 11);

    this.tweens.add({
      targets: [left, fringeL],
      x: `+=${width / 4}`,
      duration: 500,
      ease: 'Power2',
    });
    this.tweens.add({
      targets: [right, fringeR],
      x: `-=${width / 4}`,
      duration: 500,
      ease: 'Power2',
      onComplete: () => onComplete(),
    });
  }

  private showRoomAnnouncement(width: number, height: number): void {
    const container = this.add.container(0, 0);
    container.setDepth(Depths.scriptedEvent - 1); // High z-order, just below scripted events

    // Full-screen dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    container.add(overlay);

    // Decorative elements
    const gfx = this.add.graphics();
    container.add(gfx);

    // Room name — large, centered, gold
    const roomName = this.add.text(width / 2, height * 0.38, this.currentRoom.name.toUpperCase(), {
      fontFamily: FONT,
      fontSize: '36px',
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
    drawDecoDivider(gfx, width / 2, height * 0.38 - 32, width * 0.4, DecoColors.gold, 0.5);

    // Decorative divider below name
    drawDecoDivider(gfx, width / 2, height * 0.38 + 32, width * 0.4, DecoColors.gold, 0.5);

    // Room description — readable size, centered below
    const desc = this.add.text(width / 2, height * 0.52, this.currentRoom.description, {
      fontFamily: FONT,
      fontSize: '17px',
      color: DecoTextColors.cream,
      fontStyle: 'italic',
      wordWrap: { width: width * 0.65 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);
    container.add(desc);

    // "Click to continue" prompt
    const prompt = this.add.text(width / 2, height * 0.72, '— Click to continue —', {
      fontFamily: FONT,
      fontSize: '14px',
      color: DecoTextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(prompt);

    // Pulse the prompt
    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.4 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fade in the whole announcement
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });

    // Click anywhere to dismiss
    overlay.setInteractive({ cursor: HAND_CURSOR });
    overlay.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => container.destroy(),
      });
    });

    // Also allow spacebar/enter to dismiss
    const dismissKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 300,
          onComplete: () => container.destroy(),
        });
        this.input.keyboard!.off('keydown', dismissKey);
      }
    };
    this.input.keyboard!.on('keydown', dismissKey);
  }

  private navigateToRoom(roomId: string): void {
    UISounds.doorTransition();
    SaveSystem.getInstance().setCurrentRoom(roomId);
    SaveSystem.getInstance().save();
    this.playCurtainClose(() => {
      this.scene.restart({ roomId });
    });
  }
}
