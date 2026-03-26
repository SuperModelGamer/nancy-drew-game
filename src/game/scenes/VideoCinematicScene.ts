/**
 * VideoCinematicScene — plays full-screen video cutscenes (.mp4/.webm).
 *
 * Uses a native HTML <video> element overlaid on the Phaser canvas (same
 * approach as IntroScene) for reliable, glitch-free fullscreen playback.
 * Supports skip (button + ESC) and a red-curtain close transition.
 *
 * Usage:
 *   this.scene.start('VideoCinematicScene', {
 *     videoKey: 'Cutscene01_lobby2auditorium',
 *     targetScene: 'RoomScene',
 *     targetData: { roomId: 'auditorium', skipCinematic: true },
 *     onComplete?: { setFlag?: string; addJournal?: string },
 *   });
 */

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { MusicSystem } from '../systems/MusicSystem';
import { AmbientAudioSystem } from '../systems/AmbientAudioSystem';
import { UISounds } from '../utils/sounds';

const GOLD = 'rgba(201, 168, 76,';

interface OverlayTextLine {
  text: string;
  delay: number;       // ms from video start
  duration?: number;   // ms to show (default: stays until next or video end)
  style?: 'title' | 'subtitle' | 'time' | 'body';
  y?: number;          // vertical position as % (0-100, default 50)
}

interface VideoCinematicData {
  videoKey: string;
  targetScene: string;
  targetData?: Record<string, unknown>;
  subtitles?: unknown[];          // kept for interface compat — ignored
  overlayText?: OverlayTextLine[];
  onComplete?: {
    setFlag?: string;
    addJournal?: string;
  };
}

export class VideoCinematicScene extends Phaser.Scene {
  private videoData!: VideoCinematicData;
  private videoEl: HTMLVideoElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private container: HTMLDivElement | null = null;
  private escHandler: ((e: KeyboardEvent) => void) | null = null;
  private ended = false;

  constructor() {
    super({ key: 'VideoCinematicScene' });
  }

  init(data: VideoCinematicData): void {
    this.videoData = data;
    this.ended = false;
  }

