import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { UISounds } from '../utils/sounds';

interface ScriptedStep {
  action: 'fog' | 'spotlight' | 'figure' | 'text' | 'shake' | 'flicker' | 'wait' | 'sound';
  duration?: number;
  delay?: number;
  text?: string;
  speaker?: string;
  x?: number;
  y?: number;
  intensity?: number;
}

interface ScriptedEvent {
  id: string;
  triggerFlag?: string;
  triggerRoom?: string;
  steps: ScriptedStep[];
  onComplete?: {
    setFlag?: string;
    addJournal?: string;
  };
}

// Overlay-style scripted events (play ON TOP of the room scene).
// The auditorium ghost sighting is handled by CinematicScene instead.
const SCRIPTED_EVENTS: ScriptedEvent[] = [
  {
    id: 'ghost_sighting_dressing_room',
    triggerRoom: 'dressing_room',
    triggerFlag: 'learned_about_cecilia',
    steps: [
      { action: 'text', text: 'The vanity lights flicker on by themselves. I freeze.', duration: 2500 },
      { action: 'flicker', duration: 1500, intensity: 4 },
      { action: 'fog', duration: 2000, intensity: 0.3 },
      { action: 'text', text: 'In the mirror — behind my reflection — a shape. A woman in white, standing in the doorway. My blood goes cold.', duration: 4000 },
      { action: 'wait', duration: 800 },
      { action: 'text', text: 'I spin around. Nothing. The doorway is empty. Just darkness and the smell of old perfume.', duration: 3000 },
      { action: 'shake', duration: 300, intensity: 1 },
      { action: 'text', text: 'But on the vanity, a single dried rose petal sits where there wasn\'t one before. Someone was here. Someone who knows I\'m getting close.', duration: 4000 },
    ],
    onComplete: {
      setFlag: 'saw_ghost_dressing_room',
      addJournal: 'Something appeared in Margaux\'s dressing room mirror — a woman in white. When I turned, she was gone, but a dried rose petal had been left on the vanity. Staged or real, someone knows I\'m getting close.',
    },
  },
  {
    id: 'ghost_voice_backstage',
    triggerRoom: 'backstage',
    triggerFlag: 'heard_basement_noises',
    steps: [
      { action: 'text', text: 'I stop breathing. A voice — faint and distant — rising from somewhere beneath the stage.', duration: 3000 },
      { action: 'wait', duration: 1000 },
      { action: 'text', text: '"...and in the cup, the final mercy..."', speaker: '???', duration: 3000 },
      { action: 'text', text: 'I recognize it immediately. A line from The Crimson Veil. Act Three. The poisoning scene. Someone down there knows the play by heart.', duration: 3500 },
      { action: 'fog', duration: 2000, intensity: 0.2 },
      { action: 'text', text: 'A thin ribbon of fog seeps from under the basement door. Theatrical fog. From a machine. This "ghost" has equipment.', duration: 3500 },
    ],
    onComplete: {
      setFlag: 'heard_ghost_voice',
      addJournal: 'A voice from below the stage, reciting lines from The Crimson Veil — the poisoning scene. Theatrical fog seeping from under the basement door. This "ghost" has real equipment. The haunting is being staged from the basement.',
    },
  },
];

export class ScriptedEventScene extends Phaser.Scene {
  private eventData!: ScriptedEvent;
  private container!: Phaser.GameObjects.Container;
  private fogOverlay!: Phaser.GameObjects.Rectangle;
  private spotlightGfx!: Phaser.GameObjects.Ellipse;
  private figureGfx!: Phaser.GameObjects.Container;
  private textBox!: Phaser.GameObjects.Container;
  private textContent!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private stepIndex = 0;

  constructor() {
    super({ key: 'ScriptedEventScene' });
  }

  static getTriggerable(roomId: string): ScriptedEvent | null {
    const save = SaveSystem.getInstance();
    for (const event of SCRIPTED_EVENTS) {
      if (event.triggerRoom && event.triggerRoom !== roomId) continue;
      if (event.triggerFlag && !save.getFlag(event.triggerFlag)) continue;
      const seenFlag = `seen_event_${event.id}`;
      if (save.getFlag(seenFlag)) continue;
      return event;
    }
    return null;
  }

  init(data: { eventId: string }): void {
    const event = SCRIPTED_EVENTS.find(e => e.id === data.eventId);
    if (!event) {
      this.scene.stop();
      return;
    }
    this.eventData = event;
    this.stepIndex = 0;
  }

  create(): void {
    if (!this.eventData) return;

    const { width, height } = this.cameras.main;

    this.container = this.add.container(0, 0);
    this.container.setDepth(Depths.scriptedEvent);

    // Click blocker
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    blocker.setInteractive();
    this.container.add(blocker);

    // Fog overlay (starts invisible)
    this.fogOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x8888aa, 0);
    this.container.add(this.fogOverlay);

    // Spotlight (starts invisible)
    this.spotlightGfx = this.add.ellipse(0, 0, 180, 270, 0xffffcc, 0);
    this.container.add(this.spotlightGfx);

