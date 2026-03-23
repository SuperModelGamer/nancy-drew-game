import Phaser from 'phaser';
import { FONT } from '../utils/constants';

/**
 * IntroScene — plays the ElevenLabs intro cinematic as a native HTML <video>
 * element overlaid on the Phaser canvas. This bypasses Phaser's broken video
 * system entirely for reliable 1920×1080 playback.
 *
 * After the video ends (or is skipped), transitions to RoomScene + UIScene.
 */
export class IntroScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private container: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
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
      object-fit: contain;
      background: #000;
    `;

    this.container.appendChild(this.videoEl);

    // Skip button (HTML so it sits above the video)
    this.skipBtn = document.createElement('button');
    this.skipBtn.textContent = 'SKIP ▸';
    this.skipBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 24px;
      background: none;
      border: 1px solid rgba(201, 168, 76, 0.4);
      color: rgba(201, 168, 76, 0.7);
      font-family: ${FONT};
      font-size: 18px;
      letter-spacing: 2px;
      padding: 6px 16px;
      cursor: pointer;
      z-index: 11;
      opacity: 0;
      transition: opacity 1.5s ease, color 0.2s, border-color 0.2s;
    `;
    this.skipBtn.addEventListener('mouseenter', () => {
      if (this.skipBtn) {
        this.skipBtn.style.color = 'rgba(201, 168, 76, 1)';
        this.skipBtn.style.borderColor = 'rgba(201, 168, 76, 0.8)';
      }
    });
    this.skipBtn.addEventListener('mouseleave', () => {
      if (this.skipBtn) {
        this.skipBtn.style.color = 'rgba(201, 168, 76, 0.7)';
        this.skipBtn.style.borderColor = 'rgba(201, 168, 76, 0.4)';
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

  private endVideo(): void {
    if (!this.container) return; // Already cleaned up

    // Fade out
    this.container.style.transition = 'opacity 0.6s ease';
    this.container.style.opacity = '0';

    setTimeout(() => {
      this.cleanup();
      this.startGame();
    }, 600);
  }

  private cleanup(): void {
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
