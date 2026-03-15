/**
 * BaseSlideScene — shared foundation for slide-based cinematic sequences.
 *
 * Provides: background image transitions, text effects (typewriter/fade/dramatic),
 * camera motion, audio system with procedural fallbacks, visual effects (ghost flicker,
 * heartbeat, screen shake, flash, spotlight), dust particles, skip/navigation UI.
 *
 * Subclasses override:
 *   - getSlides()             → return the slide data array
 *   - onTransitionComplete()  → what to do after curtain close (start next scene)
 *   - onBeforeTransition()    → optional hook before transition animation (save flags, etc.)
 *   - onSceneCreate()         → optional hook after base create() runs (cursor init, etc.)
 *   - getDustConfig()         → optional override for particle settings
 *   - getTimingConfig()       → optional override for fade-in / delay timing
 *   - getStageDirectionPrefixes() → text prefixes styled as stage directions
 */

import Phaser from 'phaser';
import { Colors, TextColors, FONT } from '../utils/constants';
import { UISounds } from '../utils/sounds';
import { playCurtainClose } from '../utils/transitions';
import { POINTER_CURSOR } from '../utils/cursors';

// ─── Slide types ─────────────────────────────────────────────────────────────

export interface CameraMotion {
  scaleFrom?: number;
  scaleTo?: number;
  panX?: number;
  panY?: number;
}

export interface AudioCue {
  /** Phaser audio key, or 'proc:methodName' for procedural UISounds */
  key: string;
  delay?: number;
  volume?: number;
  loop?: boolean;
}

export interface SlideEffect {
  type: 'screenShake' | 'ghostFlicker' | 'spotlight' | 'heartbeat' | 'flashWhite';
  delay?: number;
  duration?: number;
}

export interface Slide {
  lines: string[];
  effect?: 'typewriter' | 'fade' | 'dramatic';
  pauseAfter?: number;
  bgImage?: string;
  bgTint?: number;
  bgAlpha?: number;
  camera?: CameraMotion;
  fogIntensity?: number;
  audio?: AudioCue[];
  effects?: SlideEffect[];
}

// ─── Procedural sound dispatch ───────────────────────────────────────────────

/** Maps procedural sound names (used with 'proc:' prefix) and Phaser audio key
 *  fallbacks to UISounds methods. Both scenes share this single dispatch table. */
const PROC_DISPATCH: Record<string, () => void> = {
  // Procedural names (used as proc:ghostDrone etc.)
  ghostDrone: () => UISounds.ghostDrone(),
  ghostDroneLong: () => UISounds.ghostDroneLong(),
  ghostWhisper: () => UISounds.ghostWhisper(),
  eerieWhistle: () => UISounds.eerieWhistle(),
  heartbeat: () => UISounds.heartbeat(),
  lightSurge: () => UISounds.lightSurge(),
  shimmer: () => UISounds.shimmer(),
  gobletClink: () => UISounds.gobletClink(),
  bodyThud: () => UISounds.bodyThud(),
  phoneRing: () => UISounds.phoneRing(),
  doorCreak: () => UISounds.doorCreak(),
  theaterDrone: () => UISounds.theaterDrone(),
  // Phaser audio key fallbacks (used when audio file fails to load)
  sfx_goblet: () => UISounds.gobletClink(),
  sfx_thud: () => UISounds.bodyThud(),
  sfx_ghost_whisper: () => UISounds.ghostWhisper(),
  sfx_phone_ring: () => UISounds.phoneRing(),
  sfx_door_creak: () => UISounds.doorCreak(),
  sfx_heartbeat: () => UISounds.heartbeat(),
  ambient_theater: () => UISounds.theaterDrone(),
};

// ─── Configuration interfaces ────────────────────────────────────────────────

interface DustConfig {
  count: number;
  driftX: number;
  driftY: number;
  alphaMin: number;
  alphaMax: number;
  durationMin: number;
  durationMax: number;
}

interface TimingConfig {
  fadeInDuration: number;
  startDelay: number;
  skipBtnDelay: number;
}

// ─── BaseSlideScene ──────────────────────────────────────────────────────────

export abstract class BaseSlideScene extends Phaser.Scene {
  protected slideIndex = 0;
  protected isAnimating = false;
  protected canSkip = false;
  protected abortSlide = false;
  protected currentTexts: Phaser.GameObjects.Text[] = [];
  protected fogOverlay!: Phaser.GameObjects.Rectangle;
  protected skipHint!: Phaser.GameObjects.Text;
  protected currentBg: Phaser.GameObjects.Image | null = null;
  protected ghostOverlay: Phaser.GameObjects.Rectangle | null = null;
  private bgDarken!: Phaser.GameObjects.Rectangle;
  private activeSounds: Phaser.Sound.BaseSound[] = [];

