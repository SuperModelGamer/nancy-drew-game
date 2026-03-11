// Procedural UI sounds using Web Audio API — no external audio files needed
// Generates short sound effects on demand

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
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
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export const UISounds = {
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
};
