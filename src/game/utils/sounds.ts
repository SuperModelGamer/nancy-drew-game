// Real audio SFX system — loads recorded sound files for authentic Nancy Drew experience
// Each sound method plays a pre-loaded audio file with volume control

/** Master volume multiplier (0 = muted, 1 = full). Persisted in localStorage. */
let masterVolume = parseFloat(localStorage.getItem('nd_master_volume') ?? '0.8');

/** Text speed: ms per character for typewriter effect. Lower = faster. */
export type TextSpeedPreset = 'slow' | 'normal' | 'fast' | 'instant';
const TEXT_SPEED_MAP: Record<TextSpeedPreset, number> = { slow: 45, normal: 28, fast: 12, instant: 0 };
let textSpeedPreset: TextSpeedPreset = (localStorage.getItem('nd_text_speed') as TextSpeedPreset) || 'normal';

/** Whether ambient particles are enabled. */
let particlesEnabled = localStorage.getItem('nd_particles') !== 'off';

/** Music volume (independent of master SFX volume). 0 = muted, 1 = full. */
let musicVolume = parseFloat(localStorage.getItem('nd_music_volume') ?? '0.5');

/** Selected music track ID for lobby background music. */
let musicTrack = localStorage.getItem('nd_music_track') ?? 'signs_to_nowhere';

/** Whether the player has manually overridden the room-default music track. */
let musicOverride = localStorage.getItem('nd_music_override') === 'true';

// ─── Audio file manifest ─────────────────────────────────────────────────────
// Maps sound keys to file paths relative to public/
const SFX_MANIFEST: Record<string, string> = {
  click: 'audio/sfx_click.mp3',
  itemPickup: 'audio/sfx_item_pickup.mp3',
  doorTransition: 'audio/sfx_door_creak.mp3',
  puzzleSolve: 'audio/sfx_puzzle_solve.mp3',
  wrongAnswer: 'audio/sfx_wrong_answer.mp3',
  panelOpen: 'audio/sfx_page_turn.mp3',
  dialogueTick: 'audio/sfx_typewriter_key.mp3',
  ghostDrone: 'audio/sfx_ghost_whisper.mp3',
  locked: 'audio/sfx_locked.mp3',
  hover: 'audio/sfx_click.mp3',
  gobletClink: 'audio/sfx_goblet.ogg',
  bodyThud: 'audio/sfx_thud.ogg',
  ghostWhisper: 'audio/sfx_ghost_whisper.mp3',
  phoneRing: 'audio/sfx_phone_ring.mp3',
  doorCreak: 'audio/sfx_door_creak.mp3',
  heartbeat: 'audio/sfx_heartbeat.mp3',
  lightSurge: 'audio/sfx_light_surge.mp3',
  theaterDrone: 'audio/sfx_eerie_whistle.mp3',
  eerieWhistle: 'audio/sfx_eerie_whistle.mp3',
  ghostDroneLong: 'audio/sfx_ghost_whisper.mp3',
  shimmer: 'audio/sfx_key_jingle.mp3',
  pageTurn: 'audio/sfx_page_turn.mp3',
  safeDial: 'audio/sfx_safe_dial.mp3',
  keyJingle: 'audio/sfx_key_jingle.mp3',
  curtainPull: 'audio/sfx_curtain_pull.mp3',
  drawerOpen: 'audio/sfx_drawer_open.mp3',
  evidencePlace: 'audio/sfx_drawer_open.mp3',
  suspicionSting: 'audio/sfx_eerie_whistle.mp3',
  journalWrite: 'audio/sfx_journal_write.mp3',
  photoSnap: 'audio/sfx_photo_snap.mp3',
  discoveryReveal: 'audio/sfx_puzzle_solve.mp3',
  typewriterKey: 'audio/sfx_typewriter_key.mp3',
  lockTumbler: 'audio/sfx_lock_tumbler.mp3',
  mapOpen: 'audio/sfx_page_turn.mp3',
  fogMachineHiss: 'audio/sfx_fog_machine.mp3',
  spotlightClick: 'audio/sfx_spotlight_click.mp3',
  trapDoorCreak: 'audio/sfx_trap_door_creak.mp3',
  poisonBubble: 'audio/sfx_poison_bubble.mp3',
};

// ─── Audio cache & playback ──────────────────────────────────────────────────
const audioCache = new Map<string, HTMLAudioElement>();
let preloaded = false;

// Managed phone ringing state
let phoneRingTimer: ReturnType<typeof setInterval> | null = null;
let phoneRingSound: HTMLAudioElement | null = null;

/** Preload all SFX files. Call once during boot. */
export function preloadSFX(): Promise<void> {
  if (preloaded) return Promise.resolve();

  const promises = Object.entries(SFX_MANIFEST).map(([key, path]) => {
    if (audioCache.has(path)) return Promise.resolve(); // dedupe shared files
    return new Promise<void>((resolve) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', () => {
        console.warn(`[SFX] Failed to load: ${path}`);
        resolve(); // don't block boot on missing files
      });
      audioCache.set(path, audio);
    });
  });

  preloaded = true;
  return Promise.all(promises).then(() => {
    console.log(`[SFX] Loaded ${audioCache.size} audio files`);
  });
}

