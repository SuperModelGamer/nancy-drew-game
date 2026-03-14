import { BaseSlideScene, Slide } from './BaseSlideScene';
import { initSceneCursor } from '../utils/cursors';

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
  constructor() {
    super({ key: 'IntroScene' });
  }

  protected getSlides(): Slide[] {
    return INTRO_SLIDES;
  }

  protected onSceneCreate(): void {
    initSceneCursor(this);
  }

  protected getStageDirectionPrefixes(): string[] {
    return ['On stage', 'She ', 'You ', 'A '];
  }

  protected onTransitionComplete(): void {
    this.scene.start('RoomScene', { roomId: 'lobby' });
    this.scene.launch('UIScene');
  }
}
