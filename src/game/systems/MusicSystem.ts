/**
 * MusicSystem v2 — Procedural ambient music with chord progressions,
 * arpeggiated patterns, and delay effects for a 1920s theater mystery.
 *
 * Each track features:
 *  - Chord progressions that crossfade cleanly (no pitch sliding)
 *  - Piano-like arpeggiated patterns following the current chord
 *  - Sub-bass following the chord root
 *  - Delay effect for spatial depth and reverb
 *  - Subtle vibrato and filter modulation for organic movement
 *
 * Tracks:
 *  - Chandelier Dreams: Elegant jazz arpeggios (lobby)
 *  - Midnight Theatre: Dark minor progressions (auditorium)
 *  - Velvet Curtain: Suspenseful noir (backstage/office)
 *  - Gaslight: Haunting sparse tones (dressing room/basement)
 *  - The Empty Stage: Melancholic and spacious (projection booth/catwalk)
 */

import { UISounds } from '../utils/sounds';

// ─── Track Definitions ──────────────────────────────────────────────────────

export interface MusicTrackDef {
  id: string;
  name: string;
  description: string;
  /** Chord progression — each chord is 4 frequencies (pad voicing) */
  chords: number[][];
  /** Seconds per chord before advancing */
  chordDuration: number;
  /** Milliseconds between arpeggio notes */
  arpInterval: number;
  /** Oscillator wave for pad voices */
  padWave: OscillatorType;
  /** Volume per pad voice (0–1) */
  padVolume: number;
  /** Volume for arpeggio notes (0–1) */
  arpVolume: number;
  /** Volume for bass layer (0–1) */
  bassVolume: number;
  /** Low-pass filter cutoff (Hz) */
  filterCutoff: number;
  /** Delay effect time (seconds) */
  delayTime: number;
  /** Delay feedback (0–1) */
  delayFeedback: number;
  /** Delay wet mix (0–1) */
  delayMix: number;
  /** Pad vibrato rate (Hz) */
  vibratoRate: number;
  /** Pad vibrato depth (cents) */
  vibratoDepth: number;
}

// ── Frequency reference ─────────────────────────────────────────────────────
// C3=130.8  D3=146.8  Eb3=155.6  E3=164.8  F3=174.6  F#3=185.0  G3=196.0
// Ab3=207.7  A3=220.0  Bb3=233.1  B3=247.0
// C4=261.6  C#4=277.2  D4=293.7  Eb4=311.1  E4=329.6  F4=349.2  F#4=370.0
// G4=392.0  Ab4=415.3  A4=440.0  Bb4=466.2  B4=493.9
// C5=523.3  D5=587.3  E5=659.3  F5=698.5  G5=784.0  A5=880.0  B5=987.8

