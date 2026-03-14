import Phaser from 'phaser';
import { TextColors, FONT } from '../utils/constants';

const TRANSITIONS: Record<number, { title: string; subtitle: string; time: string; description: string }> = {
  1: {
    title: 'Act I',
    subtitle: 'The Invitation',
    time: 'Night 1 — 9:00 PM',
    description: 'The Monarch Theatre stands dark against the city skyline.\nA single light burns in the lobby window.\nNancy Drew pushes through the heavy front doors.',
  },
  2: {
    title: 'Act II',
    subtitle: 'Behind the Curtain',
    time: 'Night 1 — 11:30 PM',
    description: 'The theater grows quieter as midnight approaches.\nShadows lengthen in the auditorium.\nSomewhere below the stage, machinery hums.',
  },
  3: {
    title: 'Act III',
    subtitle: "The Ghost's Secret",
    time: 'Day 2 — 2:00 AM',
    description: 'The fog machine activates on its own.\nFootsteps echo where no one walks.\nThe truth is hidden in plain sight.',
  },
  4: {
    title: 'Act IV',
    subtitle: 'Beneath the Stage',
    time: 'Day 2 — 6:00 AM',
    description: 'Dawn light filters through dusty windows.\nThe basement key feels heavy in Nancy\'s pocket.\nIt\'s time to go below.',
  },
  5: {
    title: 'Act V',
    subtitle: 'The Final Curtain',
    time: 'Day 2 — 8:00 AM',
    description: 'The demolition crew arrives in twelve hours.\nEdwin Hale waits in the basement.\nEvery secret leads here.',
  },
};

export class ChapterTransitionScene extends Phaser.Scene {
  private chapter: number = 1;
  private skipEnabled: boolean = false;

  constructor() {
    super({ key: 'ChapterTransitionScene' });
  }

  init(data: { chapter: number }): void {
    this.chapter = data.chapter;
    this.skipEnabled = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const transition = TRANSITIONS[this.chapter];

    if (!transition) {
      this.scene.stop();
      return;
    }

    // Hide the UI frame so the chapter transition fills the full screen
    if (this.scene.isActive('UIScene')) {
      this.scene.setVisible(false, 'UIScene');
      this.scene.setActive(false, 'UIScene');
    }

    // Full black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Track all timed events so we can cancel on skip
    const timedEvents: Phaser.Time.TimerEvent[] = [];
    const allElements: Phaser.GameObjects.Text[] = [];

    // --- Time stamp (fades in first) ---
    const timeText = this.add.text(width / 2, height * 0.18, transition.time, {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    });
    timeText.setOrigin(0.5);
    timeText.setAlpha(0);
    allElements.push(timeText);

    this.tweens.add({
      targets: timeText,
      alpha: 1,
      duration: 800,
    });

    // --- Title (after 1s) ---
    const titleText = this.add.text(width / 2, height * 0.32, transition.title, {
      fontFamily: FONT,
      fontSize: '54px',
      color: TextColors.gold,
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);
    allElements.push(titleText);

    timedEvents.push(
      this.time.delayedCall(1000, () => {
        this.tweens.add({
          targets: titleText,
          alpha: 1,
          duration: 800,
        });
      })
    );

    // --- Subtitle (after 2s) ---
    const subtitleText = this.add.text(width / 2, height * 0.42, transition.subtitle, {
      fontFamily: FONT,
      fontSize: '30px',
      color: TextColors.light,
      fontStyle: 'italic',
    });
    subtitleText.setOrigin(0.5);
    subtitleText.setAlpha(0);
    allElements.push(subtitleText);

    timedEvents.push(
      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: subtitleText,
          alpha: 1,
          duration: 800,
        });
      })
    );

    // --- Description lines (after 3.5s, staggered 600ms each) ---
    const descriptionLines = transition.description.split('\n');
    const lineStartY = height * 0.56;
    const lineSpacing = 28;
    const descriptionTexts: Phaser.GameObjects.Text[] = [];

    descriptionLines.forEach((line, index) => {
      const lineText = this.add.text(width / 2, lineStartY + index * lineSpacing, line, {
        fontFamily: FONT,
        fontSize: '22px',
        color: TextColors.goldDim,
        align: 'center',
      });
      lineText.setOrigin(0.5);
      lineText.setAlpha(0);
      descriptionTexts.push(lineText);
      allElements.push(lineText);

      timedEvents.push(
        this.time.delayedCall(3500 + index * 600, () => {
          this.tweens.add({
            targets: lineText,
            alpha: 1,
            duration: 800,
          });
        })
      );
    });

    // --- "Click to continue" hint (after 4s) ---
    const hintText = this.add.text(width / 2, height * 0.92, 'Click to continue', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    });
    hintText.setOrigin(0.5);
    hintText.setAlpha(0);
    allElements.push(hintText);

    timedEvents.push(
      this.time.delayedCall(4000, () => {
        this.skipEnabled = true;
        this.tweens.add({
          targets: hintText,
          alpha: 1,
          duration: 800,
        });
      })
    );

    // --- Auto-close: after all description lines shown + 3s ---
    const lastLineDelay = 3500 + (descriptionLines.length - 1) * 600 + 800; // last line fully visible
    const autoCloseDelay = lastLineDelay + 3000;

    timedEvents.push(
      this.time.delayedCall(autoCloseDelay, () => {
        this.fadeOutAndStop(allElements);
      })
    );

    // --- Click anywhere to skip ---
    this.input.on('pointerdown', () => {
      if (!this.skipEnabled) {
        return;
      }

      // Cancel all pending timed events
      timedEvents.forEach((event) => event.remove(false));

      // Show all elements immediately
      this.tweens.killAll();
      allElements.forEach((el) => el.setAlpha(1));

      this.fadeOutAndStop(allElements);
    });
  }

  private fadeOutAndStop(elements: Phaser.GameObjects.Text[]): void {
    // Prevent multiple fade-outs
    this.input.removeAllListeners('pointerdown');
    this.skipEnabled = false;

    this.tweens.add({
      targets: elements,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        // Restore UIScene before stopping
        if (this.scene.manager.getScene('UIScene')) {
          this.scene.setVisible(true, 'UIScene');
          this.scene.setActive(true, 'UIScene');
        }
        this.scene.stop();
      },
    });
  }
}
