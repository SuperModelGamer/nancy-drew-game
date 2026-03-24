/**
 * VideoCinematicScene — plays full-screen video cutscenes (.mp4/.webm).
 *
 * Supports optional subtitle tracks, skip functionality, and graceful
 * fallback when video files are missing (skips to target scene).
 *
 * Usage:
 *   this.scene.start('VideoCinematicScene', {
 *     videoKey: 'cinematic_ghost_reveal',
 *     targetScene: 'RoomScene',
 *     targetData: { roomId: 'basement', skipCinematic: true },
 *     subtitles: [
 *       { time: 0, text: 'The Monarch Theatre, 1928.' },
 *       { time: 3.5, text: 'On the night of the final performance...' },
 *     ],
 *     onComplete?: { setFlag?: string; addJournal?: string },
 *   });
 */

import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { MusicSystem } from '../systems/MusicSystem';
import { AmbientAudioSystem } from '../systems/AmbientAudioSystem';
import { UISounds } from '../utils/sounds';
import { FONT } from '../utils/constants';

interface Subtitle {
  /** Time in seconds when this subtitle appears */
  time: number;
  /** Subtitle text to display */
  text: string;
  /** Duration in seconds (default: auto until next subtitle or 4s) */
  duration?: number;
}

interface VideoCinematicData {
  videoKey: string;
  targetScene: string;
  targetData?: Record<string, unknown>;
  subtitles?: Subtitle[];
  onComplete?: {
    setFlag?: string;
    addJournal?: string;
  };
}

export class VideoCinematicScene extends Phaser.Scene {
  private videoData!: VideoCinematicData;
  private video!: Phaser.GameObjects.Video;
  private subtitleText!: Phaser.GameObjects.Text;
  private subtitleBg!: Phaser.GameObjects.Rectangle;
  private completed = false;

  constructor() {
    super({ key: 'VideoCinematicScene' });
  }

  init(data: VideoCinematicData): void {
    this.videoData = data;
    this.completed = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Check if video exists — fallback to target scene if not
    if (!this.textures.exists(this.videoData.videoKey) && !this.cache.video.exists(this.videoData.videoKey)) {
      this.finishAndTransition();
      return;
    }

    // Hide UIScene during video
    if (this.scene.isActive('UIScene')) {
      this.scene.setVisible(false, 'UIScene');
      this.scene.setActive(false, 'UIScene');
    }
    // Stop background music and ambient audio so they don't overlap video audio
    MusicSystem.getInstance().stop();
    AmbientAudioSystem.getInstance().stopAll();

    // Black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setDepth(0);

    // Video player — fill screen
    try {
      this.video = this.add.video(width / 2, height / 2, this.videoData.videoKey);
      const videoScale = Math.max(width / this.video.width, height / this.video.height);
      this.video.setScale(videoScale);
      this.video.setDepth(1);
      this.video.play();

      // When video ends naturally, transition
      this.video.on('complete', () => {
        this.finishAndTransition();
      });
    } catch {
      // Video playback failed — skip
      this.finishAndTransition();
      return;
    }

    // Subtitle overlay
    this.subtitleBg = this.add.rectangle(width / 2, height - 80, width, 60, 0x000000, 0.7);
    this.subtitleBg.setDepth(2).setAlpha(0);

    this.subtitleText = this.add.text(width / 2, height - 80, '', {
      fontFamily: FONT,
      fontSize: '28px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5).setDepth(3).setAlpha(0);

    // Schedule subtitles
    if (this.videoData.subtitles) {
      for (let i = 0; i < this.videoData.subtitles.length; i++) {
        const sub = this.videoData.subtitles[i];
        const nextSub = this.videoData.subtitles[i + 1];
        const duration = sub.duration ?? (nextSub ? nextSub.time - sub.time : 4);

        this.time.delayedCall(sub.time * 1000, () => {
          this.showSubtitle(sub.text, duration);
        });
      }
    }

    // Skip button — appears after 1.5 seconds
    this.time.delayedCall(1500, () => {
      const skipBtn = this.add.text(width - 30, 30, 'SKIP ▸▸', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#888888',
        backgroundColor: '#00000080',
        padding: { x: 12, y: 6 },
      }).setOrigin(1, 0).setDepth(10);
      skipBtn.setInteractive({ cursor: 'pointer' });
      skipBtn.on('pointerover', () => skipBtn.setColor('#ffffff'));
      skipBtn.on('pointerout', () => skipBtn.setColor('#888888'));
      skipBtn.on('pointerdown', () => {
        UISounds.click();
        this.finishAndTransition();
      });
    });

    // Also allow Escape to skip
    this.input.keyboard!.on('keydown-ESC', () => {
      this.finishAndTransition();
    });
  }

  private showSubtitle(text: string, duration: number): void {
    this.subtitleText.setText(text);
    this.tweens.add({ targets: [this.subtitleText, this.subtitleBg], alpha: 1, duration: 300 });
    this.time.delayedCall(duration * 1000, () => {
      this.tweens.add({ targets: [this.subtitleText, this.subtitleBg], alpha: 0, duration: 300 });
    });
  }

  private finishAndTransition(): void {
    if (this.completed) return;
    this.completed = true;

    // Apply completion effects
    if (this.videoData.onComplete) {
      const save = SaveSystem.getInstance();
      if (this.videoData.onComplete.setFlag) {
        save.setFlag(this.videoData.onComplete.setFlag, true);
      }
      if (this.videoData.onComplete.addJournal) {
        save.addJournalEntry(this.videoData.onComplete.addJournal);
      }
    }

    // Stop video
    try { this.video?.stop(); } catch { /* ok */ }

    // Restore UIScene
    if (this.scene.manager.getScene('UIScene')) {
      this.scene.setVisible(true, 'UIScene');
      this.scene.setActive(true, 'UIScene');
      this.scene.bringToTop('UIScene');
    }

    // Fade to black then transition
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.videoData.targetScene, this.videoData.targetData || {});
    });
  }
}
