import Phaser from 'phaser';
import roomsData from '../data/rooms.json';
import { FONT } from '../utils/constants';
import { POINTER_CURSOR } from '../utils/cursors';

interface HotspotData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: string;
  [key: string]: unknown;
}

interface RoomData {
  id: string;
  name: string;
  description: string;
  hotspots: HotspotData[];
}

/**
 * Visual hotspot editor overlay.
 * Toggle with backtick (`) key while in any room.
 * Drag hotspots to reposition, resize with shift+drag edges.
 * Press E to export updated JSON to console.
 */
export class HotspotEditorScene extends Phaser.Scene {
  private currentRoomId!: string;
  private currentRoom!: RoomData;
  private hotspotRects: {
    data: HotspotData;
    rect: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    coords: Phaser.GameObjects.Text;
  }[] = [];
  private selectedHotspot: HotspotData | null = null;
  private isDragging = false;
  private isResizing = false;
  private resizeEdge: 'right' | 'bottom' | 'corner' | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private infoText!: Phaser.GameObjects.Text;
  private roomSelector!: Phaser.GameObjects.Text;
  private roomNames: string[] = [];
  private currentRoomIndex = 0;

  constructor() {
    super({ key: 'HotspotEditorScene' });
  }

  init(data: { roomId?: string }): void {
    this.currentRoomId = data.roomId || 'lobby';
    const rooms = roomsData.rooms as RoomData[];
    this.currentRoom = rooms.find(r => r.id === this.currentRoomId) || rooms[0];
    this.roomNames = rooms.map(r => r.id);
    this.currentRoomIndex = this.roomNames.indexOf(this.currentRoomId);
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Semi-transparent backdrop to dim the game
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);
    backdrop.setDepth(900);

    // Header bar
    const headerBg = this.add.rectangle(width / 2, 18, width, 36, 0x000000, 0.85);
    headerBg.setDepth(950);

    // Room selector (left/right arrows)
    this.roomSelector = this.add.text(width / 2, 18, `◀  ${this.currentRoom.name}  ▶`, {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#ffcc00',
    }).setOrigin(0.5).setDepth(951);

    // Left arrow click zone
    const leftArrow = this.add.rectangle(width / 2 - 180, 18, 40, 30, 0x000000, 0)
      .setInteractive({ cursor: POINTER_CURSOR }).setDepth(952);
    leftArrow.on('pointerdown', () => this.switchRoom(-1));

    // Right arrow click zone
    const rightArrow = this.add.rectangle(width / 2 + 180, 18, 40, 30, 0x000000, 0)
      .setInteractive({ cursor: POINTER_CURSOR }).setDepth(952);
    rightArrow.on('pointerdown', () => this.switchRoom(1));

    // Info text (bottom)
    this.infoText = this.add.text(width / 2, height - 14, 'Drag hotspots to move | Shift+drag edge to resize | E = export JSON | ` = close', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#aaaaaa',
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(951);

    // Close button
    const closeBtn = this.add.text(width - 20, 18, '✕', {
      fontFamily: FONT,
      fontSize: '20px',
      color: '#ff6666',
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR }).setDepth(952);
    closeBtn.on('pointerdown', () => this.closeEditor());

    // Draw all hotspots for current room
    this.drawHotspots();

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown-E', () => this.exportJSON());
    this.input.keyboard!.on('keydown-BACKQUOTE', () => this.closeEditor());
    this.input.keyboard!.on('keydown-LEFT', () => this.switchRoom(-1));
    this.input.keyboard!.on('keydown-RIGHT', () => this.switchRoom(1));

    // Global pointer events for drag
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.selectedHotspot) return;

