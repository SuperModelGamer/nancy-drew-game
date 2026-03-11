import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';

interface RoomDef {
  id: string;
  name: string;
  icon: string;
  color: number;
  requiresChapter?: number;
  gridX: number;
  gridY: number;
}

const ROOMS: RoomDef[] = [
  { id: 'catwalk',          name: 'Catwalk',           icon: '🔦', color: 0x8a8a8a, gridX: 1, gridY: 0 },
  { id: 'projection_booth', name: 'Projection Booth',  icon: '🎬', color: 0x7bc98a, gridX: 3, gridY: 0 },
  { id: 'backstage',        name: 'Backstage',         icon: '⚙️', color: 0xc9947b, gridX: 0, gridY: 1 },
  { id: 'auditorium',       name: 'Auditorium',        icon: '🎭', color: 0x7ba3c9, gridX: 2, gridY: 1 },
  { id: 'managers_office',  name: "Manager's Office",  icon: '📋', color: 0xc97b7b, gridX: 4, gridY: 1 },
  { id: 'dressing_room',    name: 'Dressing Room',     icon: '💄', color: 0xb4a0d4, gridX: 1, gridY: 2 },
  { id: 'lobby',            name: 'Grand Lobby',       icon: '🏛️', color: Colors.gold, gridX: 2, gridY: 2 },
  { id: 'basement',         name: 'Basement',          icon: '🚪', color: 0x5a5a7a, requiresChapter: 4, gridX: 2, gridY: 3 },
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

    // --- Full-screen overlay to block clicks through to RoomScene ---
    const overlay = createOverlay(this, 0.8, Depths.mapOverlay);

    // --- Content container depth ---
    const contentDepth = Depths.mapContent;

    // --- Main panel background ---
    const panelW = Math.min(780, width - 60);
    const panelH = Math.min(560, height - 80);
    const panelX = width / 2;
    const panelY = height / 2 + 10;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, Colors.panelBg, 1);
    panelBg.setStrokeStyle(2, Colors.gold, 0.6);
    panelBg.setDepth(contentDepth);

    // Decorative inner border
    const innerBorder = this.add.rectangle(panelX, panelY, panelW - 12, panelH - 12, Colors.sceneBg, 0);
    innerBorder.setStrokeStyle(1, Colors.gold, 0.25);
    innerBorder.setDepth(contentDepth);

    // --- Title ---
    const titleY = panelY - panelH / 2 + 32;
    const titleText = this.add.text(panelX, titleY, 'Theater Map', {
      fontFamily: FONT,
      fontSize: '26px',
      color: TextColors.gold,
    });
    titleText.setOrigin(0.5);
    titleText.setDepth(contentDepth);

    // Small decorative line under title
    const lineGfx = this.add.graphics();
    lineGfx.setDepth(contentDepth);
    lineGfx.lineStyle(1, Colors.gold, 0.4);
    lineGfx.lineBetween(panelX - 80, titleY + 18, panelX + 80, titleY + 18);

    // --- Close button ---
    const closeBtnX = panelX + panelW / 2 - 28;
    const closeBtnY = panelY - panelH / 2 + 28;
    const closeBtn = this.add.text(closeBtnX, closeBtnY, '✕', {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.light,
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setDepth(contentDepth);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor(TextColors.gold));
    closeBtn.on('pointerout', () => closeBtn.setColor(TextColors.light));
    closeBtn.on('pointerdown', () => this.scene.stop());

    // --- Compute room card positions ---
    const chapter = SaveSystem.getInstance().getChapter();
    const gridOriginX = panelX;
    const gridOriginY = panelY + 14;
    const cellW = 148;
    const cellH = 108;
    const gridCols = 5;
    const gridRows = 4;
    const gridW = gridCols * cellW;
    const gridH = gridRows * cellH;

    const getRoomCenter = (room: RoomDef): { x: number; y: number } => {
      const x = gridOriginX - gridW / 2 + room.gridX * cellW + cellW / 2;
      const y = gridOriginY - gridH / 2 + room.gridY * cellH + cellH / 2 + 16;
      return { x, y };
    };

    // --- Draw connecting lines between adjacent rooms ---
    const linesGfx = this.add.graphics();
    linesGfx.setDepth(contentDepth);

    for (const [idA, idB] of CONNECTIONS) {
      const roomA = ROOMS.find((r) => r.id === idA);
      const roomB = ROOMS.find((r) => r.id === idB);
      if (!roomA || !roomB) continue;

      const a = getRoomCenter(roomA);
      const b = getRoomCenter(roomB);

      // Draw a subtle gold connection line
      linesGfx.lineStyle(1.5, Colors.gold, 0.2);
      linesGfx.lineBetween(a.x, a.y, b.x, b.y);

      // Small dots at endpoints
      linesGfx.fillStyle(Colors.gold, 0.3);
      linesGfx.fillCircle(a.x, a.y, 2);
      linesGfx.fillCircle(b.x, b.y, 2);
    }

    // --- Create room cards ---
    for (const room of ROOMS) {
      const pos = getRoomCenter(room);
      const isCurrentRoom = room.id === this.currentRoom;
      const isLocked = room.requiresChapter !== undefined && chapter < room.requiresChapter;

      const container = this.add.container(pos.x, pos.y);
      container.setDepth(contentDepth);

      const cardW = 130;
      const cardH = 90;

      // Card background
      const cardColor = isLocked ? Colors.sceneBg : Colors.sceneBg;
      const cardBg = this.add.rectangle(0, 0, cardW, cardH, cardColor, isLocked ? 0.5 : 0.9);
      const borderColor = isCurrentRoom ? Colors.gold : room.color;
      const borderAlpha = isCurrentRoom ? 1 : (isLocked ? 0.25 : 0.5);
      const borderWidth = isCurrentRoom ? 2.5 : 1.5;
      cardBg.setStrokeStyle(borderWidth, borderColor, borderAlpha);
      container.add(cardBg);

      // Current-room glow highlight
      if (isCurrentRoom) {
        const glow = this.add.rectangle(0, 0, cardW + 6, cardH + 6, room.color, 0.08);
        glow.setStrokeStyle(1, Colors.gold, 0.3);
        container.addAt(glow, 0);
      }

      // Colored accent bar at top of card
      const accentBar = this.add.rectangle(0, -cardH / 2 + 3, cardW - 4, 4, room.color, isLocked ? 0.15 : 0.6);
      container.add(accentBar);

      // Room icon
      const displayIcon = isLocked ? '🔒' : room.icon;
      const iconText = this.add.text(0, -12, displayIcon, {
        fontSize: '24px',
      });
      iconText.setOrigin(0.5);
      iconText.setAlpha(isLocked ? 0.4 : 1);
      container.add(iconText);

      // Room name
      const nameColor = isLocked ? TextColors.mutedBlue : TextColors.light;
      const nameText = this.add.text(0, 18, room.name, {
        fontFamily: FONT,
        fontSize: '12px',
        color: nameColor,
        align: 'center',
        wordWrap: { width: cardW - 16 },
      });
      nameText.setOrigin(0.5, 0);
      container.add(nameText);

      // "You are here" indicator
      if (isCurrentRoom) {
        const hereText = this.add.text(0, cardH / 2 - 12, '— you are here —', {
          fontFamily: FONT,
          fontSize: '8px',
          color: TextColors.gold,
        });
        hereText.setOrigin(0.5);
        hereText.setAlpha(0.7);
        container.add(hereText);
      }

      // Locked subtitle
      if (isLocked) {
        const lockText = this.add.text(0, cardH / 2 - 12, `Chapter ${room.requiresChapter}`, {
          fontFamily: FONT,
          fontSize: '8px',
          color: TextColors.mutedBlue,
        });
        lockText.setOrigin(0.5);
        container.add(lockText);
      }

      // Make the card interactive
      cardBg.setInteractive({ useHandCursor: !isLocked });
      container.setSize(cardW, cardH);

      if (!isLocked) {
        cardBg.on('pointerover', () => {
          if (room.id !== this.currentRoom) {
            cardBg.setFillStyle(0x24243a, 1);
            cardBg.setStrokeStyle(2, room.color, 0.9);
            nameText.setColor('#ffffff');
          }
        });

        cardBg.on('pointerout', () => {
          if (room.id !== this.currentRoom) {
            cardBg.setFillStyle(Colors.sceneBg, 0.9);
            cardBg.setStrokeStyle(1.5, room.color, 0.5);
            nameText.setColor(TextColors.light);
          }
        });

        cardBg.on('pointerdown', () => {
          if (room.id !== this.currentRoom) {
            this.navigateToRoom(room.id);
          }
        });
      }

      this.roomCards.set(room.id, container);
    }

    // --- Subtitle text at the bottom ---
    const subtitleY = panelY + panelH / 2 - 20;
    const subtitle = this.add.text(panelX, subtitleY, 'Select a location to travel', {
      fontFamily: FONT,
      fontSize: '11px',
      color: TextColors.light,
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0.4);
    subtitle.setDepth(contentDepth);

    // --- Fade in ---
    this.cameras.main.fadeIn(200, 0, 0, 0);
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
