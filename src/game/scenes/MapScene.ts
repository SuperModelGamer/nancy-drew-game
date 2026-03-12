import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { HAND_CURSOR, initSceneCursor } from '../utils/cursors';
import { createOverlay } from '../utils/ui-helpers';

interface RoomDef {
  id: string;
  name: string;
  color: number;
  /** Hand-placed position as fraction of panel (0-1) */
  px: number;
  py: number;
  /** Floor label for the cross-section */
  floor?: string;
}

/**
 * Theater cross-section layout — rooms positioned to suggest a vertical
 * slice through the Monarch Theatre, from catwalk at the top to basement
 * at the bottom. Positions are fractions of the usable panel area.
 */
const ROOMS: RoomDef[] = [
  // Top floor — catwalks & tech
  { id: 'catwalk',          name: 'Catwalk',           color: 0x8a8a8a, px: 0.30, py: 0.10, floor: 'Fly Loft' },
  { id: 'projection_booth', name: 'Projection Booth',  color: 0x7bc98a, px: 0.70, py: 0.10, floor: 'Fly Loft' },

  // Upper floor — performance spaces
  { id: 'backstage',        name: 'Backstage',         color: 0xc9947b, px: 0.18, py: 0.34, floor: 'Stage Level' },
  { id: 'auditorium',       name: 'Auditorium',        color: 0x7ba3c9, px: 0.50, py: 0.34, floor: 'Stage Level' },
  { id: 'managers_office',  name: "Manager's Office",  color: 0xc97b7b, px: 0.82, py: 0.34, floor: 'Stage Level' },

  // Ground floor — public & private
  { id: 'dressing_room',    name: 'Dressing Room',     color: 0xb4a0d4, px: 0.28, py: 0.60, floor: 'Ground Floor' },
  { id: 'lobby',            name: 'Grand Lobby',       color: Colors.gold, px: 0.65, py: 0.60, floor: 'Ground Floor' },

  // Below stage
  { id: 'basement',         name: 'Basement',          color: 0x5a5a7a, px: 0.50, py: 0.86, floor: 'Below Stage' },
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

const MEDALLION_DISPLAY_SIZE = 120;

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
    initSceneCursor(this);

    const contentDepth = Depths.mapContent;
    const save = SaveSystem.getInstance();

    // --- Panel dimensions ---
    const panelW = Math.min(960, width - 40);
    const panelH = Math.min(700, height - 40);
    const panelX = width / 2;
    const panelY = height / 2 + 10;

    // --- Draw background ---
    this.drawParchmentBackground(panelX, panelY, panelW, panelH, contentDepth);

    // --- Floor separator lines (architectural cross-section feel) ---
    this.drawFloorSeparators(panelX, panelY, panelW, panelH, contentDepth);

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
    this.drawDiamond(lineGfx, panelX - titleHalfW - 64, titleY, 4, Colors.gold, 0.5);
    this.drawDiamond(lineGfx, panelX + titleHalfW + 64, titleY, 4, Colors.gold, 0.5);

    // --- Close button ---
    const closeBtnX = panelX + panelW / 2 - 28;
    const closeBtnY = panelY - panelH / 2 + 28;

    if (this.textures.exists('ui_close_btn')) {
      const closeImg = this.add.image(closeBtnX, closeBtnY, 'ui_close_btn');
      closeImg.setDisplaySize(32, 32);
      closeImg.setAlpha(0.8);
      closeImg.setDepth(contentDepth + 2);
      closeImg.setInteractive({ cursor: HAND_CURSOR });
      closeImg.on('pointerover', () => closeImg.setAlpha(1));
      closeImg.on('pointerout', () => closeImg.setAlpha(0.8));
      closeImg.on('pointerdown', () => this.scene.stop());
    } else {
      const closeBtn = this.add.text(closeBtnX, closeBtnY, '\u2715', {
        fontFamily: FONT,
        fontSize: '22px',
        color: TextColors.goldDim,
      });
      closeBtn.setOrigin(0.5);
      closeBtn.setDepth(contentDepth + 2);
      closeBtn.setInteractive({ cursor: HAND_CURSOR });
      closeBtn.on('pointerover', () => closeBtn.setColor(TextColors.gold));
      closeBtn.on('pointerout', () => closeBtn.setColor(TextColors.goldDim));
      closeBtn.on('pointerdown', () => this.scene.stop());
    }

    // --- Compute room positions from fractional layout ---
    const usableLeft = panelX - panelW / 2 + 60;
    const usableTop = panelY - panelH / 2 + 70;
    const usableW = panelW - 120;
    const usableH = panelH - 110;

    const getRoomPos = (room: RoomDef) => ({
      x: usableLeft + room.px * usableW,
      y: usableTop + room.py * usableH,
    });

    // --- Connection paths (gold hallway lines) — only between discovered rooms ---
    const pathGfx = this.add.graphics();
    pathGfx.setDepth(contentDepth + 1);

    for (const [idA, idB] of CONNECTIONS) {
      const roomA = ROOMS.find((r) => r.id === idA);
      const roomB = ROOMS.find((r) => r.id === idB);
      if (!roomA || !roomB) continue;

      const aDiscovered = save.isRoomDiscovered(idA);
      const bDiscovered = save.isRoomDiscovered(idB);

      // Only draw connections when at least one end is discovered
      if (!aDiscovered && !bDiscovered) continue;

      const a = getRoomPos(roomA);
      const b = getRoomPos(roomB);

      const bothDiscovered = aDiscovered && bDiscovered;
      const lineAlpha = bothDiscovered ? 0.25 : 0.08;

      // Outer glow line
      pathGfx.lineStyle(4, Colors.gold, lineAlpha * 0.3);
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);

      // Main connection line
      pathGfx.lineStyle(2, Colors.gold, lineAlpha);
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);

      if (bothDiscovered) {
        this.drawDashedLine(pathGfx, a.x, a.y, b.x, b.y, 6, 4, Colors.gold, 0.12);
      }
    }

    // --- Place room medallions ---
    for (const room of ROOMS) {
      const pos = getRoomPos(room);
      const isCurrentRoom = room.id === this.currentRoom;
      const isDiscovered = save.isRoomDiscovered(room.id);

      const container = this.add.container(pos.x, pos.y);
      container.setDepth(contentDepth + 2);

      if (isDiscovered) {
        this.createDiscoveredRoom(container, room, isCurrentRoom);
      } else {
        this.createUndiscoveredRoom(container, room);
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
   * Render a discovered room with its medallion icon or colored card.
   */
  private createDiscoveredRoom(
    container: Phaser.GameObjects.Container,
    room: RoomDef,
    isCurrentRoom: boolean,
  ): void {
    const textureKey = `map_${room.id}`;
    const hasTexture = this.textures.exists(textureKey);

    if (hasTexture) {
      const medallion = this.add.image(0, -6, textureKey);
      const scale = MEDALLION_DISPLAY_SIZE / medallion.height;
      medallion.setScale(scale);
      container.add(medallion);

      const circleRadius = MEDALLION_DISPLAY_SIZE * 0.36;
      const circleOffsetY = -6 - MEDALLION_DISPLAY_SIZE * 0.1;

      if (isCurrentRoom) {
        this.addCurrentRoomGlow(container, circleRadius, circleOffsetY);
      }

      // Invisible hit area
      const hitW = MEDALLION_DISPLAY_SIZE * (medallion.width / medallion.height);
      const hitArea = this.add.rectangle(0, -6, hitW, MEDALLION_DISPLAY_SIZE, 0x000000, 0);
      hitArea.setInteractive({ cursor: HAND_CURSOR });
      container.add(hitArea);

      hitArea.on('pointerover', () => {
        if (room.id !== this.currentRoom) medallion.setScale(scale * 1.08);
      });
      hitArea.on('pointerout', () => {
        medallion.setScale(isCurrentRoom ? scale * 1.05 : scale);
      });
      hitArea.on('pointerdown', () => {
        if (room.id !== this.currentRoom) this.navigateToRoom(room.id);
      });

      if (isCurrentRoom) {
        medallion.setScale(scale * 1.05);
        const hereText = this.add.text(0, MEDALLION_DISPLAY_SIZE / 2 + 2, '— you are here —', {
          fontFamily: FONT,
          fontSize: '10px',
          color: '#fff4d0',
        });
        hereText.setOrigin(0.5);
        hereText.setAlpha(0.9);
        container.add(hereText);
      }
    } else {
      // Fallback: no texture — simple colored card
      const cardW = 110;
      const cardH = 70;

      const cardBg = this.add.rectangle(0, 0, cardW, cardH, 0x0a0a1a, 0.7);
      cardBg.setStrokeStyle(1.5, room.color, 0.5);
      container.add(cardBg);

      const nameText = this.add.text(0, 0, room.name, {
        fontFamily: FONT,
        fontSize: '11px',
        color: TextColors.gold,
        align: 'center',
        wordWrap: { width: cardW - 12 },
      });
      nameText.setOrigin(0.5);
      container.add(nameText);

      cardBg.setInteractive({ cursor: HAND_CURSOR });
      cardBg.on('pointerover', () => cardBg.setStrokeStyle(2, Colors.gold, 0.8));
      cardBg.on('pointerout', () => cardBg.setStrokeStyle(1.5, room.color, 0.5));
      cardBg.on('pointerdown', () => {
        if (room.id !== this.currentRoom) this.navigateToRoom(room.id);
      });

      if (isCurrentRoom) {
        cardBg.setStrokeStyle(2, Colors.gold, 0.9);
        const hereText = this.add.text(0, cardH / 2 + 10, '— you are here —', {
          fontFamily: FONT,
          fontSize: '10px',
          color: '#fff4d0',
        });
        hereText.setOrigin(0.5);
        hereText.setAlpha(0.9);
        container.add(hereText);
      }
    }
  }

  /**
   * Render an undiscovered room as a shadowy silhouette with "?".
   */
  private createUndiscoveredRoom(
    container: Phaser.GameObjects.Container,
    _room: RoomDef,
  ): void {
    const size = 70;

    // Dark silhouette circle
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0a0a14, 0.6);
    gfx.fillCircle(0, 0, size / 2);
    gfx.lineStyle(1.5, 0x3a3a4a, 0.3);
    gfx.strokeCircle(0, 0, size / 2);
    container.add(gfx);

    // Question mark
    const questionMark = this.add.text(0, -2, '?', {
      fontFamily: FONT,
      fontSize: '28px',
      color: '#3a3a4a',
    });
    questionMark.setOrigin(0.5);
    questionMark.setAlpha(0.6);
    container.add(questionMark);

    // Subtle pulse on the question mark
    this.tweens.add({
      targets: questionMark,
      alpha: { from: 0.6, to: 0.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Multi-layered glow ring for the current room medallion.
   */
  private addCurrentRoomGlow(
    container: Phaser.GameObjects.Container,
    circleRadius: number,
    circleOffsetY: number,
  ): void {
    const glowRing = this.add.graphics();

    glowRing.lineStyle(20, 0xfff4d0, 0.08);
    glowRing.strokeCircle(0, circleOffsetY, circleRadius + 18);

    glowRing.lineStyle(12, 0xffcc44, 0.15);
    glowRing.strokeCircle(0, circleOffsetY, circleRadius + 12);

    glowRing.lineStyle(6, 0xffd866, 0.35);
    glowRing.strokeCircle(0, circleOffsetY, circleRadius + 6);

    glowRing.lineStyle(3, 0xffeebb, 0.7);
    glowRing.strokeCircle(0, circleOffsetY, circleRadius + 2);

    glowRing.lineStyle(1.5, 0xfff8e0, 0.9);
    glowRing.strokeCircle(0, circleOffsetY, circleRadius);

    container.addAt(glowRing, 0);

    this.tweens.add({
      targets: glowRing,
      alpha: { from: 1, to: 0.5 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Draw horizontal floor separator lines for the theater cross-section.
   */
  private drawFloorSeparators(
    cx: number, cy: number, w: number, h: number, depth: number,
  ): void {
    const gfx = this.add.graphics();
    gfx.setDepth(depth + 0.5);

    const left = cx - w / 2 + 20;
    const right = cx + w / 2 - 20;
    const top = cy - h / 2 + 70;
    const usableH = h - 110;

    // Floor boundaries (between the 4 vertical zones)
    const separators = [
      { y: top + usableH * 0.22, label: 'Stage Level' },
      { y: top + usableH * 0.47, label: 'Ground Floor' },
      { y: top + usableH * 0.73, label: 'Below Stage' },
    ];

    for (const sep of separators) {
      // Thin gold line
      gfx.lineStyle(1, Colors.gold, 0.1);
      gfx.lineBetween(left + 40, sep.y, right - 40, sep.y);

      // Floor label on the left side
      const label = this.add.text(left + 10, sep.y - 1, sep.label, {
        fontFamily: FONT,
        fontSize: '8px',
        color: TextColors.goldDim,
      });
      label.setOrigin(0, 0.5);
      label.setAlpha(0.35);
      label.setDepth(depth + 0.5);
    }

    // Top zone label
    const topLabel = this.add.text(left + 10, top - 5, 'Fly Loft', {
      fontFamily: FONT,
      fontSize: '8px',
      color: TextColors.goldDim,
    });
    topLabel.setOrigin(0, 0.5);
    topLabel.setAlpha(0.35);
    topLabel.setDepth(depth + 0.5);
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

    // Warm vignette overlay
    gfx.fillStyle(0x0a0806, 0.5);
    gfx.fillRect(left, top, w, 40);
    gfx.fillStyle(0x0a0806, 0.3);
    gfx.fillRect(left, top, w, 80);
    gfx.fillStyle(0x0a0806, 0.5);
    gfx.fillRect(left, top + h - 40, w, 40);
    gfx.fillStyle(0x0a0806, 0.3);
    gfx.fillRect(left, top + h - 80, w, 80);
    gfx.fillStyle(0x0a0806, 0.4);
    gfx.fillRect(left, top, 30, h);
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

    gfx.lineStyle(3, Colors.gold, 0.7);
    gfx.strokeRect(left, top, w, h);

    gfx.lineStyle(1, Colors.gold, 0.3);
    gfx.strokeRect(left + 8, top + 8, w - 16, h - 16);

    const corners = [
      { x: left + 8, y: top + 8 },
      { x: left + w - 8, y: top + 8 },
      { x: left + 8, y: top + h - 8 },
      { x: left + w - 8, y: top + h - 8 },
    ];
    for (const c of corners) {
      this.drawDiamond(gfx, c.x, c.y, 6, Colors.gold, 0.5);
    }

    const accentLen = 40;
    gfx.lineStyle(1, Colors.gold, 0.4);
    gfx.lineBetween(left + 16, top + 16, left + 16 + accentLen, top + 16);
    gfx.lineBetween(left + 16, top + 16, left + 16, top + 16 + accentLen);
    gfx.lineBetween(left + w - 16, top + 16, left + w - 16 - accentLen, top + 16);
    gfx.lineBetween(left + w - 16, top + 16, left + w - 16, top + 16 + accentLen);
    gfx.lineBetween(left + 16, top + h - 16, left + 16 + accentLen, top + h - 16);
    gfx.lineBetween(left + 16, top + h - 16, left + 16, top + h - 16 - accentLen);
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
