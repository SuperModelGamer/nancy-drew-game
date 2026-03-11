import Phaser from 'phaser';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';

interface IntroSlide {
  lines: string[];
  effect?: 'typewriter' | 'fade' | 'dramatic';
  pauseAfter?: number;
  bgColor?: number;
  fogIntensity?: number;
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    lines: [
      'October 31, 1928.',
      '',
      'The Monarch Theatre is packed to the rafters.',
      'Every seat sold for the final performance of',
      '"The Crimson Veil."',
    ],
    effect: 'typewriter',
    pauseAfter: 2000,
    bgColor: 0x000000,
  },
  {
    lines: [
      'On stage, Margaux Fontaine raises the goblet.',
      'The audience holds its breath.',
      '',
      'She drinks.',
      '',
      'She falls.',
      '',
      'The curtain drops for the last time.',
    ],
    effect: 'typewriter',
    pauseAfter: 2500,
  },
  {
    lines: [
      'They called it a tragic accident.',
      'Poison in a prop goblet — a terrible mistake.',
      '',
      'But someone in that theater knew the truth.',
      'And they took it to their grave.',
    ],
    effect: 'fade',
    pauseAfter: 2500,
  },
  {
    lines: [
      'Nearly a century later...',
    ],
    effect: 'dramatic',
    pauseAfter: 2000,
  },
  {
    lines: [
      'The Monarch Theatre stands condemned.',
      'Developer Roland Ashworth plans to demolish it.',
      '',
      'Then he collapses at the concierge desk.',
      'Poisoned — the same way Margaux died.',
    ],
    effect: 'fade',
    pauseAfter: 2500,
    fogIntensity: 0.08,
  },
  {
    lines: [
      'And the ghost has returned.',
      '',
      'A figure in white on the empty stage.',
      'Footsteps where no one walks.',
      'A voice reciting lines from a play',
      'that ended in murder.',
    ],
    effect: 'typewriter',
    pauseAfter: 2500,
    fogIntensity: 0.15,
  },
  {
    lines: [
      'Vivian Delacroix — Margaux\'s goddaughter —',
      'has lived in the Monarch her entire life.',
      '',
      'She\'s the one who called you.',
    ],
    effect: 'fade',
    pauseAfter: 2000,
  },
  {
    lines: [
      '"Nancy, please come quickly.',
      'The demolition crew arrives tomorrow.',
      'Someone has been poisoned.',
      'And the ghost of Margaux Fontaine',
      'walks these halls again."',
    ],
    effect: 'typewriter',
    pauseAfter: 2500,
  },
  {
    lines: [
      'You push through the heavy front doors',
      'of the Monarch Theatre.',
      '',
      'The lobby is dark.',
      'A single lamp burns at the concierge desk.',
      '',
      'Vivian is waiting.',
    ],
    effect: 'fade',
    pauseAfter: 2000,
    fogIntensity: 0.05,
  },
];

export class IntroScene extends Phaser.Scene {
  private slideIndex = 0;
  private isAnimating = false;
  private canSkip = false;
  private currentTexts: Phaser.GameObjects.Text[] = [];
  private fogOverlay!: Phaser.GameObjects.Rectangle;
  private skipHint!: Phaser.GameObjects.Text;
  private abortSlide = false;

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.slideIndex = 0;
    this.isAnimating = false;
    this.canSkip = false;
    this.abortSlide = false;
    this.currentTexts = [];

    // Black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Subtle fog overlay
    this.fogOverlay = this.add.rectangle(width / 2, height / 2, width, height, Colors.fog, 0);
    this.fogOverlay.setDepth(1);

    // Ambient particles (dust motes)
    this.createDustParticles();

    // Skip hint (bottom right)
    this.skipHint = this.add.text(width - 20, height - 20, 'Click to continue', {
      fontFamily: FONT,
      fontSize: '12px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(1, 1).setAlpha(0).setDepth(10);

    // Skip button (top right)
    const skipBtn = this.add.text(width - 24, 24, 'SKIP ▸', {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.goldDim,
      letterSpacing: 2,
    }).setOrigin(1, 0).setAlpha(0).setDepth(10);
    skipBtn.setInteractive({ useHandCursor: true });
    skipBtn.on('pointerover', () => skipBtn.setColor(TextColors.gold));
    skipBtn.on('pointerout', () => skipBtn.setColor(TextColors.goldDim));
    skipBtn.on('pointerdown', () => this.skipToGame());
    this.tweens.add({ targets: skipBtn, alpha: 0.7, duration: 1500, delay: 2000 });

    // Click handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't advance slides when clicking the skip button area
      if (pointer.x > width - 80 && pointer.y < 50) return;
      this.handleClick();
    });

