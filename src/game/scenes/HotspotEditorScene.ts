import Phaser from 'phaser';
import roomsData from '../data/rooms.json';
import { FONT, computeViewfinderLayout } from '../utils/constants';
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
  private resizeMode = false;
  private modeIndicator!: Phaser.GameObjects.Text;
  // Viewport transform: maps 1920×1080 design coords to canvas coords
  private vpX = 0;
  private vpY = 0;
  private vpScale = 1;

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

    // Compute the same viewport transform used by RoomScene so editor hotspots
    // visually align with the in-game background and hotspot positions.
    const vf = computeViewfinderLayout(1920, 1080);
    const coverScale = Math.max(vf.viewportW / 1920, vf.viewportH / 1080);
    this.vpX = vf.viewportX + (vf.viewportW - 1920 * coverScale) / 2;
    this.vpY = vf.viewportY + (vf.viewportH - 1080 * coverScale) / 2;
    this.vpScale = coverScale;

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

    // Mode indicator (top-left)
    this.modeIndicator = this.add.text(12, 40, 'MODE: DRAG', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#00ff88',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 4 },
    }).setDepth(960);

    // Info text (bottom)
    this.infoText = this.add.text(width / 2, height - 14, 'Drag to move | Shift+R = resize mode | E = copy room | Shift+E = copy all | Shift+Q = close', {
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
    this.input.keyboard!.on('keydown-E', (event: KeyboardEvent) => {
      if (event.shiftKey) {
        this.exportJSON();
      } else {
        this.exportCurrentRoom();
      }
    });
    this.input.keyboard!.on('keydown-Q', (event: KeyboardEvent) => {
      if (event.shiftKey) this.closeEditor();
    });
    this.input.keyboard!.on('keydown-R', (event: KeyboardEvent) => {
      if (!event.shiftKey) return;
      this.resizeMode = !this.resizeMode;
      this.modeIndicator.setText(`MODE: ${this.resizeMode ? 'RESIZE' : 'DRAG'}`);
      this.modeIndicator.setColor(this.resizeMode ? '#ff6666' : '#00ff88');
    });
    this.input.keyboard!.on('keydown-LEFT', () => this.switchRoom(-1));
    this.input.keyboard!.on('keydown-RIGHT', () => this.switchRoom(1));

    // Global pointer events for drag (pointer coords are in canvas space,
    // convert back to design space for storage)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.selectedHotspot) return;

      if (this.isResizing) {
        this.handleResize(pointer);
      } else {
        this.selectedHotspot.x = Math.round(this.toDesignX(pointer.x - this.dragOffsetX));
        this.selectedHotspot.y = Math.round(this.toDesignY(pointer.y - this.dragOffsetY));
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

    // Transform design-space coords to canvas coords (matching in-game viewport)
    const cx = this.toCanvasX(hotspot.x);
    const cy = this.toCanvasY(hotspot.y);
    const cw = this.toCanvasSize(w);
    const ch = this.toCanvasSize(h);

    // Hotspot rectangle
    const rect = this.add.rectangle(cx, cy, cw, ch, color, 0.25);
    rect.setStrokeStyle(2, color, 0.9);
    rect.setDepth(910);
    rect.setInteractive({ cursor: POINTER_CURSOR, draggable: false });

    // Label above
    const label = this.add.text(cx, cy - ch / 2 - 12, hotspot.label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(920);

    // Coordinates below (show design-space values)
    const coords = this.add.text(cx, cy + ch / 2 + 3, `${hotspot.x},${hotspot.y} ${w}×${h}`, {
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

      if (this.resizeMode) {
        // In resize mode, always resize from corner
        this.isResizing = true;
        this.resizeEdge = 'corner';
      } else {
        this.isResizing = false;
        // Offset in canvas space between pointer and hotspot's canvas position
        this.dragOffsetX = pointer.x - this.toCanvasX(hotspot.x);
        this.dragOffsetY = pointer.y - this.toCanvasY(hotspot.y);
      }
    });

    this.hotspotRects.push({ data: hotspot, rect, label, coords });
  }

  private handleResize(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedHotspot) return;
    const hs = this.selectedHotspot;

    // Convert pointer canvas coords to design space for resize calculation
    const designPtrX = this.toDesignX(pointer.x);
    const designPtrY = this.toDesignY(pointer.y);

    if (this.resizeEdge === 'right' || this.resizeEdge === 'corner') {
      hs.width = Math.max(30, Math.round((designPtrX - hs.x) * 2));
    }
    if (this.resizeEdge === 'bottom' || this.resizeEdge === 'corner') {
      hs.height = Math.max(30, Math.round((designPtrY - hs.y) * 2));
    }
  }

  private updateHotspotVisual(hotspot: HotspotData): void {
    const entry = this.hotspotRects.find(h => h.data === hotspot);
    if (!entry) return;

    const w = Math.max(hotspot.width, 30);
    const h = Math.max(hotspot.height, 30);
    const cx = this.toCanvasX(hotspot.x);
    const cy = this.toCanvasY(hotspot.y);
    const cw = this.toCanvasSize(w);
    const ch = this.toCanvasSize(h);

    entry.rect.setPosition(cx, cy);
    entry.rect.setSize(cw, ch);
    // Phaser rectangles need geom update after setSize
    entry.rect.setInteractive();

    entry.label.setPosition(cx, cy - ch / 2 - 12);
    entry.coords.setPosition(cx, cy + ch / 2 + 3);
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

  private exportCurrentRoom(): void {
    const room = this.currentRoom;
    const output = {
      id: room.id,
      name: room.name,
      description: room.description,
      hotspots: room.hotspots.map(hs => {
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
    };

    const json = JSON.stringify(output, null, 2);
    console.log(`%c[Hotspot Editor] Exported ${room.name} (${room.id}):`, 'color: #00ff88; font-weight: bold');
    console.log(json);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        this.showToast(`${room.name} copied to clipboard!`);
      }).catch(() => {
        this.showToast('JSON logged to console (clipboard unavailable)');
      });
    } else {
      this.showToast('JSON logged to console');
    }
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

  /** Convert design-space x to canvas x */
  private toCanvasX(designX: number): number {
    return this.vpX + designX * this.vpScale;
  }

  /** Convert design-space y to canvas y */
  private toCanvasY(designY: number): number {
    return this.vpY + designY * this.vpScale;
  }

  /** Convert canvas x to design-space x */
  private toDesignX(canvasX: number): number {
    return (canvasX - this.vpX) / this.vpScale;
  }

  /** Convert canvas y to design-space y */
  private toDesignY(canvasY: number): number {
    return (canvasY - this.vpY) / this.vpScale;
  }

  /** Convert design-space dimension to canvas pixels */
  private toCanvasSize(designSize: number): number {
    return designSize * this.vpScale;
  }

  private closeEditor(): void {
    this.scene.stop();
  }
}
