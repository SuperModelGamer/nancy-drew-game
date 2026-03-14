import Phaser from 'phaser';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { POINTER_CURSOR, HAND_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';

export class PuzzleScene extends Phaser.Scene {
  private puzzleId!: string;
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Container;
  private feedbackText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private onSolvedCallback?: () => void;

  // Combination puzzle state
  private dials: number[] = [];
  private dialTexts: Phaser.GameObjects.Text[] = [];
  private dialCount = 3;
  private dialSeparator = '-';

  // Sequence puzzle state
  private sequenceInput: string[] = [];
  private sequenceButtons: Phaser.GameObjects.Container[] = [];
  private sequenceDisplay!: Phaser.GameObjects.Text;

  // Text input state
  private textInput = '';
  private textDisplay!: Phaser.GameObjects.Text;
  private cursorBlink?: Phaser.Time.TimerEvent;

  // Mirror reveal state
  private mirrorRevealed: boolean[][] = [];
  private mirrorTotalCells = 0;
  private mirrorRevealedCount = 0;

  // Cipher state
  private cipherSelected: string[] = [];

  // Lighting board state
  private lightingSequence: string[] = [];

  // Film assembly state
  private filmSlots: (string | null)[] = [];
  private filmFrameContainers: Phaser.GameObjects.Container[] = [];

  // Symbol match state
  private symbolWheelIndices: number[] = [];
  private symbolWheelTexts: Phaser.GameObjects.Text[] = [];

  // Maze state
  private mazePath: string[] = [];

  // Chemistry state
  private chemistryStep = 0;
  private chemistryCorrectSoFar = true;

  constructor() {
    super({ key: 'PuzzleScene' });
  }

  init(data: { puzzleId: string; onSolved?: () => void }): void {
    this.puzzleId = data.puzzleId;
    this.onSolvedCallback = data.onSolved;
    // Reset all state
    this.dials = [];
    this.dialTexts = [];
    this.sequenceInput = [];
    this.sequenceButtons = [];
    this.textInput = '';
    this.mirrorRevealed = [];
    this.mirrorTotalCells = 0;
    this.mirrorRevealedCount = 0;
    this.cipherSelected = [];
    this.lightingSequence = [];
    this.filmSlots = [];
    this.filmFrameContainers = [];
    this.symbolWheelIndices = [];
    this.symbolWheelTexts = [];
    this.mazePath = [];
    this.chemistryStep = 0;
    this.chemistryCorrectSoFar = true;
  }

  create(): void {
    const puzzle = PuzzleSystem.getInstance().getPuzzle(this.puzzleId);
    if (!puzzle) {
      this.closePuzzle();
      return;
    }

    if (PuzzleSystem.getInstance().isSolved(this.puzzleId)) {
      this.closePuzzle();
      return;
    }

    const { width, height } = this.cameras.main;
    initSceneCursor(this);

    // Dark overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.overlay.setInteractive(); // block clicks through
    this.overlay.setDepth(Depths.puzzleOverlay);

    // Main panel
    const panelW = Math.min(width * 0.85, 1050);
    const panelH = Math.min(height * 0.85, 820);
    this.panel = this.add.container(width / 2, height / 2);
    this.panel.setDepth(Depths.puzzleContent);

    const bg = this.add.rectangle(0, 0, panelW, panelH, Colors.panelBg, 0.97);
    bg.setStrokeStyle(2, Colors.gold, 0.8);
    this.panel.add(bg);

    // Title
    const title = this.add.text(0, -panelH / 2 + 45, puzzle.name, {
      fontFamily: FONT,
      fontSize: '33px',
      color: TextColors.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.add(title);

    // Description
    const desc = this.add.text(0, -panelH / 2 + 105, puzzle.description, {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.light,
      wordWrap: { width: panelW - 90 },
      lineSpacing: 4,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.panel.add(desc);

    // Feedback text (for wrong answers, success messages)
    this.feedbackText = this.add.text(0, panelH / 2 - 120, '', {
      fontFamily: FONT,
      fontSize: '21px',
      color: '#ff6b6b',
      align: 'center',
      wordWrap: { width: panelW - 90 },
    }).setOrigin(0.5);
    this.panel.add(this.feedbackText);

    // Hint text
    this.hintText = this.add.text(0, panelH / 2 - 82, '', {
      fontFamily: FONT,
      fontSize: '20px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
      wordWrap: { width: panelW - 90 },
      align: 'center',
    }).setOrigin(0.5);
    this.panel.add(this.hintText);

    // Close button
    const closeBtn = createCloseButton(this, panelW / 2 - 30, -panelH / 2 + 22, () => this.closePuzzle(), 120);
    this.panel.add(closeBtn);

    // Build the puzzle UI based on type
    switch (puzzle.type) {
      case 'combination':
        this.buildCombinationUI(panelW, panelH, puzzle.answer);
        break;
      case 'sequence':
        this.buildSequenceUI(panelW, panelH, puzzle.answer);
        break;
      case 'mirror_reveal':
        this.buildMirrorRevealUI(panelW, panelH, puzzle);
        break;
      case 'cipher':
        this.buildCipherUI(panelW, panelH, puzzle);
        break;
      case 'lighting_board':
        this.buildLightingBoardUI(panelW, panelH, puzzle);
        break;
      case 'film_assembly':
        this.buildFilmAssemblyUI(panelW, panelH, puzzle);
        break;
      case 'symbol_match':
        this.buildSymbolMatchUI(panelW, panelH, puzzle);
        break;
      case 'maze':
        this.buildMazeUI(panelW, panelH, puzzle);
        break;
      case 'chemistry':
        this.buildChemistryUI(panelW, panelH, puzzle);
        break;
      case 'logic':
      case 'code':
      default:
        this.buildTextInputUI(panelW, panelH);
        break;
    }

    // Fade in
    this.panel.setAlpha(0);
    this.tweens.add({ targets: this.panel, alpha: 1, duration: 250 });
  }

  // ─── COMBINATION UI (trunk, office safe) ──────────────────────────────

  private buildCombinationUI(panelW: number, _panelH: number, answer: string): void {
    const parts = answer.split('-');
    this.dialCount = parts.length;
    this.dialSeparator = '-';
    this.dials = new Array(this.dialCount).fill(0);

    const dialSpacing = Math.min(120, (panelW - 120) / this.dialCount);
    const startX = -(this.dialCount - 1) * dialSpacing / 2;
    const dialY = 45;

    for (let i = 0; i < this.dialCount; i++) {
      const x = startX + i * dialSpacing;

      // Up arrow
      const upBtn = this.add.text(x, dialY - 75, '▲', {
        fontFamily: FONT,
        fontSize: '36px',
        color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      upBtn.on('pointerdown', () => this.changeDial(i, 1));
      upBtn.on('pointerover', () => upBtn.setColor('#ffffff'));
      upBtn.on('pointerout', () => upBtn.setColor(TextColors.gold));
      this.panel.add(upBtn);

      // Dial display
      const dialBg = this.add.rectangle(x, dialY, 75, 82, Colors.sceneBg, 0.9);
      dialBg.setStrokeStyle(2, Colors.gold, 0.6);
      this.panel.add(dialBg);

      const dialText = this.add.text(x, dialY, '0', {
        fontFamily: FONT,
        fontSize: '48px',
        color: TextColors.light,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.panel.add(dialText);
      this.dialTexts.push(dialText);

      // Down arrow
      const downBtn = this.add.text(x, dialY + 75, '▼', {
        fontFamily: FONT,
        fontSize: '36px',
        color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      downBtn.on('pointerdown', () => this.changeDial(i, -1));
      downBtn.on('pointerover', () => downBtn.setColor('#ffffff'));
      downBtn.on('pointerout', () => downBtn.setColor(TextColors.gold));
      this.panel.add(downBtn);

      // Separator dash between dials
      if (i < this.dialCount - 1) {
        const sep = this.add.text(x + dialSpacing / 2, dialY, '—', {
          fontFamily: FONT,
          fontSize: '36px',
          color: TextColors.goldDim,
        }).setOrigin(0.5);
        this.panel.add(sep);
      }
    }

    // Submit button
    this.addSubmitButton(0, dialY + 150, () => {
      const answer = this.dials.join(this.dialSeparator);
      this.submitAnswer(answer);
    });
  }

  // ─── SEQUENCE UI (evidence board) ─────────────────────────────────────

  private buildSequenceUI(panelW: number, _panelH: number, answer: string): void {
    const steps = answer.split('-');
    const uniqueOptions = [...new Set(steps)];

    // Sequence display
    this.sequenceDisplay = this.add.text(0, 20, 'Sequence: (none)', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.light,
    }).setOrigin(0.5);
    this.panel.add(this.sequenceDisplay);

    // Option buttons
    const btnSpacing = Math.min(180, (panelW - 60) / uniqueOptions.length);
    const startX = -(uniqueOptions.length - 1) * btnSpacing / 2;
    const btnY = 112;

    uniqueOptions.forEach((option, i) => {
      const x = startX + i * btnSpacing;
      const btnContainer = this.add.container(x, btnY);

      const color = this.getSequenceColor(option);
      const btnBg = this.add.rectangle(0, 0, btnSpacing - 10, 72, color, 0.7);
      btnBg.setStrokeStyle(2, Colors.gold, 0.6);
      btnBg.setInteractive({ cursor: POINTER_CURSOR });

      const btnText = this.add.text(0, 0, option.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      btnContainer.add([btnBg, btnText]);
      this.panel.add(btnContainer);
      this.sequenceButtons.push(btnContainer);

      btnBg.on('pointerdown', () => {
        this.sequenceInput.push(option);
        this.updateSequenceDisplay();
        // Flash effect
        this.tweens.add({
          targets: btnBg,
          alpha: 0.3,
          duration: 100,
          yoyo: true,
        });
      });
    });

    // Clear button
    const clearBtn = this.add.text(-60, btnY + 82, 'Clear', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    clearBtn.on('pointerdown', () => {
      this.sequenceInput = [];
      this.updateSequenceDisplay();
    });
    clearBtn.on('pointerover', () => clearBtn.setColor(TextColors.gold));
    clearBtn.on('pointerout', () => clearBtn.setColor(TextColors.goldDim));
    this.panel.add(clearBtn);

    // Submit button
    this.addSubmitButton(60, btnY + 82, () => {
      const answer = this.sequenceInput.join('-');
      this.submitAnswer(answer);
    });
  }

  // ─── TEXT INPUT UI (logic, code — fallback) ───────────────────────────

  private buildTextInputUI(_panelW: number, _panelH: number): void {
    // Text display area
    const inputBg = this.add.rectangle(0, 45, 450, 72, Colors.sceneBg, 0.9);
    inputBg.setStrokeStyle(2, Colors.gold, 0.6);
    this.panel.add(inputBg);

    this.textDisplay = this.add.text(0, 45, '|', {
      fontFamily: FONT,
      fontSize: '33px',
      color: TextColors.light,
    }).setOrigin(0.5);
    this.panel.add(this.textDisplay);

    // Blinking cursor
    this.cursorBlink = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const cursor = this.textDisplay.text.endsWith('|') ? '' : '|';
        this.textDisplay.setText(this.textInput + cursor);
      },
    });

    // Keyboard input
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        this.textInput = this.textInput.slice(0, -1);
      } else if (event.key === 'Enter') {
        this.submitAnswer(this.textInput);
        return;
      } else if (event.key.length === 1 && this.textInput.length < 30) {
        this.textInput += event.key;
      }
      this.textDisplay.setText(this.textInput + '|');
    });

    // On-screen keyboard for mobile — letter grid
    const letters = 'abcdefghijklmnopqrstuvwxyz0123456789 ';
    const cols = 10;
    const keySize = 42;
    const keySpacing = 45;
    const startX = -(cols - 1) * keySpacing / 2;
    const startY = 120;

    letters.split('').forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * keySpacing;
      const y = startY + row * (keySize + 9);

      const keyBg = this.add.rectangle(x, y, keySize, keySize, Colors.sceneBg, 0.8);
      keyBg.setStrokeStyle(1, Colors.gold, 0.4);
      keyBg.setInteractive({ cursor: POINTER_CURSOR });

      const keyText = this.add.text(x, y, char === ' ' ? '␣' : char, {
        fontFamily: FONT,
        fontSize: '21px',
        color: TextColors.gold,
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

    // Backspace key
    const bksX = startX + cols * keySpacing / 2 + 60;
    const bksY = startY + 3 * (keySize + 9);
    const bksBg = this.add.rectangle(bksX, bksY, 75, keySize, Colors.sceneBg, 0.8);
    bksBg.setStrokeStyle(1, Colors.gold, 0.4);
    bksBg.setInteractive({ cursor: POINTER_CURSOR });
    const bksText = this.add.text(bksX, bksY, '⌫', {
      fontSize: '24px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    bksBg.on('pointerdown', () => {
      this.textInput = this.textInput.slice(0, -1);
      this.textDisplay.setText(this.textInput + '|');
    });
    this.panel.add([bksBg, bksText]);

    // Submit
    this.addSubmitButton(0, startY + 4 * (keySize + 9) + 15, () => {
      this.submitAnswer(this.textInput);
    });
  }

  // ─── MIRROR REVEAL UI ────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildMirrorRevealUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const revealText = (iData.revealText as string) || 'C.D.';
    const subText = (iData.subText as string) || '';
    const threshold = (iData.revealThreshold as number) || 0.8;

    const mirrorW = Math.min(panelW - 120, 600);
    const mirrorH = 280;
    const mirrorY = 30;

    // Mirror background (dark reflective surface)
    const mirrorBg = this.add.rectangle(0, mirrorY, mirrorW, mirrorH, 0x1a1a3a, 1);
    mirrorBg.setStrokeStyle(3, Colors.gold, 0.6);
    this.panel.add(mirrorBg);

    // Hidden text underneath the fog
    const hiddenMain = this.add.text(0, mirrorY - 30, revealText, {
      fontFamily: FONT,
      fontSize: '72px',
      color: '#cc3333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.add(hiddenMain);

    const hiddenSub = this.add.text(0, mirrorY + 40, subText, {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#993333',
      fontStyle: 'italic',
      wordWrap: { width: mirrorW - 40 },
      align: 'center',
    }).setOrigin(0.5);
    this.panel.add(hiddenSub);

    // Fog cells overlay grid
    const cellSize = 28;
    const cols = Math.floor(mirrorW / cellSize);
    const rows = Math.floor(mirrorH / cellSize);
    this.mirrorTotalCells = cols * rows;
    this.mirrorRevealedCount = 0;
    this.mirrorRevealed = [];

    const fogCells: Phaser.GameObjects.Rectangle[] = [];
    const fogStartX = -mirrorW / 2 + cellSize / 2;
    const fogStartY = mirrorY - mirrorH / 2 + cellSize / 2;

    for (let r = 0; r < rows; r++) {
      this.mirrorRevealed.push([]);
      for (let c = 0; c < cols; c++) {
        this.mirrorRevealed[r].push(false);
        const fogCell = this.add.rectangle(
          fogStartX + c * cellSize,
          fogStartY + r * cellSize,
          cellSize, cellSize,
          0x556677, 0.92
        );
        this.panel.add(fogCell);
        fogCells.push(fogCell);
      }
    }

    // Instruction
    const instruction = this.add.text(0, mirrorY - mirrorH / 2 - 30, 'Drag the magnifying lens across the mirror to reveal the hidden message', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.panel.add(instruction);

    // Progress bar
    const progressBarBg = this.add.rectangle(0, mirrorY + mirrorH / 2 + 30, mirrorW, 12, Colors.sceneBg, 0.8);
    progressBarBg.setStrokeStyle(1, Colors.gold, 0.4);
    this.panel.add(progressBarBg);

    const progressBar = this.add.rectangle(-mirrorW / 2, mirrorY + mirrorH / 2 + 30, 0, 10, Colors.gold, 0.7);
    progressBar.setOrigin(0, 0.5);
    this.panel.add(progressBar);

    const progressLabel = this.add.text(0, mirrorY + mirrorH / 2 + 52, '0% revealed', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.goldDim,
    }).setOrigin(0.5);
    this.panel.add(progressLabel);

    // Lens circle (rendered in scene coords, not panel coords)
    const lensRadius = 45;
    const lens = this.add.circle(0, 0, lensRadius, 0xffdd88, 0.15);
    lens.setStrokeStyle(3, Colors.gold, 0.8);
    lens.setDepth(Depths.puzzleContent + 1);
    lens.setVisible(false);

    // Make the mirror area interactive for dragging
    const hitZone = this.add.rectangle(0, mirrorY, mirrorW, mirrorH, 0x000000, 0);
    hitZone.setInteractive({ cursor: HAND_CURSOR, draggable: false });
    this.panel.add(hitZone);

    let isRevealing = false;

    hitZone.on('pointerdown', () => {
      isRevealing = true;
      lens.setVisible(true);
    });

    this.input.on('pointerup', () => {
      isRevealing = false;
      lens.setVisible(false);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Convert pointer to panel-local coords
      const localX = pointer.x - this.panel.x;
      const localY = pointer.y - this.panel.y;

      // Update lens position (in scene coords)
      lens.setPosition(pointer.x, pointer.y);

      if (!isRevealing) return;

      // Check which fog cells are within lens radius
      let changed = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (this.mirrorRevealed[r][c]) continue;
          const cellX = fogStartX + c * cellSize;
          const cellY = fogStartY + r * cellSize;
          const dist = Math.sqrt((localX - cellX) ** 2 + (localY - cellY) ** 2);
          if (dist < lensRadius) {
            this.mirrorRevealed[r][c] = true;
            this.mirrorRevealedCount++;
            const cellIdx = r * cols + c;
            // Fade out fog cell
            this.tweens.add({
              targets: fogCells[cellIdx],
              alpha: 0,
              duration: 200,
            });
            changed = true;
          }
        }
      }

      if (changed) {
        const pct = this.mirrorRevealedCount / this.mirrorTotalCells;
        progressBar.width = mirrorW * pct;
        progressLabel.setText(`${Math.round(pct * 100)}% revealed`);

        if (pct >= threshold) {
          // Auto-solve
          this.handleInteractiveSolved();
          // Reveal all remaining
          fogCells.forEach(cell => {
            this.tweens.add({ targets: cell, alpha: 0, duration: 400 });
          });
          lens.setVisible(false);
          isRevealing = false;
          hitZone.disableInteractive();
        }
      }
    });
  }

  // ─── CIPHER UI ────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildCipherUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const answerLetters = (iData.answerLetters as string[]) || ['g', 'o', 'b', 'l', 'e', 't'];
    const decoyLetters = (iData.decoyLetters as string[]) || ['a', 'r', 's', 'm', 'p', 'n'];
    const scriptTitle = (iData.scriptTitle as string) || 'Script — Act III';

    this.cipherSelected = [];

    // Script page background
    const pageW = Math.min(panelW - 80, 700);
    const pageH = 300;
    const pageY = 20;

    const pageBg = this.add.rectangle(0, pageY, pageW, pageH, 0x2a2520, 0.9);
    pageBg.setStrokeStyle(2, 0x8a7a5a, 0.6);
    this.panel.add(pageBg);

    // Script title on page
    const titleLabel = this.add.text(0, pageY - pageH / 2 + 20, scriptTitle, {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#8a7a5a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.panel.add(titleLabel);

    // Scatter all letters on the page
    const allLetters = [
      ...answerLetters.map(l => ({ letter: l, isAnswer: true })),
      ...decoyLetters.map(l => ({ letter: l, isAnswer: false })),
    ];

    // Shuffle for layout
    const shuffled = [...allLetters].sort(() => Math.random() - 0.5);

    const margin = 50;
    const usableW = pageW - margin * 2;
    const usableH = pageH - 80;
    const cols = Math.ceil(Math.sqrt(shuffled.length * 1.5));
    const rows = Math.ceil(shuffled.length / cols);
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    // Track answer letter objects for visual feedback
    const answerLetterOrder = [...answerLetters];
    let nextExpectedIndex = 0;

    // Progress display
    const progressDisplay = this.add.text(0, pageY + pageH / 2 + 25, 'Spell the word: _ _ _ _ _ _', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.gold,
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.panel.add(progressDisplay);

    const updateProgress = () => {
      const display = answerLetters.map((l, i) => {
        if (i < this.cipherSelected.length) return this.cipherSelected[i].toUpperCase();
        return '_';
      }).join(' ');
      progressDisplay.setText(`Spell the word: ${display}`);
    };

    shuffled.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = -pageW / 2 + margin + col * cellW + cellW / 2 + (Math.random() - 0.5) * 10;
      const y = pageY - pageH / 2 + 55 + row * cellH + cellH / 2 + (Math.random() - 0.5) * 8;

      const circleColor = item.isAnswer ? 0xcc3333 : 0x666666;
      const circle = this.add.circle(x, y, 22, circleColor, 0.25);
      circle.setStrokeStyle(2, circleColor, 0.8);
      circle.setInteractive({ cursor: HAND_CURSOR });
      this.panel.add(circle);

      const letterText = this.add.text(x, y, item.letter.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '24px',
        color: item.isAnswer ? '#ff6666' : '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.panel.add(letterText);

      circle.on('pointerover', () => {
        circle.setScale(1.15);
      });
      circle.on('pointerout', () => {
        circle.setScale(1.0);
      });

      circle.on('pointerdown', () => {
        if (!item.isAnswer) {
          // Wrong — clicked a decoy
          this.tweens.add({
            targets: [circle, letterText],
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 100,
            yoyo: true,
          });
          this.feedbackText.setColor('#ff6b6b');
          this.feedbackText.setText('Wrong letter! Sequence reset.');
          this.cipherSelected = [];
          nextExpectedIndex = 0;
          updateProgress();
          UISounds.wrongAnswer();
          return;
        }

        // Check if this is the next expected letter
        if (item.letter === answerLetterOrder[nextExpectedIndex]) {
          this.cipherSelected.push(item.letter);
          nextExpectedIndex++;

          // Visual confirmation
          this.tweens.add({
            targets: circle,
            fillAlpha: 0.6,
            duration: 200,
          });
          letterText.setColor('#ffffff');
          this.feedbackText.setColor('#4ade80');
          this.feedbackText.setText('');
          updateProgress();

          // Check if complete
          if (this.cipherSelected.length === answerLetters.length) {
            this.handleInteractiveSolved();
          }
        } else {
          // Right type but wrong order
          this.tweens.add({
            targets: [circle, letterText],
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 100,
            yoyo: true,
          });
          this.feedbackText.setColor('#ff6b6b');
          this.feedbackText.setText('Wrong order! Sequence reset.');
          this.cipherSelected = [];
          nextExpectedIndex = 0;
          updateProgress();
          UISounds.wrongAnswer();
        }
      });
    });

    updateProgress();
  }

  // ─── LIGHTING BOARD UI ────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildLightingBoardUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const channels = (iData.channels as string[]) || ['RED', 'BLUE', 'WHITE', 'GREEN'];
    const cueCard = (iData.cueCard as string) || '';
    const targetSequence = (iData.targetSequence as string[]) || [];

    this.lightingSequence = [];

    const boardY = 20;

    // Cue card reference
    const cueCardBg = this.add.rectangle(0, boardY - 120, Math.min(panelW - 80, 600), 50, 0x2a2520, 0.8);
    cueCardBg.setStrokeStyle(1, Colors.goldDim, 0.5);
    this.panel.add(cueCardBg);

    const cueText = this.add.text(0, boardY - 120, cueCard, {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.panel.add(cueText);

    // Sequence display as colored dots
    const dotY = boardY - 60;
    const maxDots = targetSequence.length;
    const dotSpacing = 40;
    const dotsStartX = -(maxDots - 1) * dotSpacing / 2;

    // Slot outlines
    const dotSlots: Phaser.GameObjects.Arc[] = [];
    const dotFills: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < maxDots; i++) {
      const slot = this.add.circle(dotsStartX + i * dotSpacing, dotY, 14, 0x333333, 0.5);
      slot.setStrokeStyle(2, Colors.goldDim, 0.5);
      this.panel.add(slot);
      dotSlots.push(slot);

      const fill = this.add.circle(dotsStartX + i * dotSpacing, dotY, 12, 0x000000, 0);
      this.panel.add(fill);
      dotFills.push(fill);
    }

    const channelColorMap: Record<string, number> = {
      RED: 0xcc2222,
      BLUE: 0x2244cc,
      WHITE: 0xdddddd,
      GREEN: 0x22aa44,
    };

    const updateDots = () => {
      dotFills.forEach((dot, i) => {
        if (i < this.lightingSequence.length) {
          const colorKey = this.lightingSequence[i].toUpperCase();
          dot.setFillStyle(channelColorMap[colorKey] || 0x888888, 1);
          dot.setAlpha(1);
        } else {
          dot.setAlpha(0);
        }
      });
    };

    // Channel buttons
    const btnSpacing = Math.min(160, (panelW - 80) / channels.length);
    const btnStartX = -(channels.length - 1) * btnSpacing / 2;
    const btnY = boardY + 30;

    channels.forEach((channel, i) => {
      const x = btnStartX + i * btnSpacing;
      const color = channelColorMap[channel] || 0x888888;

      const btnBg = this.add.rectangle(x, btnY, btnSpacing - 20, 80, color, 0.3);
      btnBg.setStrokeStyle(2, color, 0.8);
      btnBg.setInteractive({ cursor: HAND_CURSOR });
      this.panel.add(btnBg);

      const btnLabel = this.add.text(x, btnY, channel, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.panel.add(btnLabel);

      // Light indicator above button
      const indicator = this.add.circle(x, btnY - 55, 8, color, 0.2);
      indicator.setStrokeStyle(1, color, 0.6);
      this.panel.add(indicator);

      btnBg.on('pointerdown', () => {
        if (this.lightingSequence.length >= maxDots) return;

        this.lightingSequence.push(channel.toLowerCase());
        updateDots();

        // Flash the button and indicator
        this.tweens.add({
          targets: btnBg,
          fillAlpha: 0.8,
          duration: 120,
          yoyo: true,
        });
        this.tweens.add({
          targets: indicator,
          fillAlpha: 1,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 150,
          yoyo: true,
        });
      });

      btnBg.on('pointerover', () => btnBg.setFillStyle(color, 0.5));
      btnBg.on('pointerout', () => btnBg.setFillStyle(color, 0.3));
    });

    // Clear button
    const clearBtn = this.add.text(-80, btnY + 80, 'Clear', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    clearBtn.on('pointerdown', () => {
      this.lightingSequence = [];
      updateDots();
      this.feedbackText.setText('');
    });
    clearBtn.on('pointerover', () => clearBtn.setColor(TextColors.gold));
    clearBtn.on('pointerout', () => clearBtn.setColor(TextColors.goldDim));
    this.panel.add(clearBtn);

    // Submit button
    this.addSubmitButton(80, btnY + 80, () => {
      const inputSeq = this.lightingSequence.join('-');
      const targetSeq = targetSequence.join('-');
      if (inputSeq === targetSeq) {
        this.handleInteractiveSolved();
      } else {
        UISounds.wrongAnswer();
        this.feedbackText.setColor('#ff6b6b');
        this.feedbackText.setText('Incorrect lighting sequence. Try again.');
        this.lightingSequence = [];
        updateDots();

        // Show progressive hint
        const hint = PuzzleSystem.getInstance().getHint(this.puzzleId);
        if (hint) {
          this.hintText.setText(`Hint: ${hint}`);
        }

        this.tweens.add({
          targets: this.panel,
          x: this.panel.x - 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
        });
      }
    });
  }

  // ─── FILM ASSEMBLY UI ────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildFilmAssemblyUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const frames = (iData.frames as Array<{ id: string; label: string }>) || [];
    const correctOrder = (iData.correctOrder as string[]) || [];

    this.filmSlots = new Array(correctOrder.length).fill(null);
    this.filmFrameContainers = [];

    const slotY = -10;
    const frameY = slotY + 160;
    const slotW = Math.min(180, (panelW - 100) / correctOrder.length);
    const slotH = 60;
    const slotsStartX = -(correctOrder.length - 1) * (slotW + 10) / 2;

    // Light table label
    const ltLabel = this.add.text(0, slotY - 50, 'Light Table — Drag frames to slots', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.panel.add(ltLabel);

    // Numbered slots
    const slotBgs: Phaser.GameObjects.Rectangle[] = [];
    const slotLabels: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < correctOrder.length; i++) {
      const x = slotsStartX + i * (slotW + 10);

      const slotBg = this.add.rectangle(x, slotY, slotW, slotH, 0x1a1a2e, 0.8);
      slotBg.setStrokeStyle(2, Colors.goldDim, 0.5);
      this.panel.add(slotBg);
      slotBgs.push(slotBg);

      const slotNum = this.add.text(x, slotY - slotH / 2 - 12, `#${i + 1}`, {
        fontFamily: FONT,
        fontSize: '14px',
        color: TextColors.goldDim,
      }).setOrigin(0.5);
      this.panel.add(slotNum);

      const slotLabel = this.add.text(x, slotY, '(empty)', {
        fontFamily: FONT,
        fontSize: '14px',
        color: TextColors.goldDim,
        fontStyle: 'italic',
      }).setOrigin(0.5);
      this.panel.add(slotLabel);
      slotLabels.push(slotLabel);
    }

    // Draggable film frames (shuffled)
    const shuffledFrames = [...frames].sort(() => Math.random() - 0.5);
    const frameW = Math.min(200, (panelW - 80) / shuffledFrames.length);
    const frameH = 90;
    const framesStartX = -(shuffledFrames.length - 1) * (frameW + 10) / 2;

    shuffledFrames.forEach((frame, i) => {
      const startXPos = framesStartX + i * (frameW + 10);
      const container = this.add.container(startXPos, frameY);

      const frameBg = this.add.rectangle(0, 0, frameW, frameH, 0x3a2a1a, 0.9);
      frameBg.setStrokeStyle(2, Colors.gold, 0.6);
      container.add(frameBg);

      // Film sprocket holes decoration
      const sprocketY1 = -frameH / 2 + 6;
      const sprocketY2 = frameH / 2 - 6;
      for (let s = -2; s <= 2; s++) {
        const sx = s * 15;
        container.add(this.add.rectangle(sx, sprocketY1, 8, 5, 0x1a1a1a, 0.6));
        container.add(this.add.rectangle(sx, sprocketY2, 8, 5, 0x1a1a1a, 0.6));
      }

      const frameText = this.add.text(0, 0, frame.label, {
        fontFamily: FONT,
        fontSize: '13px',
        color: TextColors.light,
        wordWrap: { width: frameW - 20 },
        align: 'center',
      }).setOrigin(0.5);
      container.add(frameText);

      this.panel.add(container);
      this.filmFrameContainers.push(container);

      // Make interactive
      frameBg.setInteractive({ cursor: HAND_CURSOR, draggable: true });

      const originalX = startXPos;
      const originalY = frameY;

      frameBg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        // Convert drag coords relative to panel
        container.setPosition(dragX - this.panel.x, dragY - this.panel.y);
      });

      frameBg.on('dragstart', () => {
        container.setDepth(10);
        this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });

        // Remove from any slot it was in
        const slotIdx = this.filmSlots.indexOf(frame.id);
        if (slotIdx !== -1) {
          this.filmSlots[slotIdx] = null;
          slotLabels[slotIdx].setText('(empty)');
          slotLabels[slotIdx].setColor(TextColors.goldDim);
          slotBgs[slotIdx].setStrokeStyle(2, Colors.goldDim, 0.5);
        }
      });

      frameBg.on('dragend', () => {
        container.setDepth(0);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });

        // Check proximity to slots
        let placed = false;
        for (let s = 0; s < correctOrder.length; s++) {
          if (this.filmSlots[s] !== null) continue;
          const slotX = slotsStartX + s * (slotW + 10);
          const dist = Math.abs(container.x - slotX) + Math.abs(container.y - slotY);
          if (dist < 150) {
            // Snap to slot
            this.filmSlots[s] = frame.id;
            this.tweens.add({
              targets: container,
              x: slotX,
              y: slotY,
              scaleX: 0.85,
              scaleY: 0.85,
              duration: 200,
              ease: 'Back.easeOut',
            });
            slotLabels[s].setText(frame.id.toUpperCase());
            slotLabels[s].setColor(TextColors.gold);
            slotBgs[s].setStrokeStyle(2, Colors.gold, 0.8);
            placed = true;
            break;
          }
        }

        if (!placed) {
          // Return to original position
          this.tweens.add({
            targets: container,
            x: originalX,
            y: originalY,
            duration: 300,
            ease: 'Back.easeOut',
          });
        }
      });
    });

    // Enable drag input
    this.input.setDraggable(
      this.filmFrameContainers.map(c => (c.list[0] as Phaser.GameObjects.Rectangle))
    );

    // Submit button
    this.addSubmitButton(0, frameY + 90, () => {
      const currentOrder = this.filmSlots.join('-');
      const targetOrder = correctOrder.join('-');
      if (currentOrder === targetOrder) {
        this.handleInteractiveSolved();
      } else {
        UISounds.wrongAnswer();
        this.feedbackText.setColor('#ff6b6b');
        this.feedbackText.setText('The frames are in the wrong order. Try again.');

        const hint = PuzzleSystem.getInstance().getHint(this.puzzleId);
        if (hint) this.hintText.setText(`Hint: ${hint}`);

        this.tweens.add({
          targets: this.panel,
          x: this.panel.x - 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
        });
      }
    });
  }

  // ─── SYMBOL MATCH UI ─────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildSymbolMatchUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const symbols = (iData.symbols as string[]) || ['mask', 'spotlight', 'curtain', 'rose', 'key', 'bell', 'crown', 'feather'];
    const symbolEmojis = (iData.symbolEmojis as Record<string, string>) || {};
    const correctCombination = (iData.correctCombination as string[]) || ['mask', 'spotlight', 'curtain', 'rose'];

    const wheelCount = correctCombination.length;
    this.symbolWheelIndices = new Array(wheelCount).fill(0);
    this.symbolWheelTexts = [];

    const wheelSpacing = Math.min(160, (panelW - 100) / wheelCount);
    const startX = -(wheelCount - 1) * wheelSpacing / 2;
    const wheelY = 30;

    // Lock body background
    const lockW = wheelCount * wheelSpacing + 40;
    const lockBg = this.add.rectangle(0, wheelY, lockW, 220, 0x2a2a3e, 0.6);
    lockBg.setStrokeStyle(2, Colors.goldDim, 0.4);
    this.panel.add(lockBg);

    const lockTitle = this.add.text(0, wheelY - 95, 'Symbol Lock', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.panel.add(lockTitle);

    for (let i = 0; i < wheelCount; i++) {
      const x = startX + i * wheelSpacing;

      // Up arrow
      const upBtn = this.add.text(x, wheelY - 70, '▲', {
        fontFamily: FONT,
        fontSize: '32px',
        color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      this.panel.add(upBtn);

      // Symbol display
      const wheelBg = this.add.rectangle(x, wheelY, wheelSpacing - 30, 80, Colors.sceneBg, 0.9);
      wheelBg.setStrokeStyle(2, Colors.gold, 0.6);
      this.panel.add(wheelBg);

      const emoji = symbolEmojis[symbols[0]] || symbols[0];
      const symbolText = this.add.text(x, wheelY - 8, emoji, {
        fontSize: '36px',
      }).setOrigin(0.5);
      this.panel.add(symbolText);

      const nameText = this.add.text(x, wheelY + 28, symbols[0], {
        fontFamily: FONT,
        fontSize: '13px',
        color: TextColors.goldDim,
      }).setOrigin(0.5);
      this.panel.add(nameText);

      this.symbolWheelTexts.push(symbolText);

      // Down arrow
      const downBtn = this.add.text(x, wheelY + 70, '▼', {
        fontFamily: FONT,
        fontSize: '32px',
        color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      this.panel.add(downBtn);

      const updateWheel = () => {
        const idx = this.symbolWheelIndices[i];
        const sym = symbols[idx];
        const em = symbolEmojis[sym] || sym;
        symbolText.setText(em);
        nameText.setText(sym);

        // Spin animation
        this.tweens.add({
          targets: [symbolText, nameText],
          y: symbolText.y - 10,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          onComplete: () => {
            symbolText.setY(wheelY - 8);
            nameText.setY(wheelY + 28);
          },
        });
      };

      upBtn.on('pointerdown', () => {
        this.symbolWheelIndices[i] = (this.symbolWheelIndices[i] - 1 + symbols.length) % symbols.length;
        updateWheel();
      });
      upBtn.on('pointerover', () => upBtn.setColor('#ffffff'));
      upBtn.on('pointerout', () => upBtn.setColor(TextColors.gold));

      downBtn.on('pointerdown', () => {
        this.symbolWheelIndices[i] = (this.symbolWheelIndices[i] + 1) % symbols.length;
        updateWheel();
      });
      downBtn.on('pointerover', () => downBtn.setColor('#ffffff'));
      downBtn.on('pointerout', () => downBtn.setColor(TextColors.gold));
    }

    // Submit button
    this.addSubmitButton(0, wheelY + 130, () => {
      const currentCombo = this.symbolWheelIndices.map(idx => symbols[idx]);
      const isCorrect = currentCombo.every((sym, i) => sym === correctCombination[i]);
      if (isCorrect) {
        this.handleInteractiveSolved();
      } else {
        UISounds.wrongAnswer();
        this.feedbackText.setColor('#ff6b6b');
        this.feedbackText.setText('Wrong symbol combination.');

        const hint = PuzzleSystem.getInstance().getHint(this.puzzleId);
        if (hint) this.hintText.setText(`Hint: ${hint}`);

        this.tweens.add({
          targets: this.panel,
          x: this.panel.x - 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
        });
      }
    });
  }

  // ─── MAZE UI ──────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildMazeUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const nodes = (iData.nodes as Array<{ id: string; label: string; x: number; y: number; start?: boolean; goal?: boolean; deadEnd?: boolean }>) || [];
    const edges = (iData.edges as string[][]) || [];

    this.mazePath = [];

    const gridW = Math.min(panelW - 120, 550);
    const gridH = 300;
    const gridY = 20;

    // Blueprint background
    const bpBg = this.add.rectangle(0, gridY, gridW + 20, gridH + 20, 0x0a1a2e, 0.9);
    bpBg.setStrokeStyle(2, 0x3a5a7a, 0.6);
    this.panel.add(bpBg);

    // Compute grid bounds
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const margin = 40;
    const usableW = gridW - margin * 2;
    const usableH = gridH - margin * 2;

    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => {
      nodePositions[n.id] = {
        x: -gridW / 2 + margin + ((n.x - minX) / rangeX) * usableW,
        y: gridY - gridH / 2 + margin + ((n.y - minY) / rangeY) * usableH,
      };
    });

    // Draw edges
    const edgeGraphics = this.add.graphics();
    edgeGraphics.lineStyle(2, 0x3a5a7a, 0.6);
    edges.forEach(([a, b]) => {
      const pa = nodePositions[a];
      const pb = nodePositions[b];
      if (pa && pb) {
        edgeGraphics.lineBetween(pa.x, pa.y, pb.x, pb.y);
      }
    });
    this.panel.add(edgeGraphics);

    // Path graphics (drawn on top)
    const pathGraphics = this.add.graphics();
    this.panel.add(pathGraphics);

    // Draw nodes
    const nodeCircles: Record<string, Phaser.GameObjects.Arc> = {};
    const nodeLabels: Record<string, Phaser.GameObjects.Text> = {};

    const startNode = nodes.find(n => n.start);
    const goalNode = nodes.find(n => n.goal);

    // Add start node to path automatically
    if (startNode) {
      this.mazePath.push(startNode.id);
    }

    const redrawPath = () => {
      pathGraphics.clear();
      pathGraphics.lineStyle(4, 0x4ade80, 0.8);

      for (let i = 0; i < this.mazePath.length - 1; i++) {
        const pa = nodePositions[this.mazePath[i]];
        const pb = nodePositions[this.mazePath[i + 1]];
        if (pa && pb) {
          pathGraphics.lineBetween(pa.x, pa.y, pb.x, pb.y);
        }
      }

      // Update node colors
      nodes.forEach(n => {
        const circle = nodeCircles[n.id];
        if (!circle) return;
        if (this.mazePath.includes(n.id)) {
          circle.setFillStyle(0x4ade80, 0.7);
        } else if (n.deadEnd) {
          circle.setFillStyle(0x8b0000, 0.4);
        } else if (n.start) {
          circle.setFillStyle(0x2244cc, 0.6);
        } else if (n.goal) {
          circle.setFillStyle(0xc9a84c, 0.6);
        } else {
          circle.setFillStyle(0x3a5a7a, 0.5);
        }
      });
    };

    nodes.forEach(n => {
      const pos = nodePositions[n.id];
      const radius = n.start || n.goal ? 22 : 16;
      let fillColor = 0x3a5a7a;
      let fillAlpha = 0.5;

      if (n.start) { fillColor = 0x2244cc; fillAlpha = 0.6; }
      if (n.goal) { fillColor = 0xc9a84c; fillAlpha = 0.6; }
      if (n.deadEnd) { fillColor = 0x8b0000; fillAlpha = 0.4; }

      const circle = this.add.circle(pos.x, pos.y, radius, fillColor, fillAlpha);
      circle.setStrokeStyle(2, n.goal ? Colors.gold : 0x5a7a9a, 0.8);
      circle.setInteractive({ cursor: HAND_CURSOR });
      this.panel.add(circle);
      nodeCircles[n.id] = circle;

      const label = this.add.text(pos.x, pos.y + radius + 12, n.label, {
        fontFamily: FONT,
        fontSize: '11px',
        color: n.start ? '#6688cc' : n.goal ? TextColors.gold : TextColors.goldDim,
      }).setOrigin(0.5);
      this.panel.add(label);
      nodeLabels[n.id] = label;

      if (n.start) {
        const startTag = this.add.text(pos.x, pos.y - radius - 14, 'START', {
          fontFamily: FONT,
          fontSize: '11px',
          color: '#6688cc',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.panel.add(startTag);
      }
      if (n.goal) {
        const goalTag = this.add.text(pos.x, pos.y - radius - 14, 'GOAL', {
          fontFamily: FONT,
          fontSize: '11px',
          color: TextColors.gold,
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.panel.add(goalTag);
      }

      circle.on('pointerdown', () => {
        const lastInPath = this.mazePath[this.mazePath.length - 1];

        // If clicking the last node, undo
        if (n.id === lastInPath && this.mazePath.length > 1) {
          this.mazePath.pop();
          redrawPath();
          return;
        }

        // Check if this node is adjacent to the last node in path
        if (lastInPath) {
          const isAdjacent = edges.some(([a, b]) =>
            (a === lastInPath && b === n.id) || (b === lastInPath && a === n.id)
          );
          if (!isAdjacent) {
            this.feedbackText.setColor('#ff6b6b');
            this.feedbackText.setText('No passage connects there. Try an adjacent room.');
            return;
          }
        }

        // Don't revisit nodes already in path
        if (this.mazePath.includes(n.id)) {
          this.feedbackText.setColor('#ff6b6b');
          this.feedbackText.setText('You\'ve already visited that room.');
          return;
        }

        this.mazePath.push(n.id);
        this.feedbackText.setText('');
        redrawPath();

        // Pulse animation
        this.tweens.add({
          targets: circle,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 150,
          yoyo: true,
        });

        // Check if reached goal
        if (n.goal) {
          this.handleInteractiveSolved();
        }

        // Dead end warning
        if (n.deadEnd) {
          this.feedbackText.setColor('#ff6b6b');
          this.feedbackText.setText('Dead end! Click this node again to backtrack.');
        }
      });

      circle.on('pointerover', () => {
        circle.setStrokeStyle(3, 0xffffff, 1);
        circle.setScale(1.1);
      });
      circle.on('pointerout', () => {
        circle.setStrokeStyle(2, n.goal ? Colors.gold : 0x5a7a9a, 0.8);
        circle.setScale(1.0);
      });
    });

    redrawPath();

    // Reset button
    const resetBtn = this.add.text(0, gridY + gridH / 2 + 30, 'Reset Path', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    resetBtn.on('pointerdown', () => {
      this.mazePath = startNode ? [startNode.id] : [];
      redrawPath();
      this.feedbackText.setText('');
    });
    resetBtn.on('pointerover', () => resetBtn.setColor(TextColors.gold));
    resetBtn.on('pointerout', () => resetBtn.setColor(TextColors.goldDim));
    this.panel.add(resetBtn);
  }

  // ─── CHEMISTRY UI ────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildChemistryUI(panelW: number, _panelH: number, puzzle: any): void {
    const iData = (puzzle.interactiveData as Record<string, unknown>) || {};
    const steps = (iData.steps as Array<{
      action: string;
      description: string;
      result?: string;
      options?: string[];
      correctOption?: string;
      wrongFeedback?: Record<string, string>;
      correctResult?: string;
    }>) || [];

    this.chemistryStep = 0;
    this.chemistryCorrectSoFar = true;

    const labY = 20;
    const contentW = Math.min(panelW - 80, 650);

    // Lab bench background
    const labBg = this.add.rectangle(0, labY, contentW, 300, 0x1a2020, 0.8);
    labBg.setStrokeStyle(2, 0x3a5a5a, 0.5);
    this.panel.add(labBg);

    const labTitle = this.add.text(0, labY - 135, 'Chemical Analysis Station', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.panel.add(labTitle);

    // Step indicator
    const stepIndicator = this.add.text(0, labY - 110, `Step 1 of ${steps.length}`, {
      fontFamily: FONT,
      fontSize: '18px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    this.panel.add(stepIndicator);

    // Result display area
    const resultBg = this.add.rectangle(0, labY - 50, contentW - 40, 60, 0x0a1515, 0.9);
    resultBg.setStrokeStyle(1, 0x3a5a5a, 0.4);
    this.panel.add(resultBg);

    const resultText = this.add.text(0, labY - 50, 'Ready to begin analysis...', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.light,
      fontStyle: 'italic',
      wordWrap: { width: contentW - 80 },
      align: 'center',
    }).setOrigin(0.5);
    this.panel.add(resultText);

    // Dynamic content container for buttons
    const dynamicContainer = this.add.container(0, 0);
    this.panel.add(dynamicContainer);

    const renderStep = (stepIdx: number) => {
      // Clear previous dynamic content
      dynamicContainer.removeAll(true);

      if (stepIdx >= steps.length) {
        // All steps complete
        if (this.chemistryCorrectSoFar) {
          this.handleInteractiveSolved();
        }
        return;
      }

      const step = steps[stepIdx];
      stepIndicator.setText(`Step ${stepIdx + 1} of ${steps.length}`);

      const actionLabel = this.add.text(0, labY + 5, step.description, {
        fontFamily: FONT,
        fontSize: '16px',
        color: TextColors.light,
        wordWrap: { width: contentW - 60 },
        align: 'center',
      }).setOrigin(0.5);
      dynamicContainer.add(actionLabel);

      if (step.options && step.options.length > 0) {
        // Multiple choice step
        const optSpacing = Math.min(200, (contentW - 40) / step.options.length);
        const optStartX = -(step.options.length - 1) * optSpacing / 2;
        const optY = labY + 70;

        step.options.forEach((option, oi) => {
          const ox = optStartX + oi * optSpacing;

          const optBg = this.add.rectangle(ox, optY, optSpacing - 15, 55, 0x2a3a3a, 0.8);
          optBg.setStrokeStyle(2, Colors.goldDim, 0.5);
          optBg.setInteractive({ cursor: HAND_CURSOR });
          dynamicContainer.add(optBg);

          const optText = this.add.text(ox, optY, option, {
            fontFamily: FONT,
            fontSize: '14px',
            color: TextColors.light,
            wordWrap: { width: optSpacing - 30 },
            align: 'center',
          }).setOrigin(0.5);
          dynamicContainer.add(optText);

          optBg.on('pointerover', () => optBg.setFillStyle(0x3a5a5a, 0.9));
          optBg.on('pointerout', () => optBg.setFillStyle(0x2a3a3a, 0.8));

          optBg.on('pointerdown', () => {
            if (option === step.correctOption) {
              // Correct
              resultText.setColor('#4ade80');
              resultText.setText(step.correctResult || 'Correct!');
              this.feedbackText.setColor('#4ade80');
              this.feedbackText.setText('');

              // Flash green
              this.tweens.add({
                targets: optBg,
                fillColor: 0x226622,
                duration: 200,
              });
              optBg.setStrokeStyle(2, 0x4ade80, 0.8);

              // Advance to next step after delay
              this.time.delayedCall(1500, () => {
                this.chemistryStep++;
                renderStep(this.chemistryStep);
              });

              // Disable all options
              step.options!.forEach(() => {
                // handled by destroying dynamicContainer content
              });
            } else {
              // Wrong
              const feedback = step.wrongFeedback?.[option] || 'That\'s not the right choice.';
              resultText.setColor('#ff6b6b');
              resultText.setText(feedback);
              this.feedbackText.setColor('#ff6b6b');
              this.feedbackText.setText('Try a different reagent.');

              // Flash red
              this.tweens.add({
                targets: optBg,
                fillAlpha: 0.3,
                duration: 150,
                yoyo: true,
                onComplete: () => optBg.setFillStyle(0x2a3a3a, 0.8),
              });
              optBg.setStrokeStyle(2, 0xff6b6b, 0.6);

              UISounds.wrongAnswer();

              // Re-enable after a moment (reset the step appearance)
              this.time.delayedCall(800, () => {
                optBg.setStrokeStyle(2, Colors.goldDim, 0.5);
              });
            }
          });
        });
      } else {
        // Simple action button step (step 1 type)
        const btnY = labY + 60;
        const actionBtn = this.add.rectangle(0, btnY, 250, 55, 0x2a4a3a, 0.8);
        actionBtn.setStrokeStyle(2, Colors.gold, 0.6);
        actionBtn.setInteractive({ cursor: HAND_CURSOR });
        dynamicContainer.add(actionBtn);

        const btnLabel = this.add.text(0, btnY, step.action, {
          fontFamily: FONT,
          fontSize: '20px',
          color: TextColors.gold,
          fontStyle: 'bold',
        }).setOrigin(0.5);
        dynamicContainer.add(btnLabel);

        actionBtn.on('pointerover', () => actionBtn.setFillStyle(0x3a6a4a, 0.9));
        actionBtn.on('pointerout', () => actionBtn.setFillStyle(0x2a4a3a, 0.8));

        actionBtn.on('pointerdown', () => {
          resultText.setColor('#4ade80');
          resultText.setText(step.result || 'Done.');
          this.feedbackText.setText('');

          // Animate — bubbling effect
          this.tweens.add({
            targets: actionBtn,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 100,
            yoyo: true,
          });

          // Advance
          this.time.delayedCall(1200, () => {
            this.chemistryStep++;
            renderStep(this.chemistryStep);
          });
        });
      }
    };

    renderStep(0);
  }

  // ─── SHARED HELPERS ──────────────────────────────────────────────────

  private addSubmitButton(x: number, y: number, onClick: () => void): void {
    const btnBg = this.add.rectangle(x, y, 210, 66, Colors.gold, 0.2);
    btnBg.setStrokeStyle(2, Colors.gold, 0.7);
    btnBg.setInteractive({ cursor: POINTER_CURSOR });

    const btnText = this.add.text(x, y, 'Submit', {
      fontFamily: FONT,
      fontSize: '27px',
      color: TextColors.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(Colors.gold, 0.35));
    btnBg.on('pointerout', () => btnBg.setFillStyle(Colors.gold, 0.2));
    btnBg.on('pointerdown', onClick);

    this.panel.add([btnBg, btnText]);
  }

  private changeDial(index: number, direction: number): void {
    this.dials[index] = (this.dials[index] + direction + 100) % 100;
    this.dialTexts[index].setText(String(this.dials[index]));
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
      red: 0x8b0000,
      blue: 0x00008b,
      white: 0x666666,
      green: 0x006400,
      yellow: 0x8b8b00,
      toast: 0x8b6914,
      drink: 0x4a6741,
      collapse: 0x8b0000,
      understudy: 0x4a4a8b,
      cecilia: 0x6b3a5a,
      goblet: 0x8b6914,
      margaux: 0x8b0000,
      edwin: 0x3a5a6b,
      ghost: 0x666688,
      ashworth: 0x5a3a2a,
    };
    return colors[option.toLowerCase()] || 0x3a3a5a;
  }

  /**
   * Called when an interactive puzzle type is solved via its own UI logic
   * (mirror_reveal, cipher, lighting_board, film_assembly, symbol_match, maze, chemistry).
   */
  private handleInteractiveSolved(): void {
    const puzzleSystem = PuzzleSystem.getInstance();
    puzzleSystem.solvePuzzle(this.puzzleId);

    UISounds.puzzleSolve();
    this.feedbackText.setColor('#4ade80');
    this.feedbackText.setText('Correct!');
    this.hintText.setText('');

    // Check if puzzle unlocks an item
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

    // Journal entry
    if (puzzle) {
      SaveSystem.getInstance().addJournalEntry(
        `Solved "${puzzle.name}" — ${puzzle.unlocks === 'case_closed' ? 'the full timeline is clear now.' : 'this reveals new evidence.'}`
      );
    }

    // Close after a moment
    this.time.delayedCall(1500, () => {
      if (this.onSolvedCallback) this.onSolvedCallback();
      this.closePuzzle();
    });
  }

  private submitAnswer(answer: string): void {
    const puzzleSystem = PuzzleSystem.getInstance();
    const correct = puzzleSystem.checkAnswer(this.puzzleId, answer);

    if (correct) {
      UISounds.puzzleSolve();
      this.feedbackText.setColor('#4ade80');
      this.feedbackText.setText('Correct!');
      this.hintText.setText('');

      // Check if puzzle unlocks an item
      const puzzle = puzzleSystem.getPuzzle(this.puzzleId);
      if (puzzle?.unlocks) {
        const save = SaveSystem.getInstance();
        save.setFlag(puzzle.unlocks, true);

        // Check if the unlock corresponds to an item to add to inventory
        const item = (itemsData.items as Array<{ id: string; name: string }>).find(
          i => i.id === puzzle.unlocks
        );
        if (item) {
          InventorySystem.getInstance().addItem(item.id);
          this.feedbackText.setText(`Correct! Found: ${item.name}`);
        }
      }

      // Journal entry for solving the puzzle
      if (puzzle) {
        SaveSystem.getInstance().addJournalEntry(
          `Solved "${puzzle.name}" — ${puzzle.unlocks === 'case_closed' ? 'the full timeline is clear now.' : 'this reveals new evidence.'}`
        );
      }

      // Close after a moment
      this.time.delayedCall(1500, () => {
        if (this.onSolvedCallback) this.onSolvedCallback();
        this.closePuzzle();
      });
    } else {
      UISounds.wrongAnswer();
      this.feedbackText.setColor('#ff6b6b');
      this.feedbackText.setText('That\'s not right...');

      // Show progressive hint after failed attempts
      const hint = puzzleSystem.getHint(this.puzzleId);
      if (hint) {
        this.hintText.setText(`Hint: ${hint}`);
      }

      // Shake effect
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
