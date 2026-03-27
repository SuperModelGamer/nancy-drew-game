import Phaser from 'phaser';
import { TextColors, FONT } from '../utils/constants';

const TRANSITIONS: Record<number, { title: string; subtitle: string; time: string; description: string }> = {
  1: {
    title: 'Night 1',
    subtitle: '72 Hours Remain',
    time: '9:00 PM — Three Days Until Demolition',
    description: 'The Monarch Theatre stands dark against the city skyline.\nA single light burns in the lobby window.\nI push through the heavy front doors, and the smell of a century hits me — velvet, dust, and something faintly like roses.',
  },
  2: {
    title: 'Night 1',
    subtitle: 'Behind the Curtain',
    time: '11:30 PM',
    description: 'The theater grows quieter as midnight approaches.\nTwo people have been poisoned in this building. Same method. Nearly a century apart.\nSomewhere below the stage, machinery hums — and I don\'t think it\'s supposed to.',
  },
  3: {
    title: 'Night 2',
    subtitle: '48 Hours Remain',
    time: '10:00 PM — Two Days Until Demolition',
    description: 'I barely slept. Every time I closed my eyes, I saw that face on the stage.\nBut I spent the day on the phone. Bess found a pattern. George found a cover-up.\nTonight I go deeper. The ghost is a lie — but the poisoning might be a bigger one.',
  },
  4: {
    title: 'Night 3',
    subtitle: '24 Hours Remain',
    time: '11:00 PM — Final Night',
    description: 'The basement key feels heavy in my pocket.\nI know who staged the ghost. I know who fled the building.\nWhatever truth the Monarch is hiding, it\'s buried below the stage.\nTwenty-four hours. Then the wrecking ball.',
  },
  5: {
    title: 'Night 3',
    subtitle: 'The Final Hours',
    time: '2:00 AM — Hours Until Demolition',
    description: 'Edwin confessed to the ghost. But not the poisoning.\nThe chemicals don\'t match. The insurance records don\'t lie.\nThe "victim" ran when I got too close.\nOne puzzle left. One truth to prove.',
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
