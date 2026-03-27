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
  /** If set, plays via VideoCinematicScene (native HTML video). */
  videoKey?: string;
  /** Timed text overlays shown on top of the video cinematic. */
  overlayText?: { text: string; delay: number; duration?: number; style?: 'title' | 'subtitle' | 'time' | 'body'; y?: number }[];
  slides: Slide[];
  onComplete?: {
    setFlag?: string | string[];
    addJournal?: string;
  };
  /** When true, the next cinematic check fires immediately (no skipCinematic on return). */
  chainNext?: boolean;
  /** Override the room the player returns to after the cinematic (defaults to triggerRoom). */
  targetRoomOverride?: string;
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
    slides: [],
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
    videoKey: 'cinematic_backstage_entry',
    overlayText: [
      { text: 'NIGHT 1 — 11:30 PM', delay: 400, duration: 7000, style: 'time', y: 12 },
      { text: 'Two poisonings. Same method.\nNearly a century apart.', delay: 2500, style: 'body', y: 85 },
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
  // CINEMATIC 4: "The Apparition / The Next Night"
  // Plays when returning to auditorium after meeting Diego in the booth.
  // Combined ghost sighting + time passage in one cinematic.
  // Nancy sees the ghost, leaves shaken, and returns the next night.
  // After the cinematic, the player lands in the lobby for Day 2.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ghost_and_day2',
    triggerRoom: 'auditorium',
    triggerFlag: 'diego_booth',
    videoKey: 'cinematic_ghost_and_day2',
    targetRoomOverride: 'lobby',
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
      // --- Time passage begins ---
      {
        lines: [
          'I drove home at 2 AM with',
          'the smell of old roses',
          'still in my hair.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'intro_exterior',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.0, scaleTo: 1.04, panY: -3 },
        vignetteIntensity: 0.8,
        letterbox: true,
      },
      {
        lines: [
          'I barely slept.',
          '',
          'Every time I closed my eyes,',
          'I saw that face on the stage.',
          'High cheekbones. Dark eyes.',
          'The face of a woman dead for',
          'ninety-seven years.',
        ],
        effect: 'typewriter',
        pauseAfter: 3000,
        bgImage: 'intro_ghost_stage',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: 5 },
        fogIntensity: 0.08,
        vignetteIntensity: 0.85,
        letterbox: true,
      },
      {
        lines: [
          'But ghosts don\'t use fog machines.',
          'Ghosts don\'t need trapdoors.',
          '',
          'Someone in that theater is staging',
          'a very convincing performance.',
          'And I\'m going to find out who.',
        ],
        effect: 'fade',
        pauseAfter: 3000,
        vignetteIntensity: 0.8,
        letterbox: true,
      },
      {
        lines: [
          'I spent the day reviewing my notes.',
          'The dressing room. The mirror.',
          'Margaux\'s trunk.',
          '',
          'There are pieces I missed.',
          'Puzzles I wasn\'t ready for.',
        ],
        effect: 'typewriter',
        pauseAfter: 2500,
        bgImage: 'intro_exterior',
        bgAlpha: 0.3,
        vignetteIntensity: 0.7,
        letterbox: true,
      },
      {
        lines: [
          'Tonight, I go back.',
          '',
          'Forty-eight hours until demolition.',
          'Time to find the truth.',
        ],
        effect: 'dramatic',
        pauseAfter: 2000,
        vignetteIntensity: 0.9,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 200, volume: 0.1 },
        ],
      },
    ],
    onComplete: {
      setFlag: ['saw_ghost', 'day_2'],
      addJournal: 'I saw her — or something pretending to be her. A woman in white on the stage, the face of Margaux Fontaine. She vanished when the lights surged. I drove home shaken, but I barely slept. Ghosts don\'t use fog machines. Someone is performing. I came back the next night — forty-eight hours until demolition. Time to find the truth.',
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 5: "Overheard"
  // Plays on first entry to backstage on Day 2.
  // Nancy overhears Stella on the phone — she's hiding something about Edwin.
  // Sets the overheard_stella flag, which unlocks a confrontation dialogue option.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'stella_eavesdropping',
    triggerRoom: 'backstage',
    triggerFlag: 'day_2',
    videoKey: 'cinematic_stella_eavesdrop',
    slides: [
      {
        lines: [
          'I push through the backstage door',
          'and freeze.',
          '',
          'Stella\'s voice — sharp, urgent —',
          'drifting from behind the costume racks.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.0, scaleTo: 1.04, panX: -3 },
        vignetteIntensity: 0.7,
        letterbox: true,
        audio: [
          { key: 'proc:eerieWhistle', delay: 800, volume: 0.1 },
        ],
      },
      {
        lines: [
          '"I told you I\'d handle it..."',
          '',
          'She\'s on the phone. Pacing.',
          'She hasn\'t heard me come in.',
        ],
        effect: 'typewriter',
        pauseAfter: 2500,
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.02, scaleTo: 1.06, panX: 5 },
        vignetteIntensity: 0.75,
        letterbox: true,
      },
      {
        lines: [
          '"No, she doesn\'t know about Edwin.',
          'Not yet. Just give me two more days',
          'before you call anyone..."',
        ],
        effect: 'typewriter',
        pauseAfter: 3000,
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.3,
        camera: { scaleFrom: 1.04, scaleTo: 1.08, panX: -5 },
        vignetteIntensity: 0.8,
        letterbox: true,
        effects: [
          { type: 'heartbeat', delay: 500, duration: 3000 },
        ],
      },
      {
        lines: [
          '"I know what he\'s been doing down there.',
          'I\'ve known for weeks.',
          'But if this gets out before I can —"',
          '',
          'A long pause. She exhales.',
        ],
        effect: 'fade',
        pauseAfter: 3000,
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.3,
        camera: { scaleFrom: 1.06, scaleTo: 1.1, panY: -3 },
        vignetteIntensity: 0.85,
        letterbox: true,
      },
      {
        lines: [
          '"Fine. Fine. I\'ll tell her.',
          'But on my terms. Not yours."',
          '',
          'She hangs up.',
          'I hear her take a long, shaky breath.',
        ],
        effect: 'typewriter',
        pauseAfter: 2500,
        bgImage: 'intro_lobby_dark',
        bgAlpha: 0.25,
        vignetteIntensity: 0.8,
        letterbox: true,
      },
      {
        lines: [
          'I step back quietly.',
          'Let the door click shut behind me.',
          'Count to five.',
          '',
          'Then I walk in like I heard nothing.',
        ],
        effect: 'fade',
        pauseAfter: 2000,
        vignetteIntensity: 0.7,
        letterbox: true,
      },
    ],
    onComplete: {
      setFlag: 'overheard_stella',
      addJournal: 'I overheard Stella on the phone — she knows what Edwin has been doing in the basement. She\'s been covering for him. "She doesn\'t know about Edwin. Not yet." She\'s protecting someone. The question is whether she\'s protecting Edwin... or herself.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 6: "The Warning"
  // Plays on first return to auditorium after completing the catwalk.
  // Nancy finds a threatening note — someone knows she's getting close.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'the_warning',
    triggerRoom: 'auditorium',
    triggerFlag: 'catwalk_access',
    videoKey: 'cinematic_warning_note',
    slides: [
      {
        lines: [
          'Something is different.',
          '',
          'The auditorium seats look the same.',
          'The ghost light still burns.',
          'But there\'s something on the stage',
          'that wasn\'t there before.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_empty',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: 5 },
        vignetteIntensity: 0.7,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 200, volume: 0.1 },
        ],
      },
      {
        lines: [
          'A single sheet of paper.',
          'Pinned to the stage floor with a hatpin.',
          '',
          'Block letters. Black ink.',
          'No signature.',
        ],
        effect: 'typewriter',
        pauseAfter: 2500,
        bgImage: 'cine_ghost_empty',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.06, scaleTo: 1.15, panY: 8 },
        vignetteIntensity: 0.8,
        letterbox: true,
      },
      {
        lines: [
          '"STOP DIGGING',
          'OR THE NEXT FALL',
          'WON\'T BE AN ACCIDENT."',
        ],
        effect: 'dramatic',
        pauseAfter: 3500,
        vignetteIntensity: 0.9,
        letterbox: true,
        effects: [
          { type: 'screenShake', delay: 200, duration: 400 },
          { type: 'heartbeat', delay: 0, duration: 4000 },
        ],
        audio: [
          { key: 'proc:heartbeat', delay: 0 },
          { key: 'proc:heartbeat', delay: 1000 },
        ],
      },
      {
        lines: [
          'My hands are steady.',
          'My heart isn\'t.',
          '',
          'Someone knows I was on the catwalk.',
          'Someone is watching.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        vignetteIntensity: 0.85,
        letterbox: true,
      },
      {
        lines: [
          'Good.',
          '',
          'That means I\'m getting close.',
        ],
        effect: 'dramatic',
        pauseAfter: 2000,
        vignetteIntensity: 0.8,
        letterbox: true,
        audio: [
          { key: 'proc:shimmer', delay: 500 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'found_warning_note',
      addJournal: 'Someone left a threatening note pinned to the stage: "Stop digging or the next fall won\'t be an accident." They know I was on the catwalk. They\'re watching. The question is — who has more to lose? Edwin protecting his ghost scheme, or Ashworth protecting his insurance fraud?',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CINEMATIC 7: "Night 3 — 24 Hours"
  // Plays on first entry to the basement.
  // Time passage: Night 2 → Night 3. Nancy drove home, barely slept again,
  // and came back for the final night. 24 hours until demolition.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'night_3_transition',
    triggerRoom: 'basement',
    triggerFlag: '',
    videoKey: 'cinematic_night3_transition',
    slides: [
      {
        lines: [
          'I drove home at dawn.',
          '',
          'The sun was coming up over River Heights',
          'and I couldn\'t stop thinking about',
          'Ashworth\'s laptop.',
        ],
        effect: 'fade',
        pauseAfter: 2500,
        bgImage: 'intro_exterior',
        bgAlpha: 0.4,
        camera: { scaleFrom: 1.0, scaleTo: 1.04, panY: -3 },
        vignetteIntensity: 0.7,
        letterbox: true,
      },
      {
        lines: [
          'Two crimes.',
          'Two criminals.',
          '',
          'Edwin staged a ghost to save a theater.',
          'But someone else staged a poisoning',
          'to destroy it.',
        ],
        effect: 'typewriter',
        pauseAfter: 3000,
        bgImage: 'intro_poison_bottle',
        bgAlpha: 0.35,
        camera: { scaleFrom: 1.0, scaleTo: 1.06, panY: 5 },
        vignetteIntensity: 0.8,
        letterbox: true,
      },
      {
        lines: [
          'I spent the day at my desk.',
          'Notes spread across every surface.',
          'Insurance records. Chemical receipts.',
          'A shell company called Monarch Properties LLC.',
          '',
          'The "victim" who ran when I got too close.',
        ],
        effect: 'fade',
        pauseAfter: 3000,
        vignetteIntensity: 0.75,
        letterbox: true,
      },
      {
        lines: [
          'Tonight I go back for the last time.',
          '',
          'Twenty-four hours until the wrecking ball.',
          'Twenty-four hours to prove what',
          'really happened.',
        ],
        effect: 'typewriter',
        pauseAfter: 2500,
        bgImage: 'intro_exterior',
        bgAlpha: 0.3,
        camera: { scaleFrom: 1.0, scaleTo: 1.08, panY: -5 },
        vignetteIntensity: 0.85,
        letterbox: true,
        audio: [
          { key: 'proc:ghostDrone', delay: 200, volume: 0.1 },
        ],
      },
      {
        lines: [
          'The basement.',
          '',
          'That\'s where it ends.',
          'That\'s where the truth is buried.',
          'Literally.',
        ],
        effect: 'dramatic',
        pauseAfter: 2000,
        vignetteIntensity: 0.9,
        letterbox: true,
        audio: [
          { key: 'proc:shimmer', delay: 500 },
        ],
      },
    ],
    onComplete: {
      setFlag: 'night_3',
      addJournal: 'Night 3. The final night. Twenty-four hours until the Monarch comes down. I know Edwin staged the ghost. I know Ashworth staged the poisoning. Now I need to prove both — and whatever\'s hidden in the basement walls is the last piece.',
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
  private redirectedToVideo = false;

  constructor() {
    super({ key: 'CinematicScene' });
  }

  init(data: { cinematicId: string; targetRoom: string }): void {
    this.redirectedToVideo = false;
    const event = CINEMATIC_EVENTS.find(e => e.id === data.cinematicId);
    if (!event) {
      this.scene.start('RoomScene', { roomId: data.targetRoom });
      return;
    }
    this.cinematicData = event;
    this.targetRoom = data.targetRoom;
    this.eventCompleted = false;

    // If a video version exists, redirect to VideoCinematicScene (native HTML video)
    if (event.videoKey) {
      this.redirectedToVideo = true;
      const videoDestination = event.targetRoomOverride || data.targetRoom;
      this.scene.start('VideoCinematicScene', {
        videoKey: event.videoKey,
        targetScene: 'RoomScene',
        targetData: { roomId: videoDestination, skipCinematic: !event.chainNext },
        overlayText: event.overlayText,
        onComplete: event.onComplete,
      });
      return;
    }

    this.resetState();
  }

  create(): void {
    if (!this.cinematicData || this.redirectedToVideo) return;
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
    const destination = this.cinematicData.targetRoomOverride || this.targetRoom;
    const skip = !this.cinematicData.chainNext;
    this.scene.start('RoomScene', { roomId: destination, skipCinematic: skip });
  }

  private completeEvent(): void {
    if (this.eventCompleted) return;
    this.eventCompleted = true;

    const save = SaveSystem.getInstance();
    save.setFlag(`seen_event_${this.cinematicData.id}`, true);
    if (this.cinematicData.onComplete) {
      if (this.cinematicData.onComplete.setFlag) {
        const flags = Array.isArray(this.cinematicData.onComplete.setFlag)
          ? this.cinematicData.onComplete.setFlag
          : [this.cinematicData.onComplete.setFlag];
        for (const flag of flags) {
          save.setFlag(flag, true);
        }
      }
      if (this.cinematicData.onComplete.addJournal) {
        save.addJournalEntry(this.cinematicData.onComplete.addJournal);
      }
    }
  }
}