    // Keyboard handler
    this.input.keyboard?.on('keydown-SPACE', () => this.handleClick());
    this.input.keyboard?.on('keydown-ENTER', () => this.handleClick());
    this.input.keyboard?.on('keydown-ESC', () => this.skipToGame());

    // Start first slide after a brief pause
    this.cameras.main.fadeIn(1000, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      this.canSkip = true;
      this.tweens.add({ targets: this.skipHint, alpha: 0.6, duration: 500 });
      this.showSlide();
    });
  }

  private createDustParticles(): void {
    const { width, height } = this.cameras.main;
    // Create floating dust motes using simple graphics
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const mote = this.add.circle(x, y, size, 0xc9a84c, Phaser.Math.FloatBetween(0.05, 0.15));
      mote.setDepth(2);

      // Slow drift animation
      this.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-80, 80),
        y: y + Phaser.Math.Between(-60, 60),
        alpha: { from: mote.alpha, to: Phaser.Math.FloatBetween(0.02, 0.12) },
        duration: Phaser.Math.Between(6000, 12000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private handleClick(): void {
    if (!this.canSkip) return;

    if (this.isAnimating) {
      // Skip current animation — show all text immediately
      this.abortSlide = true;
    } else {
      // Advance to next slide
      this.nextSlide();
    }
  }

  private async showSlide(): Promise<void> {
    if (this.slideIndex >= INTRO_SLIDES.length) {
      this.transitionToGame();
      return;
    }

    const slide = INTRO_SLIDES[this.slideIndex];
    this.isAnimating = true;
    this.abortSlide = false;

    // Clear previous texts
    this.currentTexts.forEach(t => t.destroy());
    this.currentTexts = [];

    // Update fog
    if (slide.fogIntensity !== undefined) {
      this.tweens.add({
        targets: this.fogOverlay,
        fillAlpha: slide.fogIntensity,
        duration: 1500,
      });
    }

    const { width, height } = this.cameras.main;
    const totalLines = slide.lines.length;
    const lineHeight = 32;
    const startY = height / 2 - (totalLines * lineHeight) / 2;

    if (slide.effect === 'typewriter') {
      await this.typewriterSlide(slide.lines, startY, width, lineHeight);
    } else if (slide.effect === 'dramatic') {
      await this.dramaticSlide(slide.lines, startY, width, lineHeight);
    } else {
      await this.fadeSlide(slide.lines, startY, width, lineHeight);
    }

    this.isAnimating = false;

    // Auto-advance after pause (if not skipped)
    if (!this.abortSlide) {
      await this.wait(slide.pauseAfter || 2000);
    }
  }

  private typewriterSlide(lines: string[], startY: number, width: number, lineHeight: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let lineIndex = 0;

      const showNextLine = () => {
        if (this.abortSlide || lineIndex >= lines.length) {
          // Show all remaining lines instantly
          for (let i = lineIndex; i < lines.length; i++) {
            if (lines[i] === '') continue;
            const existing = this.currentTexts.find(t => t.getData('lineIndex') === i);
            if (!existing) {
              const t = this.createLineText(width / 2, startY + i * lineHeight, lines[i]);
              t.setData('lineIndex', i);
              t.setAlpha(1);
              this.currentTexts.push(t);
            } else {
              existing.setAlpha(1);
            }
          }
          resolve();
          return;
        }

        const line = lines[lineIndex];
        if (line === '') {
          lineIndex++;
          showNextLine();
          return;
        }

        const textObj = this.createLineText(width / 2, startY + lineIndex * lineHeight, '');
        textObj.setData('lineIndex', lineIndex);
        textObj.setAlpha(1);
        this.currentTexts.push(textObj);

        let charIndex = 0;
        const typeChar = () => {
          if (this.abortSlide) {
            textObj.setText(line);
            lineIndex++;
            showNextLine();
            return;
          }

          if (charIndex < line.length) {
            charIndex++;
            textObj.setText(line.substring(0, charIndex));
            this.time.delayedCall(35, typeChar);
          } else {
            lineIndex++;
            this.time.delayedCall(300, showNextLine);
          }
        };

        typeChar();
      };

      showNextLine();
    });
  }

  private fadeSlide(lines: string[], startY: number, width: number, lineHeight: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const textsToFade: Phaser.GameObjects.Text[] = [];

      lines.forEach((line, i) => {
        if (line === '') return;
        const t = this.createLineText(width / 2, startY + i * lineHeight, line);
        t.setAlpha(0);
        this.currentTexts.push(t);
        textsToFade.push(t);
      });

      if (this.abortSlide || textsToFade.length === 0) {
        textsToFade.forEach(t => t.setAlpha(1));
        resolve();
        return;
      }

      // Stagger fade in
      textsToFade.forEach((t, i) => {
        this.tweens.add({
          targets: t,
          alpha: 1,
          duration: 600,
          delay: i * 400,
          onComplete: () => {
            if (i === textsToFade.length - 1) resolve();
          },
        });
      });
    });
  }

  private dramaticSlide(lines: string[], startY: number, width: number, lineHeight: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const line = lines[0] || '';
      const t = this.add.text(width / 2, startY + lineHeight, line, {
        fontFamily: FONT,
        fontSize: '28px',
        color: TextColors.gold,
        fontStyle: 'italic',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0).setDepth(5);
      this.currentTexts.push(t);

      if (this.abortSlide) {
        t.setAlpha(1);
        resolve();
        return;
      }

      this.tweens.add({
        targets: t,
        alpha: 1,
        scaleX: { from: 0.8, to: 1 },
        scaleY: { from: 0.8, to: 1 },
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private createLineText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    // Check if this is a quote line (starts with ")
    const isQuote = text.startsWith('"') || text.startsWith('\u201c');
    const isStageDirection = text.startsWith('On stage') || text.startsWith('She ') || text.startsWith('You ');

    let color: string = TextColors.light;
    let style = 'normal';
    let size = '17px';

    if (isQuote) {
      color = TextColors.gold;
      style = 'italic';
    } else if (isStageDirection) {
      color = TextColors.goldDim;
      style = 'italic';
    }

    const t = this.add.text(x, y, text, {
      fontFamily: FONT,
      fontSize: size,
      color,
      fontStyle: style,
      align: 'center',
    }).setOrigin(0.5).setDepth(5);

    return t;
  }

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.abortSlide) {
        resolve();
        return;
      }
      const event = this.time.delayedCall(ms, () => resolve());
      // Allow skipping to cancel the wait
      const checkAbort = this.time.addEvent({
        delay: 50,
        repeat: Math.ceil(ms / 50),
        callback: () => {
          if (this.abortSlide) {
            event.remove(false);
            checkAbort.remove(false);
            resolve();
          }
        },
      });
    });
  }

  private nextSlide(): void {
    // Fade out current texts
    const fadeOutTargets = [...this.currentTexts];

    if (fadeOutTargets.length === 0) {
      this.slideIndex++;
      this.showSlide();
      return;
    }

    this.tweens.add({
      targets: fadeOutTargets,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        fadeOutTargets.forEach(t => t.destroy());
        this.currentTexts = this.currentTexts.filter(t => !fadeOutTargets.includes(t));
        this.slideIndex++;
        this.showSlide();
      },
    });
  }

  private skipToGame(): void {
    this.canSkip = false;
    this.transitionToGame();
  }

  private transitionToGame(): void {
    this.canSkip = false;
    this.input.removeAllListeners();

    const { width, height } = this.cameras.main;

    // Final dramatic fade
    this.tweens.add({
      targets: [...this.currentTexts, this.skipHint],
      alpha: 0,
      duration: 600,
    });

    // Brief white flash then fade to black
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(50);

    this.time.delayedCall(600, () => {
      this.tweens.add({
        targets: flash,
        fillAlpha: 0.15,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(800, 0, 0, 0);
          this.time.delayedCall(800, () => {
            this.scene.start('RoomScene', { roomId: 'lobby' });
            this.scene.launch('UIScene');
          });
        },
      });
    });
  }
}
