import Phaser from 'phaser';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { SaveSystem } from '../systems/SaveSystem';

interface EvidenceCard {
  id: string;
  label: string;
  description: string;
  icon: string;
  year: string;
}

const EVIDENCE_CARDS: EvidenceCard[] = [
  { id: 'cecilia', label: "Cecilia's Letters", description: 'Ordered poison from a\npharmacist, Oct 1928', icon: '✉️', year: '1928' },
  { id: 'goblet', label: 'The Poisoned Goblet', description: 'Swapped the prop goblet\nfor a real one', icon: '🍷', year: '1928' },
  { id: 'margaux', label: "Margaux's Death", description: 'Drank poison on stage\nOctober 31, 1928', icon: '💀', year: '1928' },
  { id: 'edwin', label: "Edwin's Discovery", description: 'Found proof of the\n1928 murder', icon: '🔍', year: 'Modern' },
  { id: 'ghost', label: 'The Ghost Project', description: 'Staged hauntings using\ntheater effects', icon: '👻', year: 'Modern' },
  { id: 'ashworth', label: 'Ashworth Poisoned', description: 'Edwin poisoned Ashworth\nwhen discovered', icon: '☠️', year: 'Modern' },
];

export class EvidenceBoardScene extends Phaser.Scene {
  private onSolvedCallback?: () => void;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private dropZones: { x: number; y: number; cardId: string | null }[] = [];
  private cardStartPositions: { x: number; y: number }[] = [];
  private boardContainer!: Phaser.GameObjects.Container;
  private feedbackText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'EvidenceBoardScene' });
  }

  init(data: { onSolved?: () => void }): void {
    this.onSolvedCallback = data.onSolved;
    this.cardContainers = [];
    this.dropZones = [];
    this.cardStartPositions = [];
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setInteractive();
    overlay.setDepth(410);

    this.boardContainer = this.add.container(0, 0);
    this.boardContainer.setDepth(411);

    // Corkboard background
    const boardW = Math.min(width * 0.92, 1000);
    const boardH = Math.min(height * 0.85, 600);
    const boardX = width / 2;
    const boardY = height / 2;

    const corkBg = this.add.rectangle(boardX, boardY, boardW, boardH, 0x6B4F2A, 0.97);
    corkBg.setStrokeStyle(4, 0x4A3520);
    this.boardContainer.add(corkBg);

    // Inner frame
    const innerFrame = this.add.rectangle(boardX, boardY, boardW - 16, boardH - 16, 0x7B5F3A, 0.3);
    innerFrame.setStrokeStyle(2, 0x8B6914, 0.5);
    this.boardContainer.add(innerFrame);

    // Title
    this.boardContainer.add(this.add.text(boardX, boardY - boardH / 2 + 30, 'Evidence Board', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#c9a84c',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // Subtitle
    this.boardContainer.add(this.add.text(boardX, boardY - boardH / 2 + 55, 'Arrange the evidence in chronological order to solve both cases', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#e0d5c0',
      fontStyle: 'italic',
    }).setOrigin(0.5));

    // Close button
    const closeBtn = this.add.text(boardX + boardW / 2 - 25, boardY - boardH / 2 + 20, '✕', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#8a7a5a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.stop());
    closeBtn.on('pointerover', () => closeBtn.setColor('#c9a84c'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#8a7a5a'));
    this.boardContainer.add(closeBtn);

    // Timeline labels
    const timelineY = boardY - boardH / 2 + 85;
    this.boardContainer.add(this.add.text(boardX - boardW / 4, timelineY, '1928 — The Murder', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#c97b7b',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    this.boardContainer.add(this.add.text(boardX + boardW / 4, timelineY, 'Modern Day — The Cover-up', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#7ba3c9',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // Timeline line
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0xc9a84c, 0.4);
    const lineY = timelineY + 20;
    gfx.lineBetween(boardX - boardW / 2 + 50, lineY, boardX + boardW / 2 - 50, lineY);
    this.boardContainer.add(gfx);

    // Drop zones (6 slots)
    const zoneW = 130;
    const zoneH = 90;
    const zoneY = timelineY + 80;
    const zoneSpacing = (boardW - 100) / 6;
    const zoneStartX = boardX - boardW / 2 + 50 + zoneSpacing / 2;

    for (let i = 0; i < 6; i++) {
      const zx = zoneStartX + i * zoneSpacing;

      const zone = this.add.rectangle(zx, zoneY, zoneW, zoneH, 0x4A3520, 0.5);
      zone.setStrokeStyle(2, 0xc9a84c, 0.4);
      this.boardContainer.add(zone);

      this.boardContainer.add(this.add.text(zx, zoneY - zoneH / 2 - 10, `${i + 1}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#c9a84c',
      }).setOrigin(0.5));

      this.dropZones.push({ x: zx, y: zoneY, cardId: null });
    }

    // Feedback text
    this.feedbackText = this.add.text(boardX, boardY + boardH / 2 - 65, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#ff6b6b',
      align: 'center',
    }).setOrigin(0.5);
    this.boardContainer.add(this.feedbackText);

    // Hint text
    this.hintText = this.add.text(boardX, boardY + boardH / 2 - 40, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#8a7a5a',
      fontStyle: 'italic',
      wordWrap: { width: boardW - 80 },
      align: 'center',
    }).setOrigin(0.5);
    this.boardContainer.add(this.hintText);

    // Shuffled evidence cards at bottom
    const shuffled = Phaser.Utils.Array.Shuffle([...EVIDENCE_CARDS]);
    const cardY = boardY + boardH / 2 - 130;
    const cardSpacing = (boardW - 80) / 6;
    const cardStartX = boardX - boardW / 2 + 40 + cardSpacing / 2;

    shuffled.forEach((card, i) => {
      const cx = cardStartX + i * cardSpacing;
      this.cardStartPositions.push({ x: cx, y: cardY });
      this.createEvidenceCard(card, cx, cardY, zoneW, zoneH, i);
    });

    // Drag handlers
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.setDepth(412);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container) => {
      gameObject.setDepth(411);
      const cardId = gameObject.getData('cardId') as string;
      const startIdx = gameObject.getData('startIndex') as number;

      // Remove from any current zone
      this.dropZones.forEach(zone => {
        if (zone.cardId === cardId) zone.cardId = null;
      });

      // Find nearest zone
      let nearestZone = -1;
      let nearestDist = 80;
      this.dropZones.forEach((zone, i) => {
        const dist = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, zone.x, zone.y);
        if (dist < nearestDist && zone.cardId === null) {
          nearestDist = dist;
          nearestZone = i;
        }
      });

      if (nearestZone >= 0) {
        this.dropZones[nearestZone].cardId = cardId;
        this.tweens.add({
          targets: gameObject,
          x: this.dropZones[nearestZone].x,
          y: this.dropZones[nearestZone].y,
          duration: 200,
          ease: 'Back.easeOut',
        });
        this.checkAllPlaced();
      } else {
        const start = this.cardStartPositions[startIdx];
        this.tweens.add({
          targets: gameObject,
          x: start.x,
          y: start.y,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    });

    // Fade in
    this.boardContainer.setAlpha(0);
    this.tweens.add({ targets: this.boardContainer, alpha: 1, duration: 300 });
  }

  private createEvidenceCard(card: EvidenceCard, x: number, y: number, w: number, h: number, index: number): void {
    const container = this.add.container(x, y);

    // Aged paper background
    const bg = this.add.rectangle(0, 0, w, h, 0xF5E6C8, 0.95);
    bg.setStrokeStyle(2, 0x8B7355);
    container.add(bg);

    // Push pin
    container.add(this.add.ellipse(0, -h / 2 + 8, 10, 10, 0xcc2222, 0.9));

    // Year tag
    const yearColor = card.year === '1928' ? '#8b1a1a' : '#1a4a8b';
    container.add(this.add.text(w / 2 - 5, -h / 2 + 3, card.year, {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: yearColor,
      fontStyle: 'bold',
    }).setOrigin(1, 0));

    // Icon
    container.add(this.add.text(0, -15, card.icon, { fontSize: '22px' }).setOrigin(0.5));

    // Label
    container.add(this.add.text(0, 8, card.label, {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#2a2a2a',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5));

    // Description
    container.add(this.add.text(0, 28, card.description, {
      fontFamily: 'Georgia, serif',
      fontSize: '8px',
      color: '#4a4a4a',
      align: 'center',
      lineSpacing: 1,
    }).setOrigin(0.5, 0));

    container.setSize(w, h);
    container.setData('cardId', card.id);
    container.setData('startIndex', index);
    container.setInteractive({ draggable: true, useHandCursor: true });

    this.boardContainer.add(container);
    this.cardContainers.push(container);
  }

  private checkAllPlaced(): void {
    const allFilled = this.dropZones.every(zone => zone.cardId !== null);
    if (!allFilled) return;

    const answer = this.dropZones.map(zone => zone.cardId).join('-');
    const correct = PuzzleSystem.getInstance().checkAnswer('evidence_board', answer);

    if (correct) {
      this.feedbackText.setColor('#4ade80');
      this.feedbackText.setText('Case Closed!');
      this.hintText.setText('');

      SaveSystem.getInstance().setFlag('case_closed', true);
      SaveSystem.getInstance().save();

      // Draw red string connections
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0x8b1a1a, 0.8);
      for (let i = 0; i < this.dropZones.length - 1; i++) {
        gfx.lineBetween(
          this.dropZones[i].x, this.dropZones[i].y,
          this.dropZones[i + 1].x, this.dropZones[i + 1].y,
        );
      }
      this.boardContainer.add(gfx);

      this.cardContainers.forEach(c => c.disableInteractive());

      this.time.delayedCall(2500, () => {
        if (this.onSolvedCallback) this.onSolvedCallback();
        this.scene.stop();
      });
    } else {
      this.feedbackText.setColor('#ff6b6b');
      this.feedbackText.setText("That's not quite right...");

      const hint = PuzzleSystem.getInstance().getHint('evidence_board');
      if (hint) {
        this.hintText.setText(`Hint: ${hint}`);
      }

      // Shake
      this.tweens.add({
        targets: this.boardContainer,
        x: this.boardContainer.x - 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });

      // Reset cards after delay
      this.time.delayedCall(1500, () => {
        this.dropZones.forEach(zone => { zone.cardId = null; });
        this.cardContainers.forEach((container, i) => {
          const start = this.cardStartPositions[i];
          this.tweens.add({
            targets: container,
            x: start.x,
            y: start.y,
            duration: 400,
            ease: 'Back.easeOut',
            delay: i * 80,
          });
        });
      });
    }
  }
}
