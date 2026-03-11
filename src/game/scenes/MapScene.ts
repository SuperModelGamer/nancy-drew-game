import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { createOverlay } from '../utils/ui-helpers';

interface RoomDef {
  id: string;
  name: string;
  color: number;
  requiresChapter?: number;
  gridX: number;
  gridY: number;
}

const ROOMS: RoomDef[] = [
  { id: 'catwalk',          name: 'Catwalk',           color: 0x8a8a8a, gridX: 1, gridY: 0 },
  { id: 'projection_booth', name: 'Projection Booth',  color: 0x7bc98a, gridX: 3, gridY: 0 },
  { id: 'backstage',        name: 'Backstage',         color: 0xc9947b, gridX: 0, gridY: 1 },
  { id: 'auditorium',       name: 'Auditorium',        color: 0x7ba3c9, gridX: 2, gridY: 1 },
  { id: 'managers_office',  name: "Manager's Office",  color: 0xc97b7b, gridX: 4, gridY: 1 },
  { id: 'dressing_room',    name: 'Dressing Room',     color: 0xb4a0d4, gridX: 1, gridY: 2 },
  { id: 'lobby',            name: 'Grand Lobby',       color: Colors.gold, gridX: 2, gridY: 2 },
  { id: 'basement',         name: 'Basement',          color: 0x5a5a7a, requiresChapter: 4, gridX: 2, gridY: 3 },
];

const CONNECTIONS: [string, string][] = [
  ['catwalk', 'backstage'],
  ['catwalk', 'auditorium'],
  ['projection_booth', 'auditorium'],
  ['projection_booth', 'managers_office'],
  ['backstage', 'auditorium'],
  ['backstage', 'dressing_room'],
  ['auditorium', 'managers_office'],
  ['auditorium', 'lobby'],
  ['dressing_room', 'lobby'],
  ['lobby', 'basement'],
];

// Size to display each medallion icon (height-based since icons are portrait with built-in labels)
const MEDALLION_DISPLAY_SIZE = 110;

