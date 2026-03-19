import Phaser from 'phaser';
import { BaseSlideScene, Slide } from './BaseSlideScene';
import { initSceneCursor, POINTER_CURSOR } from '../utils/cursors';
import { Colors, TextColors, FONT } from '../utils/constants';

// ─── Intro Slides ────────────────────────────────────────────────────────────

const INTRO_SLIDES: Slide[] = [
  // ACT I: The Night of the Murder (1928)
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
    bgAlpha: 0.65,
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
    bgAlpha: 0.55,
    camera: { scaleFrom: 1.05, scaleTo: 1.2, panY: 5 },
    audio: [
      { key: 'sfx_goblet', delay: 1500, volume: 0.5 },
      { key: 'sfx_thud', delay: 4500, volume: 0.4 },
    ],
    effects: [
      { type: 'screenShake', delay: 4500, duration: 300 },
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
    bgAlpha: 0.5,
    camera: { scaleFrom: 1.0, scaleTo: 1.05, panX: -15 },
  },

  // ACT II: Present Day
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
    bgAlpha: 0.55,
    camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: -8 },
    fogIntensity: 0.08,
    effects: [
      { type: 'screenShake', delay: 1400, duration: 400 },
    ],
  },

  // ACT III: The Ghost
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
    bgAlpha: 0.5,
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
    bgAlpha: 0.5,
    camera: { scaleFrom: 1.0, scaleTo: 1.05, panX: 10 },
    audio: [
      { key: 'sfx_phone_ring', delay: 1500, volume: 0.4 },
    ],
  },

  // ACT IV: The Call
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
    bgAlpha: 0.45,
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
    bgAlpha: 0.55,
    camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -5 },
    fogIntensity: 0.05,
    audio: [
      { key: 'sfx_door_creak', delay: 200, volume: 0.5 },
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

    // If the video loaded successfully, play it before the slides
    if (this.cache.video.exists('intro_monarch_video')) {
      this.playVideoPreroll();
    }
    // Otherwise BaseSlideScene proceeds directly to slides
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
