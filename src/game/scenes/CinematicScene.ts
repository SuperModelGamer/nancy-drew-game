/**
 * CinematicScene — plays a sequence of image slides with text before entering a room.
 *
 * Works like the IntroScene (background images, typewriter/fade text, camera motion,
 * cinematic effects) but is triggered by story events at room transitions.
 *
 * Slides use Midjourney stills or video frames as backgrounds. After the last slide,
 * the scene transitions to the target room with a curtain close.
 *
 * Usage:
 *   this.scene.start('CinematicScene', {
 *     cinematicId: 'ghost_sighting_auditorium',
 *     targetRoom: 'auditorium',
 *   });
 */

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { UISounds } from '../utils/sounds';
import { POINTER_CURSOR } from '../utils/cursors';

// ─── Slide types (mirrors IntroScene) ────────────────────────────────────────

interface CameraMotion {
  scaleFrom?: number;
  scaleTo?: number;
  panX?: number;
  panY?: number;
}

interface CinematicEffect {
  type: 'screenShake' | 'ghostFlicker' | 'flashWhite' | 'heartbeat';
  delay?: number;
  duration?: number;
}

interface AudioCue {
  /** Phaser audio key (loaded file) or 'proc:methodName' for procedural UISounds */
  key: string;
  delay?: number;
  volume?: number;
  loop?: boolean;
}

interface CinematicSlide {
  lines: string[];
  effect?: 'typewriter' | 'fade' | 'dramatic';
  pauseAfter?: number;
  bgImage?: string;
  bgTint?: number;
  bgAlpha?: number;
  camera?: CameraMotion;
  fogIntensity?: number;
  effects?: CinematicEffect[];
  audio?: AudioCue[];
}

// ─── Cinematic event definitions ─────────────────────────────────────────────

interface CinematicEvent {
  id: string;
  triggerRoom: string;
  triggerFlag: string;
  slides: CinematicSlide[];
  onComplete?: {
    setFlag?: string;
    addJournal?: string;
  };
}