export const MUSIC_TRACKS: MusicTrackDef[] = [
  {
    id: 'chandelier_dreams',
    name: 'Chandelier Dreams',
    description: 'Elegant jazz with crystal arpeggios',
    chords: [
      [261.6, 329.6, 392.0, 493.9],  // Cmaj7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [293.7, 349.2, 440.0, 523.3],  // Dm7
      [196.0, 247.0, 293.7, 349.2],  // G7
      [174.6, 220.0, 261.6, 329.6],  // Fmaj7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [293.7, 349.2, 440.0, 523.3],  // Dm7
      [196.0, 247.0, 293.7, 349.2],  // G7
    ],
    chordDuration: 8,
    arpInterval: 340,
    padWave: 'triangle',
    padVolume: 0.04,
    arpVolume: 0.07,
    bassVolume: 0.035,
    filterCutoff: 2400,
    delayTime: 0.33,
    delayFeedback: 0.18,
    delayMix: 0.14,
    vibratoRate: 4.5,
    vibratoDepth: 1.5,
  },
  {
    id: 'midnight_theatre',
    name: 'Midnight Theatre',
    description: 'Dark minor progressions with deep pads',
    chords: [
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [293.7, 349.2, 440.0, 523.3],  // Dm7
      [164.8, 207.7, 247.0, 293.7],  // E7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [174.6, 220.0, 261.6, 329.6],  // Fmaj7
      [293.7, 349.2, 440.0, 523.3],  // Dm7
      [247.0, 293.7, 349.2, 415.3],  // Bdim7
      [164.8, 207.7, 247.0, 293.7],  // E7
    ],
    chordDuration: 10,
    arpInterval: 450,
    padWave: 'sine',
    padVolume: 0.045,
    arpVolume: 0.06,
    bassVolume: 0.04,
    filterCutoff: 1400,
    delayTime: 0.4,
    delayFeedback: 0.2,
    delayMix: 0.18,
    vibratoRate: 3.5,
    vibratoDepth: 2,
  },
  {
    id: 'velvet_curtain',
    name: 'Velvet Curtain',
    description: 'Suspenseful noir with building tension',
    chords: [
      [146.8, 174.6, 220.0, 261.6],  // Dm7
      [196.0, 233.1, 293.7, 349.2],  // Gm7
      [220.0, 277.2, 329.6, 392.0],  // A7
      [146.8, 174.6, 220.0, 261.6],  // Dm7
      [233.1, 293.7, 349.2, 440.0],  // Bbmaj7
      [196.0, 233.1, 293.7, 349.2],  // Gm7
      [220.0, 277.2, 329.6, 392.0],  // A7
      [146.8, 174.6, 220.0, 261.6],  // Dm7
    ],
    chordDuration: 9,
    arpInterval: 320,
    padWave: 'triangle',
    padVolume: 0.04,
    arpVolume: 0.065,
    bassVolume: 0.03,
    filterCutoff: 1800,
    delayTime: 0.28,
    delayFeedback: 0.15,
    delayMix: 0.12,
    vibratoRate: 4.0,
    vibratoDepth: 1.5,
  },
  {
    id: 'gaslight',
    name: 'Gaslight',
    description: 'Haunting and sparse with ghostly tones',
    chords: [
      [164.8, 196.0, 247.0, 293.7],  // Em7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [247.0, 311.1, 370.0, 440.0],  // B7
      [164.8, 196.0, 247.0, 293.7],  // Em7
      [261.6, 329.6, 392.0, 493.9],  // Cmaj7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [247.0, 311.1, 370.0, 440.0],  // B7
      [164.8, 196.0, 247.0, 293.7],  // Em7
    ],
    chordDuration: 12,
    arpInterval: 550,
    padWave: 'sine',
    padVolume: 0.035,
    arpVolume: 0.06,
    bassVolume: 0.03,
    filterCutoff: 1100,
    delayTime: 0.45,
    delayFeedback: 0.22,
    delayMix: 0.2,
    vibratoRate: 3.0,
    vibratoDepth: 2,
  },
  {
    id: 'empty_stage',
    name: 'The Empty Stage',
    description: 'Melancholic and spacious with slow echoes',
    chords: [
      [196.0, 233.1, 293.7, 349.2],  // Gm7
      [261.6, 311.1, 392.0, 466.2],  // Cm7
      [146.8, 185.0, 220.0, 261.6],  // D7
      [196.0, 233.1, 293.7, 349.2],  // Gm7
      [311.1, 392.0, 466.2, 587.3],  // Ebmaj7
      [261.6, 311.1, 392.0, 466.2],  // Cm7
      [146.8, 185.0, 220.0, 261.6],  // D7
      [196.0, 233.1, 293.7, 349.2],  // Gm7
    ],
    chordDuration: 11,
    arpInterval: 480,
    padWave: 'sine',
    padVolume: 0.04,
    arpVolume: 0.055,
    bassVolume: 0.035,
    filterCutoff: 1000,
    delayTime: 0.5,
    delayFeedback: 0.22,
    delayMix: 0.2,
    vibratoRate: 2.8,
    vibratoDepth: 2.5,
  },
];