export class MapScene extends Phaser.Scene {
  private currentRoom = '';
  private roomCards: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: { currentRoom?: string }): void {
    this.currentRoom = data.currentRoom ?? SaveSystem.getInstance().getCurrentRoom();
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.roomCards.clear();

    // --- Full-screen overlay ---
    createOverlay(this, 0.8, Depths.mapOverlay);

    const contentDepth = Depths.mapContent;

    // --- Panel dimensions ---
    const panelW = Math.min(820, width - 40);
    const panelH = Math.min(600, height - 60);
    const panelX = width / 2;
    const panelY = height / 2 + 10;

    // --- Draw dark aged parchment background ---
    this.drawParchmentBackground(panelX, panelY, panelW, panelH, contentDepth);

    // --- Art deco border frame ---
    this.drawArtDecoBorder(panelX, panelY, panelW, panelH, contentDepth);

    // --- Title ---
    const titleY = panelY - panelH / 2 + 36;
    const titleText = this.add.text(panelX, titleY, 'THE MONARCH THEATRE', {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.gold,
      letterSpacing: 6,
    });
    titleText.setOrigin(0.5);
    titleText.setDepth(contentDepth + 1);

    // Decorative lines flanking the title
    const lineGfx = this.add.graphics();
    lineGfx.setDepth(contentDepth + 1);
    lineGfx.lineStyle(1, Colors.gold, 0.5);
    const titleHalfW = titleText.width / 2 + 16;
    lineGfx.lineBetween(panelX - titleHalfW - 60, titleY, panelX - titleHalfW, titleY);
    lineGfx.lineBetween(panelX + titleHalfW, titleY, panelX + titleHalfW + 60, titleY);
    // Small diamond accents
    this.drawDiamond(lineGfx, panelX - titleHalfW - 64, titleY, 4, Colors.gold, 0.5);
    this.drawDiamond(lineGfx, panelX + titleHalfW + 64, titleY, 4, Colors.gold, 0.5);

    // --- Close button ---
    const closeBtnX = panelX + panelW / 2 - 28;
    const closeBtnY = panelY - panelH / 2 + 28;
    const closeBtn = this.add.text(closeBtnX, closeBtnY, '✕', {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.goldDim,
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setDepth(contentDepth + 2);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor(TextColors.gold));
    closeBtn.on('pointerout', () => closeBtn.setColor(TextColors.goldDim));
    closeBtn.on('pointerdown', () => this.scene.stop());

    // --- Room grid layout ---
    const chapter = SaveSystem.getInstance().getChapter();
    const gridOriginX = panelX;
    const gridOriginY = panelY + 18;
    const cellW = 155;
    const cellH = 120;
    const gridCols = 5;
    const gridRows = 4;
    const gridW = gridCols * cellW;
    const gridH = gridRows * cellH;

    const getRoomCenter = (room: RoomDef): { x: number; y: number } => ({
      x: gridOriginX - gridW / 2 + room.gridX * cellW + cellW / 2,
      y: gridOriginY - gridH / 2 + room.gridY * cellH + cellH / 2 + 16,
    });

    // --- Connection paths (gold hallway lines) ---
    const pathGfx = this.add.graphics();
    pathGfx.setDepth(contentDepth + 1);

    for (const [idA, idB] of CONNECTIONS) {
      const roomA = ROOMS.find((r) => r.id === idA);
      const roomB = ROOMS.find((r) => r.id === idB);
      if (!roomA || !roomB) continue;

      const a = getRoomCenter(roomA);
      const b = getRoomCenter(roomB);

      // Outer glow line
      pathGfx.lineStyle(4, Colors.gold, 0.08);
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);

      // Main connection line
      pathGfx.lineStyle(2, Colors.gold, 0.25);
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);

      // Dashed center highlight
      this.drawDashedLine(pathGfx, a.x, a.y, b.x, b.y, 6, 4, Colors.gold, 0.12);
    }

    // --- Place medallion icons ---
    for (const room of ROOMS) {
      const pos = getRoomCenter(room);
      const isCurrentRoom = room.id === this.currentRoom;
      const isLocked = room.requiresChapter !== undefined && chapter < room.requiresChapter;

      const container = this.add.container(pos.x, pos.y);
      container.setDepth(contentDepth + 2);

      const textureKey = `map_${room.id}`;
      const hasTexture = this.textures.exists(textureKey);

      if (hasTexture && !isLocked) {
        // Use the medallion image (new icons are portrait with built-in nameplate)
        const medallion = this.add.image(0, -6, textureKey);
        // Scale to fit our display size based on height (icons are taller than wide)
        const scale = MEDALLION_DISPLAY_SIZE / medallion.height;
        medallion.setScale(scale);
        container.add(medallion);

        // The circular part of the medallion is roughly the top 75% of the image
        const circleRadius = (MEDALLION_DISPLAY_SIZE * 0.38);
        const circleOffsetY = -6 - (MEDALLION_DISPLAY_SIZE * 0.1);

        // Current room glow ring (centered on the circular medallion part)
        if (isCurrentRoom) {
          const glowRing = this.add.graphics();
          glowRing.lineStyle(3, Colors.gold, 0.6);
          glowRing.strokeCircle(0, circleOffsetY, circleRadius + 4);
          glowRing.lineStyle(6, Colors.gold, 0.15);
          glowRing.strokeCircle(0, circleOffsetY, circleRadius + 8);
          container.addAt(glowRing, 0);
        }

        // Invisible hit area over the full medallion (including nameplate)
        const hitW = MEDALLION_DISPLAY_SIZE * (medallion.width / medallion.height);
        const hitArea = this.add.rectangle(0, -6, hitW, MEDALLION_DISPLAY_SIZE, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Hover effects
        hitArea.on('pointerover', () => {
          if (room.id !== this.currentRoom) {
            medallion.setScale(scale * 1.08);
          }
        });
        hitArea.on('pointerout', () => {
          medallion.setScale(scale);
        });
        hitArea.on('pointerdown', () => {
          if (room.id !== this.currentRoom) {
            this.navigateToRoom(room.id);
          }
        });

        // "You are here" indicator (below the nameplate)
        if (isCurrentRoom) {
          const hereText = this.add.text(0, MEDALLION_DISPLAY_SIZE / 2 - 2, '— you are here —', {
            fontFamily: FONT,
            fontSize: '9px',
            color: TextColors.gold,
          });
          hereText.setOrigin(0.5);
          hereText.setAlpha(0.8);
          container.add(hereText);
        }
      } else {
        // Fallback: locked room or missing texture — draw a simple card
        const cardW = 100;
        const cardH = 80;

        const cardBg = this.add.rectangle(0, 0, cardW, cardH, 0x0a0a1a, 0.7);
        cardBg.setStrokeStyle(1.5, isLocked ? 0x3a3a4a : room.color, isLocked ? 0.4 : 0.5);
        container.add(cardBg);

        const lockIcon = this.add.text(0, -10, '🔒', { fontSize: '20px' });
        lockIcon.setOrigin(0.5);
        lockIcon.setAlpha(0.4);
        container.add(lockIcon);

        const nameText = this.add.text(0, 14, room.name, {
          fontFamily: FONT,
          fontSize: '10px',
          color: TextColors.mutedBlue,
          align: 'center',
        });
        nameText.setOrigin(0.5, 0);
        container.add(nameText);

        if (isLocked && room.requiresChapter) {
          const lockText = this.add.text(0, 30, `Chapter ${room.requiresChapter}`, {
            fontFamily: FONT,
            fontSize: '8px',
            color: TextColors.mutedBlue,
          });
          lockText.setOrigin(0.5);
          lockText.setAlpha(0.6);
          container.add(lockText);
        }
      }

      this.roomCards.set(room.id, container);
    }

    // --- Subtitle ---
    const subtitleY = panelY + panelH / 2 - 22;
    const subtitle = this.add.text(panelX, subtitleY, 'Select a location to travel', {
      fontFamily: FONT,
      fontSize: '11px',
      color: TextColors.goldDim,
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0.5);
    subtitle.setDepth(contentDepth + 1);

    // --- Fade in ---
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  /**
   * Draw a dark aged parchment texture as the map background.
   */
  private drawParchmentBackground(
    cx: number, cy: number, w: number, h: number, depth: number,
  ): void {
    const gfx = this.add.graphics();
    gfx.setDepth(depth);

    const left = cx - w / 2;
    const top = cy - h / 2;

    // Base dark parchment color
    gfx.fillStyle(0x1a1610, 1);
    gfx.fillRect(left, top, w, h);

    // Layered noise-like patches for aged texture
    const patchColors = [0x1e1a14, 0x16120e, 0x201c14, 0x14100c, 0x221e16];
    for (let i = 0; i < 40; i++) {
      const px = left + Math.random() * w;
      const py = top + Math.random() * h;
      const pw = 30 + Math.random() * 120;
      const ph = 20 + Math.random() * 80;
      gfx.fillStyle(patchColors[i % patchColors.length], 0.3 + Math.random() * 0.3);
      gfx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
    }

    // Subtle horizontal grain lines
    gfx.lineStyle(1, 0x2a2418, 0.15);
    for (let y = top + 10; y < top + h; y += 8 + Math.random() * 6) {
      const x1 = left + Math.random() * 20;
      const x2 = left + w - Math.random() * 20;
      gfx.lineBetween(x1, y, x2, y);
    }

    // Warm vignette overlay — darker at edges
    // Top edge
    gfx.fillStyle(0x0a0806, 0.5);
    gfx.fillRect(left, top, w, 40);
    gfx.fillStyle(0x0a0806, 0.3);
    gfx.fillRect(left, top, w, 80);
    // Bottom edge
    gfx.fillStyle(0x0a0806, 0.5);
    gfx.fillRect(left, top + h - 40, w, 40);
    gfx.fillStyle(0x0a0806, 0.3);
    gfx.fillRect(left, top + h - 80, w, 80);
    // Left edge
    gfx.fillStyle(0x0a0806, 0.4);
    gfx.fillRect(left, top, 30, h);
    // Right edge
    gfx.fillStyle(0x0a0806, 0.4);
    gfx.fillRect(left + w - 30, top, 30, h);

    // Faint gold wash in the center
    gfx.fillStyle(Colors.gold, 0.03);
    gfx.fillRect(cx - w / 4, cy - h / 4, w / 2, h / 2);
  }

  /**
   * Draw an art deco styled border frame.
   */
  private drawArtDecoBorder(
    cx: number, cy: number, w: number, h: number, depth: number,
  ): void {
    const gfx = this.add.graphics();
    gfx.setDepth(depth + 1);

    const left = cx - w / 2;
    const top = cy - h / 2;

    // Outer border
    gfx.lineStyle(3, Colors.gold, 0.7);
    gfx.strokeRect(left, top, w, h);

    // Inner border
    gfx.lineStyle(1, Colors.gold, 0.3);
    gfx.strokeRect(left + 8, top + 8, w - 16, h - 16);

    // Corner accents — art deco diamonds
    const corners = [
      { x: left + 8, y: top + 8 },
      { x: left + w - 8, y: top + 8 },
      { x: left + 8, y: top + h - 8 },
      { x: left + w - 8, y: top + h - 8 },
    ];
    for (const c of corners) {
      this.drawDiamond(gfx, c.x, c.y, 6, Colors.gold, 0.5);
    }

    // Art deco line accents at top corners
    const accentLen = 40;
    gfx.lineStyle(1, Colors.gold, 0.4);
    // Top-left
    gfx.lineBetween(left + 16, top + 16, left + 16 + accentLen, top + 16);
    gfx.lineBetween(left + 16, top + 16, left + 16, top + 16 + accentLen);
    // Top-right
    gfx.lineBetween(left + w - 16, top + 16, left + w - 16 - accentLen, top + 16);
    gfx.lineBetween(left + w - 16, top + 16, left + w - 16, top + 16 + accentLen);
    // Bottom-left
    gfx.lineBetween(left + 16, top + h - 16, left + 16 + accentLen, top + h - 16);
    gfx.lineBetween(left + 16, top + h - 16, left + 16, top + h - 16 - accentLen);
    // Bottom-right
    gfx.lineBetween(left + w - 16, top + h - 16, left + w - 16 - accentLen, top + h - 16);
    gfx.lineBetween(left + w - 16, top + h - 16, left + w - 16, top + h - 16 - accentLen);
  }

  private drawDiamond(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number, size: number,
    color: number, alpha: number,
  ): void {
    gfx.fillStyle(color, alpha);
    gfx.fillTriangle(cx, cy - size, cx + size, cy, cx, cy + size);
    gfx.fillTriangle(cx, cy - size, cx - size, cy, cx, cy + size);
  }

  private drawDashedLine(
    gfx: Phaser.GameObjects.Graphics,
    x1: number, y1: number, x2: number, y2: number,
    dashLen: number, gapLen: number,
    color: number, alpha: number,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    let pos = 0;

    gfx.lineStyle(1, color, alpha);
    while (pos < dist) {
      const segEnd = Math.min(pos + dashLen, dist);
      gfx.lineBetween(
        x1 + nx * pos, y1 + ny * pos,
        x1 + nx * segEnd, y1 + ny * segEnd,
      );
      pos = segEnd + gapLen;
    }
  }

  private navigateToRoom(roomId: string): void {
    this.scene.stop();
    const roomScene = this.scene.get('RoomScene') as Phaser.Scene;
    roomScene.cameras.main.fadeOut(400, 0, 0, 0);
    roomScene.time.delayedCall(400, () => {
      roomScene.scene.restart({ roomId });
    });
  }
}