// Track active audio clones so we can stop them all on scene transitions
const activeClones: Set<HTMLAudioElement> = new Set();

/** Play a sound by its manifest key. Volume-aware, non-blocking. */
function playSFX(key: string, volume = 0.5): void {
  if (masterVolume <= 0) return;

  const path = SFX_MANIFEST[key];
  if (!path) return;

  const cached = audioCache.get(path);
  if (!cached) return;

  // Clone the audio element so overlapping plays don't cut each other off
  const sound = cached.cloneNode(true) as HTMLAudioElement;
  sound.volume = Math.min(1, volume * masterVolume);
  activeClones.add(sound);
  sound.addEventListener('ended', () => activeClones.delete(sound), { once: true });
  sound.play().catch(() => {
    activeClones.delete(sound);
  });
}

/** Fade out an HTMLAudioElement over the given duration (ms), then pause & reset it. */
function fadeOutAudio(sound: HTMLAudioElement, duration = 300): void {
  const startVol = sound.volume;
  if (startVol <= 0) { sound.pause(); sound.currentTime = 0; return; }
  const steps = 15;
  const interval = duration / steps;
  const decrement = startVol / steps;
  let step = 0;
  const timer = window.setInterval(() => {
    step++;
    if (step >= steps || sound.paused) {
      sound.volume = 0;
      sound.pause();
      sound.currentTime = 0;
      window.clearInterval(timer);
      return;
    }
    sound.volume = Math.max(0, startVol - decrement * step);
  }, interval);
}

/** Stop all currently playing SFX clones — call on scene transitions.
 *  Fades out over ~300ms for a smooth transition. */
function stopAllSFX(): void {
  for (const sound of activeClones) {
    fadeOutAudio(sound, 300);
  }
  activeClones.clear();
  // Also stop managed phone ringing
  if (phoneRingTimer) {
    clearInterval(phoneRingTimer);
    phoneRingTimer = null;
  }
  if (phoneRingSound) {
    fadeOutAudio(phoneRingSound, 300);
    phoneRingSound = null;
  }
}

