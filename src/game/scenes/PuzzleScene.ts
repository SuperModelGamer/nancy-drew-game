import Phaser from 'phaser';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';

export class PuzzleScene extends Phaser.Scene {
  private puzzleId!: string;
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private feedbackText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private onSolvedCallback?: () => void;
  private panelW = 0;
  private panelH = 0;

  // Combination puzzle state
  private dials: number[] = [];
  private dialTexts: Phaser.GameObjects.Text[] = [];
  private dialCount = 3;
  private dialSeparator = '-';

  // Sequence puzzle state (evidence board uses EvidenceBoardScene)
  private sequenceInput: string[] = [];
  private sequenceButtons: Phaser.GameObjects.Container[] = [];
  private sequenceDisplay!: Phaser.GameObjects.Text;

  // Text input state
  private textInput = '';
  private textDisplay!: Phaser.GameObjects.Text;
  private cursorBlink?: Phaser.Time.TimerEvent;

  // Cipher state
  private cipherAnswer: string[] = [];
  private cipherDisplay!: Phaser.GameObjects.Text;

  // Lighting board state
  private channelSelections: string[] = [];
  private channelLabels: Phaser.GameObjects.Text[] = [];
  private stagePreview!: Phaser.GameObjects.Graphics;

  // Mirror reveal state
  private revealedCells: boolean[][] = [];
  private revealProgress = 0;
  private mirrorGfx!: Phaser.GameObjects.Graphics;
  private mirrorTextObj!: Phaser.GameObjects.Text;

  // Film strip state
  private filmSlots: (string | null)[] = [];
  private filmCards: Phaser.GameObjects.Container[] = [];
  private draggedCard: Phaser.GameObjects.Container | null = null;
  private draggedCardIndex = -1;

  // Prop match state
  private propDials: number[] = [];
  private propDialTexts: Phaser.GameObjects.Text[] = [];

  // Maze state
  private currentMazeNode = '';
  private mazePath: string[] = [];
  private mazeGfx!: Phaser.GameObjects.Graphics;
  private mazeNodeObjects: Map<string, Phaser.GameObjects.Container> = new Map();

  // Chemistry state
  private chemStep = 0;

  constructor() {
    super({ key: 'PuzzleScene' });
  }

  init(data: { puzzleId: string; onSolved?: () => void }): void {
    this.puzzleId = data.puzzleId;
    this.onSolvedCallback = data.onSolved;
    this.dials = [];
    this.dialTexts = [];
    this.sequenceInput = [];
    this.sequenceButtons = [];
    this.textInput = '';
    this.cipherAnswer = [];
    this.channelSelections = [];
    this.channelLabels = [];
    this.revealedCells = [];
    this.revealProgress = 0;
    this.filmSlots = [];
    this.filmCards = [];
    this.draggedCard = null;
    this.draggedCardIndex = -1;
    this.propDials = [];
    this.propDialTexts = [];
    this.currentMazeNode = '';
    this.mazePath = [];
    this.mazeNodeObjects = new Map();
    this.chemStep = 0;
  }

