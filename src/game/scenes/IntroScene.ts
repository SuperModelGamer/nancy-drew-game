import Phaser from 'phaser';
import { BaseSlideScene, Slide } from './BaseSlideScene';
import { initSceneCursor, POINTER_CURSOR } from '../utils/cursors';
import { Colors, TextColors, FONT } from '../utils/constants';

// ─── Intro Slides ────────────────────────────────────────────────────────────
// Short, punchy intro: Vivienne's call → Nancy arrives at the theater.
// The full backstory (1928 murder, copycat poisoning, ghost rumors) is revealed
// through gameplay cinematics as the player explores different rooms.

const INTRO_SLIDES: Slide[] = [
  // ── The Call ────────────────────────────────────────────────────────────────

  {
    lines: [
      'Vivian Delacroix has lived in the',
      'Monarch her entire life.',
      'Margaux\'s goddaughter.',
      'The last person who still remembers.',
    ],
    effect: 'fade',
    pauseAfter: 800,
    voiceover: 'vo_intro_15',
    bgImage: 'intro_phone',
    bgAlpha: 0.5,
    camera: { scaleFrom: 1.0, scaleTo: 1.06, panX: 10 },
    vignetteIntensity: 0.6,
    letterbox: true,
    audio: [
      { key: 'proc:phoneRing', delay: 200, volume: 0.4 },
    ],
  },
  {
    lines: [
      '"Nancy — someone has been poisoned.',
      'The police won\'t listen.',
      'The wrecking crew comes in three days.',
      'And something is haunting this theater.',
      '',
      'Please. You\'re the only one I trust."',
    ],
    effect: 'typewriter',
    pauseAfter: 800,
    voiceover: 'vo_intro_16',
    bgImage: 'intro_phone',
    bgAlpha: 0.4,
    camera: { scaleFrom: 1.06, scaleTo: 1.14, panX: -8 },
    vignetteIntensity: 0.7,
    letterbox: true,
  },

  // ── Arrival ─────────────────────────────────────────────────────────────────

  {
    lines: [
      'Seventy-two hours.',
      'A copycat poisoner. A condemned building.',
      'A ghost that shouldn\'t exist.',
    ],
    effect: 'fade',
    pauseAfter: 800,
    voiceover: 'vo_intro_17',
    bgImage: 'intro_nancy_car',
    bgAlpha: 0.55,
    camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -6 },
    fogIntensity: 0.1,
    vignetteIntensity: 0.7,
    letterbox: true,
    audio: [
      { key: 'proc:heartbeat', delay: 200, volume: 0.3 },
    ],
  },
  {
    lines: [
      'You push through the heavy doors',
      'of the Monarch Theatre.',
      '',
      'The lobby is dark.',
      'A single lamp burns at the front desk.',
      '',
      'Vivian is waiting.',
    ],
    effect: 'typewriter',
    pauseAfter: 800,
    voiceover: 'vo_intro_18',
    bgImage: 'intro_doors',
    bgAlpha: 0.55,
    camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: -8 },
    fogIntensity: 0.05,
    vignetteIntensity: 0.6,
    letterbox: true,
    audio: [
      { key: 'proc:doorCreak', delay: 200, volume: 0.5 },
    ],
  },
];

// ─── IntroScene ──────────────────────────────────────────────────────────────

export class IntroScene extends BaseSlideScene {
  private video: Phaser.GameObjects.Video | null = null;
  private videoSkipBtn: Phaser.GameObjects.Text | null = null;
  private videoOverlay: Phaser.GameObjects.Rectangle | null = null;
  private videoLetterboxBars: Phaser.GameObjects.Rectangle[] = [];
  private videoPlaying = false;

  constructor() {
    super({ key: 'IntroScene' });
  }

  protected getSlides(): Slide[] {
    return INTRO_SLIDES;
  }

  protected onSceneCreate(): void {
    initSceneCursor(this);

    // Video preroll disabled — Phaser's Video game object doesn't report
    // accurate dimensions before playback, causing the video to render
    // zoomed/cropped. TODO: revisit with a native HTML <video> overlay.
    // BaseSlideScene proceeds directly to the story slides.
  }

  protected getStageDirectionPrefixes(): string[] {
    return ['On stage', 'She ', 'You ', 'A '];
  }

  protected onTransitionComplete(): void {
    this.scene.start('RoomScene', { roomId: 'lobby' });
    this.scene.launch('UIScene');
  }

  // ─── Video Pre-roll ────────────────────────────────────────────────────────

  private playVideoPreroll(): void {
    const { width, height } = this.cameras.main;
    this.videoPlaying = true;

    // Pause the slide system — prevent clicks from advancing slides during video
    this.canSkip = false;

    // Dark overlay behind video (covers any slide content)
    this.videoOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1);
    this.videoOverlay.setDepth(49);

    // Create video game object centered on screen
    this.video = this.add.video(width / 2, height / 2, 'intro_monarch_video');
    this.video.setDepth(50); // Above the blackout overlay, below the skip button
    this.video.setAlpha(0);