  create(): void {
    // Hide UIScene during video
    if (this.scene.isActive('UIScene')) {
      this.scene.setVisible(false, 'UIScene');
      this.scene.setActive(false, 'UIScene');
    }

    // Stop ALL other audio — video has its own audio track
    MusicSystem.getInstance().stop();
    AmbientAudioSystem.getInstance().stopAll();
    UISounds.stopAll();

    // Black background behind everything
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Get the Phaser canvas to position the video over it
    const canvas = this.game.canvas;
    const parent = canvas.parentElement;
    if (!parent) {
      this.finishAndTransition();
      return;
    }

    // Create a container div that covers the full canvas area
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      z-index: 10;
      overflow: hidden;
    `;
    parent.style.position = 'relative';
    parent.appendChild(this.container);

    // Create native HTML video element — fills entire screen at 1920x1080
    this.videoEl = document.createElement('video');
    this.videoEl.src = `assets/cinematics/${this.videoData.videoKey}.mp4`;
    this.videoEl.playsInline = true;
    this.videoEl.preload = 'auto';
    this.videoEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: 100%;
      min-height: 100%;
      width: auto;
      height: auto;
      object-fit: cover;
    `;
    this.container.appendChild(this.videoEl);

    // ── Text overlays — timed text that fades in over the video ──
    if (this.videoData.overlayText?.length) {
      for (const line of this.videoData.overlayText) {
        setTimeout(() => {
          if (this.ended || !this.container) return;
          const el = document.createElement('div');
          const yPos = line.y ?? 50;
          const styleMap: Record<string, string> = {
            title: `font-size: 48px; font-weight: bold; letter-spacing: 6px; font-family: 'Playfair Display SC', 'Crimson Text', Georgia, serif; color: ${GOLD} 0.95); text-shadow: 0 2px 12px rgba(0,0,0,0.8);`,
            subtitle: `font-size: 24px; font-style: italic; letter-spacing: 3px; font-family: 'Crimson Text', Georgia, serif; color: ${GOLD} 0.8); text-shadow: 0 1px 8px rgba(0,0,0,0.7);`,
            time: `font-size: 18px; letter-spacing: 5px; font-family: 'Crimson Text', Georgia, serif; color: rgba(180,180,200,0.8); text-transform: uppercase; text-shadow: 0 1px 6px rgba(0,0,0,0.7);`,
            body: `font-size: 20px; line-height: 1.6; font-family: 'Crimson Text', Georgia, serif; color: rgba(240,224,184,0.9); text-shadow: 0 1px 8px rgba(0,0,0,0.8); max-width: 600px;`,
          };
          el.innerHTML = line.text.replace(/\n/g, '<br>');
          el.style.cssText = `
            position: absolute;
            top: ${yPos}%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 12;
            opacity: 0;
            transition: opacity 0.8s ease;
            pointer-events: none;
            ${styleMap[line.style || 'body']}
          `;
          this.container!.appendChild(el);
          requestAnimationFrame(() => { el.style.opacity = '1'; });
          if (line.duration) {
            setTimeout(() => {
              el.style.opacity = '0';
              setTimeout(() => el.remove(), 900);
            }, line.duration);
          }
        }, line.delay);
      }
    }

    // Skip button — gold, matching IntroScene exactly
    this.skipBtn = document.createElement('button');
    this.skipBtn.textContent = 'SKIP \u25B6';
    this.skipBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 24px;
      background: none;
      border: 1px solid ${GOLD} 0.4);
      color: ${GOLD} 0.7);
      font-family: 'Crimson Text', 'Georgia', serif;
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
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', this.escHandler!);
        this.endVideo();
      }
    };
    document.addEventListener('keydown', this.escHandler);

    // Play the video
    this.videoEl.play().catch(() => {
      // Autoplay blocked — skip to target scene
      this.endVideo();
    });

    // When video ends naturally
    this.videoEl.addEventListener('ended', () => this.endVideo());
  }

  private endVideo(): void {
    if (this.ended) return;
    this.ended = true;

    // Apply completion effects (flags, journal)
    if (this.videoData.onComplete) {
      const save = SaveSystem.getInstance();
      if (this.videoData.onComplete.setFlag) {
        save.setFlag(this.videoData.onComplete.setFlag, true);
      }
      if (this.videoData.onComplete.addJournal) {
        save.addJournalEntry(this.videoData.onComplete.addJournal);
      }
    }

    if (!this.container) {
      this.finishAndTransition();
      return;
    }

    // Red curtain close effect — two crimson panels slide in from left and right
    const curtainStyle = `
      position: absolute;
      top: 0;
      width: 52%;
      height: 100%;
      background: linear-gradient(90deg, #2a0505 0%, #4a0a0a 40%, #5a1010 60%, #4a0a0a 100%);
      z-index: 14;
      transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const leftCurtain = document.createElement('div');
    leftCurtain.style.cssText = curtainStyle + 'left: 0; transform: translateX(-100%);';

    const rightCurtain = document.createElement('div');
    rightCurtain.style.cssText = curtainStyle + 'right: 0; transform: translateX(100%);';

    // Gold fringe line on inner edge of each curtain
    const fringeStyle = `
      position: absolute;
      top: 0;
      width: 3px;
      height: 100%;
      background: linear-gradient(180deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0.3) 50%, rgba(201,168,76,0.6) 100%);
    `;
    const fringeL = document.createElement('div');
    fringeL.style.cssText = fringeStyle + 'right: 0;';
    leftCurtain.appendChild(fringeL);

    const fringeR = document.createElement('div');
    fringeR.style.cssText = fringeStyle + 'left: 0;';
    rightCurtain.appendChild(fringeR);

    this.container.appendChild(leftCurtain);
    this.container.appendChild(rightCurtain);

    // Trigger the slide-in animation (double-rAF ensures browser paints the
    // initial off-screen position before the transition fires)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        leftCurtain.style.transform = 'translateX(0)';
        rightCurtain.style.transform = 'translateX(0)';
      });
    });

    // After curtains close, clean up and transition
    setTimeout(() => {
      this.cleanup();
      this.finishAndTransition();
    }, 900);
  }

  private cleanup(): void {
    // Remove ESC handler
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }

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
  }

  private finishAndTransition(): void {
    this.cleanup();

    // Restore UIScene
    if (this.scene.manager.getScene('UIScene')) {
      this.scene.setVisible(true, 'UIScene');
      this.scene.setActive(true, 'UIScene');
      this.scene.bringToTop('UIScene');
    }

    this.scene.start(this.videoData.targetScene, this.videoData.targetData || {});
  }

  shutdown(): void {
    this.cleanup();
  }

  destroy(): void {
    this.cleanup();
  }
}
