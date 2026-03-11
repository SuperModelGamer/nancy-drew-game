import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';

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

const SCRIPTED_EVENTS: ScriptedEvent[] = [
  {
    id: 'ghost_sighting_auditorium',
    triggerRoom: 'auditorium',
    triggerFlag: 'learned_about_margaux',
    steps: [
      { action: 'flicker', duration: 2000, intensity: 3 },
      { action: 'text', text: 'The lights flicker and dim...', duration: 2000 },
      { action: 'fog', duration: 3000, intensity: 0.6 },
      { action: 'text', text: 'A cold mist rolls across the stage from nowhere.', duration: 2500 },
      { action: 'wait', duration: 500 },
      { action: 'spotlight', x: 640, y: 300, duration: 4000 },
      { action: 'figure', x: 640, y: 280, duration: 4000 },
      { action: 'text', text: 'A figure in white stands center stage, bathed in a pale spotlight.', speaker: '', duration: 3000 },
      { action: 'wait', duration: 1000 },
      { action: 'text', text: 'She turns toward you. For a moment, you see her face — beautiful, sorrowful, familiar from a hundred playbills.', duration: 3500 },
      { action: 'shake', duration: 500, intensity: 2 },
      { action: 'flicker', duration: 1000, intensity: 5 },
      { action: 'text', text: 'The lights surge. When your eyes adjust, the stage is empty. Only the ghost light remains.', duration: 3000 },
      { action: 'wait', duration: 500 },
      { action: 'text', text: '...But the scent of old roses lingers in the air.', duration: 2500 },
    ],
    onComplete: {
      setFlag: 'saw_ghost',
      addJournal: 'I saw her — or something pretending to be her. A woman in white on the stage. She vanished through the floor. Ghost or hoax, someone is haunting the Monarch.',
    },
  },
  {
    id: 'ghost_sighting_dressing_room',
    triggerRoom: 'dressing_room',
    triggerFlag: 'learned_about_cecilia',
    steps: [
      { action: 'text', text: 'The vanity lights flicker on by themselves.', duration: 2000 },
      { action: 'flicker', duration: 1500, intensity: 4 },
      { action: 'fog', duration: 2000, intensity: 0.3 },
      { action: 'text', text: 'In the mirror, behind your reflection — a shape. A woman in white, standing in the doorway.', duration: 3500 },
      { action: 'wait', duration: 800 },
      { action: 'text', text: 'You spin around. Nothing. The doorway is empty.', duration: 2500 },
      { action: 'shake', duration: 300, intensity: 1 },
      { action: 'text', text: 'But on the vanity, a single dried rose petal sits where there wasn\'t one before.', duration: 3000 },
    ],
    onComplete: {
      setFlag: 'saw_ghost_dressing_room',
      addJournal: 'The ghost appeared in Margaux\'s dressing room mirror. Real or staged, someone knows I\'m getting close to the truth.',
    },
  },
  {
    id: 'ghost_voice_backstage',
    triggerRoom: 'backstage',
    triggerFlag: 'heard_basement_noises',
    steps: [
      { action: 'text', text: 'You hear something. A voice, faint and distant, rising from beneath the stage.', duration: 3000 },
      { action: 'wait', duration: 1000 },
      { action: 'text', text: '"...and in the cup, the final mercy..."', speaker: '???', duration: 3000 },
      { action: 'text', text: 'A line from The Crimson Veil. Act III. The poisoning scene.', duration: 2500 },
      { action: 'fog', duration: 2000, intensity: 0.2 },
      { action: 'text', text: 'A wisp of fog seeps from under the basement door.', duration: 2500 },
    ],
    onComplete: {
      setFlag: 'heard_ghost_voice',
      addJournal: 'A woman\'s voice from below the stage, reciting lines from The Crimson Veil. The fog came from under the basement door. The "ghost" operates from the basement.',
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
      // Must match room
      if (event.triggerRoom && event.triggerRoom !== roomId) continue;
      // Must have trigger flag set
      if (event.triggerFlag && !save.getFlag(event.triggerFlag)) continue;
      // Must not have already been seen
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
    this.spotlightGfx = this.add.ellipse(0, 0, 120, 180, 0xffffcc, 0);
    this.container.add(this.spotlightGfx);

    // Ghost figure (starts invisible)
    this.figureGfx = this.createGhostFigure();
    this.figureGfx.setAlpha(0);
    this.container.add(this.figureGfx);

    // Text box
    this.textBox = this.add.container(width / 2, height - 80);
    this.textBox.setAlpha(0);

    const textBg = this.add.rectangle(0, 0, width * 0.85, 70, 0x000000, 0.9);
    textBg.setStrokeStyle(1, Colors.gold, 0.5);

    this.speakerText = this.add.text(-width * 0.4 + 20, -20, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.gold,
      fontStyle: 'bold',
    });

    this.textContent = this.add.text(0, 5, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TextColors.light,
      fontStyle: 'italic',
      wordWrap: { width: width * 0.8 },
      align: 'center',
    }).setOrigin(0.5, 0);

    this.textBox.add([textBg, this.speakerText, this.textContent]);
    this.container.add(this.textBox);

    // Start stepping through the event
    this.executeStep();
  }

  private createGhostFigure(): Phaser.GameObjects.Container {
    const figure = this.add.container(640, 280);

    // Simple ghost silhouette using shapes
    // Head
    const head = this.add.ellipse(0, -60, 30, 35, 0xffffff, 0.7);
    // Body (trapezoid-ish using rectangle)
    const body = this.add.rectangle(0, -10, 40, 80, 0xffffff, 0.5);
    // Flowing bottom
    const skirt = this.add.triangle(0, 40, -35, 0, 35, 0, 0, 30, 0xffffff, 0.3);
    // Glow
    const glow = this.add.ellipse(0, -10, 80, 140, 0xccccff, 0.15);

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
        this.spotlightGfx.setPosition(step.x || 640, step.y || 300);
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
        this.figureGfx.setPosition(step.x || 640, step.y || 280);
        this.tweens.add({
          targets: this.figureGfx,
          alpha: 0.8,
          duration: 1000,
          hold: duration - 2000,
          yoyo: true,
          onComplete: () => this.nextStep(),
        });
        // Gentle float animation
        this.tweens.add({
          targets: this.figureGfx,
          y: (step.y || 280) - 10,
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

    // Mark as seen
    save.setFlag(`seen_event_${this.eventData.id}`, true);

    // Apply onComplete effects
    if (this.eventData.onComplete) {
      if (this.eventData.onComplete.setFlag) {
        save.setFlag(this.eventData.onComplete.setFlag, true);
      }
      if (this.eventData.onComplete.addJournal) {
        save.addJournalEntry(this.eventData.onComplete.addJournal);
      }
    }

    // Fade out and close
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
