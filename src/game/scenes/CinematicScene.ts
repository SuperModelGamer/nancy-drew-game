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
  // ── The Murder of 1928 — plays first time entering the auditorium ─────────
  // Nancy stands on the stage where Margaux died and imagines that night.
  {
    id: 'the_murder_of_1928',
    triggerRoom: 'auditorium',
    triggerFlag: '',
    slides: [
      {
        lines: [
          'Halloween, 1928.',
        ],
        effect: 'dramatic',
        pauseAfter: 800,
        voiceover: 'vo_intro_01',
        bgImage: 'intro_marquee_lights',
        bgAlpha: 0.7,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: -8 },
        vignetteIntensity: 0.8,
        letterbox: true,
        audio: [
          { key: 'ambient_theater', volume: 0.3, loop: true },
        ],
      },
      {
        lines: [
          'Every seat in the Monarch Theatre is taken.',
          'Standing room only for the final night',
          'of "The Crimson Veil."',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_02',
        bgImage: 'intro_stage_1928',
        bgAlpha: 0.65,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: -12 },
        vignetteIntensity: 0.6,
        letterbox: true,
      },
      {
        lines: [
          'The star, Margaux Fontaine,',
          'raises a golden goblet to her lips.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_03',
        bgImage: 'intro_goblet',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.15, panY: 8 },
        vignetteIntensity: 0.7,
        letterbox: true,
        effects: [
          { type: 'spotlight', delay: 200, duration: 3000 },
        ],
        audio: [
          { key: 'sfx_goblet', delay: 800, volume: 0.5 },
        ],
      },
      {
        lines: [
          'She drinks.',
          '',
          'She falls.',
          '',
          'This time, she doesn\'t get up.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_04',
        bgImage: 'intro_goblet',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.15, scaleTo: 1.3, panY: 15 },
        vignetteIntensity: 0.9,
        letterbox: true,
        audio: [
          { key: 'sfx_thud', delay: 1000, volume: 0.5 },
        ],
        effects: [
          { type: 'screenShake', delay: 1000, duration: 500 },
          { type: 'heartbeat', delay: 1200, duration: 2500 },
        ],
      },
      {
        lines: [
          'The curtain falls for the last time.',
        ],
        effect: 'dramatic',
        pauseAfter: 800,
        voiceover: 'vo_intro_05',
        bgImage: 'intro_stage_empty',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.05, panX: -10 },
        vignetteIntensity: 0.8,
        letterbox: true,
      },
      {
        lines: [
          'The papers call it a tragic accident.',
          'Poison in a prop goblet.',
          'A terrible mistake.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_06',
        bgImage: 'intro_newspaper',
        bgAlpha: 0.6,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -6 },
        vignetteIntensity: 0.5,
        letterbox: true,
      },
      {
        lines: [
          'But someone in the audience that night',
          'knew exactly what happened.',
          '',
          'And they never said a word.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_07',
        bgImage: 'intro_backstage',
        bgAlpha: 0.45,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panX: 12 },
        vignetteIntensity: 0.7,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 500, volume: 0.2 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'learned_1928_murder',
      addJournal: 'The auditorium where Margaux Fontaine died on stage in 1928. Poison in a prop goblet — the papers called it an accident, but someone knew the truth.',
    },
  },

  // ── The Copycat Poisoning — plays first time entering manager's office ────
  // Nancy learns about Ashworth's poisoning in the place where it happened.
  {
    id: 'the_copycat',
    triggerRoom: 'managers_office',
    triggerFlag: '',
    slides: [
      {
        lines: [
          'Ninety-seven years later.',
        ],
        effect: 'dramatic',
        pauseAfter: 800,
        voiceover: 'vo_intro_08',
        bgImage: 'intro_exterior',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.04, panY: -5 },
        vignetteIntensity: 0.5,
        letterbox: true,
        effects: [
          { type: 'flashWhite', delay: 0, duration: 500 },
        ],
      },
      {
        lines: [
          'The Monarch sits condemned.',
          'Three days from demolition.',
          'A developer named Roland Ashworth',
          'plans to tear it down for condominiums.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_09',
        bgImage: 'intro_demolition',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: -8 },
        fogIntensity: 0.08,
        vignetteIntensity: 0.6,
        letterbox: true,
      },
      {
        lines: [
          'But last night, Ashworth collapsed.',
          'Poisoned.',
          'The same method. The same symptoms.',
          'The same theater.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_10',
        bgImage: 'intro_poison_bottle',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.12, panY: 5 },
        vignetteIntensity: 0.8,
        letterbox: true,
        effects: [
          { type: 'screenShake', delay: 600, duration: 400 },
          { type: 'heartbeat', delay: 800, duration: 3000 },
        ],
      },
      {
        lines: [
          'Someone is copying a murder',
          'that was never solved.',
        ],
        effect: 'dramatic',
        pauseAfter: 800,
        voiceover: 'vo_intro_11',
        bgImage: 'intro_poison_bottle',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.12, scaleTo: 1.2, panY: 8 },
        vignetteIntensity: 0.9,
        letterbox: true,
      },
    ],
    onComplete: {
      setFlag: 'learned_copycat_poisoning',
      addJournal: 'Roland Ashworth was poisoned in this office — the same method as Margaux Fontaine in 1928. Someone is copying a ninety-seven-year-old murder.',
    },
  },

  // ── Ghost Rumors — plays first time entering backstage ────────────────────
  // The crew area where whispers of the haunting circulate.
  {
    id: 'ghost_rumors',
    triggerRoom: 'backstage',
    triggerFlag: '',
    slides: [
      {
        lines: [
          'And something else is wrong.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_12',
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panX: -5 },
        fogIntensity: 0.12,
        vignetteIntensity: 0.7,
        letterbox: true,
        audio: [
          { key: 'proc:eerieWhistle', delay: 200, volume: 0.3 },
        ],
      },
      {
        lines: [
          'A figure in white on the empty stage.',
          'Footsteps in locked corridors.',
          'A voice whispering lines',
          'from a play that ended in death.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_13',
        bgImage: 'intro_ghost_stage',
        bgAlpha: 0.45,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: 5 },
        fogIntensity: 0.18,
        vignetteIntensity: 0.8,
        letterbox: true,
        effects: [
          { type: 'ghostFlicker', delay: 300, duration: 4000 },
          { type: 'spotlight', delay: 600, duration: 3000 },
        ],
        audio: [
          { key: 'proc:ghostWhisper', delay: 800, volume: 0.3 },
        ],
      },
      {
        lines: [
          'The ghost of Margaux Fontaine',
          'walks the Monarch again.',
        ],
        effect: 'dramatic',
        pauseAfter: 800,
        voiceover: 'vo_intro_14',
        bgImage: 'intro_ghost',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panX: -8 },
        fogIntensity: 0.15,
        vignetteIntensity: 0.9,
        letterbox: true,
        effects: [
          { type: 'ghostFlicker', delay: 200, duration: 3000 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'learned_ghost_rumors',
      addJournal: 'The crew whispers about a ghost — a figure in white on the empty stage, footsteps in locked corridors. They say Margaux Fontaine walks the Monarch again.',
    },
  },

  // ── Ghost Sighting — plays when returning to auditorium after hearing rumors
  {
    id: 'ghost_sighting_auditorium',
    triggerRoom: 'auditorium',
    triggerFlag: 'seen_event_ghost_rumors',
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
