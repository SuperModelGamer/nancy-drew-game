/**
 * MusicSystem — procedural ambient music generator using Web Audio API.
 *
 * Generates atmospheric ambient music on the fly — no audio files needed.
 * Each "track" is a unique combination of oscillators, filters, and modulation
 * that creates a distinct mood. Music is infinite and non-repetitive (no loop seams).
 *
 * Tracks are themed for a 1920s theater mystery:
 *  - Midnight Theatre: Deep pads with organ-like overtones
 *  - Velvet Curtain: Warm, mysterious shimmer
 *  - Gaslight: Haunting, sparse with bell-like tones
 *  - The Empty Stage: Eerie minimal drone with distant echoes
 *  - Chandelier Dreams: Elegant ambient with crystal tones
 */

import { UISounds } from '../utils/sounds';

// ─── Track Definitions ──────────────────────────────────────────────────────

export interface MusicTrackDef {
  id: string;
  name: string;
  description: string;
  /** Base frequencies for the pad layers */
  padFreqs: number[];
  /** Oscillator types for each pad */
  padWaves: OscillatorType[];
  /** Pad volumes (0–1) */
  padVols: number[];
  /** LFO speed (Hz) for pad volume modulation */
  lfoSpeed: number;
  /** LFO depth (0–1) — how much volume wobbles */
  lfoDepth: number;
  /** Whether to add shimmer (high harmonics) */
  shimmer: boolean;
  /** Shimmer base frequency */
  shimmerFreq?: number;
  /** Whether to add bell/chime tones */
  bells: boolean;
  /** Bell interval range [min, max] in ms */
  bellInterval?: [number, number];
  /** Bell frequencies (pentatonic-ish) */
  bellFreqs?: number[];
  /** Filter cutoff for warmth (Hz) — lower = darker */
  filterCutoff: number;
  /** Sub-bass drone frequency (0 = none) */
  subBass: number;
  /** Detune range for organic feel (cents) */
  detuneRange: number;
}

export const MUSIC_TRACKS: MusicTrackDef[] = [
  {
    id: 'midnight_theatre',
    name: 'Midnight Theatre',
    description: 'Deep, dark pads with organ-like overtones',
    padFreqs: [55, 82.5, 110, 165],        // A1, E2, A2, E3
    padWaves: ['sine', 'sine', 'triangle', 'sine'],
    padVols: [0.12, 0.08, 0.06, 0.03],
    lfoSpeed: 0.08,
    lfoDepth: 0.3,
    shimmer: false,
    bells: true,
    bellInterval: [8000, 16000],
    bellFreqs: [440, 523, 659, 784, 880],   // A4, C5, E5, G5, A5
    filterCutoff: 800,
    subBass: 36.7,                           // D1
    detuneRange: 8,
  },
  {
    id: 'velvet_curtain',
    name: 'Velvet Curtain',
    description: 'Warm, mysterious with subtle shimmer',
    padFreqs: [65.4, 98, 130.8, 196],       // C2, G2, C3, G3
    padWaves: ['sine', 'triangle', 'sine', 'sine'],
    padVols: [0.10, 0.07, 0.05, 0.04],
    lfoSpeed: 0.06,
    lfoDepth: 0.25,
    shimmer: true,
    shimmerFreq: 1047,                       // C6
    bells: true,
    bellInterval: [6000, 12000],
    bellFreqs: [523, 587, 698, 784, 1047],   // C5, D5, F5, G5, C6
    filterCutoff: 1200,
    subBass: 32.7,                           // C1
    detuneRange: 6,
  },
  {
    id: 'gaslight',
    name: 'Gaslight',
    description: 'Haunting and sparse with bell-like tones',
    padFreqs: [73.4, 110, 146.8],           // D2, A2, D3
    padWaves: ['sine', 'sine', 'triangle'],
    padVols: [0.09, 0.06, 0.04],
    lfoSpeed: 0.04,
    lfoDepth: 0.4,
    shimmer: false,
    bells: true,
    bellInterval: [4000, 9000],
    bellFreqs: [587, 698, 880, 1047, 1175],  // D5, F5, A5, C6, D6
    filterCutoff: 900,
    subBass: 0,
    detuneRange: 12,
  },
  {
    id: 'empty_stage',
    name: 'The Empty Stage',
    description: 'Eerie, minimal drone with distant echoes',
    padFreqs: [49, 73.4, 98],               // G1, D2, G2
    padWaves: ['sine', 'sine', 'sine'],
    padVols: [0.11, 0.07, 0.04],
    lfoSpeed: 0.03,
    lfoDepth: 0.5,
    shimmer: true,
    shimmerFreq: 784,                        // G5
    bells: true,
    bellInterval: [10000, 20000],
    bellFreqs: [392, 494, 587, 784],         // G4, B4, D5, G5
    filterCutoff: 600,
    subBass: 24.5,                           // B0
    detuneRange: 15,
  },
  {
    id: 'chandelier_dreams',
    name: 'Chandelier Dreams',
    description: 'Elegant ambient with crystal-like tones',
    padFreqs: [82.4, 123.5, 164.8, 247],    // E2, B2, E3, B3
    padWaves: ['sine', 'triangle', 'sine', 'sine'],
    padVols: [0.08, 0.06, 0.05, 0.03],
    lfoSpeed: 0.07,
    lfoDepth: 0.2,
    shimmer: true,
    shimmerFreq: 1319,                       // E6
    bells: true,
    bellInterval: [3000, 7000],
    bellFreqs: [659, 784, 988, 1319, 1568],  // E5, G5, B5, E6, G6
    filterCutoff: 2000,
    subBass: 41.2,                           // E1
    detuneRange: 5,
  },
];