    // Fit the video inside the viewport so we don't crop or zoom the preroll.
    // The previous cover-scale behavior looked fine at 16:9, but it cropped the
    // sides/top on other aspect ratios and made the intro feel over-zoomed.
    this.fitVideoToViewport();

    // "SKIP" button for the video
    this.videoSkipBtn = this.add.text(width - 24, 24, 'SKIP \u25b8', {
      fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim, letterSpacing: 2,
    }).setOrigin(1, 0).setAlpha(0).setDepth(51);
    this.videoSkipBtn.setInteractive({ cursor: POINTER_CURSOR });
    this.videoSkipBtn.on('pointerover', () => this.videoSkipBtn?.setColor(TextColors.gold));
    this.videoSkipBtn.on('pointerout', () => this.videoSkipBtn?.setColor(TextColors.goldDim));
    this.videoSkipBtn.on('pointerdown', () => this.endVideoPreroll());

    // Show skip button after a short delay
    this.tweens.add({ targets: this.videoSkipBtn, alpha: 0.7, duration: 1500, delay: 1500 });

    // Fade video in and play
    this.tweens.add({
      targets: this.video,
      alpha: 1,
      duration: 800,
      onComplete: () => {
        if (!this.video) return;
        this.video.play(false); // false = don't loop

        // When video ends naturally, transition to slides
        this.video.on('complete', () => {
          this.endVideoPreroll();
        });
      },
    });

    // Allow clicking anywhere (except skip button area) to skip video too
    const videoClickHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.videoPlaying) return;
      // Ignore clicks near the skip button
      if (pointer.x > width - 80 && pointer.y < 50) return;
      // Require at least 2 seconds of video before click-to-skip works
      if (this.video && this.video.getCurrentTime() < 2) return;
      this.endVideoPreroll();
    };
    this.input.on('pointerdown', videoClickHandler);

    // ESC to skip video
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.videoPlaying) this.endVideoPreroll();
    });
  }

  private fitVideoToViewport(): void {
    if (!this.video) return;

    const { width, height } = this.cameras.main;
    const videoWidth = this.video.width || this.video.displayWidth || 1920;
    const videoHeight = this.video.height || this.video.displayHeight || 1080;
    const scaleX = width / videoWidth;
    const scaleY = height / videoHeight;
    // Contain scale: fit the full video inside the viewport (may letterbox, but no cropping)
    const containScale = Math.min(scaleX, scaleY);

    this.video.setScale(containScale);
    this.video.setPosition(width / 2, height / 2);

    // Add letterbox bars if the video doesn't fill the full viewport
    this.videoLetterboxBars.forEach(bar => bar.destroy());
    this.videoLetterboxBars = [];

    const scaledW = videoWidth * containScale;
    const scaledH = videoHeight * containScale;

    if (scaledW < width) {
      // Pillarbox: vertical bars on left and right
      const barW = Math.ceil((width - scaledW) / 2);
      this.videoLetterboxBars.push(
        this.add.rectangle(barW / 2, height / 2, barW, height, 0x000000).setDepth(50),
        this.add.rectangle(width - barW / 2, height / 2, barW, height, 0x000000).setDepth(50),
      );
    } else if (scaledH < height) {
      // Letterbox: horizontal bars on top and bottom
      const barH = Math.ceil((height - scaledH) / 2);
      this.videoLetterboxBars.push(
        this.add.rectangle(width / 2, barH / 2, width, barH, 0x000000).setDepth(50),
        this.add.rectangle(width / 2, height - barH / 2, width, barH, 0x000000).setDepth(50),
      );
    }
  }

  private endVideoPreroll(): void {
    if (!this.videoPlaying) return;
    this.videoPlaying = false;

    const { width, height } = this.cameras.main;

    // Fade out video
    if (this.video) {
      this.tweens.add({
        targets: this.video,
        alpha: 0,
        duration: 600,
        onComplete: () => {
          if (this.video) {
            this.video.stop();
            this.video.destroy();
            this.video = null;
          }
        },
      });
    }

    // Fade out overlay and letterboxing
    const overlayTargets = [
      ...(this.videoOverlay ? [this.videoOverlay] : []),
      ...this.videoLetterboxBars,
    ];
    if (overlayTargets.length > 0) {
      this.tweens.add({
        targets: overlayTargets,
        fillAlpha: 0,
        duration: 800,
        onComplete: () => {
          this.videoOverlay?.destroy();
          this.videoOverlay = null;
          this.videoLetterboxBars.forEach(bar => bar.destroy());
          this.videoLetterboxBars = [];
        },
      });
    }

    // Remove skip button
    if (this.videoSkipBtn) {
      this.videoSkipBtn.destroy();
      this.videoSkipBtn = null;
    }

    // Re-enable slide system after video fades out
    this.time.delayedCall(900, () => {
      this.canSkip = true;
    });
  }
}
