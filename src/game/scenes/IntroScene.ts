import Phaser from 'phaser';
import { Colors, TextColors, FONT } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';

// ─── Slide Configuration ────────────────────────────────────────────────────
// Each slide can have: background image, parallax zoom/pan, audio cues,
// cinematic effects, and text with different reveal styles.

interface CameraMotion {
  // Start/end scale for slow zoom (1.0 = normal, 1.15 = 15% zoom in)
  scaleFrom?: number;
  scaleTo?: number;
  // Pan offset (pixels to drift during slide)
  panX?: number;
  panY?: number;
}

interface AudioCue {
  key: string;       // Phaser audio key
  delay?: number;    // ms after slide starts
  volume?: number;
  loop?: boolean;
}

interface CinematicEffect {
  type: 'screenShake' | 'ghostFlicker' | 'spotlight' | 'heartbeat' | 'flashWhite';
  delay?: number;    // ms after slide starts
  duration?: number;
}

interface IntroSlide {
  lines: string[];
  effect?: 'typewriter' | 'fade' | 'dramatic';
  pauseAfter?: number;
  // Visual
  bgImage?: string;             // texture key for background image
  bgTint?: number;              // tint color overlay on background
  bgAlpha?: number;             // background opacity (default 0.5)
  camera?: CameraMotion;        // slow zoom/pan
  fogIntensity?: number;
  // Audio
  audio?: AudioCue[];
  // Cinematic
  effects?: CinematicEffect[];
}

const INTRO_SLIDES: IntroSlide[] = [
  // ─── ACT I: The Night of the Murder (1928) ────────────────────────────────
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
    bgImage: 'intro_stage_1928',
    bgAlpha: 0.4,
    camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -10 },
    audio: [
      { key: 'ambient_theater', volume: 0.3, loop: true },
    ],
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
    bgImage: 'intro_goblet',
    bgAlpha: 0.35,
    camera: { scaleFrom: 1.05, scaleTo: 1.2, panY: 5 },
    audio: [
      { key: 'sfx_goblet', delay: 1500, volume: 0.5 },
      { key: 'sfx_thud', delay: 5500, volume: 0.4 },
    ],
    effects: [
      { type: 'screenShake', delay: 5500, duration: 300 },
    ],
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
    bgImage: 'intro_stage_empty',
    bgAlpha: 0.3,
    camera: { scaleFrom: 1.0, scaleTo: 1.05, panX: -15 },
  },

  // ─── ACT II: Present Day ──────────────────────────────────────────────────
  {
    lines: [
      'Nearly a century later...',
    ],
    effect: 'dramatic',
    pauseAfter: 2000,
    effects: [
      { type: 'flashWhite', delay: 0, duration: 400 },
    ],
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
    bgImage: 'intro_exterior',
    bgAlpha: 0.35,
    camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: -8 },
    fogIntensity: 0.08,
    effects: [
      { type: 'screenShake', delay: 5500, duration: 400 },
    ],
  },

  // ─── ACT III: The Ghost ───────────────────────────────────────────────────
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
    bgImage: 'intro_ghost',
    bgAlpha: 0.3,
    camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: 5 },
    fogIntensity: 0.15,
    audio: [
      { key: 'sfx_ghost_whisper', delay: 800, volume: 0.3 },
    ],
    effects: [
      { type: 'ghostFlicker', delay: 500, duration: 6000 },
    ],
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
    bgImage: 'intro_phone',
    bgAlpha: 0.3,
    camera: { scaleFrom: 1.0, scaleTo: 1.05, panX: 10 },
    audio: [
      { key: 'sfx_phone_ring', delay: 1500, volume: 0.4 },
    ],
  },

  // ─── ACT IV: The Call ─────────────────────────────────────────────────────
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
    bgImage: 'intro_phone',
    bgAlpha: 0.25,
    camera: { scaleFrom: 1.05, scaleTo: 1.12, panX: -5 },
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
    bgImage: 'intro_doors',
    bgAlpha: 0.35,
    camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -5 },
    fogIntensity: 0.05,
    audio: [
      { key: 'sfx_door_creak', delay: 200, volume: 0.5 },
    ],
  },
];

// ─── IntroScene Class ───────────────────────────────────────────────────────

export class IntroScene extends Phaser.Scene {
  private slideIndex = 0;
  private isAnimating = false;
  private canSkip = false;
  private currentTexts: Phaser.GameObjects.Text[] = [];
  private fogOverlay!: Phaser.GameObjects.Rectangle;
  private skipHint!: Phaser.GameObjects.Text;
  private abortSlide = false;

  // Background image layers
  private currentBg: Phaser.GameObjects.Image | null = null;
  private bgDarken!: Phaser.GameObjects.Rectangle;

  // Active audio tracks (so we can stop them on skip/transition)
  private activeSounds: Phaser.Sound.BaseSound[] = [];