// ─── Music System Singleton ─────────────────────────────────────────────────

export class MusicSystem {
  private static instance: MusicSystem;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private padGains: GainNode[] = [];
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private shimmerOsc: OscillatorNode | null = null;
  private shimmerGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private bellTimerId: number = 0;
  private currentTrack: MusicTrackDef | null = null;
  private playing = false;
  private fadeInterval: number = 0;

  static getInstance(): MusicSystem {
    if (!MusicSystem.instance) {
      MusicSystem.instance = new MusicSystem();
    }
    return MusicSystem.instance;
  }

  private getCtx(): AudioContext | null {
    if (!this.audioCtx) {
      try { this.audioCtx = new AudioContext(); } catch { return null; }
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /** Start playing a track by ID. Crossfades if already playing. */
  play(trackId?: string): void {
    const id = trackId ?? UISounds.getMusicTrack();
    const track = MUSIC_TRACKS.find(t => t.id === id) ?? MUSIC_TRACKS[0];

    if (this.playing && this.currentTrack?.id === track.id) return;

    // Stop current track with fade
    if (this.playing) {
      this.stop(true).then(() => this.startTrack(track));
    } else {
      this.startTrack(track);
    }
  }

  /** Stop the current track. */
  async stop(fade = true): Promise<void> {
    if (!this.playing || !this.masterGain || !this.audioCtx) {
      this.cleanup();
      return;
    }

    if (fade) {
      // Fade out over 1.5s
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.5);
      await new Promise(r => setTimeout(r, 1600));
    }

    this.cleanup();
  }

  /** Update volume in real-time (called when user changes music volume slider). */
  updateVolume(): void {
    if (!this.masterGain || !this.audioCtx) return;
    const vol = UISounds.getMusicVolume() * UISounds.getVolume();
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0.001, vol), now + 0.1);
  }

  isPlaying(): boolean { return this.playing; }
  getCurrentTrack(): MusicTrackDef | null { return this.currentTrack; }

  // ── Private ─────────────────────────────────────────────────────────────

  private startTrack(track: MusicTrackDef): void {
    const ctx = this.getCtx();
    if (!ctx) return;

    this.currentTrack = track;
    this.playing = true;

    const musicVol = UISounds.getMusicVolume() * UISounds.getVolume();

    // Master gain → destination
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // Low-pass filter for warmth
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(track.filterCutoff, ctx.currentTime);
    this.filterNode.Q.setValueAtTime(0.7, ctx.currentTime);
    this.filterNode.connect(this.masterGain);

    // LFO for organic volume modulation
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.setValueAtTime(track.lfoSpeed, ctx.currentTime);
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime(track.lfoDepth, ctx.currentTime);
    this.lfoOsc.connect(this.lfoGain);
    this.lfoOsc.start(ctx.currentTime);

    // Create pad oscillators
    for (let i = 0; i < track.padFreqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = track.padWaves[i] ?? 'sine';
      osc.frequency.setValueAtTime(track.padFreqs[i], ctx.currentTime);
      // Slight detune for organic feel
      osc.detune.setValueAtTime((Math.random() - 0.5) * track.detuneRange * 2, ctx.currentTime);

      gain.gain.setValueAtTime(track.padVols[i] ?? 0.05, ctx.currentTime);
      // Connect LFO to modulate pad gain
      this.lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.filterNode);
      osc.start(ctx.currentTime);

      this.padOscs.push(osc);
      this.padGains.push(gain);
    }

    // Sub-bass drone
    if (track.subBass > 0) {
      this.subOsc = ctx.createOscillator();
      this.subGain = ctx.createGain();
      this.subOsc.type = 'sine';
      this.subOsc.frequency.setValueAtTime(track.subBass, ctx.currentTime);
      this.subGain.gain.setValueAtTime(0.06, ctx.currentTime);
      this.subOsc.connect(this.subGain);
      this.subGain.connect(this.masterGain); // bypass filter for clean sub
      this.subOsc.start(ctx.currentTime);
    }

    // Shimmer layer (high harmonics with slow sweep)
    if (track.shimmer && track.shimmerFreq) {
      this.shimmerOsc = ctx.createOscillator();
      this.shimmerGain = ctx.createGain();
      this.shimmerOsc.type = 'sine';
      this.shimmerOsc.frequency.setValueAtTime(track.shimmerFreq, ctx.currentTime);
      this.shimmerGain.gain.setValueAtTime(0.008, ctx.currentTime);
      this.shimmerOsc.connect(this.shimmerGain);
      this.shimmerGain.connect(this.masterGain);
      this.shimmerOsc.start(ctx.currentTime);

      // Slow frequency sweep for movement
      this.shimmerOsc.frequency.linearRampToValueAtTime(
        track.shimmerFreq * 1.02, ctx.currentTime + 20
      );
    }

    // Fade in over 3 seconds
    this.masterGain.gain.linearRampToValueAtTime(musicVol, ctx.currentTime + 3);

    // Start bell/chime events
    if (track.bells && track.bellFreqs && track.bellInterval) {
      this.scheduleBell(track);
    }

    // Start slow organic drift — periodically retune pads slightly
    this.startDrift(track);
  }

  private scheduleBell(track: MusicTrackDef): void {
    if (!this.playing || !track.bellInterval || !track.bellFreqs) return;
    const [minMs, maxMs] = track.bellInterval;
    const delay = minMs + Math.random() * (maxMs - minMs);

    this.bellTimerId = window.setTimeout(() => {
      if (!this.playing) return;
      this.playBell(track);
      this.scheduleBell(track);
    }, delay);
  }

  private playBell(track: MusicTrackDef): void {
    const ctx = this.getCtx();
    if (!ctx || !this.masterGain || !track.bellFreqs) return;

    const musicVol = UISounds.getMusicVolume() * UISounds.getVolume();
    if (musicVol <= 0) return;

    const freq = track.bellFreqs[Math.floor(Math.random() * track.bellFreqs.length)];
    const now = ctx.currentTime;

    // Main bell tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Bell-like envelope: quick attack, long exponential decay
    const vol = 0.03 + Math.random() * 0.02;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 4.1);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };

    // Optional second harmonic (softer, octave up) for richness
    if (Math.random() > 0.5) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(vol * 0.3, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 3);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now);
      osc2.stop(now + 3.1);
      osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
    }
  }

  private startDrift(track: MusicTrackDef): void {
    // Every 15-25 seconds, slightly retune pads for organic movement
    const drift = () => {
      if (!this.playing || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      for (let i = 0; i < this.padOscs.length; i++) {
        const baseFreq = track.padFreqs[i];
        const newDetune = (Math.random() - 0.5) * track.detuneRange * 2;
        try {
          this.padOscs[i].detune.linearRampToValueAtTime(newDetune, now + 8);
        } catch { /* oscillator may have been stopped */ }
      }

      // Also gently sweep the filter cutoff
      if (this.filterNode) {
        const cutoffDrift = track.filterCutoff * (0.85 + Math.random() * 0.3);
        this.filterNode.frequency.linearRampToValueAtTime(cutoffDrift, now + 10);
      }

      // Schedule next drift
      const nextDrift = 15000 + Math.random() * 10000;
      this.fadeInterval = window.setTimeout(drift, nextDrift);
    };

    this.fadeInterval = window.setTimeout(drift, 10000 + Math.random() * 5000);
  }

  private cleanup(): void {
    this.playing = false;
    window.clearTimeout(this.bellTimerId);
    window.clearTimeout(this.fadeInterval);

    const stopOsc = (osc: OscillatorNode | null) => {
      if (!osc) return;
      try { osc.stop(); } catch { /* ok */ }
      try { osc.disconnect(); } catch { /* ok */ }
    };

    for (const osc of this.padOscs) stopOsc(osc);
    for (const gain of this.padGains) { try { gain.disconnect(); } catch { /* ok */ } }
    this.padOscs = [];
    this.padGains = [];

    stopOsc(this.lfoOsc);
    this.lfoOsc = null;
    if (this.lfoGain) { try { this.lfoGain.disconnect(); } catch { /* ok */ } }
    this.lfoGain = null;

    stopOsc(this.shimmerOsc);
    this.shimmerOsc = null;
    if (this.shimmerGain) { try { this.shimmerGain.disconnect(); } catch { /* ok */ } }
    this.shimmerGain = null;

    stopOsc(this.subOsc);
    this.subOsc = null;
    if (this.subGain) { try { this.subGain.disconnect(); } catch { /* ok */ } }
    this.subGain = null;

    if (this.filterNode) { try { this.filterNode.disconnect(); } catch { /* ok */ } }
    this.filterNode = null;

    if (this.masterGain) { try { this.masterGain.disconnect(); } catch { /* ok */ } }
    this.masterGain = null;
  }
}
