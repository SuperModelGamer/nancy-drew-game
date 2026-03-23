import Phaser from 'phaser';
import { FONT } from '../utils/constants';

/**
 * IntroScene — plays the ElevenLabs intro cinematic as a native HTML <video>
 * element overlaid on the Phaser canvas. This bypasses Phaser's broken video
 * system entirely for reliable 1920×1080 playback.
 *
 * Features:
 *  - Timed subtitles synced to narration
 *  - Cinematic letterbox bars for film feel
 *  - Smooth fade-to-black transition
 *
 * After the video ends (or is skipped), transitions to RoomScene + UIScene.
 */

interface SubtitleCue {
  /** Time in seconds when this subtitle appears */
  time: number;
  /** Subtitle text */
  text: string;
  /** Duration in seconds (auto-calculated from next cue if omitted) */
  duration?: number;
}

// ── Subtitle track for the intro cinematic narration ──────────────────────────
// Timings are approximate — adjust after watching the final video.
const INTRO_SUBTITLES: SubtitleCue[] = [
  { time: 1.0,  text: 'The Monarch Theatre, 1928.' },
  { time: 4.5,  text: 'On the night of the final performance of "The Crimson Veil"...' },
  { time: 9.0,  text: 'Every seat was taken. Standing room only.' },
  { time: 13.0, text: 'The star, Margaux Fontaine, raised a golden goblet to her lips.' },
  { time: 18.0, text: 'She drank. She fell. She never got up.' },
  { time: 22.5, text: 'The curtain fell for the last time.' },
  { time: 26.0, text: 'The papers called it a tragic accident. Poison in a prop goblet.' },
  { time: 31.0, text: 'But someone in the audience that night knew exactly what happened.' },
  { time: 35.5, text: 'And they never said a word.' },
  { time: 40.0, text: 'Ninety-seven years later...' },
  { time: 43.5, text: 'The Monarch sits condemned. Three days from demolition.' },
  { time: 48.0, text: 'But last night, developer Roland Ashworth collapsed. Poisoned.' },
  { time: 53.0, text: 'The same method. The same symptoms. The same theatre.' },
  { time: 58.0, text: 'Someone is copying a murder that was never solved.' },
  { time: 63.0, text: 'And something else is wrong.' },
  { time: 66.0, text: 'A figure in white on the empty stage. Footsteps in locked corridors.' },
  { time: 71.0, text: 'The ghost of Margaux Fontaine walks the Monarch again.' },
  { time: 76.0, text: '' }, // clear subtitles at end
];

const GOLD = 'rgba(201, 168, 76,';
const LETTERBOX_HEIGHT = '7%';