      if (this.isResizing) {
        this.handleResize(pointer);
      } else {
        this.selectedHotspot.x = Math.round(pointer.x - this.dragOffsetX);
        this.selectedHotspot.y = Math.round(pointer.y - this.dragOffsetY);
      }
      this.updateHotspotVisual(this.selectedHotspot);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.isResizing = false;
      this.resizeEdge = null;
    });
  }

  private drawHotspots(): void {
    // Clear existing
    this.hotspotRects.forEach(h => {
      h.rect.destroy();
      h.label.destroy();
      h.coords.destroy();
    });
    this.hotspotRects = [];

    for (const hotspot of this.currentRoom.hotspots) {
      this.createHotspotVisual(hotspot);
    }
  }

  private createHotspotVisual(hotspot: HotspotData): void {
    const w = Math.max(hotspot.width, 30);
    const h = Math.max(hotspot.height, 30);

    // Color by type
    const typeColors: Record<string, number> = {
      inspect: 0x00aaff,
      pickup: 0x00ff88,
      locked: 0xff4444,
      navigate: 0xffaa00,
      talk: 0xcc66ff,
    };
    const color = typeColors[hotspot.type] || 0xffffff;

    // Hotspot rectangle
    const rect = this.add.rectangle(hotspot.x, hotspot.y, w, h, color, 0.25);
    rect.setStrokeStyle(2, color, 0.9);
    rect.setDepth(910);
    rect.setInteractive({ cursor: POINTER_CURSOR, draggable: false });

    // Label above
    const label = this.add.text(hotspot.x, hotspot.y - h / 2 - 12, hotspot.label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(920);

    // Coordinates below
    const coords = this.add.text(hotspot.x, hotspot.y + h / 2 + 3, `${hotspot.x},${hotspot.y} ${w}×${h}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#aaffaa',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 0).setDepth(920);

    // Drag start
    rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Highlight selection
      this.hotspotRects.forEach(hr => hr.rect.setStrokeStyle(2, typeColors[hr.data.type] || 0xffffff, 0.9));
      rect.setStrokeStyle(3, 0xffffff, 1);

      this.selectedHotspot = hotspot;
      this.isDragging = true;

      // Check if near edge (within 10px) for resize
      const localX = pointer.x - hotspot.x;
      const localY = pointer.y - hotspot.y;
      const nearRight = Math.abs(localX - w / 2) < 10;
      const nearBottom = Math.abs(localY - h / 2) < 10;

      if (pointer.event.shiftKey && (nearRight || nearBottom)) {
        this.isResizing = true;
        if (nearRight && nearBottom) this.resizeEdge = 'corner';
        else if (nearRight) this.resizeEdge = 'right';
        else this.resizeEdge = 'bottom';
      } else {
        this.isResizing = false;
        this.dragOffsetX = pointer.x - hotspot.x;
        this.dragOffsetY = pointer.y - hotspot.y;
      }
    });

    this.hotspotRects.push({ data: hotspot, rect, label, coords });
  }

  private handleResize(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedHotspot) return;
    const hs = this.selectedHotspot;

    if (this.resizeEdge === 'right' || this.resizeEdge === 'corner') {
      hs.width = Math.max(30, Math.round((pointer.x - hs.x) * 2));
    }
    if (this.resizeEdge === 'bottom' || this.resizeEdge === 'corner') {
      hs.height = Math.max(30, Math.round((pointer.y - hs.y) * 2));
    }
  }

  private updateHotspotVisual(hotspot: HotspotData): void {
    const entry = this.hotspotRects.find(h => h.data === hotspot);
    if (!entry) return;

    const w = Math.max(hotspot.width, 30);
    const h = Math.max(hotspot.height, 30);

    entry.rect.setPosition(hotspot.x, hotspot.y);
    entry.rect.setSize(w, h);
    // Phaser rectangles need geom update after setSize
    entry.rect.setInteractive();

    entry.label.setPosition(hotspot.x, hotspot.y - h / 2 - 12);
    entry.coords.setPosition(hotspot.x, hotspot.y + h / 2 + 3);
    entry.coords.setText(`${hotspot.x},${hotspot.y} ${w}×${h}`);
  }

  private switchRoom(direction: number): void {
    this.currentRoomIndex = (this.currentRoomIndex + direction + this.roomNames.length) % this.roomNames.length;
    const newRoomId = this.roomNames[this.currentRoomIndex];
    const rooms = roomsData.rooms as RoomData[];
    this.currentRoom = rooms.find(r => r.id === newRoomId)!;
    this.currentRoomId = newRoomId;

    // Update room selector text
    this.roomSelector.setText(`◀  ${this.currentRoom.name}  ▶`);

    // Switch the background in the RoomScene
    this.scene.get('RoomScene').scene.restart({ roomId: newRoomId });

    // Redraw hotspots
    this.drawHotspots();
  }

  private exportJSON(): void {
    // Build the full rooms data with current modifications
    const rooms = roomsData.rooms as RoomData[];
    const output = { rooms: rooms.map(room => ({
      ...room,
      hotspots: room.hotspots.map(hs => {
        // Clean up: only include defined fields
        const clean: Record<string, unknown> = {
          id: hs.id,
          x: hs.x,
          y: hs.y,
          width: hs.width,
          height: hs.height,
          label: hs.label,
          type: hs.type,
        };
        if (hs.description) clean.description = hs.description;
        if (hs.itemId) clean.itemId = hs.itemId;
        if (hs.requiredItem) clean.requiredItem = hs.requiredItem;
        if (hs.dialogueId) clean.dialogueId = hs.dialogueId;
        if (hs.targetRoom) clean.targetRoom = hs.targetRoom;
        if (hs.puzzleId) clean.puzzleId = hs.puzzleId;
        if (hs.onceOnly) clean.onceOnly = hs.onceOnly;
        if (hs.showWhen) clean.showWhen = hs.showWhen;
        return clean;
      }),
    }))};

    const json = JSON.stringify(output, null, 2);
    console.log('%c[Hotspot Editor] Exported rooms.json:', 'color: #00ff88; font-weight: bold');
    console.log(json);

    // Also copy to clipboard if available
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        this.showToast('JSON copied to clipboard!');
      }).catch(() => {
        this.showToast('JSON logged to console (clipboard unavailable)');
      });
    } else {
      this.showToast('JSON logged to console');
    }
  }

  private showToast(message: string): void {
    const { width } = this.cameras.main;
    const toast = this.add.text(width / 2, 50, message, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#00ff88',
      backgroundColor: '#000000dd',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(960);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 35,
      delay: 2000,
      duration: 500,
      onComplete: () => toast.destroy(),
    });
  }

  private closeEditor(): void {
    this.scene.stop();
  }
}