const CINEMATIC_EVENTS: CinematicEvent[] = [
  {
    id: 'ghost_sighting_auditorium',
    triggerRoom: 'auditorium',
    triggerFlag: 'learned_about_margaux',
    slides: [
      // Slide 1: Eerie auditorium, lights dimming
      {
        lines: [
          'The lights flicker and dim...',
          '',
          'A cold mist rolls across the stage from nowhere.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_fog',
        bgAlpha: 0.6,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: -8 },
        fogIntensity: 0.12,
        effects: [
          { type: 'ghostFlicker', delay: 500, duration: 4000 },
        ],
        audio: [
          { key: 'cine_ambient_ghost', volume: 0.25, loop: true },
          { key: 'proc:ghostDroneLong', delay: 300 },
        ],
      },
      // Slide 2: Ghost figure appears on stage
      {
        lines: [
          'A figure in white stands center stage,',
          'bathed in a pale spotlight.',
        ],
        effect: 'fade',
        pauseAfter: 3000,
        bgImage: 'cine_ghost_figure',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: 5 },
        fogIntensity: 0.15,
        effects: [
          { type: 'ghostFlicker', delay: 200, duration: 5000 },
        ],
        audio: [
          { key: 'proc:eerieWhistle', delay: 500 },
          { key: 'cine_whisper', delay: 1500, volume: 0.15 },
        ],
      },
      // Slide 3: Ghost face reveal
      {
        lines: [
          'She turns toward you.',
          'For a moment, you see her face —',
          'beautiful, sorrowful, familiar',
          'from a hundred playbills.',
        ],
        effect: 'typewriter',
        pauseAfter: 3500,
        bgImage: 'cine_ghost_face',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.05, scaleTo: 1.15, panY: 3 },
        effects: [
          { type: 'heartbeat', delay: 0, duration: 4000 },
        ],
        audio: [
          { key: 'proc:heartbeat', delay: 0 },
          { key: 'proc:heartbeat', delay: 1000 },
          { key: 'proc:heartbeat', delay: 2000 },
          { key: 'proc:heartbeat', delay: 3000 },
          { key: 'proc:ghostWhisper', delay: 1200 },
        ],
      },
      // Slide 4: Ghost vanishes
      {
        lines: [
          'The lights surge.',
          'When your eyes adjust, the stage is empty.',
          '',
          'Only the ghost light remains.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_empty',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.08, scaleTo: 1.0, panY: -5 },
        effects: [
          { type: 'flashWhite', delay: 0, duration: 500 },
          { type: 'screenShake', delay: 0, duration: 400 },
        ],
        audio: [
          { key: 'proc:lightSurge', delay: 0 },
        ],
      },
      // Slide 5: Aftermath
      {
        lines: [
          '...But the scent of old roses',
          'lingers in the air.',
        ],
        effect: 'dramatic',
        pauseAfter: 2500,
        fogIntensity: 0.06,
        audio: [
          { key: 'proc:shimmer', delay: 500 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'saw_ghost',
      addJournal: 'I saw her — or something pretending to be her. A woman in white on the stage. She vanished through the floor. Ghost or hoax, someone is haunting the Monarch.',
    },
  },
];

// ─── Public helper for checking triggerable cinematics ───────────────────────

export function getCinematicForRoom(roomId: string): CinematicEvent | null {
  const save = SaveSystem.getInstance();
  for (const event of CINEMATIC_EVENTS) {
    if (event.triggerRoom !== roomId) continue;
    if (!save.getFlag(event.triggerFlag)) continue;
    const seenFlag = `seen_event_${event.id}`;
    if (save.getFlag(seenFlag)) continue;
    return event;
  }
  return null;
}

// ─── CinematicScene ──────────────────────────────────────────────────────────

export class CinematicScene extends Phaser.Scene {
  private cinematicData!: CinematicEvent;
  private targetRoom = 'lobby';
  private slideIndex = 0;
  private isAnimating = false;
  private canSkip = false;
  private abortSlide = false;
  private currentTexts: Phaser.GameObjects.Text[] = [];
  private fogOverlay!: Phaser.GameObjects.Rectangle;
  private skipHint!: Phaser.GameObjects.Text;
  private currentBg: Phaser.GameObjects.Image | null = null;
  private bgDarken!: Phaser.GameObjects.Rectangle;
  private ghostOverlay: Phaser.GameObjects.Rectangle | null = null;
  private activeSounds: Phaser.Sound.BaseSound[] = [];

  constructor() {
    super({ key: 'CinematicScene' });
  }

  init(data: { cinematicId: string; targetRoom: string }): void {
    const event = CINEMATIC_EVENTS.find(e => e.id === data.cinematicId);
    if (!event) {
      // No cinematic found — go straight to room
      this.scene.start('RoomScene', { roomId: data.targetRoom });
      return;
    }
    this.cinematicData = event;
    this.targetRoom = data.targetRoom;
    this.slideIndex = 0;
    this.isAnimating = false;
    this.canSkip = false;
    this.abortSlide = false;
    this.currentTexts = [];
    this.currentBg = null;
    this.ghostOverlay = null;
    this.activeSounds = [];
  }

  create(): void {
    if (!this.cinematicData) return;

    const { width, height } = this.cameras.main;

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
    skipBtn.on('pointerdown', () => this.skipToRoom());
    this.tweens.add({ targets: skipBtn, alpha: 0.7, duration: 1500, delay: 1500 });

    // Click / keyboard handlers
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > width - 80 && pointer.y < 50) return;
      this.handleClick();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.handleClick());
    this.input.keyboard?.on('keydown-ENTER', () => this.handleClick());
    this.input.keyboard?.on('keydown-ESC', () => this.skipToRoom());

    // Ghost drone sound for atmosphere
    UISounds.ghostDrone();

    // Fade in and start
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.time.delayedCall(1000, () => {
      this.canSkip = true;
      this.tweens.add({ targets: this.skipHint, alpha: 0.6, duration: 500 });
      this.showSlide();
    });
  }

  // ─── Dust Particles ───────────────────────────────────────────────────────

  private createDustParticles(): void {
    const { width, height } = this.cameras.main;
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const mote = this.add.circle(x, y, size, 0xc9a84c, Phaser.Math.FloatBetween(0.04, 0.12));
      mote.setDepth(4);
      this.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-40, 40),
        alpha: { from: mote.alpha, to: Phaser.Math.FloatBetween(0.02, 0.1) },
        duration: Phaser.Math.Between(5000, 10000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private handleClick(): void {
    if (!this.canSkip) return;
    if (this.isAnimating) {
      this.abortSlide = true;
    } else {
      this.nextSlide();
    }
  }

  // ─── Slide Display ────────────────────────────────────────────────────────

  private async showSlide(): Promise<void> {
    if (this.slideIndex >= this.cinematicData.slides.length) {
      this.transitionToRoom();
      return;
    }

    const slide = this.cinematicData.slides[this.slideIndex];
    this.isAnimating = true;
    this.abortSlide = false;

    // Clear previous texts
    this.currentTexts.forEach(t => t.destroy());
    this.currentTexts = [];

    // Transition background
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

    if (!this.abortSlide) {
      await this.wait(slide.pauseAfter || 2000);
    }
  }

  // ─── Background ───────────────────────────────────────────────────────────

  private transitionBackground(slide: CinematicSlide): void {
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

  // ─── Audio ────────────────────────────────────────────────────────────────

  /** Map of procedural sound method names to UISounds functions */
  private static readonly PROC_SOUNDS: Record<string, () => void> = {
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
  };

  private triggerAudio(slide: CinematicSlide): void {
    if (!slide.audio) return;

    for (const cue of slide.audio) {
      const delay = cue.delay ?? 0;

      this.time.delayedCall(delay, () => {
        if (this.abortSlide) return;

        // Procedural sound: key starts with 'proc:'
        if (cue.key.startsWith('proc:')) {
          const method = cue.key.substring(5);
          const fn = CinematicScene.PROC_SOUNDS[method];
          if (fn) fn();
          return;
        }

        // Phaser loaded audio
        if (!this.cache.audio.exists(cue.key)) return;
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
      if (s.isPlaying) s.stop();
      s.destroy();
    }
    this.activeSounds = [];
  }

  // ─── Effects ──────────────────────────────────────────────────────────────

  private triggerEffects(slide: CinematicSlide): void {
    if (!slide.effects) return;
    for (const fx of slide.effects) {
      this.time.delayedCall(fx.delay ?? 0, () => {
        if (this.abortSlide) return;
        switch (fx.type) {
          case 'screenShake': this.cameras.main.shake(fx.duration ?? 300, 0.008); break;
          case 'ghostFlicker': this.ghostFlickerEffect(fx.duration ?? 4000); break;
          case 'flashWhite': this.flashWhiteEffect(fx.duration ?? 300); break;
          case 'heartbeat': this.heartbeatEffect(fx.duration ?? 4000); break;
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

  private flashWhiteEffect(duration: number): void {
    const { width, height } = this.cameras.main;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(8);
    this.tweens.add({
      targets: flash, fillAlpha: { from: 0.2, to: 0 },
      duration, ease: 'Cubic.easeOut', onComplete: () => flash.destroy(),
    });
  }

  private heartbeatEffect(duration: number): void {
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

  // ─── Text Effects ─────────────────────────────────────────────────────────

  private typewriterSlide(lines: string[], startY: number, width: number, lineHeight: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let lineIndex = 0;

      const showNextLine = () => {
        if (this.abortSlide || lineIndex >= lines.length) {
          // Show remaining lines instantly
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
    const isStageDirection = text.startsWith('She ') || text.startsWith('You ') || text.startsWith('A ');

    let color: string = TextColors.light;
    let style = 'normal';

    if (isQuote) { color = TextColors.gold; style = 'italic'; }
    else if (isStageDirection) { color = TextColors.goldDim; style = 'italic'; }

    return this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '26px', color, fontStyle: style, align: 'center',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(5);
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

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

  private skipToRoom(): void {
    this.canSkip = false;
    this.stopAllSounds();
    this.completeEvent();
    this.transitionToRoom();
  }

  private completeEvent(): void {
    const save = SaveSystem.getInstance();
    save.setFlag(`seen_event_${this.cinematicData.id}`, true);
    if (this.cinematicData.onComplete) {
      if (this.cinematicData.onComplete.setFlag) {
        save.setFlag(this.cinematicData.onComplete.setFlag, true);
      }
      if (this.cinematicData.onComplete.addJournal) {
        save.addJournalEntry(this.cinematicData.onComplete.addJournal);
      }
    }
  }

  private transitionToRoom(): void {
    this.canSkip = false;
    this.input.removeAllListeners();
    this.stopAllSounds();
    this.completeEvent();

    const { width, height } = this.cameras.main;

    // Fade out everything
    this.tweens.add({
      targets: [...this.currentTexts, this.skipHint],
      alpha: 0, duration: 600,
    });
    if (this.currentBg) {
      this.tweens.add({ targets: this.currentBg, alpha: 0, duration: 600 });
    }

    // Brief flash then curtain close to room
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(50);

    this.time.delayedCall(600, () => {
      this.tweens.add({
        targets: flash, fillAlpha: 0.15, duration: 200, yoyo: true,
        onComplete: () => {
          UISounds.doorTransition();
          this.playCurtainClose(() => {
            this.scene.start('RoomScene', { roomId: this.targetRoom });
          });
        },
      });
    });
  }

  private playCurtainClose(onComplete: () => void): void {
    const { width, height } = this.cameras.main;
    const curtainColor = 0x4a0a0a;

    const left = this.add.rectangle(-width / 4, height / 2, width / 2, height, curtainColor, 1);
    const right = this.add.rectangle(width + width / 4, height / 2, width / 2, height, curtainColor, 1);
    left.setDepth(Depths.scriptedEvent + 10);
    right.setDepth(Depths.scriptedEvent + 10);

    const fringeL = this.add.rectangle(-width / 4 + width / 4, height / 2, 3, height, Colors.gold, 0.6);
    const fringeR = this.add.rectangle(width + width / 4 - width / 4, height / 2, 3, height, Colors.gold, 0.6);
    fringeL.setDepth(Depths.scriptedEvent + 11);
    fringeR.setDepth(Depths.scriptedEvent + 11);

    this.tweens.add({
      targets: [left, fringeL], x: `+=${width / 4}`, duration: 500, ease: 'Power2',
    });
    this.tweens.add({
      targets: [right, fringeR], x: `-=${width / 4}`, duration: 500, ease: 'Power2',
      onComplete: () => onComplete(),
    });
  }
}