  create(): void {
    const puzzle = PuzzleSystem.getInstance().getPuzzle(this.puzzleId);
    if (!puzzle) { this.closePuzzle(); return; }
    if (PuzzleSystem.getInstance().isSolved(this.puzzleId)) { this.closePuzzle(); return; }

    const { width, height } = this.cameras.main;
    initSceneCursor(this);

    // Dark overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.overlay.setInteractive();
    this.overlay.setDepth(Depths.puzzleOverlay);

    // Panel sizing
    this.panelW = Math.min(width * 0.88, 1050);
    this.panelH = Math.min(height * 0.82, 820);
    this.panel = this.add.container(width / 2, height / 2);
    this.panel.setDepth(Depths.puzzleContent);

    const bg = this.add.rectangle(0, 0, this.panelW, this.panelH, Colors.panelBg, 0.97);
    bg.setStrokeStyle(2, Colors.gold, 0.8);
    this.panel.add(bg);

    // Title
    const title = this.add.text(0, -this.panelH / 2 + 40, puzzle.name, {
      fontFamily: FONT, fontSize: '30px', color: TextColors.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.add(title);

    // Description
    const desc = this.add.text(0, -this.panelH / 2 + 85, puzzle.description, {
      fontFamily: FONT, fontSize: '19px', color: TextColors.light,
      wordWrap: { width: this.panelW - 80 }, lineSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0);
    this.panel.add(desc);

    // Feedback text
    this.feedbackText = this.add.text(0, this.panelH / 2 - 95, '', {
      fontFamily: FONT, fontSize: '20px', color: '#ff6b6b', align: 'center',
    }).setOrigin(0.5);
    this.panel.add(this.feedbackText);

    // Hint text
    this.hintText = this.add.text(0, this.panelH / 2 - 60, '', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim, fontStyle: 'italic',
      wordWrap: { width: this.panelW - 80 }, align: 'center',
    }).setOrigin(0.5);
    this.panel.add(this.hintText);

    // Close button
    const closeBtn = createCloseButton(this, this.panelW / 2 - 28, -this.panelH / 2 + 22, () => this.closePuzzle(), 55);
    this.panel.add(closeBtn);

    // Build UI based on type
    switch (puzzle.type) {
      case 'combination': this.buildCombinationUI(puzzle.answer); break;
      case 'cipher': this.buildCipherUI(puzzle); break;
      case 'lighting_board': this.buildLightingBoardUI(puzzle); break;
      case 'mirror_reveal': this.buildMirrorRevealUI(puzzle); break;
      case 'film_strip': this.buildFilmStripUI(puzzle); break;
      case 'prop_match': this.buildPropMatchUI(puzzle); break;
      case 'maze': this.buildMazeUI(puzzle); break;
      case 'chemistry': this.buildChemistryUI(puzzle); break;
      case 'sequence': this.buildSequenceUI(puzzle.answer); break;
      case 'logic': case 'code': default: this.buildTextInputUI(); break;
    }

    // Fade in
    this.panel.setAlpha(0);
    this.tweens.add({ targets: this.panel, alpha: 1, duration: 250 });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMBINATION LOCK (trunk, office safe)
  // ═══════════════════════════════════════════════════════════════════════

  private buildCombinationUI(answer: string): void {
    const parts = answer.split('-');
    this.dialCount = parts.length;
    this.dialSeparator = '-';
    this.dials = new Array(this.dialCount).fill(0);

    const dialSpacing = Math.min(120, (this.panelW - 120) / this.dialCount);
    const startX = -(this.dialCount - 1) * dialSpacing / 2;
    const dialY = 30;

    for (let i = 0; i < this.dialCount; i++) {
      const x = startX + i * dialSpacing;

      const upBtn = this.add.text(x, dialY - 70, '▲', {
        fontFamily: FONT, fontSize: '34px', color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      upBtn.on('pointerdown', () => this.changeDial(i, 1));
      upBtn.on('pointerover', () => upBtn.setColor('#ffffff'));
      upBtn.on('pointerout', () => upBtn.setColor(TextColors.gold));
      this.panel.add(upBtn);

      const dialBg = this.add.rectangle(x, dialY, 72, 78, Colors.sceneBg, 0.9);
      dialBg.setStrokeStyle(2, Colors.gold, 0.6);
      this.panel.add(dialBg);

      const dialText = this.add.text(x, dialY, '0', {
        fontFamily: FONT, fontSize: '44px', color: TextColors.light, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.panel.add(dialText);
      this.dialTexts.push(dialText);

      const downBtn = this.add.text(x, dialY + 70, '▼', {
        fontFamily: FONT, fontSize: '34px', color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      downBtn.on('pointerdown', () => this.changeDial(i, -1));
      downBtn.on('pointerover', () => downBtn.setColor('#ffffff'));
      downBtn.on('pointerout', () => downBtn.setColor(TextColors.gold));
      this.panel.add(downBtn);

      if (i < this.dialCount - 1) {
        const sep = this.add.text(x + dialSpacing / 2, dialY, '—', {
          fontFamily: FONT, fontSize: '34px', color: TextColors.goldDim,
        }).setOrigin(0.5);
        this.panel.add(sep);
      }
    }

    this.addSubmitButton(0, dialY + 140, () => {
      this.submitAnswer(this.dials.join(this.dialSeparator));
    });
  }

  private changeDial(index: number, direction: number): void {
    this.dials[index] = (this.dials[index] + direction + 100) % 100;
    this.dialTexts[index].setText(String(this.dials[index]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CIPHER — click red-circled letters in script to spell hidden word
  // ═══════════════════════════════════════════════════════════════════════

  private buildCipherUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const lines = (puzzle as any).scriptLines as { text: string; letters: { char: string; pos: number; circled: boolean }[] }[] | undefined;
    if (!lines) { this.buildTextInputUI(); return; }

    // Answer display
    this.cipherAnswer = [];
    this.cipherDisplay = this.add.text(0, -this.panelH / 2 + 155, 'Hidden word: _ _ _ _ _ _', {
      fontFamily: FONT, fontSize: '26px', color: TextColors.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.add(this.cipherDisplay);

    // Script lines with clickable letters
    const startY = -this.panelH / 2 + 210;
    const lineH = 65;

    lines.forEach((line, lineIdx) => {
      const y = startY + lineIdx * lineH;

      // Line number
      this.panel.add(this.add.text(-this.panelW / 2 + 40, y, `${lineIdx + 1}.`, {
        fontFamily: FONT, fontSize: '14px', color: TextColors.muted, fontStyle: 'italic',
      }));

      // Script text (dimmed)
      this.panel.add(this.add.text(-this.panelW / 2 + 65, y, line.text, {
        fontFamily: FONT, fontSize: '16px', color: TextColors.light,
        wordWrap: { width: this.panelW - 140 }, lineSpacing: 2,
      }));

      // Clickable letter circles
      line.letters.forEach(letter => {
        const lx = -this.panelW / 2 + 65 + letter.pos * 9.5;
        const ly = y + 32;

        const circleColor = letter.circled ? 0xcc3333 : 0x555555;
        const circle = this.add.circle(lx, ly, 16, circleColor, letter.circled ? 0.25 : 0.1);
        circle.setStrokeStyle(2, circleColor, letter.circled ? 0.8 : 0.3);
        circle.setInteractive({ cursor: POINTER_CURSOR });
        this.panel.add(circle);

        const charText = this.add.text(lx, ly, letter.char.toUpperCase(), {
          fontFamily: FONT, fontSize: '18px', color: letter.circled ? '#ff4444' : '#888888',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.panel.add(charText);

        circle.on('pointerdown', () => {
          if (letter.circled) {
            // Correct circled letter
            this.cipherAnswer.push(letter.char);
            circle.setFillStyle(0x44aa44, 0.4);
            circle.setStrokeStyle(2, 0x44aa44, 0.9);
            charText.setColor('#44ff44');
            circle.removeInteractive();
            this.updateCipherDisplay(puzzle.answer);
          } else {
            // Wrong letter — shake and flash red
            this.feedbackText.setText('That letter isn\'t circled in red.');
            this.feedbackText.setColor('#ff6b6b');
            this.tweens.add({ targets: circle, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true });
          }
        });
      });
    });

    // Reset button
    const resetBtn = this.add.text(0, this.panelH / 2 - 130, '↺ Reset', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    resetBtn.on('pointerdown', () => {
      this.cipherAnswer = [];
      this.updateCipherDisplay(puzzle.answer);
      // Rebuild scene to reset circle states
      this.scene.restart({ puzzleId: this.puzzleId, onSolved: this.onSolvedCallback });
    });
    this.panel.add(resetBtn);
  }

  private updateCipherDisplay(answer: string): void {
    const display = answer.split('').map((_, i) =>
      i < this.cipherAnswer.length ? this.cipherAnswer[i].toUpperCase() : '_'
    ).join(' ');
    this.cipherDisplay.setText(`Hidden word: ${display}`);

    // Auto-check when all letters selected
    if (this.cipherAnswer.length === answer.length) {
      const attempt = this.cipherAnswer.join('');
      this.submitAnswer(attempt);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  LIGHTING BOARD — set each channel to correct color
  // ═══════════════════════════════════════════════════════════════════════

  private buildLightingBoardUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const channels = (puzzle as any).channels as { label: string; correctColor: string; options: string[] }[] | undefined;
    if (!channels) { this.buildTextInputUI(); return; }

    this.channelSelections = channels.map(() => 'off');

    // Stage preview area (top)
    this.stagePreview = this.add.graphics();
    this.panel.add(this.stagePreview);
    this.drawStagePreview();

    // Channel controls
    const channelW = Math.min(200, (this.panelW - 60) / channels.length);
    const startX = -(channels.length - 1) * channelW / 2;
    const controlY = 80;

    channels.forEach((ch, i) => {
      const x = startX + i * channelW;

      // Channel label
      const label = this.add.text(x, controlY - 55, ch.label.replace(' — ', '\n'), {
        fontFamily: FONT, fontSize: '13px', color: TextColors.light,
        align: 'center', lineSpacing: 2,
      }).setOrigin(0.5);
      this.panel.add(label);

      // Color selector — cycle through options on click
      const selectorBg = this.add.rectangle(x, controlY + 15, channelW - 20, 50, 0x222233, 0.9);
      selectorBg.setStrokeStyle(2, Colors.gold, 0.5);
      selectorBg.setInteractive({ cursor: POINTER_CURSOR });
      this.panel.add(selectorBg);

      const selectorText = this.add.text(x, controlY + 15, 'OFF', {
        fontFamily: FONT, fontSize: '18px', color: '#888888', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.panel.add(selectorText);
      this.channelLabels.push(selectorText);

      // Arrow buttons for cycling
      const leftArrow = this.add.text(x - channelW / 2 + 18, controlY + 15, '◀', {
        fontFamily: FONT, fontSize: '20px', color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      leftArrow.on('pointerdown', () => this.cycleChannel(i, -1, ch.options));
      this.panel.add(leftArrow);

      const rightArrow = this.add.text(x + channelW / 2 - 18, controlY + 15, '▶', {
        fontFamily: FONT, fontSize: '20px', color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      rightArrow.on('pointerdown', () => this.cycleChannel(i, 1, ch.options));
      this.panel.add(rightArrow);

      // Intensity slider visual (decorative for now)
      const sliderTrack = this.add.rectangle(x, controlY + 60, channelW - 30, 8, 0x333344, 0.8);
      sliderTrack.setStrokeStyle(1, Colors.gold, 0.3);
      this.panel.add(sliderTrack);
    });

    this.addSubmitButton(0, controlY + 130, () => {
      const answer = this.channelSelections.join('-');
      this.submitAnswer(answer);
    });
  }

  private cycleChannel(index: number, direction: number, options: string[]): void {
    const current = options.indexOf(this.channelSelections[index]);
    const next = (current + direction + options.length) % options.length;
    this.channelSelections[index] = options[next];
    this.channelLabels[index].setText(options[next].toUpperCase());
    this.channelLabels[index].setColor(this.getLightColorHex(options[next]));
    this.drawStagePreview();
  }

  private drawStagePreview(): void {
    if (!this.stagePreview) return;
    this.stagePreview.clear();
    const previewY = -this.panelH / 2 + 170;
    const previewW = this.panelW - 100;
    const previewH = 120;

    // Stage floor
    this.stagePreview.fillStyle(0x1a1a2a, 0.8);
    this.stagePreview.fillRect(-previewW / 2, previewY, previewW, previewH);
    this.stagePreview.lineStyle(1, Colors.gold, 0.3);
    this.stagePreview.strokeRect(-previewW / 2, previewY, previewW, previewH);

    // Light beams from each channel
    const beamW = previewW / this.channelSelections.length;
    this.channelSelections.forEach((color, i) => {
      if (color === 'off') return;
      const cx = -previewW / 2 + i * beamW + beamW / 2;
      const lightColor = this.getLightColor(color);

      // Cone-shaped light beam
      this.stagePreview.fillStyle(lightColor, 0.25);
      this.stagePreview.fillTriangle(
        cx - 10, previewY,
        cx + 10, previewY,
        cx, previewY + previewH
      );
      this.stagePreview.fillStyle(lightColor, 0.15);
      this.stagePreview.fillTriangle(
        cx - 30, previewY,
        cx + 30, previewY,
        cx, previewY + previewH
      );
    });
  }

  private getLightColor(color: string): number {
    const map: Record<string, number> = { red: 0xff2222, blue: 0x4444ff, white: 0xffffff, amber: 0xffaa33 };
    return map[color] || 0x333333;
  }

  private getLightColorHex(color: string): string {
    const map: Record<string, string> = { red: '#ff4444', blue: '#6666ff', white: '#ffffff', amber: '#ffcc44', off: '#888888' };
    return map[color] || '#888888';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MIRROR REVEAL — drag magnifying glass to uncover hidden text
  // ═══════════════════════════════════════════════════════════════════════

  private buildMirrorRevealUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const message = (puzzle as any).mirrorMessage as string || '';

    const mirrorW = this.panelW - 100;
    const mirrorH = 200;
    const mirrorY = -20;

    // Mirror background (foggy)
    const mirrorBg = this.add.rectangle(0, mirrorY, mirrorW, mirrorH, 0x8899aa, 0.3);
    mirrorBg.setStrokeStyle(3, 0xc9a84c, 0.6);
    this.panel.add(mirrorBg);

    // Mirror decorative frame
    const frameBorder = this.add.rectangle(0, mirrorY, mirrorW + 12, mirrorH + 12, 0x000000, 0);
    frameBorder.setStrokeStyle(4, 0x8b6914, 0.7);
    this.panel.add(frameBorder);

    // Hidden text (initially invisible behind fog)
    this.mirrorTextObj = this.add.text(0, mirrorY, message, {
      fontFamily: '\'Palatino Linotype\', Georgia, serif',
      fontSize: '22px', color: '#cc3333', fontStyle: 'italic',
      wordWrap: { width: mirrorW - 60 }, lineSpacing: 8, align: 'center',
    }).setOrigin(0.5).setAlpha(0);
    this.panel.add(this.mirrorTextObj);

    // Fog overlay (graphics that get "wiped away")
    this.mirrorGfx = this.add.graphics();
    this.panel.add(this.mirrorGfx);

    // Initialize fog grid
    const cellSize = 30;
    const cols = Math.ceil(mirrorW / cellSize);
    const rows = Math.ceil(mirrorH / cellSize);
    this.revealedCells = Array.from({ length: rows }, () => Array(cols).fill(false));
    const totalCells = rows * cols;
    this.revealProgress = 0;

    this.drawFog(mirrorW, mirrorH, mirrorY, cellSize);

    // Interactive zone for dragging magnifying glass
    const interactZone = this.add.rectangle(0, mirrorY, mirrorW, mirrorH, 0x000000, 0);
    interactZone.setInteractive({ cursor: POINTER_CURSOR });
    this.panel.add(interactZone);

    // Magnifying glass cursor indicator
    const glassIcon = this.add.text(0, 0, '🔍', { fontSize: '36px' }).setOrigin(0.5).setVisible(false);
    this.panel.add(glassIcon);

    interactZone.on('pointerover', () => glassIcon.setVisible(true));
    interactZone.on('pointerout', () => glassIcon.setVisible(false));

    interactZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) {
        glassIcon.setPosition(pointer.x - this.panel.x, pointer.y - this.panel.y);
        return;
      }

      const localX = pointer.x - this.panel.x;
      const localY = pointer.y - this.panel.y;
      glassIcon.setPosition(localX, localY);

      // Reveal cells near the pointer
      const gridX = localX + mirrorW / 2;
      const gridY = localY - mirrorY + mirrorH / 2;
      const revealRadius = 2; // cells

      for (let dy = -revealRadius; dy <= revealRadius; dy++) {
        for (let dx = -revealRadius; dx <= revealRadius; dx++) {
          const col = Math.floor(gridX / cellSize) + dx;
          const row = Math.floor(gridY / cellSize) + dy;
          if (row >= 0 && row < rows && col >= 0 && col < cols && !this.revealedCells[row][col]) {
            this.revealedCells[row][col] = true;
            this.revealProgress++;
          }
        }
      }

      this.drawFog(mirrorW, mirrorH, mirrorY, cellSize);

      // Gradually reveal text
      const pct = this.revealProgress / totalCells;
      this.mirrorTextObj.setAlpha(Math.min(1, pct * 1.5));

      // Auto-solve when enough is revealed
      if (pct > 0.55) {
        this.mirrorTextObj.setAlpha(1);
        interactZone.removeInteractive();
        glassIcon.setVisible(false);

        // Show the answer prompt
        this.feedbackText.setColor('#4ade80');
        this.feedbackText.setText('The message is revealed! Who did Margaux accuse?');

        // Add initials input
        this.time.delayedCall(500, () => this.addMirrorAnswerInput());
      }
    });

    // Instructions
    this.panel.add(this.add.text(0, mirrorY + mirrorH / 2 + 35, 'Click and drag across the mirror to wipe away the fog', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.muted, fontStyle: 'italic',
    }).setOrigin(0.5));
  }

  private drawFog(mirrorW: number, mirrorH: number, mirrorY: number, cellSize: number): void {
    this.mirrorGfx.clear();
    const startX = -mirrorW / 2;
    const startY = mirrorY - mirrorH / 2;

    for (let row = 0; row < this.revealedCells.length; row++) {
      for (let col = 0; col < this.revealedCells[row].length; col++) {
        if (!this.revealedCells[row][col]) {
          this.mirrorGfx.fillStyle(0x667788, 0.7 + Math.random() * 0.15);
          this.mirrorGfx.fillRect(startX + col * cellSize, startY + row * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  private addMirrorAnswerInput(): void {
    const inputBg = this.add.rectangle(0, this.panelH / 2 - 155, 200, 50, Colors.sceneBg, 0.9);
    inputBg.setStrokeStyle(2, Colors.gold, 0.6);
    this.panel.add(inputBg);

    this.textDisplay = this.add.text(0, this.panelH / 2 - 155, '|', {
      fontFamily: FONT, fontSize: '28px', color: TextColors.light,
    }).setOrigin(0.5);
    this.panel.add(this.textDisplay);

    this.textInput = '';
    this.cursorBlink = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        const cursor = this.textDisplay.text.endsWith('|') ? '' : '|';
        this.textDisplay.setText(this.textInput + cursor);
      },
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Backspace') this.textInput = this.textInput.slice(0, -1);
      else if (event.key === 'Enter') { this.submitAnswer(this.textInput); return; }
      else if (event.key.length === 1 && this.textInput.length < 10) this.textInput += event.key;
      this.textDisplay.setText(this.textInput + '|');
    });

    this.addSubmitButton(0, this.panelH / 2 - 95, () => this.submitAnswer(this.textInput));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  FILM STRIP — drag frames onto light table slots
  // ═══════════════════════════════════════════════════════════════════════

  private buildFilmStripUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const frames = (puzzle as any).frames as { id: string; label: string; description: string; icon: string }[] | undefined;
    if (!frames) { this.buildTextInputUI(); return; }

    // Light table slots (top)
    const slotW = 160;
    const slotH = 140;
    const slotY = -40;
    const slotSpacing = slotW + 20;
    const slotStartX = -(frames.length - 1) * slotSpacing / 2;

    this.filmSlots = new Array(frames.length).fill(null);

    const slotContainers: Phaser.GameObjects.Container[] = [];
    frames.forEach((_, i) => {
      const x = slotStartX + i * slotSpacing;
      const slot = this.add.container(x, slotY);

      const slotBg = this.add.rectangle(0, 0, slotW, slotH, 0x111122, 0.8);
      slotBg.setStrokeStyle(2, Colors.gold, 0.4);
      slot.add(slotBg);

      const slotNum = this.add.text(0, -slotH / 2 + 18, `Frame ${i + 1}`, {
        fontFamily: FONT, fontSize: '14px', color: TextColors.goldDim,
      }).setOrigin(0.5);
      slot.add(slotNum);

      // Slot highlight
      const slotLabel = this.add.text(0, 10, '?', {
        fontFamily: FONT, fontSize: '36px', color: TextColors.muted,
      }).setOrigin(0.5);
      slot.add(slotLabel);

      this.panel.add(slot);
      slotContainers.push(slot);
    });

    // Draggable frame cards (bottom, shuffled)
    const cardY = slotY + slotH / 2 + 100;
    const shuffled = [...frames].sort(() => Math.random() - 0.5);

    shuffled.forEach((frame, i) => {
      const x = slotStartX + i * slotSpacing;
      const card = this.add.container(x, cardY);
      card.setData('frameId', frame.id);
      card.setData('originalX', x);
      card.setData('originalY', cardY);

      const cardBg = this.add.rectangle(0, 0, slotW - 10, slotH - 10, 0x2a2a3a, 0.95);
      cardBg.setStrokeStyle(2, Colors.gold, 0.6);
      cardBg.setInteractive({ cursor: POINTER_CURSOR, draggable: true });
      card.add(cardBg);

      // Film sprocket holes on sides
      const sprocketGfx = this.add.graphics();
      for (let s = -3; s <= 3; s++) {
        sprocketGfx.fillStyle(0x000000, 0.5);
        sprocketGfx.fillRect(-slotW / 2 + 6, s * 16, 8, 8);
        sprocketGfx.fillRect(slotW / 2 - 22, s * 16, 8, 8);
      }
      card.add(sprocketGfx);

      const icon = this.add.text(0, -15, frame.icon, { fontSize: '36px' }).setOrigin(0.5);
      card.add(icon);

      const label = this.add.text(0, 25, frame.label, {
        fontFamily: FONT, fontSize: '14px', color: TextColors.light,
        align: 'center', wordWrap: { width: slotW - 30 },
      }).setOrigin(0.5);
      card.add(label);

      this.panel.add(card);
      this.filmCards.push(card);

      // Drag handlers
      cardBg.on('dragstart', () => {
        card.setDepth(10);
        this.draggedCard = card;
      });

      cardBg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        card.setPosition(dragX - this.panel.x, dragY - this.panel.y);
      });

      cardBg.on('dragend', () => {
        card.setDepth(0);
        this.draggedCard = null;

        // Check if dropped on a slot
        let placed = false;
        slotContainers.forEach((slot, slotIdx) => {
          const dist = Phaser.Math.Distance.Between(card.x, card.y, slot.x, slot.y);
          if (dist < 80 && this.filmSlots[slotIdx] === null) {
            // Snap to slot
            this.filmSlots[slotIdx] = card.getData('frameId');
            card.setPosition(slot.x, slot.y);
            card.setData('slotIndex', slotIdx);
            placed = true;

            // Check if all slots filled
            if (!this.filmSlots.includes(null)) {
              const answer = this.filmSlots.join('-');
              this.submitAnswer(answer);
            }
          }
        });

        if (!placed) {
          // Check if was in a slot — free it
          const prevSlot = card.getData('slotIndex');
          if (prevSlot !== undefined && prevSlot >= 0) {
            this.filmSlots[prevSlot] = null;
            card.setData('slotIndex', -1);
          }
          // Snap back to original position
          card.setPosition(card.getData('originalX'), card.getData('originalY'));
        }
      });

      this.input.setDraggable(cardBg);
    });

    // Clear all button
    const clearBtn = this.add.text(0, this.panelH / 2 - 130, '↺ Clear All', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    clearBtn.on('pointerdown', () => {
      this.filmSlots.fill(null);
      this.filmCards.forEach(card => {
        card.setPosition(card.getData('originalX'), card.getData('originalY'));
        card.setData('slotIndex', -1);
      });
    });
    this.panel.add(clearBtn);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PROP MATCH — rotate symbol dials to match pattern
  // ═══════════════════════════════════════════════════════════════════════

  private buildPropMatchUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const symbols = (puzzle as any).symbols as string[] | undefined;
    const correct = (puzzle as any).correctSymbols as string[] | undefined;
    const icons = (puzzle as any).symbolIcons as Record<string, string> | undefined;
    if (!symbols || !correct || !icons) { this.buildTextInputUI(); return; }

    this.propDials = new Array(correct.length).fill(0);
    this.propDialTexts = [];

    const dialSpacing = Math.min(180, (this.panelW - 60) / correct.length);
    const startX = -(correct.length - 1) * dialSpacing / 2;
    const dialY = 20;

    // Lock plate reference (the target symbols — shown as silhouettes)
    this.panel.add(this.add.text(0, dialY - 120, 'Match the symbols on the lock plate:', {
      fontFamily: FONT, fontSize: '17px', color: TextColors.muted, fontStyle: 'italic',
    }).setOrigin(0.5));

    // Target symbol silhouettes
    correct.forEach((sym, i) => {
      const x = startX + i * dialSpacing;
      const targetBg = this.add.rectangle(x, dialY - 80, 55, 55, 0x111122, 0.8);
      targetBg.setStrokeStyle(1, Colors.gold, 0.3);
      this.panel.add(targetBg);

      this.panel.add(this.add.text(x, dialY - 80, '?', {
        fontFamily: FONT, fontSize: '28px', color: TextColors.goldDim,
      }).setOrigin(0.5));
    });

    // Rotating dials
    correct.forEach((_, i) => {
      const x = startX + i * dialSpacing;

      // Up arrow
      const upBtn = this.add.text(x, dialY - 30, '▲', {
        fontFamily: FONT, fontSize: '28px', color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      upBtn.on('pointerdown', () => this.cyclePropDial(i, 1, symbols, icons));
      this.panel.add(upBtn);

      // Dial display
      const dialBg = this.add.rectangle(x, dialY + 20, 80, 80, Colors.sceneBg, 0.9);
      dialBg.setStrokeStyle(2, Colors.gold, 0.6);
      this.panel.add(dialBg);

      const dialIcon = this.add.text(x, dialY + 10, icons[symbols[0]] || '?', { fontSize: '36px' }).setOrigin(0.5);
      this.panel.add(dialIcon);

      const dialLabel = this.add.text(x, dialY + 45, symbols[0], {
        fontFamily: FONT, fontSize: '12px', color: TextColors.muted,
      }).setOrigin(0.5);
      this.panel.add(dialLabel);

      this.propDialTexts.push(dialIcon);

      // Down arrow
      const downBtn = this.add.text(x, dialY + 70, '▼', {
        fontFamily: FONT, fontSize: '28px', color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      downBtn.on('pointerdown', () => this.cyclePropDial(i, -1, symbols, icons));
      this.panel.add(downBtn);

      // Store label ref for updating
      dialIcon.setData('labelRef', dialLabel);
    });

    this.addSubmitButton(0, dialY + 140, () => {
      const answer = this.propDials.map(d => symbols[d]).join('-');
      this.submitAnswer(answer);
    });
  }

  private cyclePropDial(index: number, direction: number, symbols: string[], icons: Record<string, string>): void {
    this.propDials[index] = (this.propDials[index] + direction + symbols.length) % symbols.length;
    const sym = symbols[this.propDials[index]];
    this.propDialTexts[index].setText(icons[sym] || '?');
    const label = this.propDialTexts[index].getData('labelRef') as Phaser.GameObjects.Text;
    if (label) label.setText(sym);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MAZE — navigate hidden passages from basement to dressing room
  // ═══════════════════════════════════════════════════════════════════════

  private buildMazeUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const nodes = (puzzle as any).mazeNodes as { id: string; label: string; x: number; y: number; connections: string[]; deadEnd?: boolean; goal?: boolean }[] | undefined;
    if (!nodes) { this.buildTextInputUI(); return; }

    const mapW = this.panelW - 80;
    const mapH = this.panelH - 260;
    const mapX = -mapW / 2;
    const mapY = -mapH / 2 + 30;

    // Blueprint background
    const blueprintBg = this.add.rectangle(0, mapY + mapH / 2, mapW, mapH, 0x0a1a3a, 0.9);
    blueprintBg.setStrokeStyle(2, 0x3a6aaa, 0.5);
    this.panel.add(blueprintBg);

    // Grid lines (blueprint style)
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(0.5, 0x2a4a7a, 0.15);
    for (let gx = mapX; gx <= mapX + mapW; gx += 40) {
      gridGfx.lineBetween(gx, mapY, gx, mapY + mapH);
    }
    for (let gy = mapY; gy <= mapY + mapH; gy += 40) {
      gridGfx.lineBetween(mapX, gy, mapX + mapW, gy);
    }
    this.panel.add(gridGfx);

    // Draw passage connections
    this.mazeGfx = this.add.graphics();
    this.panel.add(this.mazeGfx);

    const nodePositions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      nodePositions.set(node.id, {
        x: mapX + node.x * mapW,
        y: mapY + node.y * mapH,
      });
    });

    // Draw connections
    this.mazeGfx.lineStyle(3, 0x4a7aaa, 0.4);
    nodes.forEach(node => {
      const pos = nodePositions.get(node.id)!;
      node.connections.forEach(connId => {
        const connPos = nodePositions.get(connId);
        if (connPos) {
          this.mazeGfx.lineBetween(pos.x, pos.y, connPos.x, connPos.y);
        }
      });
    });

    // Create clickable nodes
    this.currentMazeNode = 'basement';
    this.mazePath = ['basement'];

    nodes.forEach(node => {
      const pos = nodePositions.get(node.id)!;
      const nodeContainer = this.add.container(pos.x, pos.y);

      const isStart = node.id === 'basement';
      const isGoal = node.goal;
      const nodeColor = isStart ? 0x44aa44 : (isGoal ? 0xffd700 : (node.deadEnd ? 0xaa4444 : 0x4a7aaa));

      const nodeBg = this.add.circle(0, 0, 22, nodeColor, 0.6);
      nodeBg.setStrokeStyle(2, nodeColor, 1);
      nodeBg.setInteractive({ cursor: POINTER_CURSOR });
      nodeContainer.add(nodeBg);

      const nodeLabel = this.add.text(0, 30, node.label, {
        fontFamily: FONT, fontSize: '12px', color: '#88aacc',
        align: 'center',
      }).setOrigin(0.5);
      nodeContainer.add(nodeLabel);

      if (isStart) {
        nodeContainer.add(this.add.text(0, 0, '▼', {
          fontFamily: FONT, fontSize: '16px', color: '#ffffff',
        }).setOrigin(0.5));
      }
      if (isGoal) {
        nodeContainer.add(this.add.text(0, 0, '★', {
          fontFamily: FONT, fontSize: '16px', color: '#ffffff',
        }).setOrigin(0.5));
      }

      nodeBg.on('pointerdown', () => {
        this.handleMazeNodeClick(node, nodes);
      });

      this.mazeNodeObjects.set(node.id, nodeContainer);
      this.panel.add(nodeContainer);
    });

    this.updateMazeHighlight(nodes);

    // Back button
    const backBtn = this.add.text(-80, this.panelH / 2 - 130, '← Go Back', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    backBtn.on('pointerdown', () => {
      if (this.mazePath.length > 1) {
        this.mazePath.pop();
        this.currentMazeNode = this.mazePath[this.mazePath.length - 1];
        this.updateMazeHighlight(nodes);
        this.feedbackText.setText('');
      }
    });
    this.panel.add(backBtn);

    // Restart button
    const restartBtn = this.add.text(80, this.panelH / 2 - 130, '↺ Restart', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    restartBtn.on('pointerdown', () => {
      this.currentMazeNode = 'basement';
      this.mazePath = ['basement'];
      this.updateMazeHighlight(nodes);
      this.feedbackText.setText('');
    });
    this.panel.add(restartBtn);
  }

  private handleMazeNodeClick(node: { id: string; label: string; connections: string[]; deadEnd?: boolean; goal?: boolean }, allNodes: any[]): void {
    const currentNode = allNodes.find((n: any) => n.id === this.currentMazeNode);
    if (!currentNode) return;

    // Can only click connected nodes
    if (!currentNode.connections.includes(node.id)) {
      this.feedbackText.setText('No passage connects there from here.');
      this.feedbackText.setColor('#ff6b6b');
      return;
    }

    if (node.deadEnd) {
      this.feedbackText.setText(`Dead end — ${node.label}! Go back.`);
      this.feedbackText.setColor('#ff6b6b');
      this.tweens.add({ targets: this.panel, x: this.panel.x - 5, duration: 50, yoyo: true, repeat: 3 });
      return;
    }

    // Move to node
    this.currentMazeNode = node.id;
    this.mazePath.push(node.id);
    this.updateMazeHighlight(allNodes);

    if (node.goal) {
      this.feedbackText.setText('');
      this.submitAnswer(node.label.toLowerCase());
    }
  }

  private updateMazeHighlight(nodes: any[]): void {
    const currentNode = nodes.find((n: any) => n.id === this.currentMazeNode);

    // Redraw path
    this.mazeGfx.clear();

    // All connections (dim)
    this.mazeGfx.lineStyle(3, 0x4a7aaa, 0.25);
    nodes.forEach((node: any) => {
      node.connections.forEach((connId: string) => {
        const fromNode = this.mazeNodeObjects.get(node.id);
        const toNode = this.mazeNodeObjects.get(connId);
        if (fromNode && toNode) {
          this.mazeGfx.lineBetween(fromNode.x, fromNode.y, toNode.x, toNode.y);
        }
      });
    });

    // Traveled path (bright)
    this.mazeGfx.lineStyle(4, 0x44ff44, 0.6);
    for (let i = 1; i < this.mazePath.length; i++) {
      const from = this.mazeNodeObjects.get(this.mazePath[i - 1]);
      const to = this.mazeNodeObjects.get(this.mazePath[i]);
      if (from && to) {
        this.mazeGfx.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    // Highlight accessible nodes
    this.mazeNodeObjects.forEach((container, id) => {
      const circle = container.getAt(0) as Phaser.GameObjects.Arc;
      if (id === this.currentMazeNode) {
        circle.setAlpha(1);
        circle.setStrokeStyle(3, 0x44ff44, 1);
      } else if (currentNode?.connections.includes(id)) {
        circle.setAlpha(0.9);
        circle.setStrokeStyle(2, 0xffffff, 0.7);
      } else {
        circle.setAlpha(0.4);
        circle.setStrokeStyle(1, 0x4a7aaa, 0.3);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CHEMISTRY — multi-step reagent analysis
  // ═══════════════════════════════════════════════════════════════════════

  private buildChemistryUI(puzzle: ReturnType<PuzzleSystem['getPuzzle']>): void {
    if (!puzzle) return;
    const steps = (puzzle as any).steps as { instruction: string; options: string[]; correct: number; result: string }[] | undefined;
    if (!steps) { this.buildTextInputUI(); return; }

    this.chemStep = 0;
    this.showChemistryStep(steps);
  }

  private showChemistryStep(steps: { instruction: string; options: string[]; correct: number; result: string }[]): void {
    // Clear previous step content (keep base panel elements = first 7)
    while (this.panel.length > 7) {
      this.panel.removeAt(7, true);
    }

    if (this.chemStep >= steps.length) {
      // All steps complete — puzzle solved
      this.submitAnswer('antimony');
      return;
    }

    const step = steps[this.chemStep];

    // Test tube / beaker visual
    const beakerY = -30;
    const beakerGfx = this.add.graphics();
    // Beaker outline
    beakerGfx.lineStyle(3, 0xaaccff, 0.6);
    beakerGfx.beginPath();
    beakerGfx.moveTo(-30, beakerY - 60);
    beakerGfx.lineTo(-30, beakerY + 40);
    beakerGfx.lineTo(-45, beakerY + 60);
    beakerGfx.lineTo(45, beakerY + 60);
    beakerGfx.lineTo(30, beakerY + 40);
    beakerGfx.lineTo(30, beakerY - 60);
    beakerGfx.strokePath();

    // Liquid fill (color based on step progress)
    const fillColors = [0x8899aa, 0xeeeeee, 0xff6633];
    const fillColor = this.chemStep > 0 ? fillColors[Math.min(this.chemStep, fillColors.length - 1)] : 0x8899aa;
    beakerGfx.fillStyle(fillColor, 0.4);
    beakerGfx.fillRect(-28, beakerY, 56, 100);

    this.panel.add(beakerGfx);

    // Step progress
    const progressText = this.add.text(0, beakerY - 90, `Step ${this.chemStep + 1} of ${steps.length}`, {
      fontFamily: FONT, fontSize: '16px', color: TextColors.goldDim,
    }).setOrigin(0.5);
    this.panel.add(progressText);

    // Previous step result (if not first step)
    if (this.chemStep > 0) {
      const prevResult = this.add.text(0, beakerY - 110, steps[this.chemStep - 1].result, {
        fontFamily: FONT, fontSize: '15px', color: '#4ade80', fontStyle: 'italic',
        wordWrap: { width: this.panelW - 100 }, align: 'center',
      }).setOrigin(0.5);
      this.panel.add(prevResult);
    }

    // Instruction
    const instruction = this.add.text(0, beakerY + 90, step.instruction, {
      fontFamily: FONT, fontSize: '19px', color: TextColors.light,
      wordWrap: { width: this.panelW - 80 }, align: 'center',
    }).setOrigin(0.5);
    this.panel.add(instruction);

    // Option buttons
    const optionStartY = beakerY + 150;
    const optionH = 50;
    const optionW = Math.min(400, this.panelW - 100);

    step.options.forEach((option, i) => {
      const y = optionStartY + i * (optionH + 10);

      const optBg = this.add.rectangle(0, y, optionW, optionH, 0x1a1a2e, 0.9);
      optBg.setStrokeStyle(1.5, Colors.gold, 0.4);
      optBg.setInteractive({ cursor: POINTER_CURSOR });
      this.panel.add(optBg);

      const optText = this.add.text(0, y, option, {
        fontFamily: FONT, fontSize: '17px', color: TextColors.light, align: 'center',
      }).setOrigin(0.5);
      this.panel.add(optText);

      optBg.on('pointerover', () => optBg.setStrokeStyle(2, Colors.gold, 0.8));
      optBg.on('pointerout', () => optBg.setStrokeStyle(1.5, Colors.gold, 0.4));

      optBg.on('pointerdown', () => {
        if (i === step.correct) {
          // Correct choice
          optBg.setFillStyle(0x1a3a1a, 0.9);
          optBg.setStrokeStyle(2, 0x44aa44, 0.8);
          optText.setColor('#4ade80');

          this.feedbackText.setText(step.result);
          this.feedbackText.setColor('#4ade80');

          this.time.delayedCall(1200, () => {
            this.chemStep++;
            this.feedbackText.setText('');
            this.showChemistryStep(steps);
          });
        } else {
          // Wrong choice
          optBg.setFillStyle(0x3a1a1a, 0.9);
          optText.setColor('#ff6b6b');
          this.feedbackText.setText('Not quite — try again.');
          this.feedbackText.setColor('#ff6b6b');

          // Record attempt for hints
          PuzzleSystem.getInstance().checkAnswer(this.puzzleId, 'wrong');
          const hint = PuzzleSystem.getInstance().getHint(this.puzzleId);
          if (hint) this.hintText.setText(`Hint: ${hint}`);

          this.tweens.add({
            targets: optBg,
            alpha: 0.5, duration: 200,
            onComplete: () => {
              optBg.setFillStyle(0x1a1a2e, 0.9);
              optText.setColor(TextColors.light);
              optBg.setAlpha(1);
            },
          });
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SEQUENCE (for evidence board fallback) & TEXT INPUT (legacy)
  // ═══════════════════════════════════════════════════════════════════════

  private buildSequenceUI(answer: string): void {
    const steps = answer.split('-');
    const uniqueOptions = [...new Set(steps)];

    this.sequenceDisplay = this.add.text(0, 20, 'Sequence: (none)', {
      fontFamily: FONT, fontSize: '22px', color: TextColors.light,
    }).setOrigin(0.5);
    this.panel.add(this.sequenceDisplay);

    const btnSpacing = Math.min(160, (this.panelW - 60) / uniqueOptions.length);
    const startX = -(uniqueOptions.length - 1) * btnSpacing / 2;
    const btnY = 100;

    uniqueOptions.forEach((option, i) => {
      const x = startX + i * btnSpacing;
      const btnContainer = this.add.container(x, btnY);

      const color = this.getSequenceColor(option);
      const btnBg = this.add.rectangle(0, 0, btnSpacing - 10, 65, color, 0.7);
      btnBg.setStrokeStyle(2, Colors.gold, 0.6);
      btnBg.setInteractive({ cursor: POINTER_CURSOR });

      const btnText = this.add.text(0, 0, option.toUpperCase(), {
        fontFamily: FONT, fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      btnContainer.add([btnBg, btnText]);
      this.panel.add(btnContainer);

      btnBg.on('pointerdown', () => {
        this.sequenceInput.push(option);
        this.updateSequenceDisplay();
        this.tweens.add({ targets: btnBg, alpha: 0.3, duration: 100, yoyo: true });
      });
    });

    const clearBtn = this.add.text(-60, btnY + 70, 'Clear', {
      fontFamily: FONT, fontSize: '19px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    clearBtn.on('pointerdown', () => { this.sequenceInput = []; this.updateSequenceDisplay(); });
    this.panel.add(clearBtn);

    this.addSubmitButton(60, btnY + 70, () => this.submitAnswer(this.sequenceInput.join('-')));
  }

  private buildTextInputUI(): void {
    const inputBg = this.add.rectangle(0, 40, 420, 65, Colors.sceneBg, 0.9);
    inputBg.setStrokeStyle(2, Colors.gold, 0.6);
    this.panel.add(inputBg);

    this.textDisplay = this.add.text(0, 40, '|', {
      fontFamily: FONT, fontSize: '30px', color: TextColors.light,
    }).setOrigin(0.5);
    this.panel.add(this.textDisplay);

    this.cursorBlink = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        const cursor = this.textDisplay.text.endsWith('|') ? '' : '|';
        this.textDisplay.setText(this.textInput + cursor);
      },
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Backspace') this.textInput = this.textInput.slice(0, -1);
      else if (event.key === 'Enter') { this.submitAnswer(this.textInput); return; }
      else if (event.key.length === 1 && this.textInput.length < 30) this.textInput += event.key;
      this.textDisplay.setText(this.textInput + '|');
    });

    const letters = 'abcdefghijklmnopqrstuvwxyz0123456789 ';
    const cols = 10;
    const keySize = 40;
    const keySpacing = 43;
    const startX = -(cols - 1) * keySpacing / 2;
    const startY = 110;

    letters.split('').forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * keySpacing;
      const y = startY + row * (keySize + 8);

      const keyBg = this.add.rectangle(x, y, keySize, keySize, Colors.sceneBg, 0.8);
      keyBg.setStrokeStyle(1, Colors.gold, 0.4);
      keyBg.setInteractive({ cursor: POINTER_CURSOR });

      const keyText = this.add.text(x, y, char === ' ' ? '␣' : char, {
        fontFamily: FONT, fontSize: '20px', color: TextColors.gold,
      }).setOrigin(0.5);

      keyBg.on('pointerdown', () => {
        if (this.textInput.length < 30) {
          this.textInput += char;
          this.textDisplay.setText(this.textInput + '|');
        }
      });
      keyBg.on('pointerover', () => keyBg.setFillStyle(Colors.hoverBg));
      keyBg.on('pointerout', () => keyBg.setFillStyle(Colors.sceneBg, 0.8));

      this.panel.add([keyBg, keyText]);
    });

    const bksX = startX + cols * keySpacing / 2 + 55;
    const bksY = startY + 3 * (keySize + 8);
    const bksBg = this.add.rectangle(bksX, bksY, 70, keySize, Colors.sceneBg, 0.8);
    bksBg.setStrokeStyle(1, Colors.gold, 0.4);
    bksBg.setInteractive({ cursor: POINTER_CURSOR });
    this.panel.add(bksBg);
    const bksText = this.add.text(bksX, bksY, '⌫', { fontSize: '22px', color: TextColors.gold }).setOrigin(0.5);
    bksBg.on('pointerdown', () => { this.textInput = this.textInput.slice(0, -1); this.textDisplay.setText(this.textInput + '|'); });
    this.panel.add(bksText);

    this.addSubmitButton(0, startY + 4 * (keySize + 8) + 12, () => this.submitAnswer(this.textInput));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private addSubmitButton(x: number, y: number, onClick: () => void): void {
    const btnBg = this.add.rectangle(x, y, 200, 58, Colors.gold, 0.2);
    btnBg.setStrokeStyle(2, Colors.gold, 0.7);
    btnBg.setInteractive({ cursor: POINTER_CURSOR });

    const btnText = this.add.text(x, y, 'Submit', {
      fontFamily: FONT, fontSize: '24px', color: TextColors.gold, fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(Colors.gold, 0.35));
    btnBg.on('pointerout', () => btnBg.setFillStyle(Colors.gold, 0.2));
    btnBg.on('pointerdown', onClick);

    this.panel.add([btnBg, btnText]);
  }

  private updateSequenceDisplay(): void {
    if (this.sequenceInput.length === 0) {
      this.sequenceDisplay.setText('Sequence: (none)');
    } else {
      this.sequenceDisplay.setText('Sequence: ' + this.sequenceInput.join(' → '));
    }
  }

  private getSequenceColor(option: string): number {
    const colors: Record<string, number> = {
      red: 0x8b0000, blue: 0x00008b, white: 0x666666, green: 0x006400,
      toast: 0x8b6914, drink: 0x4a6741, collapse: 0x8b0000, understudy: 0x4a4a8b,
      cecilia: 0x6b3a5a, goblet: 0x8b6914, margaux: 0x8b0000,
      edwin: 0x3a5a6b, ghost: 0x666688, ashworth: 0x5a3a2a,
    };
    return colors[option.toLowerCase()] || 0x3a3a5a;
  }

  private submitAnswer(answer: string): void {
    const puzzleSystem = PuzzleSystem.getInstance();
    const correct = puzzleSystem.checkAnswer(this.puzzleId, answer);

    if (correct) {
      UISounds.puzzleSolve();
      this.feedbackText.setColor('#4ade80');
      this.feedbackText.setText('Correct!');
      this.hintText.setText('');

      const puzzle = puzzleSystem.getPuzzle(this.puzzleId);
      if (puzzle?.unlocks) {
        const save = SaveSystem.getInstance();
        save.setFlag(puzzle.unlocks, true);

        const item = (itemsData.items as Array<{ id: string; name: string }>).find(
          i => i.id === puzzle.unlocks
        );
        if (item) {
          InventorySystem.getInstance().addItem(item.id);
          this.feedbackText.setText(`Correct! Found: ${item.name}`);
        }
      }

      if (puzzle) {
        SaveSystem.getInstance().addJournalEntry(
          `Solved "${puzzle.name}" — ${puzzle.unlocks === 'case_closed' ? 'the full timeline is clear now.' : 'this reveals new evidence.'}`
        );
      }

      this.time.delayedCall(1500, () => {
        if (this.onSolvedCallback) this.onSolvedCallback();
        this.closePuzzle();
      });
    } else {
      UISounds.wrongAnswer();
      this.feedbackText.setColor('#ff6b6b');
      this.feedbackText.setText('That\'s not right...');

      const hint = puzzleSystem.getHint(this.puzzleId);
      if (hint) this.hintText.setText(`Hint: ${hint}`);

      this.tweens.add({
        targets: this.panel,
        x: this.panel.x - 5,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
    }
  }

  private closePuzzle(): void {
    if (this.cursorBlink) {
      this.cursorBlink.remove();
      this.cursorBlink = undefined;
    }
    this.input.keyboard?.removeAllListeners('keydown');
    this.scene.stop();
  }

  shutdown(): void {
    if (this.cursorBlink) {
      this.cursorBlink.remove();
      this.cursorBlink = undefined;
    }
    this.input.keyboard?.removeAllListeners('keydown');
  }
}
