import Phaser from 'phaser';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';

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

    // Dark overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.overlay.setInteractive(); // block clicks through
    this.overlay.setDepth(Depths.puzzleOverlay);

    // Main panel
    const panelW = Math.min(width * 0.85, 600);
    const panelH = Math.min(height * 0.75, 500);
    this.panel = this.add.container(width / 2, height / 2);
    this.panel.setDepth(Depths.puzzleContent);

    const bg = this.add.rectangle(0, 0, panelW, panelH, Colors.panelBg, 0.97);
    bg.setStrokeStyle(2, Colors.gold, 0.8);
    this.panel.add(bg);

    // Title
    const title = this.add.text(0, -panelH / 2 + 30, puzzle.name, {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.add(title);

    // Description
    const desc = this.add.text(0, -panelH / 2 + 70, puzzle.description, {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.light,
      wordWrap: { width: panelW - 60 },
      lineSpacing: 4,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.panel.add(desc);

    // Feedback text (for wrong answers, success messages)
    this.feedbackText = this.add.text(0, panelH / 2 - 80, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#ff6b6b',
      align: 'center',
    }).setOrigin(0.5);
    this.panel.add(this.feedbackText);

    // Hint text
    this.hintText = this.add.text(0, panelH / 2 - 55, '', {
      fontFamily: FONT,
      fontSize: '13px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
      wordWrap: { width: panelW - 60 },
      align: 'center',
    }).setOrigin(0.5);
    this.panel.add(this.hintText);

    // Close button
    const closeBtn = this.add.text(panelW / 2 - 20, -panelH / 2 + 15, '✕', {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor(TextColors.gold));
    closeBtn.on('pointerout', () => closeBtn.setColor(TextColors.goldDim));
    closeBtn.on('pointerdown', () => this.closePuzzle());
    this.panel.add(closeBtn);

    // Build the puzzle UI based on type
    switch (puzzle.type) {
      case 'combination':
        this.buildCombinationUI(panelW, panelH, puzzle.answer);
        break;
      case 'sequence':
        this.buildSequenceUI(panelW, panelH, puzzle.answer);
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

  private buildCombinationUI(panelW: number, _panelH: number, answer: string): void {
    const parts = answer.split('-');
    this.dialCount = parts.length;
    this.dialSeparator = '-';
    this.dials = new Array(this.dialCount).fill(0);

    const dialSpacing = Math.min(80, (panelW - 80) / this.dialCount);
    const startX = -(this.dialCount - 1) * dialSpacing / 2;
    const dialY = 30;

    for (let i = 0; i < this.dialCount; i++) {
      const x = startX + i * dialSpacing;

      // Up arrow
      const upBtn = this.add.text(x, dialY - 50, '▲', {
        fontFamily: FONT,
        fontSize: '24px',
        color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upBtn.on('pointerdown', () => this.changeDial(i, 1));
      upBtn.on('pointerover', () => upBtn.setColor('#ffffff'));
      upBtn.on('pointerout', () => upBtn.setColor(TextColors.gold));
      this.panel.add(upBtn);

      // Dial display
      const dialBg = this.add.rectangle(x, dialY, 50, 55, Colors.sceneBg, 0.9);
      dialBg.setStrokeStyle(2, Colors.gold, 0.6);
      this.panel.add(dialBg);

      const dialText = this.add.text(x, dialY, '0', {
        fontFamily: FONT,
        fontSize: '32px',
        color: TextColors.light,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.panel.add(dialText);
      this.dialTexts.push(dialText);

      // Down arrow
      const downBtn = this.add.text(x, dialY + 50, '▼', {
        fontFamily: FONT,
        fontSize: '24px',
        color: TextColors.gold,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      downBtn.on('pointerdown', () => this.changeDial(i, -1));
      downBtn.on('pointerover', () => downBtn.setColor('#ffffff'));
      downBtn.on('pointerout', () => downBtn.setColor(TextColors.gold));
      this.panel.add(downBtn);

      // Separator dash between dials
      if (i < this.dialCount - 1) {
        const sep = this.add.text(x + dialSpacing / 2, dialY, '—', {
          fontFamily: FONT,
          fontSize: '24px',
          color: TextColors.goldDim,
        }).setOrigin(0.5);
        this.panel.add(sep);
      }
    }

    // Submit button
    this.addSubmitButton(0, dialY + 100, () => {
      const answer = this.dials.join(this.dialSeparator);
      this.submitAnswer(answer);
    });
  }

  private buildSequenceUI(panelW: number, _panelH: number, answer: string): void {
    const steps = answer.split('-');
    const uniqueOptions = [...new Set(steps)];

    // Sequence display
    this.sequenceDisplay = this.add.text(0, 20, 'Sequence: (none)', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.light,
    }).setOrigin(0.5);
    this.panel.add(this.sequenceDisplay);

    // Option buttons
    const btnSpacing = Math.min(120, (panelW - 40) / uniqueOptions.length);
    const startX = -(uniqueOptions.length - 1) * btnSpacing / 2;
    const btnY = 75;

    uniqueOptions.forEach((option, i) => {
      const x = startX + i * btnSpacing;
      const btnContainer = this.add.container(x, btnY);

      const color = this.getSequenceColor(option);
      const btnBg = this.add.rectangle(0, 0, btnSpacing - 10, 48, color, 0.7);
      btnBg.setStrokeStyle(2, Colors.gold, 0.6);
      btnBg.setInteractive({ useHandCursor: true });

      const btnText = this.add.text(0, 0, option.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '14px',
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
    const clearBtn = this.add.text(-60, btnY + 55, 'Clear', {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => {
      this.sequenceInput = [];
      this.updateSequenceDisplay();
    });
    clearBtn.on('pointerover', () => clearBtn.setColor(TextColors.gold));
    clearBtn.on('pointerout', () => clearBtn.setColor(TextColors.goldDim));
    this.panel.add(clearBtn);

    // Submit button
    this.addSubmitButton(60, btnY + 55, () => {
      const answer = this.sequenceInput.join('-');
      this.submitAnswer(answer);
    });
  }

  private buildTextInputUI(_panelW: number, _panelH: number): void {
    // Text display area
    const inputBg = this.add.rectangle(0, 30, 300, 48, Colors.sceneBg, 0.9);
    inputBg.setStrokeStyle(2, Colors.gold, 0.6);
    this.panel.add(inputBg);

    this.textDisplay = this.add.text(0, 30, '|', {
      fontFamily: FONT,
      fontSize: '22px',
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
    const keySize = 28;
    const keySpacing = 30;
    const startX = -(cols - 1) * keySpacing / 2;
    const startY = 80;

    letters.split('').forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * keySpacing;
      const y = startY + row * (keySize + 6);

      const keyBg = this.add.rectangle(x, y, keySize, keySize, Colors.sceneBg, 0.8);
      keyBg.setStrokeStyle(1, Colors.gold, 0.4);
      keyBg.setInteractive({ useHandCursor: true });

      const keyText = this.add.text(x, y, char === ' ' ? '␣' : char, {
        fontFamily: FONT,
        fontSize: '14px',
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
    const bksX = startX + cols * keySpacing / 2 + 40;
    const bksY = startY + 3 * (keySize + 6);
    const bksBg = this.add.rectangle(bksX, bksY, 50, keySize, Colors.sceneBg, 0.8);
    bksBg.setStrokeStyle(1, Colors.gold, 0.4);
    bksBg.setInteractive({ useHandCursor: true });
    const bksText = this.add.text(bksX, bksY, '⌫', {
      fontSize: '16px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    bksBg.on('pointerdown', () => {
      this.textInput = this.textInput.slice(0, -1);
      this.textDisplay.setText(this.textInput + '|');
    });
    this.panel.add([bksBg, bksText]);

    // Submit
    this.addSubmitButton(0, startY + 4 * (keySize + 6) + 10, () => {
      this.submitAnswer(this.textInput);
    });
  }

  private addSubmitButton(x: number, y: number, onClick: () => void): void {
    const btnBg = this.add.rectangle(x, y, 140, 44, Colors.gold, 0.2);
    btnBg.setStrokeStyle(2, Colors.gold, 0.7);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(x, y, 'Submit', {
      fontFamily: FONT,
      fontSize: '18px',
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

  private submitAnswer(answer: string): void {
    const puzzleSystem = PuzzleSystem.getInstance();
    const correct = puzzleSystem.checkAnswer(this.puzzleId, answer);

    if (correct) {
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

      // Close after a moment
      this.time.delayedCall(1500, () => {
        if (this.onSolvedCallback) this.onSolvedCallback();
        this.closePuzzle();
      });
    } else {
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