export const UISounds = {
  /** Get/set master volume (0–1). Persisted to localStorage. */
  getVolume(): number {
    return masterVolume;
  },
  setVolume(v: number): void {
    masterVolume = Math.max(0, Math.min(1, v));
    localStorage.setItem('nd_master_volume', masterVolume.toString());
  },

  /** Text speed preset. Persisted to localStorage. */
  getTextSpeed(): TextSpeedPreset { return textSpeedPreset; },
  getTextSpeedMs(): number { return TEXT_SPEED_MAP[textSpeedPreset]; },
  setTextSpeed(preset: TextSpeedPreset): void {
    textSpeedPreset = preset;
    localStorage.setItem('nd_text_speed', preset);
  },

  /** Ambient particles toggle. Persisted to localStorage. */
  getParticlesEnabled(): boolean { return particlesEnabled; },
  setParticlesEnabled(on: boolean): void {
    particlesEnabled = on;
    localStorage.setItem('nd_particles', on ? 'on' : 'off');
  },

  /** Music volume (0–1). Independent of master SFX volume. Persisted to localStorage. */
  getMusicVolume(): number { return musicVolume; },
  setMusicVolume(v: number): void {
    musicVolume = Math.max(0, Math.min(1, v));
    localStorage.setItem('nd_music_volume', musicVolume.toString());
  },

  /** Selected music track ID. Persisted to localStorage. */
  getMusicTrack(): string { return musicTrack; },
  setMusicTrack(id: string): void {
    musicTrack = id;
    localStorage.setItem('nd_music_track', id);
  },

  /** Whether player has manually overridden room-default music. */
  getMusicOverride(): boolean { return musicOverride; },
  setMusicOverride(on: boolean): void {
    musicOverride = on;
    localStorage.setItem('nd_music_override', on ? 'true' : 'false');
  },

  // ─── UI Interaction SFX ──────────────────────────────────────────────────

  /** Soft click for button presses and hotspot interaction */
  click(): void { playSFX('click', 0.4); },

  /** Satisfying pickup sound for collecting items */
  itemPickup(): void { playSFX('itemPickup', 0.5); },

  /** Door/room transition */
  doorTransition(): void { playSFX('doorTransition', 0.3); },

  /** Puzzle solve — success chime */
  puzzleSolve(): void { playSFX('puzzleSolve', 0.6); },

  /** Wrong answer — error buzz */
  wrongAnswer(): void { playSFX('wrongAnswer', 0.4); },

  /** Journal/panel open — paper rustle */
  panelOpen(): void { playSFX('panelOpen', 0.3); },

  /** Dialogue line advance — typewriter tick */
  dialogueTick(): void { playSFX('dialogueTick', 0.2); },

  /** Ghost event — eerie whisper */
  ghostDrone(): void { playSFX('ghostDrone', 0.4); },

  /** Locked — metallic lock rattle */
  locked(): void { playSFX('locked', 0.5); },

  /** Hover — very subtle click */
  hover(): void { playSFX('hover', 0.1); },

  // ─── Cinematic / Intro SFX ──────────────────────────────────────────────

  /** Glass goblet clink */
  gobletClink(): void { playSFX('gobletClink', 0.6); },

  /** Body thud — heavy impact */
  bodyThud(): void { playSFX('bodyThud', 0.7); },

  /** Ghostly whisper texture */
  ghostWhisper(): void { playSFX('ghostWhisper', 0.4); },

  /** Old rotary phone ring — single shot */
  phoneRing(): void { playSFX('phoneRing', 0.6); },

  /** Start ambient phone ringing — plays 2 rings then pauses, repeating.
   *  Call phoneRingStop() to cancel. */
  phoneRingStart(): void {
    // Already ringing
    if (phoneRingTimer) return;

    const ring = () => {
      if (masterVolume <= 0) return;
      const path = SFX_MANIFEST['phoneRing'];
      if (!path) return;
      const cached = audioCache.get(path);
      if (!cached) return;
      phoneRingSound = cached.cloneNode(true) as HTMLAudioElement;
      phoneRingSound.volume = Math.min(1, 0.35 * masterVolume);
      phoneRingSound.play().catch(() => {});
    };

    // Ring once now, then repeat every 4 seconds (short ring + silence gap)
    ring();
    phoneRingTimer = setInterval(ring, 4000);
  },

  /** Stop ambient phone ringing (fades out). */
  phoneRingStop(): void {
    if (phoneRingTimer) {
      clearInterval(phoneRingTimer);
      phoneRingTimer = null;
    }
    if (phoneRingSound) {
      fadeOutAudio(phoneRingSound, 300);
      phoneRingSound = null;
    }
  },

  /** Door creak — old wooden door */
  doorCreak(): void { playSFX('doorCreak', 0.5); },

  /** Heartbeat — tension pulse */
  heartbeat(): void { playSFX('heartbeat', 0.6); },

  /** Light surge — electrical buzz */
  lightSurge(): void { playSFX('lightSurge', 0.4); },

  /** Theater ambience — eerie atmosphere */
  theaterDrone(): void { playSFX('theaterDrone', 0.3); },

  /** Eerie stage whistle — ghost presence */
  eerieWhistle(): void { playSFX('eerieWhistle', 0.3); },

  /** Sustained ghost drone — longer cinematic version */
  ghostDroneLong(): void { playSFX('ghostDroneLong', 0.4); },

  /** Roses scent moment — delicate shimmer */
  shimmer(): void { playSFX('shimmer', 0.3); },

  // ─── Interaction SFX ──────────────────────────────────────────────────────

  /** Page turn — paper flip */
  pageTurn(): void { playSFX('pageTurn', 0.4); },

  /** Safe dial click — combination lock */
  safeDial(): void { playSFX('safeDial', 0.5); },

  /** Key jingle — bright metallic rattle */
  keyJingle(): void { playSFX('keyJingle', 0.4); },

  /** Curtain pull — fabric swoosh */
  curtainPull(): void { playSFX('curtainPull', 0.5); },

  /** Drawer open — wood slide */
  drawerOpen(): void { playSFX('drawerOpen', 0.5); },

  /** Evidence placed — confirmation */
  evidencePlace(): void { playSFX('evidencePlace', 0.5); },

  /** Suspicion sting — tense atmosphere */
  suspicionSting(): void { playSFX('suspicionSting', 0.4); },

  /** Journal write — pen on paper */
  journalWrite(): void { playSFX('journalWrite', 0.4); },

  /** Photograph snap — camera shutter */
  photoSnap(): void { playSFX('photoSnap', 0.5); },

  /** Discovery reveal — finding important clues */
  discoveryReveal(): void { playSFX('discoveryReveal', 0.6); },

  /** Typewriter key — dialogue weight */
  typewriterKey(): void { playSFX('typewriterKey', 0.3); },

  /** Combination lock tumbler — mechanical click */
  lockTumbler(): void { playSFX('lockTumbler', 0.5); },

  /** Map open — paper unfold */
  mapOpen(): void { playSFX('mapOpen', 0.4); },

  /** Fog machine hiss — atmospheric steam */
  fogMachineHiss(): void { playSFX('fogMachineHiss', 0.4); },

  /** Spotlight click — theater light switch */
  spotlightClick(): void { playSFX('spotlightClick', 0.5); },

  /** Trap door creak — heavy wooden mechanism */
  trapDoorCreak(): void { playSFX('trapDoorCreak', 0.5); },

  /** Poison bubble — sinister liquid gurgle */
  poisonBubble(): void { playSFX('poisonBubble', 0.4); },

  /** Stop ALL playing SFX — call during scene transitions to prevent audio bleed. */
  stopAll(): void { stopAllSFX(); },
};
