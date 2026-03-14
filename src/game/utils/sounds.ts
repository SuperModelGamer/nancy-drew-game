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
}

/** Play noise burst (for impacts, rustles, whisper textures). */
function playNoise(duration: number, volume = 0.1, bandpass?: { freq: number; Q: number }): void {
  if (masterVolume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;

  const effectiveVol = volume * masterVolume;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
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
  } else {
    source.connect(gain);
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
};
