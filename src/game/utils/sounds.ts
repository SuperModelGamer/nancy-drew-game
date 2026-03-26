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
let musicVolume = parseFloat(localStorage.getItem('nd_music_volume') ?? '0.35');

/** Selected music track ID for lobby background music. */
let musicTrack = localStorage.getItem('nd_music_track') ?? 'signs_to_nowhere';

/** Whether the player has manually overridden the room-default music track (session only). */
let musicOverride = false;

// ─── Audio file manifest ─────────────────────────────────────────────────────
// Maps sound keys to file paths relative to public/
const SFX_MANIFEST: Record<string, string> = {
  click: 'audio/sfx_click.mp3',
  hover: 'audio/sfx_click.mp3',
  spotlightClick: 'audio/sfx_spotlight_click.mp3',
};

// ─── Audio cache & playback ──────────────────────────────────────────────────
const audioCache = new Map<string, HTMLAudioElement>();
let preloaded = false;

// Managed phone ringing state (programmatic — classic rotary phone ring via Web Audio API)
let phoneRingTimer: ReturnType<typeof setInterval> | null = null;
let phoneRingCtx: AudioContext | null = null;
let phoneRingGain: GainNode | null = null;

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

/** Play a single phone ring burst using Web Audio API (two-tone, ~0.8s). */
function playPhoneRingBurst(): void {
  if (masterVolume <= 0) return;
  try {
    if (!phoneRingCtx) phoneRingCtx = new AudioContext();
    const ctx = phoneRingCtx;
    const now = ctx.currentTime;
    const vol = 0.25 * masterVolume;

    // Master gain for this burst
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.setValueAtTime(vol, now + 0.7);
    gain.gain.linearRampToValueAtTime(0, now + 0.85);
    gain.connect(ctx.destination);
    phoneRingGain = gain;

    // Two-tone ring (440 Hz + 480 Hz) — classic US phone ring
    for (const freq of [440, 480]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.85);
    }

    // Amplitude modulation (20 Hz tremolo for "ringing" character)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'square';
    lfo.frequency.value = 20;
    lfoGain.gain.value = vol * 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start(now);
    lfo.stop(now + 0.85);
  } catch {
    // Web Audio not available — silent fallback
  }
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
    clearTimeout(phoneRingTimer as unknown as number);
    phoneRingTimer = null;
  }
  if (phoneRingGain) {
    try { phoneRingGain.gain.linearRampToValueAtTime(0, phoneRingCtx!.currentTime + 0.1); } catch { /* ok */ }
    phoneRingGain = null;
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
  },

  // ─── UI Interaction SFX ──────────────────────────────────────────────────

  // ─── Active SFX (loaded files) ─────────────────────────────────────────────

  /** Soft click for button presses and hotspot interaction */
  click(): void { playSFX('click', 0.4); },

  /** Hover — very subtle click */
  hover(): void { playSFX('hover', 0.1); },

  /** Spotlight click — theater light switch */
  spotlightClick(): void { playSFX('spotlightClick', 0.5); },

  // ─── Placeholder stubs (no audio files yet — will be replaced with user-sourced SFX) ──

  itemPickup(): void {},
  doorTransition(): void {},
  puzzleSolve(): void {},
  wrongAnswer(): void {},
  panelOpen(): void {},
  dialogueTick(): void {},
  ghostDrone(): void {},
  locked(): void {},
  gobletClink(): void {},
  bodyThud(): void {},
  ghostWhisper(): void {},
  phoneRing(): void { playPhoneRingBurst(); },
  phoneRingStart(): void {
    if (phoneRingTimer) return;
    // Classic pattern: ring-ring … pause … ring-ring … pause
    // Two short bursts (0.85s each, 0.4s gap) then 3s silence
    let burstCount = 0;
    const doBurst = () => {
      playPhoneRingBurst();
      burstCount++;
      if (burstCount % 2 === 1) {
        // Schedule second burst after 0.4s gap
        phoneRingTimer = setTimeout(doBurst, 400) as unknown as ReturnType<typeof setInterval>;
      } else {
        // Pause 3s before next pair
        phoneRingTimer = setTimeout(doBurst, 3000) as unknown as ReturnType<typeof setInterval>;
      }
    };
    doBurst();
  },
  phoneRingStop(): void {
    if (phoneRingTimer) { clearTimeout(phoneRingTimer as unknown as number); phoneRingTimer = null; }
    if (phoneRingGain) {
      try { phoneRingGain.gain.linearRampToValueAtTime(0, phoneRingCtx!.currentTime + 0.1); } catch { /* ok */ }
      phoneRingGain = null;
    }
  },
  doorCreak(): void {},
  heartbeat(): void {},
  lightSurge(): void {},
  theaterDrone(): void {},
  eerieWhistle(): void {},
  ghostDroneLong(): void {},
  shimmer(): void {},
  pageTurn(): void {},
  safeDial(): void {},
  keyJingle(): void {},
  curtainPull(): void {},
  drawerOpen(): void {},
  evidencePlace(): void {},
  suspicionSting(): void {},
  journalWrite(): void {},
  photoSnap(): void {},
  discoveryReveal(): void {},
  typewriterKey(): void {},
  lockTumbler(): void {},
  mapOpen(): void {},
  fogMachineHiss(): void {},
  trapDoorCreak(): void {},
  poisonBubble(): void {},

  /** Stop ALL playing SFX — call during scene transitions to prevent audio bleed. */
  stopAll(): void { stopAllSFX(); },
};
