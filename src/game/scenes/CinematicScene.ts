/**
 * CinematicScene — plays a sequence of image slides with text before entering a room.
 *
 * Extends BaseSlideScene for all rendering/animation. This file owns the cinematic
 * event definitions and the trigger/completion logic.
 *
 * Each cinematic has an optional videoKey. If the corresponding video asset exists,
 * the scene redirects to VideoCinematicScene for full video playback. Otherwise,
 * the slide-based fallback plays with all effects and voiceover.
 *
 * Usage:
 *   this.scene.start('CinematicScene', {
 *     cinematicId: 'ghost_sighting_auditorium',
 *     targetRoom: 'auditorium',
 *   });
 */

import { SaveSystem } from '../systems/SaveSystem';
import { UISounds } from '../utils/sounds';
import { MusicSystem } from '../systems/MusicSystem';
import { AmbientAudioSystem } from '../systems/AmbientAudioSystem';
import { BaseSlideScene, Slide } from './BaseSlideScene';

// ─── Cinematic event definitions ─────────────────────────────────────────────

interface CinematicEvent {
  id: string;
  triggerRoom: string;
  triggerFlag: string;
  /** If set, checks for this video key — plays via VideoCinematicScene if the asset exists. */
  videoKey?: string;
  /** Subtitles for the video version (used with VideoCinematicScene). */
  videoSubtitles?: Array<{ time: number; text: string; duration?: number }>;
  slides: Slide[];
  onComplete?: {
    setFlag?: string;
    addJournal?: string;
  };
}