export class IntroScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private container: HTMLDivElement | null = null;
  private subtitleEl: HTMLDivElement | null = null;
  private subtitleTimers: number[] = [];
  private ended = false;

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
    this.ended = false;

    // Black background behind everything
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Get the Phaser canvas to position the video over it
    const canvas = this.game.canvas;
    const parent = canvas.parentElement;
    if (!parent) {
      this.startGame();
      return;
    }

    // Create a container div that matches the canvas position exactly
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      z-index: 10;
    `;
    parent.style.position = 'relative';
    parent.appendChild(this.container);

    // Create native HTML video element
    this.videoEl = document.createElement('video');
    this.videoEl.src = 'assets/cinematics/ElevenLabs_Nancy_Drew_Intro_1.mp4';
    this.videoEl.playsInline = true;
    this.videoEl.preload = 'auto';
    this.videoEl.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    `;

    this.container.appendChild(this.videoEl);

    // ── Cinematic letterbox bars ──
    const makeBar = (position: 'top' | 'bottom') => {
      const bar = document.createElement('div');
      bar.style.cssText = `
        position: absolute;
        ${position}: 0;
        left: 0;
        width: 100%;
        height: ${LETTERBOX_HEIGHT};
        background: #000;
        z-index: 11;
        pointer-events: none;
      `;
      return bar;
    };
    this.container.appendChild(makeBar('top'));
    this.container.appendChild(makeBar('bottom'));

    // ── Subtitle overlay ──
    this.subtitleEl = document.createElement('div');
    this.subtitleEl.style.cssText = `
      position: absolute;
      bottom: 12%;
      left: 50%;
      transform: translateX(-50%);
      max-width: 80%;
      text-align: center;
      font-family: ${FONT};
      font-size: clamp(16px, 2.2vw, 28px);
      color: #fff;
      text-shadow: 0 0 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);
      background: rgba(0, 0, 0, 0.45);
      padding: 8px 24px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      line-height: 1.5;
      z-index: 12;
      opacity: 0;
      transition: opacity 0.4s ease;
      pointer-events: none;
    `;
    this.container.appendChild(this.subtitleEl);

    // Schedule subtitle cues
    this.scheduleSubtitles();

    // Skip button (HTML so it sits above the video)
    this.skipBtn = document.createElement('button');
    this.skipBtn.textContent = 'SKIP \u25B8';
    this.skipBtn.style.cssText = `
      position: absolute;
      top: calc(${LETTERBOX_HEIGHT} + 12px);
      right: 24px;
      background: none;
      border: 1px solid ${GOLD} 0.4);
      color: ${GOLD} 0.7);
      font-family: ${FONT};
      font-size: 18px;
      letter-spacing: 2px;
      padding: 6px 16px;
      cursor: pointer;
      z-index: 13;
      opacity: 0;
      transition: opacity 1.5s ease, color 0.2s, border-color 0.2s;
    `;
    this.skipBtn.addEventListener('mouseenter', () => {
      if (this.skipBtn) {
        this.skipBtn.style.color = `${GOLD} 1)`;
        this.skipBtn.style.borderColor = `${GOLD} 0.8)`;
      }
    });
    this.skipBtn.addEventListener('mouseleave', () => {
      if (this.skipBtn) {
        this.skipBtn.style.color = `${GOLD} 0.7)`;
        this.skipBtn.style.borderColor = `${GOLD} 0.4)`;
      }
    });
    this.skipBtn.addEventListener('click', () => this.endVideo());
    this.container.appendChild(this.skipBtn);

    // Show skip button after 1.5s
    setTimeout(() => {
      if (this.skipBtn) this.skipBtn.style.opacity = '1';
    }, 1500);

    // ESC to skip
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        this.endVideo();
      }
    };
    document.addEventListener('keydown', escHandler);

    // Play the video
    this.videoEl.play().catch(() => {
      // Autoplay blocked (e.g., no user interaction yet) — skip to game
      this.endVideo();
    });

    // When video ends naturally
    this.videoEl.addEventListener('ended', () => this.endVideo());
  }

  private scheduleSubtitles(): void {
    for (let i = 0; i < INTRO_SUBTITLES.length; i++) {
      const cue = INTRO_SUBTITLES[i];
      const next = INTRO_SUBTITLES[i + 1];
      const duration = cue.duration ?? (next ? next.time - cue.time - 0.4 : 4);

      const showTimer = window.setTimeout(() => {
        if (!this.subtitleEl) return;
        if (cue.text === '') {
          // Empty text = hide subtitles
          this.subtitleEl.style.opacity = '0';
        } else {
          this.subtitleEl.textContent = cue.text;
          this.subtitleEl.style.opacity = '1';
        }
      }, cue.time * 1000);
      this.subtitleTimers.push(showTimer);

      // Auto-hide before next cue (unless empty cue)
      if (cue.text !== '' && duration > 0) {
        const hideTimer = window.setTimeout(() => {
          if (this.subtitleEl) this.subtitleEl.style.opacity = '0';
        }, (cue.time + duration) * 1000);
        this.subtitleTimers.push(hideTimer);
      }
    }
  }

  private endVideo(): void {
    if (this.ended) return;
    this.ended = true;

    if (!this.container) {
      this.startGame();
      return;
    }

    // Fade out
    this.container.style.transition = 'opacity 0.8s ease';
    this.container.style.opacity = '0';

    setTimeout(() => {
      this.cleanup();
      this.startGame();
    }, 800);
  }

  private cleanup(): void {
    // Clear subtitle timers
    for (const t of this.subtitleTimers) window.clearTimeout(t);
    this.subtitleTimers = [];

    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load(); // Release memory
      this.videoEl = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.skipBtn = null;
    this.subtitleEl = null;
  }

  private startGame(): void {
    this.scene.start('RoomScene', { roomId: 'lobby' });
    this.scene.launch('UIScene');
  }

  shutdown(): void {
    this.cleanup();
  }

  destroy(): void {
    this.cleanup();
  }
}