  // ─── Abstract / overridable ──────────────────────────────────────────────

  /** Return the slides for this scene. */
  protected abstract getSlides(): Slide[];

  /** Called after curtain close — start the next scene. */
  protected abstract onTransitionComplete(): void;

  /** Hook before transition animation (e.g., save flags). Default: no-op. */
  protected onBeforeTransition(): void { /* no-op */ }

  /** Hook after base create() runs (e.g., cursor init, ambient sound). Default: no-op. */
  protected onSceneCreate(): void { /* no-op */ }

  /** Dust particle configuration. */
  protected getDustConfig(): DustConfig {
    return { count: 20, driftX: 80, driftY: 60, alphaMin: 0.05, alphaMax: 0.15, durationMin: 6000, durationMax: 12000 };
  }

  /** Timing configuration for fade-in and initial delay. */
  protected getTimingConfig(): TimingConfig {
    return { fadeInDuration: 1000, startDelay: 1200, skipBtnDelay: 2000 };
  }

  /** Prefixes for stage-direction styled lines (italic, dim gold). */
  protected getStageDirectionPrefixes(): string[] {
    return ['On stage', 'She ', 'You ', 'A '];
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  protected resetState(): void {
    this.slideIndex = 0;
    this.isAnimating = false;
    this.canSkip = false;
    this.abortSlide = false;
    this.currentTexts = [];
    this.activeSounds = [];
    this.currentBg = null;
    this.ghostOverlay = null;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const timing = this.getTimingConfig();

    // Base black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setDepth(0);

    // Background darkening layer
    this.bgDarken = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35);
    this.bgDarken.setDepth(0.5);

    // Fog overlay
    this.fogOverlay = this.add.rectangle(width / 2, height / 2, width, height, Colors.fog, 0);
    this.fogOverlay.setDepth(3);

    // Dust particles
    this.createDustParticles();

    // Skip hint
    this.skipHint = this.add.text(width - 20, height - 20, 'Click to continue', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim, fontStyle: 'italic',
    }).setOrigin(1, 1).setAlpha(0).setDepth(10);

    // Skip button
    const skipBtn = this.add.text(width - 24, 24, 'SKIP \u25b8', {
      fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim, letterSpacing: 2,
    }).setOrigin(1, 0).setAlpha(0).setDepth(10);
    skipBtn.setInteractive({ cursor: POINTER_CURSOR });
    skipBtn.on('pointerover', () => skipBtn.setColor(TextColors.gold));
    skipBtn.on('pointerout', () => skipBtn.setColor(TextColors.goldDim));
    skipBtn.on('pointerdown', () => this.skip());
    this.tweens.add({ targets: skipBtn, alpha: 0.7, duration: 1500, delay: timing.skipBtnDelay });

