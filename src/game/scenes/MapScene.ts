import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { Cursors, POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';

/**
 * Room definition with hand-placed positions reflecting the Monarch Theatre's
 * vertical cross-section: catwalk up top, auditorium and wings in the middle,
 * lobby at ground level, basement below.
 *
 * Positions are expressed as fractions (0-1) of the map content area so the
 * layout scales to any panel size.
 */
interface RoomDef {
  id: string;
  name: string;
  /** Fraction of content width (0 = left edge, 1 = right edge) */
  fx: number;
  /** Fraction of content height (0 = top, 1 = bottom) */
  fy: number;
  /** Floor label for the cross-section */
  floor: 'upper' | 'main' | 'ground' | 'below';
  /** Minimum chapter required to ACCESS this room (can still be visible if discovered) */
  requiresChapter?: number;
}

const ROOMS: RoomDef[] = [
  // Upper level — above the stage
  { id: 'catwalk',          name: 'Catwalk',           fx: 0.30, fy: 0.12, floor: 'upper', requiresChapter: 3 },
  { id: 'projection_booth', name: 'Projection Booth',  fx: 0.70, fy: 0.12, floor: 'upper' },

  // Main level — the stage and wings
  { id: 'backstage',        name: 'Backstage',         fx: 0.15, fy: 0.38, floor: 'main' },
  { id: 'auditorium',       name: 'Auditorium',        fx: 0.50, fy: 0.38, floor: 'main' },
  { id: 'managers_office',  name: "Manager's Office",  fx: 0.85, fy: 0.38, floor: 'main' },

  // Ground level — front of house
  { id: 'dressing_room',    name: 'Dressing Room',     fx: 0.28, fy: 0.64, floor: 'ground' },
  { id: 'lobby',            name: 'Grand Lobby',       fx: 0.68, fy: 0.64, floor: 'ground' },

  // Below stage
  { id: 'basement',         name: 'Basement',          fx: 0.50, fy: 0.90, floor: 'below', requiresChapter: 4 },
];

/** Connections between rooms shown as hallway lines */
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

/** Floor labels for the cross-section diagram */
const FLOOR_LABELS: { label: string; fy: number }[] = [
  { label: 'UPPER GALLERY',  fy: 0.12 },
  { label: 'STAGE LEVEL',    fy: 0.38 },
  { label: 'GROUND FLOOR',   fy: 0.64 },
  { label: 'BELOW STAGE',    fy: 0.90 },
];

const MEDALLION_SIZE = 165;

export class MapScene extends Phaser.Scene {
  private currentRoom = '';

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: { currentRoom?: string }): void {
    this.currentRoom = data.currentRoom ?? SaveSystem.getInstance().getCurrentRoom();
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.getInstance();
    const chapter = save.getChapter();

    // --- Full-screen overlay ---
    createOverlay(this, 0.8, Depths.mapOverlay);
    initSceneCursor(this);

    const contentDepth = Depths.mapContent;

    // --- Panel dimensions ---
    const panelW = Math.min(1440, width - 48);
    const panelH = Math.min(1050, height - 48);
    const panelX = width / 2;
    const panelY = height / 2;

    // --- Background ---
    this.drawParchmentBackground(panelX, panelY, panelW, panelH, contentDepth);
    this.drawArtDecoBorder(panelX, panelY, panelW, panelH, contentDepth);

    // --- Title ---
    const titleY = panelY - panelH / 2 + 48;
    const titleText = this.add.text(panelX, titleY, 'THE MONARCH THEATRE', {
      fontFamily: FONT,
      fontSize: '30px',
      color: TextColors.gold,
      letterSpacing: 9,
    }).setOrigin(0.5).setDepth(contentDepth + 1);

    // Decorative lines flanking the title
    const lineGfx = this.add.graphics().setDepth(contentDepth + 1);
    lineGfx.lineStyle(1, Colors.gold, 0.5);
    const thw = titleText.width / 2 + 24;
    lineGfx.lineBetween(panelX - thw - 90, titleY, panelX - thw, titleY);
    lineGfx.lineBetween(panelX + thw, titleY, panelX + thw + 90, titleY);
    this.drawDiamond(lineGfx, panelX - thw - 96, titleY, 6, Colors.gold, 0.5);
    this.drawDiamond(lineGfx, panelX + thw + 96, titleY, 6, Colors.gold, 0.5);

    // --- Close button ---
    const closeBtnX = panelX + panelW / 2 - 42;
    const closeBtnY = panelY - panelH / 2 + 42;

    const closeBtnContainer = createCloseButton(this, closeBtnX, closeBtnY, () => this.scene.stop(), 80);
    closeBtnContainer.setDepth(contentDepth + 3);

    // --- Content area (inside border, below title) ---
    const contentLeft = panelX - panelW / 2 + 75;
    const contentTop = titleY + 30;
    const contentW = panelW - 150;
    const contentH = panelH - 120;

    // --- Floor level labels (left side) ---
    for (const fl of FLOOR_LABELS) {
      const labelY = contentTop + fl.fy * contentH;
      this.add.text(contentLeft - 12, labelY, fl.label, {
        fontFamily: FONT,
        fontSize: '12px',
        color: TextColors.goldDim,
        letterSpacing: 3,
      }).setOrigin(1, 0.5).setDepth(contentDepth + 1).setAlpha(0.6);

      // Faint horizontal guide line
      const guideGfx = this.add.graphics().setDepth(contentDepth);
      guideGfx.lineStyle(1, Colors.gold, 0.06);
      guideGfx.lineBetween(contentLeft, labelY, contentLeft + contentW, labelY);
    }

    // --- Helper to get room pixel position ---
    const getRoomPos = (room: RoomDef) => ({
      x: contentLeft + room.fx * contentW,
      y: contentTop + room.fy * contentH,
    });

    // --- Connection paths ---
    const pathGfx = this.add.graphics().setDepth(contentDepth + 1);

    for (const [idA, idB] of CONNECTIONS) {
      const roomA = ROOMS.find(r => r.id === idA);
      const roomB = ROOMS.find(r => r.id === idB);
      if (!roomA || !roomB) continue;

      const a = getRoomPos(roomA);
      const b = getRoomPos(roomB);
      const aDiscovered = save.isRoomDiscovered(roomA.id);
      const bDiscovered = save.isRoomDiscovered(roomB.id);
      const bothKnown = aDiscovered && bDiscovered;

      // Outer glow
      pathGfx.lineStyle(4, Colors.gold, bothKnown ? 0.08 : 0.03);
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);

      // Main line
      pathGfx.lineStyle(2, Colors.gold, bothKnown ? 0.25 : 0.08);
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);

      if (bothKnown) {
        this.drawDashedLine(pathGfx, a.x, a.y, b.x, b.y, 6, 4, Colors.gold, 0.12);
      }
    }

    // --- Place room medallions ---
    for (const room of ROOMS) {
      const pos = getRoomPos(room);
      const isCurrentRoom = room.id === this.currentRoom;
      const isDiscovered = save.isRoomDiscovered(room.id);
      const isLocked = room.requiresChapter !== undefined && chapter < room.requiresChapter;

      const container = this.add.container(pos.x, pos.y);
      container.setDepth(contentDepth + 2);

      if (isDiscovered) {
        // --- DISCOVERED ROOM: Show medallion ---
        const textureKey = `map_${room.id}`;
        const hasTexture = this.textures.exists(textureKey);

        if (hasTexture) {
          const medallion = this.add.image(0, -6, textureKey);
          const scale = MEDALLION_SIZE / medallion.height;
          medallion.setScale(scale);

          // Locked rooms (discovered but chapter-gated): desaturated + lock overlay
          if (isLocked) {
            medallion.setTint(0x666666);
            medallion.setAlpha(0.5);
          }

          container.add(medallion);

          const circleRadius = MEDALLION_SIZE * 0.36;
          const circleOffsetY = -6 - MEDALLION_SIZE * 0.1;

          // Current room glow
          if (isCurrentRoom) {
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

          // Hit area
          const hitW = MEDALLION_SIZE * (medallion.width / medallion.height);
          const hitArea = this.add.rectangle(0, -6, hitW, MEDALLION_SIZE, 0x000000, 0);
          hitArea.setInteractive({ cursor: isLocked ? Cursors.locked : POINTER_CURSOR });
          container.add(hitArea);

          if (!isLocked) {
            const baseScale = isCurrentRoom ? scale * 1.05 : scale;
            if (isCurrentRoom) medallion.setScale(baseScale);

            hitArea.on('pointerover', () => {
              if (room.id !== this.currentRoom) medallion.setScale(scale * 1.08);
            });
            hitArea.on('pointerout', () => {
              medallion.setScale(isCurrentRoom ? scale * 1.05 : scale);
            });
            hitArea.on('pointerdown', () => {
              if (room.id !== this.currentRoom) this.navigateToRoom(room.id);
            });
          }

          // Lock icon overlay for chapter-gated rooms
          if (isLocked) {
            const lockIcon = this.add.text(0, circleOffsetY, '🔒', {
              fontSize: '36px',
            }).setOrigin(0.5).setAlpha(0.7);
            container.add(lockIcon);

            const lockLabel = this.add.text(0, MEDALLION_SIZE / 2 + 3, `Chapter ${room.requiresChapter}`, {
              fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
            }).setOrigin(0.5).setAlpha(0.6);
            container.add(lockLabel);
          }

          // "You are here" indicator
          if (isCurrentRoom) {
            const hereText = this.add.text(0, MEDALLION_SIZE / 2 + 3, '— you are here —', {
              fontFamily: FONT, fontSize: '15px', color: '#fff4d0',
            }).setOrigin(0.5).setAlpha(0.9);
            container.add(hereText);
          }
        } else {
          // Fallback: discovered but no texture
          this.createFallbackCard(container, room, isCurrentRoom, isLocked);
        }
      } else {
        // --- UNDISCOVERED ROOM: Shadowy silhouette with ? ---
        const silBg = this.add.graphics();
        silBg.fillStyle(0x0a0a1a, 0.6);
        silBg.fillCircle(0, -18, 54);
        silBg.lineStyle(2, Colors.gold, 0.15);
        silBg.strokeCircle(0, -18, 54);
        container.add(silBg);

        const questionMark = this.add.text(0, -21, '?', {
          fontFamily: FONT,
          fontSize: '42px',
          color: TextColors.goldDim,
        }).setOrigin(0.5).setAlpha(0.4);
        container.add(questionMark);

        // Faint pulsing mystery effect
        this.tweens.add({
          targets: questionMark,
          alpha: { from: 0.25, to: 0.5 },
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        const unknownLabel = this.add.text(0, 30, '???', {
          fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
        }).setOrigin(0.5).setAlpha(0.4);
        container.add(unknownLabel);
      }
    }

    // --- Discovery count ---
    const discovered = ROOMS.filter(r => save.isRoomDiscovered(r.id)).length;
    const subtitleY = panelY + panelH / 2 - 30;
    this.add.text(panelX, subtitleY, `${discovered} of ${ROOMS.length} locations discovered`, {
      fontFamily: FONT,
      fontSize: '15px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(contentDepth + 1);

    // --- Fade in ---
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  /** Fallback card for rooms with missing textures */
  private createFallbackCard(
    container: Phaser.GameObjects.Container,
    room: RoomDef,
    isCurrent: boolean,
    isLocked: boolean,
  ): void {
    const cardBg = this.add.rectangle(0, 0, 135, 105, 0x0a0a1a, 0.7);
    cardBg.setStrokeStyle(1.5, isLocked ? 0x3a3a4a : Colors.gold, isLocked ? 0.4 : 0.5);
    container.add(cardBg);

    const nameText = this.add.text(0, isCurrent ? -8 : 0, room.name, {
      fontFamily: FONT, fontSize: '15px', color: isCurrent ? TextColors.gold : TextColors.mutedBlue,
      align: 'center', wordWrap: { width: 120 },
    }).setOrigin(0.5);
    container.add(nameText);

    if (isCurrent) {
      const hereText = this.add.text(0, 18, '— here —', {
        fontFamily: FONT, fontSize: '14px', color: '#fff4d0',
      }).setOrigin(0.5).setAlpha(0.7);
      container.add(hereText);
    }

    if (!isLocked && !isCurrent) {
      cardBg.setInteractive({ cursor: POINTER_CURSOR });
      cardBg.on('pointerover', () => cardBg.setStrokeStyle(1.5, Colors.gold, 0.8));
      cardBg.on('pointerout', () => cardBg.setStrokeStyle(1.5, Colors.gold, 0.5));
      cardBg.on('pointerdown', () => this.navigateToRoom(room.id));
    }
  }

  private drawParchmentBackground(
    cx: number, cy: number, w: number, h: number, depth: number,
  ): void {
    const gfx = this.add.graphics().setDepth(depth);
    const left = cx - w / 2;
    const top = cy - h / 2;

    gfx.fillStyle(0x1a1610, 1);
    gfx.fillRect(left, top, w, h);

    const patchColors = [0x1e1a14, 0x16120e, 0x201c14, 0x14100c, 0x221e16];
    for (let i = 0; i < 40; i++) {
      const px = left + Math.random() * w;
      const py = top + Math.random() * h;
      const pw = 30 + Math.random() * 120;
      const ph = 20 + Math.random() * 80;
      gfx.fillStyle(patchColors[i % patchColors.length], 0.3 + Math.random() * 0.3);
      gfx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
    }

    gfx.lineStyle(1, 0x2a2418, 0.15);
    for (let y = top + 10; y < top + h; y += 8 + Math.random() * 6) {
      gfx.lineBetween(left + Math.random() * 20, y, left + w - Math.random() * 20, y);
    }

    // Vignette
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

    gfx.fillStyle(Colors.gold, 0.03);
    gfx.fillRect(cx - w / 4, cy - h / 4, w / 2, h / 2);
  }

  private drawArtDecoBorder(
    cx: number, cy: number, w: number, h: number, depth: number,
  ): void {
    const gfx = this.add.graphics().setDepth(depth + 1);
    const left = cx - w / 2;
    const top = cy - h / 2;

    gfx.lineStyle(4, Colors.gold, 0.7);
    gfx.strokeRect(left, top, w, h);
    gfx.lineStyle(1.5, Colors.gold, 0.3);
    gfx.strokeRect(left + 12, top + 12, w - 24, h - 24);

    const corners = [
      { x: left + 12, y: top + 12 },
      { x: left + w - 12, y: top + 12 },
      { x: left + 12, y: top + h - 12 },
      { x: left + w - 12, y: top + h - 12 },
    ];
    for (const c of corners) {
      this.drawDiamond(gfx, c.x, c.y, 9, Colors.gold, 0.5);
    }

    const accentLen = 60;
    gfx.lineStyle(1.5, Colors.gold, 0.4);
    gfx.lineBetween(left + 24, top + 24, left + 24 + accentLen, top + 24);
    gfx.lineBetween(left + 24, top + 24, left + 24, top + 24 + accentLen);
    gfx.lineBetween(left + w - 24, top + 24, left + w - 24 - accentLen, top + 24);
    gfx.lineBetween(left + w - 24, top + 24, left + w - 24, top + 24 + accentLen);
    gfx.lineBetween(left + 24, top + h - 24, left + 24 + accentLen, top + h - 24);
    gfx.lineBetween(left + 24, top + h - 24, left + 24, top + h - 24 - accentLen);
    gfx.lineBetween(left + w - 24, top + h - 24, left + w - 24 - accentLen, top + h - 24);
    gfx.lineBetween(left + w - 24, top + h - 24, left + w - 24, top + h - 24 - accentLen);
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