const CINEMATIC_EVENTS: CinematicEvent[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 1: "Where She Fell"
  // Plays on first entry to the auditorium.
  // Nancy stands on the stage where Margaux died — narrated in first person.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'the_murder_of_1928',
    triggerRoom: 'auditorium',
    triggerFlag: '',
    videoKey: 'Cutscene01_lobby2auditorium',
    videoSubtitles: [],
    slides: [
      {
        lines: [
          'The auditorium takes my breath away.',
          '',
          'Even abandoned, even condemned —',
          'you can feel what this place was.',
        ],
        effect: 'fade',
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
          'A thousand red velvet seats face the stage.',
          'The curtain hangs in tatters,',
          'but the gold fringe still catches the light.',
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
          'This is where it happened.',
          'Halloween night, 1928.',
          'The final performance of "The Crimson Veil."',
        ],
        effect: 'dramatic',
        pauseAfter: 800,
        voiceover: 'vo_intro_03',
        bgImage: 'intro_stage_1928',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -6 },
        vignetteIntensity: 0.7,
        letterbox: true,
      },
      {
        lines: [
          'Margaux Fontaine was the star.',
          'They say she lit up the room',
          'just by walking on stage.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_04',
        bgImage: 'intro_goblet',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.15, panY: 8 },
        vignetteIntensity: 0.7,
        letterbox: true,
        effects: [
          { type: 'spotlight', delay: 200, duration: 3000 },
        ],
      },
      {
        lines: [
          'That night, in Act Three,',
          'she raised a golden goblet to her lips.',
          '',
          'She drank. She stumbled.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_05',
        bgImage: 'intro_goblet',
        bgAlpha: 0.45,
        camera: { scaleFrom: 1.0, scaleTo: 1.12, panY: 5 },
        vignetteIntensity: 0.8,
        letterbox: true,
        audio: [
          { key: 'sfx_goblet', delay: 800, volume: 0.5 },
        ],
      },
      {
        lines: [
          'The audience thought it was part of the show.',
          '',
          'It wasn\'t.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_06',
        bgImage: 'intro_goblet',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.12, scaleTo: 1.3, panY: 15 },
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
          'The official report called it a tragic accident.',
          'Arsenic in a prop goblet.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_07',
        bgImage: 'intro_newspaper',
        bgAlpha: 0.6,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -6 },
        vignetteIntensity: 0.5,
        letterbox: true,
      },
      {
        lines: [
          'But ninety-seven years later,',
          'no one has ever explained how arsenic',
          'got into a theater prop.',
          '',
          'Someone in this audience knew the truth.',
          'And they took it to their grave.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        bgImage: 'intro_backstage',
        bgAlpha: 0.45,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panX: 12 },
        vignetteIntensity: 0.7,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 500, volume: 0.2 },
        ],
      },
      {
        lines: [
          '...Or did they?',
        ],
        effect: 'dramatic',
        pauseAfter: 1200,
        bgImage: 'intro_backstage',
        bgAlpha: 0.3,
        vignetteIntensity: 0.9,
        letterbox: true,
      },
    ],
    onComplete: {
      setFlag: 'learned_1928_murder',
      addJournal: 'The auditorium where Margaux Fontaine died on stage in 1928. Arsenic in a prop goblet — the papers called it an accident, but no one ever explained how poison got into a theater prop. Someone in the audience knew the truth.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 2: "The Same Method"
  // Plays on first entry to the manager's office.
  // Nancy discovers where Ashworth was poisoned and connects it to 1928.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'the_copycat',
    triggerRoom: 'managers_office',
    triggerFlag: '',
    videoKey: 'cinematic_copycat',
    videoSubtitles: [
      { time: 1.0,  text: 'The manager\'s office still smells like cigars and old paper.' },
      { time: 5.0,  text: 'Roland Ashworth\'s briefcase sits on the desk, half-packed. Demolition blueprints are pinned to the wall.' },
      { time: 11.0, text: 'This is where they found him. Last night. Slumped over this desk.' },
      { time: 16.0, text: 'Poisoned.' },
      { time: 18.5, text: 'The police report says he complained of dizziness at nine. By 9:30, he couldn\'t stand.' },
      { time: 24.0, text: 'They rushed him to River Heights General. He survived — barely.' },
      { time: 29.0, text: 'The toxicology results sent a chill down my spine.' },
      { time: 33.0, text: 'Not just poison. The same poison. The same concentration. The same delivery method.' },
      { time: 39.0, text: 'Someone studied Margaux Fontaine\'s death down to the last detail.' },
      { time: 44.0, text: 'And they recreated it. Here. In the same theater. Ninety-seven years to the day.' },
      { time: 50.0, text: 'This isn\'t a coincidence. This is a message.' },
      { time: 54.0, text: 'But who is it meant for?' },
      { time: 57.0, text: '' },
    ],
    slides: [
      {
        lines: [
          'The manager\'s office still smells',
          'like cigars and old paper.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_08',
        bgImage: 'intro_exterior',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.04, panY: -5 },
        vignetteIntensity: 0.5,
        letterbox: true,
      },
      {
        lines: [
          'Ashworth\'s briefcase sits on the desk, half-packed.',
          'Demolition blueprints pinned to the wall.',
          '',
          'This is where they found him. Last night.',
          'Slumped over this desk.',
        ],
        effect: 'typewriter',
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
          'Poisoned.',
          '',
          'The police report says he complained',
          'of dizziness at nine.',
          'By 9:30, he couldn\'t stand.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_10',
        bgImage: 'intro_poison_bottle',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.12, panY: 5 },
        vignetteIntensity: 0.8,
        letterbox: true,
        effects: [
          { type: 'heartbeat', delay: 800, duration: 3000 },
        ],
      },
      {
        lines: [
          'The toxicology results sent a chill down my spine.',
          '',
          'Not just poison. The same poison.',
          'The same concentration.',
          'The same delivery method.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_11',
        bgImage: 'intro_poison_bottle',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.08, scaleTo: 1.15, panY: 3 },
        vignetteIntensity: 0.85,
        letterbox: true,
        effects: [
          { type: 'screenShake', delay: 600, duration: 400 },
        ],
      },
      {
        lines: [
          'Someone studied Margaux Fontaine\'s death',
          'down to the last detail.',
          'And they recreated it here.',
          'In the same theater.',
          'Ninety-seven years to the day.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        bgImage: 'intro_poison_bottle',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.12, scaleTo: 1.2, panY: 8 },
        vignetteIntensity: 0.9,
        letterbox: true,
      },
      {
        lines: [
          'This isn\'t a coincidence.',
          'This is a message.',
          '',
          'But who is it meant for?',
        ],
        effect: 'dramatic',
        pauseAfter: 1200,
        vignetteIntensity: 0.9,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 200, volume: 0.15 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'learned_copycat_poisoning',
      addJournal: 'Roland Ashworth was poisoned in this office — the exact same method as Margaux Fontaine in 1928. Same poison, same concentration, same delivery. This isn\'t random. Someone studied a ninety-seven-year-old murder and recreated it. This is a message.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 3: "Whispers in the Wings"
  // Plays on first entry to backstage.
  // Nancy senses something wrong and learns about the ghost sightings.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ghost_rumors',
    triggerRoom: 'backstage',
    triggerFlag: '',
    videoKey: 'cinematic_ghost_rumors',
    videoSubtitles: [
      { time: 1.0,  text: 'Backstage at the Monarch is a maze of ropes, pulleys, and faded memories.' },
      { time: 6.0,  text: 'Costumes from decades of performances hang like ghosts on their racks.' },
      { time: 10.5, text: 'The air smells like sawdust and greasepaint.' },
      { time: 14.0, text: 'But something feels wrong. The hairs on my arms are standing up.' },
      { time: 19.0, text: 'Vivian told me the crew has been talking. Strange things happening after dark.' },
      { time: 24.0, text: 'Lights turning on in empty rooms. Footsteps above the stage when no one\'s on the catwalk.' },
      { time: 30.0, text: 'And then there\'s the figure.' },
      { time: 33.0, text: 'A woman in white, standing center stage under the ghost light.' },
      { time: 37.5, text: 'They\'ve seen her three times this week.' },
      { time: 41.0, text: '"The ghost of Margaux Fontaine," they whisper. "She\'s come back for the final show."' },
      { time: 47.0, text: 'I don\'t believe in ghosts.' },
      { time: 50.0, text: 'But I believe someone wants the people in this theater to be afraid.' },
      { time: 55.0, text: 'The question is — why?' },
      { time: 58.0, text: '' },
    ],
    slides: [
      {
        lines: [
          'Backstage at the Monarch is a maze',
          'of ropes, pulleys, and faded memories.',
          '',
          'The air smells like sawdust and greasepaint.',
        ],
        effect: 'fade',
        pauseAfter: 800,
        voiceover: 'vo_intro_12',
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panX: -5 },
        fogIntensity: 0.08,
        vignetteIntensity: 0.7,
        letterbox: true,
      },
      {
        lines: [
          'But something feels wrong.',
          'The hairs on my arms are standing up.',
          '',
          'Vivian told me the crew has been talking.',
          'Strange things happening after dark.',
        ],
        effect: 'typewriter',
        pauseAfter: 800,
        voiceover: 'vo_intro_13',
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panX: 5 },
        fogIntensity: 0.12,
        vignetteIntensity: 0.75,
        letterbox: true,
        audio: [
          { key: 'proc:eerieWhistle', delay: 200, volume: 0.3 },
        ],
      },
      {
        lines: [
          'Lights turning on in empty rooms.',
          'Footsteps above the stage',
          'when no one\'s on the catwalk.',
          '',
          'And then there\'s the figure.',
        ],
        effect: 'fade',
        pauseAfter: 800,
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
      },
      {
        lines: [
          'A woman in white,',
          'standing center stage under the ghost light.',
          'They\'ve seen her three times this week.',
          '',
          '"The ghost of Margaux Fontaine," they whisper.',
          '"She\'s come back for the final show."',
        ],
        effect: 'typewriter',
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
        audio: [
          { key: 'proc:ghostWhisper', delay: 800, volume: 0.3 },
        ],
      },
      {
        lines: [
          'I don\'t believe in ghosts.',
          '',
          'But I believe someone wants the people',
          'in this theater to be afraid.',
          '',
          'The question is — why?',
        ],
        effect: 'dramatic',
        pauseAfter: 1200,
        bgImage: 'intro_ghost',
        bgAlpha: 0.3,
        vignetteIntensity: 0.85,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 300, volume: 0.15 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'learned_ghost_rumors',
      addJournal: 'The crew whispers about a ghost — a woman in white on the stage, footsteps in locked corridors. I don\'t believe in ghosts, but someone wants the people in this theater to be afraid. The question is why.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 4: "The Apparition"
  // Plays when returning to auditorium after hearing ghost rumors.
  // Nancy sees the ghost herself — first person, pulse-pounding.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ghost_sighting_auditorium',
    triggerRoom: 'auditorium',
    triggerFlag: 'seen_event_ghost_rumors',
    videoKey: 'cinematic_ghost_sighting',
    videoSubtitles: [
      { time: 1.0,  text: 'I came back to the auditorium to check the rigging. Something about the spotlight controls didn\'t add up.' },
      { time: 7.0,  text: 'That\'s when the lights went out.' },
      { time: 10.0, text: 'Not all at once — they dimmed, slowly, like someone was turning a dial.' },
      { time: 15.0, text: 'Then I saw her.' },
      { time: 18.0, text: 'A figure in white, standing center stage. Perfectly still.' },
      { time: 22.5, text: 'A pale light fell around her like a halo.' },
      { time: 26.0, text: 'My heart was pounding so loud I was sure she could hear it.' },
      { time: 30.0, text: 'She turned toward me.' },
      { time: 33.0, text: 'For one impossible second, I saw her face. High cheekbones. Dark eyes.' },
      { time: 38.0, text: 'The face from a hundred old playbills. Margaux Fontaine.' },
      { time: 43.0, text: 'The lights surged. I threw my hand over my eyes.' },
      { time: 47.0, text: 'When I looked again, the stage was empty. Just the ghost light, burning alone.' },
      { time: 53.0, text: 'But I could smell something. Faint. Unmistakable.' },
      { time: 57.0, text: 'Old roses.' },
      { time: 60.0, text: 'Ghost or hoax — someone is going to a lot of trouble to haunt this theater.' },
      { time: 65.0, text: 'And I\'m going to find out who.' },
      { time: 68.0, text: '' },
    ],
    slides: [
      {
        lines: [
          'I came back to the auditorium',
          'to check the rigging.',
          'Something about the spotlight controls',
          'didn\'t add up.',
        ],
        effect: 'fade',
        pauseAfter: 1500,
        bgImage: 'cine_ghost_fog',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.0, scaleTo: 1.04, panY: -5 },
        vignetteIntensity: 0.6,
        audio: [
          { key: 'cine_ambient_ghost', volume: 0.25, loop: true },
        ],
      },
      {
        lines: [
          'That\'s when the lights went out.',
          '',
          'Not all at once — they dimmed, slowly,',
          'like someone was turning a dial.',
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
          { key: 'proc:ghostDroneLong', delay: 300 },
        ],
      },
      {
        lines: [
          'Then I saw her.',
          '',
          'A figure in white, standing center stage.',
          'Perfectly still.',
          'A pale light fell around her like a halo.',
        ],
        effect: 'fade',
        pauseAfter: 3000,
        bgImage: 'cine_ghost_figure',
        bgAlpha: 0.55,
        camera: { scaleFrom: 1.0, scaleTo: 1.1, panY: 5 },
        fogIntensity: 0.15,
        effects: [
          { type: 'ghostFlicker', delay: 200, duration: 5000 },
          { type: 'spotlight', delay: 600, duration: 4000 },
        ],
        audio: [
          { key: 'proc:eerieWhistle', delay: 500 },
        ],
      },
      {
        lines: [
          'My heart was pounding so loud',
          'I was sure she could hear it.',
          '',
          'She turned toward me.',
        ],
        effect: 'typewriter',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_figure',
        bgAlpha: 0.5,
        camera: { scaleFrom: 1.08, scaleTo: 1.12, panY: 2 },
        effects: [
          { type: 'heartbeat', delay: 0, duration: 4000 },
        ],
        audio: [
          { key: 'proc:heartbeat', delay: 0 },
          { key: 'proc:heartbeat', delay: 1000 },
          { key: 'proc:heartbeat', delay: 2000 },
        ],
      },
      {
        lines: [
          'For one impossible second, I saw her face.',
          'High cheekbones. Dark eyes.',
          '',
          'The face from a hundred old playbills.',
          'Margaux Fontaine.',
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
          { key: 'proc:ghostWhisper', delay: 1200 },
        ],
      },
      {
        lines: [
          'The lights surged.',
          'I threw my hand over my eyes.',
          '',
          'When I looked again, the stage was empty.',
          'Just the ghost light, burning alone.',
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
      {
        lines: [
          'But I could smell something.',
          'Faint. Unmistakable.',
          '',
          'Old roses.',
        ],
        effect: 'dramatic',
        pauseAfter: 2500,
        fogIntensity: 0.06,
        audio: [
          { key: 'proc:shimmer', delay: 500 },
        ],
      },
      {
        lines: [
          'Ghost or hoax — someone is going',
          'to a lot of trouble',
          'to haunt this theater.',
          '',
          'And I\'m going to find out who.',
        ],
        effect: 'fade',
        pauseAfter: 1500,
        vignetteIntensity: 0.8,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 200, volume: 0.1 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'saw_ghost',
      addJournal: 'I saw her — or something pretending to be her. A woman in white on the stage, the face of Margaux Fontaine. She vanished when the lights surged. The scent of old roses lingered. Ghost or hoax, someone is going to a lot of trouble. I\'m going to find out who.',
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

    // If a video version exists, redirect to VideoCinematicScene
    if (event.videoKey && this.game.cache?.video?.exists(event.videoKey)) {
      this.scene.start('VideoCinematicScene', {
        videoKey: event.videoKey,
        targetScene: 'RoomScene',
        targetData: { roomId: data.targetRoom, skipCinematic: true },
        subtitles: event.videoSubtitles ?? [],
        onComplete: event.onComplete,
      });
      return;
    }

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
    // Stop background music and ambient audio so they don't overlap cinematic audio
    MusicSystem.getInstance().stop();
    AmbientAudioSystem.getInstance().stopAll();
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
    return ['She ', 'You ', 'A ', 'I '];
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
