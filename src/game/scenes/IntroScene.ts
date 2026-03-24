import Phaser from 'phaser';

/**
 * IntroScene — plays the ElevenLabs intro cinematic as a native HTML <video>
 * element overlaid on the Phaser canvas. This bypasses Phaser's broken video
 * system entirely for reliable fullscreen playback.
 *
 * After the video ends (or is skipped), transitions to RoomScene + UIScene.
 */

const GOLD = 'rgba(201, 168, 76,';

export class IntroScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private container: HTMLDivElement | null = null;
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

    // Create native HTML video element — fills entire screen
    this.videoEl = document.createElement('video');
    this.videoEl.src = 'assets/cinematics/ElevenLabs_Nancy_Drew_Intro_1.mp4';
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

    // Skip button (HTML so it sits above the video)
    this.skipBtn = document.createElement('button');
    this.skipBtn.textContent = 'SKIP \u25B8';
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
