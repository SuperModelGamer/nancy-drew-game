/**
 * CinematicScene — plays a sequence of image slides with text before entering a room.
 *
 * Extends BaseSlideScene for all rendering/animation. This file owns the cinematic
 * event definitions and the trigger/completion logic.
 *
 * Usage:
 *   this.scene.start('CinematicScene', {
 *     cinematicId: 'ghost_sighting_auditorium',
 *     targetRoom: 'auditorium',
 *   });
 */

import { SaveSystem } from '../systems/SaveSystem';
import { UISounds } from '../utils/sounds';
import { BaseSlideScene, Slide } from './BaseSlideScene';

// ─── Cinematic event definitions ─────────────────────────────────────────────

interface CinematicEvent {
  id: string;
  triggerRoom: string;
  triggerFlag: string;
  slides: Slide[];
  onComplete?: {
    setFlag?: string;
    addJournal?: string;
  };
}

const CINEMATIC_EVENTS: CinematicEvent[] = [
  {
    id: 'ghost_sighting_auditorium',
    triggerRoom: 'auditorium',
    triggerFlag: '',
    slides: [
      // Slide 1: Eerie auditorium, lights dimming
      {
        lines: [
          'The lights flicker and dim...',
          '',
          'A cold mist rolls across the stage from nowhere.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_fog',
        bgAlpha: 0.6,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: -8 },
        fogIntensity: 0.12,
        effects: [
          { type: 'ghostFlicker', delay: 500, duration: 4000 },
        ],
        audio: [
          { key: 'cine_ambient_ghost', volume: 0.25, loop: true },
          { key: 'proc:ghostDroneLong', delay: 300 },
        ],
      },
      // Slide 2: Ghost figure appears on stage
      {
        lines: [
          'A figure in white stands center stage,',
          'bathed in a pale spotlight.',
        ],
        effect: 'fade',
        pauseAfter: 3000,
        bgImage: 'cine_ghost_figure',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: 5 },
        fogIntensity: 0.15,
        effects: [
          { type: 'ghostFlicker', delay: 200, duration: 5000 },
        ],
        audio: [
          { key: 'proc:eerieWhistle', delay: 500 },
          { key: 'sfx_ghost_whisper', delay: 1500, volume: 0.15 },
        ],
      },
      // Slide 3: Ghost face reveal
      {
        lines: [
          'She turns toward you.',
          'For a moment, you see her face —',
          'beautiful, sorrowful, familiar',
          'from a hundred playbills.',
        ],
        effect: 'typewriter',
        pauseAfter: 3500,
        bgImage: 'cine_ghost_face',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.05, scaleTo: 1.15, panY: 3 },
        effects: [
          { type: 'heartbeat', delay: 0, duration: 4000 },
        ],
        audio: [
          { key: 'proc:heartbeat', delay: 0 },
          { key: 'proc:heartbeat', delay: 1000 },
          { key: 'proc:heartbeat', delay: 2000 },
          { key: 'proc:heartbeat', delay: 3000 },
          { key: 'proc:ghostWhisper', delay: 1200 },
        ],
      },
      // Slide 4: Ghost vanishes
      {
        lines: [
          'The lights surge.',
          'When your eyes adjust, the stage is empty.',
          '',
          'Only the ghost light remains.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_empty',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.08, scaleTo: 1.0, panY: -5 },
        effects: [
          { type: 'flashWhite', delay: 0, duration: 500 },
          { type: 'screenShake', delay: 0, duration: 400 },
        ],
        audio: [
          { key: 'proc:lightSurge', delay: 0 },
        ],
      },
      // Slide 5: Aftermath
      {
        lines: [
          '...But the scent of old roses',
          'lingers in the air.',
        ],
        effect: 'dramatic',
        pauseAfter: 2500,
        fogIntensity: 0.06,
        audio: [
          { key: 'proc:shimmer', delay: 500 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'saw_ghost',
      addJournal: 'I saw her — or something pretending to be her. A woman in white on the stage. She vanished through the floor. Ghost or hoax, someone is haunting the Monarch.',
    },
  },
];

// ─── Public helper for checking triggerable cinematics ───────────────────────

export function getCinematicForRoom(roomId: string): CinematicEvent | null {
  const save = SaveSystem.getInstance();
  for (const event of CINEMATIC_EVENTS) {
    if (event.triggerRoom !== roomId) continue;
    if (event.triggerFlag && !save.getFlag(event.triggerFlag)) continue;
    const seenFlag = `seen_event_${event.id}`;
    if (save.getFlag(seenFlag)) continue;
    return event;
  }
  return null;
}

// ─── CinematicScene ──────────────────────────────────────────────────────────

export class CinematicScene extends BaseSlideScene {
  private cinematicData!: CinematicEvent;
  private targetRoom = 'lobby';
  private eventCompleted = false;

  constructor() {
    super({ key: 'CinematicScene' });
  }

  init(data: { cinematicId: string; targetRoom: string }): void {
    const event = CINEMATIC_EVENTS.find(e => e.id === data.cinematicId);
    if (!event) {
      this.scene.start('RoomScene', { roomId: data.targetRoom });
      return;
    }
    this.cinematicData = event;
    this.targetRoom = data.targetRoom;
    this.eventCompleted = false;
    this.resetState();
  }

  create(): void {
    if (!this.cinematicData) return;
    // Hide the UI frame so the cinematic fills the full screen
    if (this.scene.isActive('UIScene')) {
      this.scene.setVisible(false, 'UIScene');
      this.scene.setActive(false, 'UIScene');
      this.scene.sendToBack('UIScene');
    }
    super.create();
  }

  protected getSlides(): Slide[] {
    return this.cinematicData.slides;
  }

  protected onSceneCreate(): void {
    UISounds.ghostDrone();
  }

  protected getDustConfig() {
    return { count: 15, driftX: 60, driftY: 40, alphaMin: 0.04, alphaMax: 0.12, durationMin: 5000, durationMax: 10000 };
  }

  protected getTimingConfig() {
    return { fadeInDuration: 800, startDelay: 1000, skipBtnDelay: 1500 };
  }

  protected getStageDirectionPrefixes(): string[] {
    return ['She ', 'You ', 'A '];
  }

  protected onBeforeTransition(): void {
    this.completeEvent();
  }

  protected onTransitionComplete(): void {
    // Restore UIScene before returning to the room
    if (this.scene.manager.getScene('UIScene')) {
      this.scene.setVisible(true, 'UIScene');
      this.scene.setActive(true, 'UIScene');
      this.scene.bringToTop('UIScene');
    }
    this.scene.start('RoomScene', { roomId: this.targetRoom, skipCinematic: true });
  }

  private completeEvent(): void {
    if (this.eventCompleted) return;
    this.eventCompleted = true;

    const save = SaveSystem.getInstance();
    save.setFlag(`seen_event_${this.cinematicData.id}`, true);
    if (this.cinematicData.onComplete) {
      if (this.cinematicData.onComplete.setFlag) {
        save.setFlag(this.cinematicData.onComplete.setFlag, true);
      }
      if (this.cinematicData.onComplete.addJournal) {
        save.addJournalEntry(this.cinematicData.onComplete.addJournal);
      }
    }
  }
}