    // Input handlers
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > width - 80 && pointer.y < 50) return;
      this.handleClick();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.handleClick());
    this.input.keyboard?.on('keydown-ENTER', () => this.handleClick());
    this.input.keyboard?.on('keydown-ESC', () => this.skip());

    // Subclass hook
    this.onSceneCreate();

    // Fade in and start slides
    this.cameras.main.fadeIn(timing.fadeInDuration, 0, 0, 0);
    this.time.delayedCall(timing.startDelay, () => {
      this.canSkip = true;
      this.tweens.add({ targets: this.skipHint, alpha: 0.6, duration: 500 });
      this.showSlide();
    });
  }

  // ─── Dust Particles ──────────────────────────────────────────────────────

  private createDustParticles(): void {
    const { width, height } = this.cameras.main;
    const cfg = this.getDustConfig();
    for (let i = 0; i < cfg.count; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const mote = this.add.circle(x, y, size, 0xc9a84c, Phaser.Math.FloatBetween(cfg.alphaMin, cfg.alphaMax));
      mote.setDepth(4);
      this.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-cfg.driftX, cfg.driftX),
        y: y + Phaser.Math.Between(-cfg.driftY, cfg.driftY),
        alpha: { from: mote.alpha, to: Phaser.Math.FloatBetween(0.02, cfg.alphaMax * 0.8) },
        duration: Phaser.Math.Between(cfg.durationMin, cfg.durationMax),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  private handleClick(): void {
    if (!this.canSkip) return;
    if (this.isAnimating) {
      this.abortSlide = true;
    } else {
      this.nextSlide();
    }
  }

  // ─── Slide Display ───────────────────────────────────────────────────────

  private async showSlide(): Promise<void> {
    const slides = this.getSlides();
    if (this.slideIndex >= slides.length) {
      this.transitionOut();
      return;
    }

    const slide = slides[this.slideIndex];
    this.isAnimating = true;
    this.abortSlide = false;

    // Clear previous texts
    this.currentTexts.forEach(t => t.destroy());
    this.currentTexts = [];

    // Background
    this.transitionBackground(slide);

    // Fog
    if (slide.fogIntensity !== undefined) {
      this.tweens.add({ targets: this.fogOverlay, fillAlpha: slide.fogIntensity, duration: 1500 });
    }

    // Audio
    this.triggerAudio(slide);

    // Effects
    this.triggerEffects(slide);

    // Text
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

    // After text finishes (naturally or via click), pause then auto-advance.
    // Reset abortSlide so the pause timer runs even if user clicked to rush text.
    this.abortSlide = false;
    await this.wait(slide.pauseAfter || 2000);

    // Auto-advance to next slide after pause completes
    if (!this.abortSlide) {
      this.nextSlide();
    }
  }

  // ─── Background ──────────────────────────────────────────────────────────

  private transitionBackground(slide: Slide): void {
    const { width, height } = this.cameras.main;

    if (this.currentBg) {
      const oldBg = this.currentBg;
      this.tweens.add({
        targets: oldBg, alpha: 0, duration: 800,
        onComplete: () => oldBg.destroy(),
      });
      this.currentBg = null;
    }

    if (!slide.bgImage || !this.textures.exists(slide.bgImage)) return;

    const bgAlpha = slide.bgAlpha ?? 0.5;
    const bg = this.add.image(width / 2, height / 2, slide.bgImage);
    bg.setDepth(0.2);
    bg.setAlpha(0);

    const scaleX = (width * 1.2) / bg.width;
    const scaleY = (height * 1.2) / bg.height;
    const baseScale = Math.max(scaleX, scaleY);
    bg.setScale(baseScale);

    if (slide.bgTint !== undefined) bg.setTint(slide.bgTint);

    this.tweens.add({ targets: bg, alpha: bgAlpha, duration: 1200 });

    if (slide.camera) {
      const cam = slide.camera;
      const startScale = baseScale * (cam.scaleFrom ?? 1.0);
      const endScale = baseScale * (cam.scaleTo ?? 1.0);
      bg.setScale(startScale);
      const motionDuration = (slide.pauseAfter ?? 2000) + slide.lines.length * 800;
      this.tweens.add({
        targets: bg,
        scaleX: endScale, scaleY: endScale,
        x: width / 2 + (cam.panX ?? 0),
        y: height / 2 + (cam.panY ?? 0),
        duration: motionDuration, ease: 'Sine.easeInOut',
      });
    }

    this.currentBg = bg;
  }

  // ─── Audio ───────────────────────────────────────────────────────────────

  private triggerAudio(slide: Slide): void {
    if (!slide.audio) return;

    for (const cue of slide.audio) {
      const delay = cue.delay ?? 0;

      this.time.delayedCall(delay, () => {
        if (this.abortSlide) return;

        // Procedural sound: key starts with 'proc:'
        if (cue.key.startsWith('proc:')) {
          const fn = PROC_DISPATCH[cue.key.substring(5)];
          if (fn) fn();
          return;
        }

        // Try Phaser loaded audio
        if (this.cache.audio.exists(cue.key)) {
          const sound = this.sound.add(cue.key, {
            volume: cue.volume ?? 0.3,
            loop: cue.loop ?? false,
          });
          sound.play();
          this.activeSounds.push(sound);
          return;
        }

        // Fall back to procedural dispatch by Phaser key
        const fallback = PROC_DISPATCH[cue.key];
        if (fallback) fallback();
      });
    }
  }

  protected stopAllSounds(): void {
    for (const s of this.activeSounds) {
      if (s.isPlaying) s.stop();
      s.destroy();
    }
    this.activeSounds = [];
  }

  // ─── Effects ─────────────────────────────────────────────────────────────

  private triggerEffects(slide: Slide): void {
    if (!slide.effects) return;

    for (const fx of slide.effects) {
      this.time.delayedCall(fx.delay ?? 0, () => {
        if (this.abortSlide) return;

        switch (fx.type) {
          case 'screenShake':
            this.cameras.main.shake(fx.duration ?? 300, 0.008);
            break;
          case 'ghostFlicker':
            this.ghostFlickerEffect(fx.duration ?? 4000);
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

  private ghostFlickerEffect(duration: number): void {
    const { width, height } = this.cameras.main;
    if (!this.ghostOverlay) {
      this.ghostOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0xccccff, 0);
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
          duration: Phaser.Math.Between(150, 350), ease: 'Sine.easeOut',
        });
      });
    }
  }

  private spotlightBeam(duration: number): void {
    const { width, height } = this.cameras.main;
    const spotlight = this.add.graphics();
    spotlight.setDepth(2.5);
    spotlight.setAlpha(0);
    spotlight.fillStyle(0xffffcc, 0.06);
    spotlight.fillTriangle(
      width / 2, 0,
      width / 2 - 80, height * 0.7,
      width / 2 + 80, height * 0.7,
    );
    this.tweens.add({
      targets: spotlight,
      alpha: { from: 0, to: 1 },
      duration: 1000, yoyo: true, hold: duration - 2000,
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
        if (this.abortSlide) { pulse.destroy(); return; }
        this.tweens.add({
          targets: pulse, fillAlpha: { from: 0.06, to: 0 },
          duration: 400, ease: 'Sine.easeOut',
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
      targets: flash, fillAlpha: { from: 0.2, to: 0 },
      duration, ease: 'Cubic.easeOut', onComplete: () => flash.destroy(),
    });
  }

  // ─── Text Effects ────────────────────────────────────────────────────────

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
        if (line === '') { lineIndex++; showNextLine(); return; }

        const textObj = this.createLineText(width / 2, startY + lineIndex * lineHeight, '');
        textObj.setData('lineIndex', lineIndex);
        textObj.setAlpha(1);
        this.currentTexts.push(textObj);

        let charIndex = 0;
        const typeChar = () => {
          if (this.abortSlide) {
            textObj.setText(line); lineIndex++; showNextLine(); return;
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
          targets: t, alpha: 1, duration: 600, delay: i * 400,
          onComplete: () => { if (i === textsToFade.length - 1) resolve(); },
        });
      });
    });
  }

  private dramaticSlide(lines: string[], startY: number, width: number, lineHeight: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const line = lines[0] || '';
      const t = this.add.text(width / 2, startY + lineHeight, line, {
        fontFamily: FONT, fontSize: '42px', color: TextColors.gold,
        fontStyle: 'italic', align: 'center',
      }).setOrigin(0.5).setAlpha(0).setDepth(5);
      this.currentTexts.push(t);

      if (this.abortSlide) { t.setAlpha(1); resolve(); return; }

      this.tweens.add({
        targets: t, alpha: 1,
        scaleX: { from: 0.8, to: 1 }, scaleY: { from: 0.8, to: 1 },
        duration: 1200, ease: 'Cubic.easeOut', onComplete: () => resolve(),
      });
    });
  }

  private createLineText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    const isQuote = text.startsWith('"') || text.startsWith('\u201c');
    const prefixes = this.getStageDirectionPrefixes();
    const isStageDirection = prefixes.some(p => text.startsWith(p));

    let color: string = TextColors.light;
    let style = 'normal';

    if (isQuote) { color = TextColors.gold; style = 'italic'; }
    else if (isStageDirection) { color = TextColors.goldDim; style = 'italic'; }

    return this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '26px', color, fontStyle: style, align: 'center',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(5);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.abortSlide) { resolve(); return; }
      const event = this.time.delayedCall(ms, () => resolve());
      const checkAbort = this.time.addEvent({
        delay: 50, repeat: Math.ceil(ms / 50),
        callback: () => {
          if (this.abortSlide) { event.remove(false); checkAbort.remove(false); resolve(); }
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
      targets: fadeOutTargets, alpha: 0, duration: 400,
      onComplete: () => {
        fadeOutTargets.forEach(t => t.destroy());
        this.currentTexts = this.currentTexts.filter(t => !fadeOutTargets.includes(t));
        this.slideIndex++;
        this.showSlide();
      },
    });
  }

  private skip(): void {
    this.canSkip = false;
    this.abortSlide = true;
    this.time.removeAllEvents();
    this.stopAllSounds();
    this.transitionOut();
  }

  private transitionOut(): void {
    this.canSkip = false;
    this.input.removeAllListeners();
    this.stopAllSounds();
    this.onBeforeTransition();

    const { width, height } = this.cameras.main;

    // Fade out text and background
    this.tweens.add({
      targets: [...this.currentTexts, this.skipHint],
      alpha: 0, duration: 600,
    });
    if (this.currentBg) {
      this.tweens.add({ targets: this.currentBg, alpha: 0, duration: 600 });
    }

    // Flash then curtain close
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(50);

    this.time.delayedCall(600, () => {
      this.tweens.add({
        targets: flash, fillAlpha: 0.15, duration: 200, yoyo: true,
        onComplete: () => {
          UISounds.doorTransition();
          playCurtainClose(this, () => this.onTransitionComplete());
        },
      });
    });
  }
}