  // Ghost flicker target (for the effect)
  private ghostOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);
    this.slideIndex = 0;
    this.isAnimating = false;
    this.canSkip = false;
    this.abortSlide = false;
    this.currentTexts = [];
    this.activeSounds = [];
    this.currentBg = null;
    this.ghostOverlay = null;

    // Base black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setDepth(0);

    // Background darkening layer (sits between bg image and text)
    this.bgDarken = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    this.bgDarken.setDepth(0.5);

    // Subtle fog overlay
    this.fogOverlay = this.add.rectangle(width / 2, height / 2, width, height, Colors.fog, 0);
    this.fogOverlay.setDepth(3);

    // Ambient particles (dust motes)
    this.createDustParticles();

    // Skip hint (bottom right)
    this.skipHint = this.add.text(width - 20, height - 20, 'Click to continue', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(1, 1).setAlpha(0).setDepth(10);

    // Skip button (top right)
    const skipBtn = this.add.text(width - 24, 24, 'SKIP ▸', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.goldDim,
      letterSpacing: 2,
    }).setOrigin(1, 0).setAlpha(0).setDepth(10);
    skipBtn.setInteractive({ cursor: POINTER_CURSOR });
    skipBtn.on('pointerover', () => skipBtn.setColor(TextColors.gold));
    skipBtn.on('pointerout', () => skipBtn.setColor(TextColors.goldDim));
    skipBtn.on('pointerdown', () => this.skipToGame());
    this.tweens.add({ targets: skipBtn, alpha: 0.7, duration: 1500, delay: 2000 });

    // Click handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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

  // ─── Dust Particles ─────────────────────────────────────────────────────

  private createDustParticles(): void {
    const { width, height } = this.cameras.main;
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const mote = this.add.circle(x, y, size, 0xc9a84c, Phaser.Math.FloatBetween(0.05, 0.15));
      mote.setDepth(4);

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

  // ─── Input Handling ─────────────────────────────────────────────────────

  private handleClick(): void {
    if (!this.canSkip) return;

    if (this.isAnimating) {
      this.abortSlide = true;
    } else {
      this.nextSlide();
    }
  }

  // ─── Slide Display (master controller) ──────────────────────────────────

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

    // Transition background image
    this.transitionBackground(slide);

    // Update fog
    if (slide.fogIntensity !== undefined) {
      this.tweens.add({
        targets: this.fogOverlay,
        fillAlpha: slide.fogIntensity,
        duration: 1500,
      });
    }

    // Trigger audio cues
    this.triggerAudio(slide);

    // Trigger cinematic effects
    this.triggerEffects(slide);

    // Show text
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

    if (!this.abortSlide) {
      await this.wait(slide.pauseAfter || 2000);
    }
  }

  // ─── Background Image System ────────────────────────────────────────────

  private transitionBackground(slide: IntroSlide): void {
    const { width, height } = this.cameras.main;

    // Fade out old background
    if (this.currentBg) {
      const oldBg = this.currentBg;
      this.tweens.add({
        targets: oldBg,
        alpha: 0,
        duration: 800,
        onComplete: () => oldBg.destroy(),
      });
      this.currentBg = null;
    }

    if (!slide.bgImage || !this.textures.exists(slide.bgImage)) return;

    const bgAlpha = slide.bgAlpha ?? 0.5;
    const bg = this.add.image(width / 2, height / 2, slide.bgImage);
    bg.setDepth(0.2);
    bg.setAlpha(0);

    // Scale to cover the screen (with slight oversize for pan room)
    const scaleX = (width * 1.2) / bg.width;
    const scaleY = (height * 1.2) / bg.height;
    const baseScale = Math.max(scaleX, scaleY);
    bg.setScale(baseScale);

    // Apply tint if specified
    if (slide.bgTint !== undefined) {
      bg.setTint(slide.bgTint);
    }

    // Fade in
    this.tweens.add({
      targets: bg,
      alpha: bgAlpha,
      duration: 1200,
    });

    // Parallax camera motion (slow zoom + pan)
    if (slide.camera) {
      const cam = slide.camera;
      const startScale = baseScale * (cam.scaleFrom ?? 1.0);
      const endScale = baseScale * (cam.scaleTo ?? 1.0);
      const panX = cam.panX ?? 0;
      const panY = cam.panY ?? 0;

      bg.setScale(startScale);

      // Duration based on slide text length (longer text = longer motion)
      const motionDuration = (slide.pauseAfter ?? 2000) + slide.lines.length * 800;

      this.tweens.add({
        targets: bg,
        scaleX: endScale,
        scaleY: endScale,
        x: width / 2 + panX,
        y: height / 2 + panY,
        duration: motionDuration,
        ease: 'Sine.easeInOut',
      });
    }

    this.currentBg = bg;
  }

  // ─── Audio System ───────────────────────────────────────────────────────

  private triggerAudio(slide: IntroSlide): void {
    if (!slide.audio) return;

    for (const cue of slide.audio) {
      // Only play if the audio key is loaded
      if (!this.cache.audio.exists(cue.key)) continue;

      const delay = cue.delay ?? 0;

      this.time.delayedCall(delay, () => {
        if (this.abortSlide) return;

        const sound = this.sound.add(cue.key, {
          volume: cue.volume ?? 0.3,
          loop: cue.loop ?? false,
        });
        sound.play();
        this.activeSounds.push(sound);
      });
    }
  }

  private stopAllSounds(): void {
    for (const s of this.activeSounds) {
      if (s.isPlaying) {
        s.stop();
      }
      s.destroy();
    }
    this.activeSounds = [];
  }

  // ─── Cinematic Effects ──────────────────────────────────────────────────

  private triggerEffects(slide: IntroSlide): void {
    if (!slide.effects) return;

    for (const fx of slide.effects) {
      this.time.delayedCall(fx.delay ?? 0, () => {
        if (this.abortSlide) return;

        switch (fx.type) {
          case 'screenShake':
            this.screenShake(fx.duration ?? 300);
            break;
          case 'ghostFlicker':
            this.ghostFlicker(fx.duration ?? 4000);
            break;
          case 'spotlight':
            this.spotlightBeam(fx.duration ?? 3000);
            break;
          case 'heartbeat':
            this.heartbeatPulse(fx.duration ?? 4000);
            break;
          case 'flashWhite':
            this.flashWhite(fx.duration ?? 300);
            break;
        }
      });
    }
  }

  private screenShake(duration: number): void {
    this.cameras.main.shake(duration, 0.008);
  }

  private ghostFlicker(duration: number): void {
    const { width, height } = this.cameras.main;

    // Create a semi-transparent white overlay that flickers
    if (!this.ghostOverlay) {
      this.ghostOverlay = this.add.rectangle(
        width / 2, height / 2, width, height, 0xccccff, 0,
      );
      this.ghostOverlay.setDepth(2);
    }

    const flickerCount = Math.floor(duration / 600);
    for (let i = 0; i < flickerCount; i++) {
      const delay = i * Phaser.Math.Between(400, 800);
      if (delay > duration) break;

      this.time.delayedCall(delay, () => {
        if (!this.ghostOverlay || this.abortSlide) return;
        this.tweens.add({
          targets: this.ghostOverlay,
          fillAlpha: { from: Phaser.Math.FloatBetween(0.03, 0.08), to: 0 },
          duration: Phaser.Math.Between(150, 350),
          ease: 'Sine.easeOut',
        });
      });
    }
  }

  private spotlightBeam(duration: number): void {
    const { width, height } = this.cameras.main;
    const spotlight = this.add.graphics();
    spotlight.setDepth(2.5);
    spotlight.setAlpha(0);

    // Draw a cone of light
    spotlight.fillStyle(0xffffcc, 0.06);
    spotlight.fillTriangle(
      width / 2, 0,
      width / 2 - 80, height * 0.7,
      width / 2 + 80, height * 0.7,
    );

    this.tweens.add({
      targets: spotlight,
      alpha: { from: 0, to: 1 },
      duration: 1000,
      yoyo: true,
      hold: duration - 2000,
      onComplete: () => spotlight.destroy(),
    });
  }

  private heartbeatPulse(duration: number): void {
    const { width, height } = this.cameras.main;
    const pulse = this.add.rectangle(width / 2, height / 2, width, height, 0x330000, 0);
    pulse.setDepth(2);

    const beats = Math.floor(duration / 1000);
    for (let i = 0; i < beats; i++) {
      this.time.delayedCall(i * 1000, () => {
        if (this.abortSlide) {
          pulse.destroy();
          return;
        }
        this.tweens.add({
          targets: pulse,
          fillAlpha: { from: 0.06, to: 0 },
          duration: 400,
          ease: 'Sine.easeOut',
        });
      });
    }

    this.time.delayedCall(duration, () => pulse.destroy());
  }

  private flashWhite(duration: number): void {
    const { width, height } = this.cameras.main;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(8);

    this.tweens.add({
      targets: flash,
      fillAlpha: { from: 0.2, to: 0 },
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  // ─── Text Effects ───────────────────────────────────────────────────────

  private typewriterSlide(lines: string[], startY: number, width: number, lineHeight: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let lineIndex = 0;

      const showNextLine = () => {
        if (this.abortSlide || lineIndex >= lines.length) {
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
        fontSize: '42px',
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
    const isQuote = text.startsWith('"') || text.startsWith('\u201c');
    const isStageDirection = text.startsWith('On stage') || text.startsWith('She ') || text.startsWith('You ');

    let color: string = TextColors.light;
    let style = 'normal';
    const size = '17px';

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
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000000',
        blur: 6,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(5);

    return t;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.abortSlide) {
        resolve();
        return;
      }
      const event = this.time.delayedCall(ms, () => resolve());
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
    this.stopAllSounds();
    this.transitionToGame();
  }

  private transitionToGame(): void {
    this.canSkip = false;
    this.input.removeAllListeners();
    this.stopAllSounds();

    const { width, height } = this.cameras.main;

    // Final dramatic fade
    this.tweens.add({
      targets: [...this.currentTexts, this.skipHint],
      alpha: 0,
      duration: 600,
    });

    // Fade out background
    if (this.currentBg) {
      this.tweens.add({
        targets: this.currentBg,
        alpha: 0,
        duration: 600,
      });
    }

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
