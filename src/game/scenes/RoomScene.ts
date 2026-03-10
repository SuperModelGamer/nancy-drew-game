import Phaser from 'phaser';
import roomsData from '../data/rooms.json';
import { InventorySystem } from '../systems/InventorySystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { PuzzleSystem } from '../systems/PuzzleSystem';

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

  constructor() {
    super({ key: 'RoomScene' });
  }

  init(data: { roomId?: string }): void {
    const roomId = data.roomId || 'foyer';
    const rooms = roomsData.rooms as RoomData[];
    this.currentRoom = rooms.find(r => r.id === roomId) || rooms[0];
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Room background - placeholder colored rectangle until real art exists
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Room name banner
    const banner = this.add.text(width / 2, 30, this.currentRoom.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#c9a84c',
    });
    banner.setOrigin(0.5);

    // Create hotspots
    this.createHotspots();

    // Tooltip for hover
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    this.tooltipText.setVisible(false);
    this.tooltipText.setDepth(100);

    // Description box (hidden)
    this.descriptionBox = this.createDescriptionBox();
    this.descriptionBox.setVisible(false);
    this.descriptionBox.setDepth(200);

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private createHotspots(): void {
    this.hotspotObjects.forEach(h => h.destroy());
    this.hotspotObjects = [];

    for (const hotspot of this.currentRoom.hotspots) {
      const container = this.add.container(hotspot.x, hotspot.y);

      // Hotspot clickable area - minimum 48px for mobile tap targets
      const w = Math.max(hotspot.width, 48);
      const h = Math.max(hotspot.height, 48);

      const bg = this.add.rectangle(0, 0, w, h, 0xc9a84c, 0.15);
      bg.setStrokeStyle(1, 0xc9a84c, 0.4);
      bg.setInteractive({ useHandCursor: true });

      const label = this.add.text(0, h / 2 + 10, hotspot.label, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#c9a84c',
        align: 'center',
      });
      label.setOrigin(0.5, 0);

      container.add([bg, label]);
      container.setSize(w, h);

      // Hover feedback (desktop)
      bg.on('pointerover', () => {
        bg.setFillStyle(0xc9a84c, 0.3);
        this.tooltipText.setText(hotspot.label);
        this.tooltipText.setVisible(true);
      });

      bg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        this.tooltipText.setPosition(pointer.x + 15, pointer.y - 10);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0xc9a84c, 0.15);
        this.tooltipText.setVisible(false);
      });

      // Click/tap handler
      bg.on('pointerdown', () => {
        this.handleHotspot(hotspot);
      });

      this.hotspotObjects.push(container);
    }
  }

  private handleHotspot(hotspot: Hotspot): void {
    if (hotspot.onceOnly && this.usedHotspots.has(hotspot.id)) {
      this.showDescription('Nothing else to find here.');
      return;
    }

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
            this.showDescription(`Picked up: ${hotspot.label}`);
            this.usedHotspots.add(hotspot.id);
            this.events.emit('item-picked-up', hotspot.itemId);
          }
        }
        break;

      case 'locked':
        if (hotspot.requiredItem) {
          const inv = InventorySystem.getInstance();
          if (inv.hasItem(hotspot.requiredItem)) {
            this.showDescription(hotspot.description || 'Unlocked!');
            this.usedHotspots.add(hotspot.id);
            if (hotspot.targetRoom) {
              this.navigateToRoom(hotspot.targetRoom);
            }
          } else {
            this.showDescription('It\'s locked. You need something to open this.');
          }
        }
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

  private showDescription(text: string): void {
    const { width, height } = this.cameras.main;

    // Update and show the description box
    const textObj = this.descriptionBox.getAt(1) as Phaser.GameObjects.Text;
    textObj.setText(text);

    this.descriptionBox.setPosition(width / 2, height - 80);
    this.descriptionBox.setVisible(true);
    this.descriptionBox.setAlpha(0);

    this.tweens.add({
      targets: this.descriptionBox,
      alpha: 1,
      duration: 200,
    });

    // Auto-hide after a delay
    this.time.delayedCall(3000, () => {
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
    bg.setStrokeStyle(1, 0xc9a84c, 0.5);

    const text = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e0d5c0',
      align: 'center',
      wordWrap: { width: width * 0.75 },
    });
    text.setOrigin(0.5);

    container.add([bg, text]);
    return container;
  }

  private navigateToRoom(roomId: string): void {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.restart({ roomId });
    });
  }
}