    // Ghost figure (starts invisible)
    this.figureGfx = this.createGhostFigure();
    this.figureGfx.setAlpha(0);
    this.container.add(this.figureGfx);

    // Text box
    this.textBox = this.add.container(width / 2, height - 120);
    this.textBox.setAlpha(0);

    const textBg = this.add.rectangle(0, 0, width * 0.85, 105, 0x000000, 0.9);
    textBg.setStrokeStyle(1, Colors.gold, 0.5);

    this.speakerText = this.add.text(-width * 0.4 + 20, -30, '', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.gold,
      fontStyle: 'bold',
    });

    this.textContent = this.add.text(0, 8, '', {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.light,
      fontStyle: 'italic',
      wordWrap: { width: width * 0.8 },
      align: 'center',
    }).setOrigin(0.5, 0);

    this.textBox.add([textBg, this.speakerText, this.textContent]);
    this.container.add(this.textBox);

    // Ghost drone for atmosphere
    UISounds.ghostDrone();

    // Start stepping through the event
    this.executeStep();
  }

  private createGhostFigure(): Phaser.GameObjects.Container {
    const figure = this.add.container(960, 420);
    const head = this.add.ellipse(0, -90, 45, 52, 0xffffff, 0.7);
    const body = this.add.rectangle(0, -15, 60, 120, 0xffffff, 0.5);
    const skirt = this.add.triangle(0, 60, -52, 0, 52, 0, 0, 45, 0xffffff, 0.3);
    const glow = this.add.ellipse(0, -15, 120, 210, 0xccccff, 0.15);
    figure.add([glow, skirt, body, head]);
    return figure;
  }

  private executeStep(): void {
    if (this.stepIndex >= this.eventData.steps.length) {
      this.finishEvent();
      return;
    }

    const step = this.eventData.steps[this.stepIndex];
    const delay = step.delay || 0;

    this.time.delayedCall(delay, () => {
      this.runStep(step);
    });
  }

  private runStep(step: ScriptedStep): void {
    const duration = step.duration || 1000;

    switch (step.action) {
      case 'fog':
        this.tweens.add({
          targets: this.fogOverlay,
          fillAlpha: step.intensity || 0.4,
          duration: duration * 0.6,
          yoyo: true,
          hold: duration * 0.4,
          onComplete: () => this.nextStep(),
        });
        break;

      case 'spotlight':
        this.spotlightGfx.setPosition(step.x || 960, step.y || 450);
        this.tweens.add({
          targets: this.spotlightGfx,
          fillAlpha: 0.3,
          duration: 500,
          yoyo: true,
          hold: duration - 1000,
          onComplete: () => {
            this.spotlightGfx.setFillStyle(0xffffcc, 0);
            this.nextStep();
          },
        });
        break;

      case 'figure':
        this.figureGfx.setPosition(step.x || 960, step.y || 420);
        this.tweens.add({
          targets: this.figureGfx,
          alpha: 0.8,
          duration: 1000,
          hold: duration - 2000,
          yoyo: true,
          onComplete: () => this.nextStep(),
        });
        this.tweens.add({
          targets: this.figureGfx,
          y: (step.y || 420) - 15,
          duration: 2000,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'text':
        this.speakerText.setText(step.speaker || '');
        this.textContent.setText(step.text || '');
        this.tweens.add({
          targets: this.textBox,
          alpha: 1,
          duration: 300,
          hold: duration - 600,
          yoyo: true,
          onComplete: () => this.nextStep(),
        });
        break;

      case 'shake':
        this.cameras.main.shake(duration, (step.intensity || 2) * 0.002);
        this.time.delayedCall(duration, () => this.nextStep());
        break;

      case 'flicker':
        this.doFlicker(duration, step.intensity || 3);
        break;

      case 'wait':
        this.time.delayedCall(duration, () => this.nextStep());
        break;

      default:
        this.nextStep();
    }
  }

  private doFlicker(duration: number, count: number): void {
    const { width, height } = this.cameras.main;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    this.container.add(flash);

    const flickerInterval = duration / (count * 2);
    let flicks = 0;

    const timer = this.time.addEvent({
      delay: flickerInterval,
      repeat: count * 2 - 1,
      callback: () => {
        flicks++;
        flash.setAlpha(flicks % 2 === 1 ? 0.6 : 0);
      },
    });

    this.time.delayedCall(duration, () => {
      if (timer) timer.remove();
      flash.destroy();
      this.nextStep();
    });
  }

  private nextStep(): void {
    this.stepIndex++;
    this.executeStep();
  }

  private finishEvent(): void {
    const save = SaveSystem.getInstance();

    save.setFlag(`seen_event_${this.eventData.id}`, true);

    if (this.eventData.onComplete) {
      if (this.eventData.onComplete.setFlag) {
        save.setFlag(this.eventData.onComplete.setFlag, true);
      }
      if (this.eventData.onComplete.addJournal) {
        save.addJournalEntry(this.eventData.onComplete.addJournal);
      }
    }

    this.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        this.scene.stop();
      },
    });
  }
}