// ─── Internal Types ─────────────────────────────────────────────────────────

interface PadVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
}

// ─── Music System ───────────────────────────────────────────────────────────

export class MusicSystem {
  private static instance: MusicSystem;

  private audioCtx: AudioContext | null = null;

  // Audio graph nodes
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private dryGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private padVoices: PadVoice[] = [];
  private bassOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private vibratoLFO: OscillatorNode | null = null;
  private vibratoGain: GainNode | null = null;
  private filterLFO: OscillatorNode | null = null;
  private filterLFOGain: GainNode | null = null;

  // State
  private currentTrack: MusicTrackDef | null = null;
  private playing = false;
  private chordIndex = 0;
  private arpIndex = 0;
  private chordTimerId = 0;
  private arpTimerId = 0;

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

  /** Start playing a track by ID. Crossfades if already playing a different track. */
  play(trackId?: string): void {
    const id = trackId ?? UISounds.getMusicTrack();
    const track = MUSIC_TRACKS.find(t => t.id === id) ?? MUSIC_TRACKS[0];

    if (this.playing && this.currentTrack?.id === track.id) return;

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
    this.chordIndex = 0;
    this.arpIndex = 0;

    const musicVol = UISounds.getMusicVolume() * UISounds.getVolume();
    const now = ctx.currentTime;

    // ── Master output ──
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.connect(ctx.destination);

    // ── Delay effect (feedback delay for reverb/space) ──
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(track.delayTime, now);
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(track.delayFeedback, now);
    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(track.delayMix, now);

    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode); // feedback loop
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.masterGain);

    // ── Dry path ──
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, now);
    this.dryGain.connect(this.masterGain);

    // ── Low-pass filter for warmth ──
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(track.filterCutoff, now);
    this.filterNode.Q.setValueAtTime(0.7, now);
    this.filterNode.connect(this.dryGain);
    this.filterNode.connect(this.delayNode); // send to delay too

    // ── Subtle filter sweep LFO (very gentle movement) ──
    this.filterLFO = ctx.createOscillator();
    this.filterLFO.type = 'sine';
    this.filterLFO.frequency.setValueAtTime(0.03, now);
    this.filterLFOGain = ctx.createGain();
    this.filterLFOGain.gain.setValueAtTime(track.filterCutoff * 0.1, now);
    this.filterLFO.connect(this.filterLFOGain);
    this.filterLFOGain.connect(this.filterNode.frequency);
    this.filterLFO.start(now);

    // ── Pad voices (4 voices × 2 detuned oscillators for chorus) ──
    this.createPadVoices(ctx, track, track.chords[0], now);

    // ── Vibrato LFO for pads (subtle) ──
    this.vibratoLFO = ctx.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.setValueAtTime(track.vibratoRate, now);
    this.vibratoGain = ctx.createGain();
    this.vibratoGain.gain.setValueAtTime(track.vibratoDepth, now);
    this.vibratoLFO.connect(this.vibratoGain);
    for (const voice of this.padVoices) {
      this.vibratoGain.connect(voice.osc1.detune);
      this.vibratoGain.connect(voice.osc2.detune);
    }
    this.vibratoLFO.start(now);

    // ── Bass (root note one octave below chord, bypasses filter for clarity) ──
    this.bassOsc = ctx.createOscillator();
    this.bassOsc.type = 'sine';
    this.bassOsc.frequency.setValueAtTime(track.chords[0][0] / 2, now);
    this.bassGain = ctx.createGain();
    this.bassGain.gain.setValueAtTime(track.bassVolume, now);
    this.bassOsc.connect(this.bassGain);
    this.bassGain.connect(this.masterGain);
    this.bassOsc.start(now);

    // ── Fade in over 2.5 seconds ──
    this.masterGain.gain.linearRampToValueAtTime(musicVol, now + 2.5);

    // ── Start chord progression and arpeggiator ──
    this.scheduleChordChange(track);
    this.scheduleArpNote(track);
  }

  /** Create pad oscillator voices for a chord */
  private createPadVoices(
    ctx: AudioContext, track: MusicTrackDef, chord: number[], now: number, fadeIn = false,
  ): void {
    for (let i = 0; i < 4; i++) {
      const freq = chord[i] ?? chord[0];

      const osc1 = ctx.createOscillator();
      osc1.type = track.padWave;
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(-3, now);

      const osc2 = ctx.createOscillator();
      osc2.type = track.padWave;
      osc2.frequency.setValueAtTime(freq, now);
      osc2.detune.setValueAtTime(3, now);

      const gain = ctx.createGain();
      if (fadeIn) {
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(track.padVolume, now + 1.5);
      } else {
        gain.gain.setValueAtTime(track.padVolume, now);
      }

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.filterNode!);

      // Connect vibrato if available
      if (this.vibratoGain) {
        this.vibratoGain.connect(osc1.detune);
        this.vibratoGain.connect(osc2.detune);
      }

      osc1.start(now);
      osc2.start(now);

      this.padVoices.push({ osc1, osc2, gain });
    }
  }

  // ── Chord progression ─────────────────────────────────────────────────

  private scheduleChordChange(track: MusicTrackDef): void {
    this.chordTimerId = window.setTimeout(() => {
      if (!this.playing) return;
      this.advanceChord(track);
      this.scheduleChordChange(track);
    }, track.chordDuration * 1000);
  }

  /** Crossfade to the next chord — no pitch sliding */
  private advanceChord(track: MusicTrackDef): void {
    const ctx = this.audioCtx;
    if (!this.playing || !ctx || !this.filterNode) return;

    this.chordIndex = (this.chordIndex + 1) % track.chords.length;
    const chord = track.chords[this.chordIndex];
    const now = ctx.currentTime;
    const fadeTime = 1.5;

    // Fade out old pad voices
    const oldVoices = [...this.padVoices];
    for (const v of oldVoices) {
      try {
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(0.001, now + fadeTime);
      } catch { /* ok */ }
    }

    // Schedule cleanup of old voices after fade completes
    setTimeout(() => {
      for (const v of oldVoices) {
        try { v.osc1.stop(); } catch { /* ok */ }
        try { v.osc1.disconnect(); } catch { /* ok */ }
        try { v.osc2.stop(); } catch { /* ok */ }
        try { v.osc2.disconnect(); } catch { /* ok */ }
        try { v.gain.disconnect(); } catch { /* ok */ }
      }
    }, (fadeTime + 0.3) * 1000);

    // Create new pad voices at new chord frequencies (fade in)
    this.padVoices = [];
    this.createPadVoices(ctx, track, chord, now, true);

    // Crossfade bass to new root
    if (this.bassOsc && this.bassGain) {
      const newBassFreq = chord[0] / 2;
      // Quick fade out, snap frequency, fade back in
      this.bassGain.gain.setValueAtTime(this.bassGain.gain.value, now);
      this.bassGain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      this.bassOsc.frequency.setValueAtTime(newBassFreq, now + 0.15);
      this.bassGain.gain.linearRampToValueAtTime(track.bassVolume, now + 0.3);
    }

    // Reset arp index for new chord
    this.arpIndex = 0;
  }

  // ── Arpeggiator ───────────────────────────────────────────────────────

  private scheduleArpNote(track: MusicTrackDef): void {
    // Slight timing jitter (±8%) for human feel
    const jitter = track.arpInterval * (0.92 + Math.random() * 0.16);
    this.arpTimerId = window.setTimeout(() => {
      if (!this.playing) return;
      this.playArpNote(track);
      this.scheduleArpNote(track);
    }, jitter);
  }

  private playArpNote(track: MusicTrackDef): void {
    const ctx = this.getCtx();
    if (!ctx || !this.filterNode) return;

    // Derive arp notes from current chord (one octave up, pendulum pattern)
    const chord = track.chords[this.chordIndex];
    const arpUp = chord.map(f => f * 2);
    const len = arpUp.length;
    const period = len * 2 - 2; // pendulum: 0,1,2,3,2,1 → period=6
    const pos = this.arpIndex % Math.max(period, 1);
    const noteIdx = pos < len ? pos : period - pos;
    const freq = arpUp[noteIdx] ?? arpUp[0];
    this.arpIndex++;

    // 15% chance to rest — creates breathing room
    if (Math.random() < 0.15) return;

    const now = ctx.currentTime;
    // Velocity variation (±25%) for dynamics
    const velocity = track.arpVolume * (0.75 + Math.random() * 0.5);

    // Piano-like tone: fundamental + 2nd harmonic (octave) + 3rd harmonic
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const harm2 = ctx.createOscillator();
    harm2.type = 'sine';
    harm2.frequency.setValueAtTime(freq * 2, now);

    const harm3 = ctx.createOscillator();
    harm3.type = 'sine';
    harm3.frequency.setValueAtTime(freq * 3, now);

    // Piano envelope: fast attack, moderate decay, gentle release
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(velocity, now + 0.005);            // crisp attack
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.4, now + 0.08);  // hammer decay
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.15, now + 0.6);  // sustain decay
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);            // release

    // Harmonics for brightness (piano-like timbre)
    const harm2Gain = ctx.createGain();
    harm2Gain.gain.setValueAtTime(0.12, now);  // octave harmonic
    const harm3Gain = ctx.createGain();
    harm3Gain.gain.setValueAtTime(0.04, now);  // 3rd harmonic (subtle brightness)

    osc.connect(noteGain);
    harm2.connect(harm2Gain);
    harm2Gain.connect(noteGain);
    harm3.connect(harm3Gain);
    harm3Gain.connect(noteGain);
    noteGain.connect(this.filterNode);

    osc.start(now);
    harm2.start(now);
    harm3.start(now);
    osc.stop(now + 2.5);
    harm2.stop(now + 2.5);
    harm3.stop(now + 2.5);

    osc.onended = () => {
      try { osc.disconnect(); harm2.disconnect(); harm3.disconnect(); }
      catch { /* ok */ }
      try { noteGain.disconnect(); harm2Gain.disconnect(); harm3Gain.disconnect(); }
      catch { /* ok */ }
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  private cleanup(): void {
    this.playing = false;
    window.clearTimeout(this.chordTimerId);
    window.clearTimeout(this.arpTimerId);

    const stopOsc = (osc: OscillatorNode | null) => {
      if (!osc) return;
      try { osc.stop(); } catch { /* ok */ }
      try { osc.disconnect(); } catch { /* ok */ }
    };

    const disc = (node: AudioNode | null) => {
      if (!node) return;
      try { node.disconnect(); } catch { /* ok */ }
    };

    for (const v of this.padVoices) {
      stopOsc(v.osc1);
      stopOsc(v.osc2);
      disc(v.gain);
    }
    this.padVoices = [];

    stopOsc(this.bassOsc);       this.bassOsc = null;
    disc(this.bassGain);         this.bassGain = null;
    stopOsc(this.vibratoLFO);    this.vibratoLFO = null;
    disc(this.vibratoGain);      this.vibratoGain = null;
    stopOsc(this.filterLFO);     this.filterLFO = null;
    disc(this.filterLFOGain);    this.filterLFOGain = null;
    disc(this.filterNode);       this.filterNode = null;
    disc(this.delayNode);        this.delayNode = null;
    disc(this.feedbackGain);     this.feedbackGain = null;
    disc(this.wetGain);          this.wetGain = null;
    disc(this.dryGain);          this.dryGain = null;
    disc(this.masterGain);       this.masterGain = null;
  }
}
