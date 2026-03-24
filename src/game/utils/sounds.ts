// Procedural UI sounds using Web Audio API — no external audio files needed
// Generates short sound effects on demand

let audioCtx: AudioContext | null = null;

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

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume suspended context (browsers require user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  freqEnd?: number,
): void {
  if (masterVolume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;

  const effectiveVol = volume * masterVolume;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(effectiveVol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);

  // Deterministic cleanup — disconnect nodes when oscillator finishes
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}

/** Cached noise buffers keyed by sample count to avoid repeated allocation. */
const noiseBufferCache = new Map<number, AudioBuffer>();

/** Play noise burst (for impacts, rustles, whisper textures). */
function playNoise(duration: number, volume = 0.1, bandpass?: { freq: number; Q: number }): void {
  if (masterVolume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;

  const effectiveVol = volume * masterVolume;
  const bufferSize = Math.round(ctx.sampleRate * duration);

  // Reuse cached noise buffer for same size — noise is noise
  let buffer = noiseBufferCache.get(bufferSize);
  if (!buffer) {
    buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBufferCache.set(bufferSize, buffer);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(effectiveVol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  if (bandpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = bandpass.freq;
    filter.Q.value = bandpass.Q;
    source.connect(filter);
    filter.connect(gain);
    // Deterministic cleanup
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  } else {
    source.connect(gain);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }

  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + duration);
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

  // Soft click for button presses and hotspot interaction
  click(): void {
    playTone(800, 0.06, 'sine', 0.1);
  },

  // Satisfying pickup chime — ascending two-note
  itemPickup(): void {
    playTone(523, 0.1, 'triangle', 0.12); // C5
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.1), 80); // E5
  },

  // Door/room transition — low whoosh
  doorTransition(): void {
    playTone(200, 0.3, 'sine', 0.08, 80);
  },

  // Puzzle solve fanfare — three ascending notes
  puzzleSolve(): void {
    playTone(523, 0.15, 'triangle', 0.12); // C5
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.12), 120); // E5
    setTimeout(() => playTone(784, 0.25, 'triangle', 0.15), 240); // G5
  },

  // Wrong answer — low descending buzz
  wrongAnswer(): void {
    playTone(200, 0.2, 'square', 0.06, 120);
  },

  // Journal/panel open — soft paper rustle (noise-like)
  panelOpen(): void {
    playTone(2000, 0.08, 'sawtooth', 0.03, 500);
  },

  // Dialogue line advance — tiny soft tick
  dialogueTick(): void {
    playTone(1200, 0.03, 'sine', 0.05);
  },

  // Ghost event — eerie low drone
  ghostDrone(): void {
    playTone(80, 0.8, 'sine', 0.06, 60);
    setTimeout(() => playTone(120, 0.6, 'sine', 0.04, 90), 200);
  },

  // Locked — metallic clunk
  locked(): void {
    playTone(150, 0.12, 'square', 0.08, 80);
  },

  // Hover — very subtle high tick
  hover(): void {
    playTone(2400, 0.025, 'sine', 0.03);
  },

  // ─── Cinematic / Intro SFX ──────────────────────────────────────────────

  /** Glass goblet clink — bright crystalline ping */
  gobletClink(): void {
    playTone(2600, 0.15, 'sine', 0.08);
    setTimeout(() => playTone(3200, 0.12, 'sine', 0.05), 30);
    setTimeout(() => playTone(1800, 0.2, 'triangle', 0.04), 60);
  },

  /** Body thud — heavy low impact */
  bodyThud(): void {
    playTone(60, 0.25, 'sine', 0.12, 30);
    playNoise(0.15, 0.08, { freq: 200, Q: 1 });
  },

  /** Ghostly whisper texture — breathy filtered noise */
  ghostWhisper(): void {
    playNoise(1.2, 0.05, { freq: 800, Q: 3 });
    setTimeout(() => playNoise(0.8, 0.04, { freq: 1200, Q: 4 }), 400);
    setTimeout(() => playTone(400, 0.6, 'sine', 0.02, 350), 200);
  },

  /** Phone ring — two-tone warble */
  phoneRing(): void {
    const ring = () => {
      playTone(440, 0.08, 'sine', 0.1);
      setTimeout(() => playTone(480, 0.08, 'sine', 0.1), 80);
    };
    ring();
    setTimeout(ring, 200);
    setTimeout(ring, 600);
    setTimeout(ring, 800);
  },

  /** Door creak — slow descending rasp */
  doorCreak(): void {
    playTone(500, 0.4, 'sawtooth', 0.04, 200);
    setTimeout(() => playTone(350, 0.3, 'sawtooth', 0.03, 150), 150);
  },

  /** Heartbeat — two-pulse thump */
  heartbeat(): void {
    // lub
    playTone(55, 0.15, 'sine', 0.12, 40);
    playNoise(0.08, 0.06, { freq: 100, Q: 2 });
    // dub
    setTimeout(() => {
      playTone(50, 0.12, 'sine', 0.08, 35);
      playNoise(0.06, 0.04, { freq: 80, Q: 2 });
    }, 180);
  },

  /** Light surge — electrical buzz then pop */
  lightSurge(): void {
    playTone(120, 0.3, 'sawtooth', 0.06, 2000);
    setTimeout(() => playNoise(0.05, 0.1, { freq: 3000, Q: 1 }), 280);
  },

  /** Theater ambience drone — sustained low organ-like hum */
  theaterDrone(): void {
    playTone(110, 2.0, 'sine', 0.04, 100);
    playTone(165, 2.0, 'sine', 0.02, 155);
    setTimeout(() => playTone(82, 2.0, 'sine', 0.03, 78), 500);
  },

  /** Eerie stage whistle — high breathy tone for ghost presence */
  eerieWhistle(): void {
    playTone(1400, 1.5, 'sine', 0.03, 1200);
    setTimeout(() => playTone(1100, 1.2, 'sine', 0.02, 900), 600);
  },

  /** Sustained ghost drone — longer version for cinematic scenes */
  ghostDroneLong(): void {
    playTone(70, 2.5, 'sine', 0.06, 55);
    setTimeout(() => playTone(105, 2.0, 'sine', 0.04, 85), 300);
    setTimeout(() => playTone(55, 1.8, 'sine', 0.03, 45), 800);
    setTimeout(() => playNoise(1.5, 0.02, { freq: 600, Q: 5 }), 500);
  },

  /** Roses scent moment — delicate high shimmer */
  shimmer(): void {
    playTone(2000, 0.6, 'sine', 0.03);
    setTimeout(() => playTone(2400, 0.5, 'sine', 0.025), 100);
    setTimeout(() => playTone(1800, 0.7, 'sine', 0.02), 200);
    setTimeout(() => playTone(2200, 0.4, 'triangle', 0.015), 350);
  },

  // ─── Additional Interaction SFX ──────────────────────────────────────────

  /** Page turn — soft paper rustle with high-frequency texture */
  pageTurn(): void {
    playNoise(0.15, 0.06, { freq: 3000, Q: 1.5 });
    setTimeout(() => playNoise(0.1, 0.04, { freq: 4000, Q: 2 }), 50);
    playTone(1500, 0.08, 'sine', 0.02, 800);
  },

  /** Safe dial click — precise metallic tick */
  safeDial(): void {
    playTone(3500, 0.025, 'square', 0.08);
    setTimeout(() => playTone(2800, 0.02, 'square', 0.04), 15);
  },

  /** Key jingle — bright metallic shimmer */
  keyJingle(): void {
    playTone(3200, 0.08, 'triangle', 0.06);
    setTimeout(() => playTone(3800, 0.06, 'triangle', 0.05), 40);
    setTimeout(() => playTone(4200, 0.05, 'triangle', 0.04), 80);
    setTimeout(() => playTone(3000, 0.07, 'triangle', 0.03), 120);
  },

  /** Curtain pull — fabric swoosh */
  curtainPull(): void {
    playNoise(0.4, 0.06, { freq: 600, Q: 0.8 });
    playTone(250, 0.35, 'sine', 0.03, 120);
    setTimeout(() => playNoise(0.2, 0.03, { freq: 800, Q: 1.2 }), 200);
  },

  /** Drawer open — wood slide with soft thunk */
  drawerOpen(): void {
    playTone(180, 0.15, 'sawtooth', 0.04, 100);
    playNoise(0.1, 0.04, { freq: 500, Q: 1 });
    setTimeout(() => playTone(120, 0.08, 'sine', 0.06), 130);
  },

  /** Evidence placed — satisfying confirmation thud */
  evidencePlace(): void {
    playTone(300, 0.12, 'sine', 0.08);
    playNoise(0.06, 0.05, { freq: 400, Q: 1.5 });
    setTimeout(() => playTone(450, 0.15, 'triangle', 0.05), 60);
  },

  /** Suspicion sting — tense two-note dissonance */
  suspicionSting(): void {
    playTone(220, 0.4, 'sine', 0.06);
    setTimeout(() => playTone(233, 0.35, 'sine', 0.05), 50);
    setTimeout(() => playTone(185, 0.5, 'triangle', 0.03), 200);
  },

  /** Journal write — pen scratch with paper texture */
  journalWrite(): void {
    playNoise(0.08, 0.03, { freq: 2500, Q: 3 });
    setTimeout(() => playNoise(0.06, 0.025, { freq: 3000, Q: 2.5 }), 60);
    setTimeout(() => playNoise(0.07, 0.02, { freq: 2200, Q: 3 }), 120);
  },

  /** Photograph snap — camera shutter click */
  photoSnap(): void {
    playTone(4000, 0.015, 'square', 0.1);
    setTimeout(() => playNoise(0.03, 0.06, { freq: 5000, Q: 2 }), 10);
    setTimeout(() => playTone(3000, 0.02, 'square', 0.05), 25);
  },

  /** Discovery reveal — rising chime for finding important clues */
  discoveryReveal(): void {
    playTone(440, 0.2, 'triangle', 0.08);     // A4
    setTimeout(() => playTone(554, 0.2, 'triangle', 0.07), 100); // C#5
    setTimeout(() => playTone(659, 0.25, 'triangle', 0.08), 200); // E5
    setTimeout(() => playTone(880, 0.4, 'sine', 0.06), 350);     // A5
  },

  /** Typewriter key — for dialogue with real weight */
  typewriterKey(): void {
    playTone(2800, 0.02, 'square', 0.04);
    playNoise(0.015, 0.03, { freq: 4000, Q: 3 });
  },

  /** Combination lock tumbler — chunky mechanical click */
  lockTumbler(): void {
    playTone(500, 0.04, 'square', 0.09);
    setTimeout(() => playTone(350, 0.03, 'square', 0.06), 20);
    playNoise(0.03, 0.05, { freq: 800, Q: 2 });
  },

  /** Map open — paper unfold with gentle swoosh */
  mapOpen(): void {
    playNoise(0.2, 0.04, { freq: 1500, Q: 1 });
    playTone(800, 0.15, 'sine', 0.02, 400);
    setTimeout(() => playNoise(0.15, 0.03, { freq: 2000, Q: 1.5 }), 100);
  },

  /** Fog machine hiss — atmospheric steam burst */
  fogMachineHiss(): void {
    playNoise(0.8, 0.05, { freq: 2000, Q: 0.5 });
    setTimeout(() => playNoise(0.6, 0.04, { freq: 3000, Q: 0.8 }), 200);
    playTone(150, 0.6, 'sine', 0.02, 80);
  },

  /** Spotlight click — theater light switching on */
  spotlightClick(): void {
    playTone(3000, 0.02, 'square', 0.1);
    setTimeout(() => playTone(120, 0.3, 'sawtooth', 0.04, 100), 30);
    setTimeout(() => playTone(60, 0.5, 'sine', 0.03), 100);
  },

  /** Trap door creak — heavy wooden mechanism */
  trapDoorCreak(): void {
    playTone(200, 0.6, 'sawtooth', 0.05, 80);
    setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.04, 60), 200);
    setTimeout(() => playTone(100, 0.3, 'sine', 0.06, 50), 500);
    playNoise(0.2, 0.03, { freq: 300, Q: 1 });
  },

  /** Poison bubble — sinister liquid gurgle */
  poisonBubble(): void {
    playTone(200, 0.15, 'sine', 0.04, 280);
    setTimeout(() => playTone(250, 0.12, 'sine', 0.03, 310), 100);
    setTimeout(() => playTone(180, 0.18, 'sine', 0.04, 260), 250);
    playNoise(0.3, 0.02, { freq: 400, Q: 2 });
  },
};
