/**
 * AmbientAudioSystem — manages per-room background audio.
 *
 * Each room can have:
 *  1. A primary ambient loop (loaded audio file)
 *  2. Optional secondary layer (loaded audio file)
 *  3. Procedural texture layers (Web Audio API drones, ticks, drips)
 *
 * Crossfades between rooms when the player navigates.
 * Respects the master volume from UISounds.
 */

import { UISounds } from '../utils/sounds';

// ─── Room audio configuration ────────────────────────────────────────────────

interface RoomAudioConfig {
  /** Primary ambient loop (Phaser audio key) */
  primary?: string;
  /** Secondary ambient layer */
  secondary?: string;
  /** Volume multiplier for primary (0–1) */
  primaryVol?: number;
  /** Volume multiplier for secondary (0–1) */
  secondaryVol?: number;
  /** Procedural layer definitions */
  procedural?: ProceduralLayer[];
}

interface ProceduralLayer {
  type: 'drone' | 'tick' | 'drip' | 'creak' | 'hum' | 'wind';
  /** Base frequency in Hz */
  freq: number;
  /** Volume 0–1 */
  volume: number;
  /** Oscillator type */
  wave?: OscillatorType;
  /** Frequency end for sweep */
  freqEnd?: number;
  /** Interval between repeats (ms), 0 = continuous */
  interval?: number;
  /** Duration per event (seconds) */
  duration?: number;
}

// Room ambient SFX — very subtle texture underneath the real music tracks.
// Primary loops play at whisper-level volume; procedural layers add occasional
// environmental detail (creaks, drips) rather than constant drones.
// No continuous drones — the music system handles atmosphere now.
const ROOM_AUDIO: Record<string, RoomAudioConfig> = {
  lobby: {
    primary: 'amb_abandoned_building',
    primaryVol: 0.04,
    procedural: [],
  },
  auditorium: {
    primaryVol: 0,
    procedural: [
      { type: 'creak', freq: 300, volume: 0.008, wave: 'sawtooth', freqEnd: 150, interval: 18000, duration: 0.3 },
    ],
  },
  backstage: {
    primary: 'amb_abandoned_building2',
    primaryVol: 0.03,
    secondary: 'amb_wood_creak',
    secondaryVol: 0.03,
    procedural: [],
  },
  dressing_room: {
    primaryVol: 0,
    procedural: [],
  },
  projection_booth: {
    primary: 'amb_electrical_hum',
    primaryVol: 0.04,
    procedural: [],
  },
  catwalk: {
    primary: 'amb_metal_ambience',
    primaryVol: 0.04,
    procedural: [
      { type: 'creak', freq: 500, volume: 0.006, wave: 'sawtooth', freqEnd: 200, interval: 15000, duration: 0.4 },
    ],
  },
  basement: {
    primary: 'amb_water_drip',
    primaryVol: 0.05,
    procedural: [
      { type: 'drip', freq: 3000, volume: 0.006, wave: 'sine', freqEnd: 800, interval: 8000, duration: 0.08 },
    ],
  },
  managers_office: {
    primary: 'amb_abandoned_building',
    primaryVol: 0.03,
    secondary: 'amb_clock_tick',
    secondaryVol: 0.06,
    procedural: [],
  },
};

// ─── Audio asset manifest (loaded by BootScene) ─────────────────────────────

/** Returns the audio keys and file paths to load. */
export function getAmbientAudioManifest(): Array<{ key: string; path: string }> {
  return [
    { key: 'amb_abandoned_building', path: 'assets/audio/abandoned_building.mp3' },
    { key: 'amb_abandoned_building2', path: 'assets/audio/abandoned_building2.mp3' },
    { key: 'amb_ambient_horror', path: 'assets/audio/ambient_horror.ogg' },
    { key: 'amb_clock_tick', path: 'assets/audio/clock_tick.ogg' },
    { key: 'amb_creepy_ambient', path: 'assets/audio/creepy_ambient.mp3' },
    { key: 'amb_electrical_hum', path: 'assets/audio/electrical_hum.wav' },
    { key: 'amb_ghost_whisper', path: 'assets/audio/ghost_whisper.wav' },
    { key: 'amb_horror_ambient', path: 'assets/audio/horror_ambient.mp3' },
    { key: 'amb_machinery_hum', path: 'assets/audio/machinery_hum.ogg' },
    { key: 'amb_metal_ambience', path: 'assets/audio/metal_ambience.wav' },
    { key: 'amb_water_drip', path: 'assets/audio/water_drip.wav' },
    { key: 'amb_wood_creak', path: 'assets/audio/wood_creak.ogg' },
  ];
}

// ─── System singleton ────────────────────────────────────────────────────────

const CROSSFADE_MS = 800;

export class AmbientAudioSystem {
  private static instance: AmbientAudioSystem;
  private scene: Phaser.Scene | null = null;
  private currentRoom = '';
  private activeSounds: Phaser.Sound.BaseSound[] = [];
  private proceduralTimers: Phaser.Time.TimerEvent[] = [];
  private audioCtx: AudioContext | null = null;
  private proceduralNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

  static getInstance(): AmbientAudioSystem {
    if (!AmbientAudioSystem.instance) {
      AmbientAudioSystem.instance = new AmbientAudioSystem();
    }
    return AmbientAudioSystem.instance;
  }

  /** Call once from RoomScene.create() to bind the scene. */
  setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /** Start ambient audio for a room (crossfades from previous). */
  enterRoom(roomId: string): void {
    if (!this.scene) return;
    if (roomId === this.currentRoom) return;

    // Fade out old sounds
    this.fadeOutAll();

    this.currentRoom = roomId;
    const config = ROOM_AUDIO[roomId];
    if (!config) return;

    const masterVol = UISounds.getVolume();

    // Start primary loop
    if (config.primary && (this.scene.sound.get(config.primary) || this.scene.cache.audio.exists(config.primary))) {
      this.startLoop(config.primary, (config.primaryVol ?? 0.3) * masterVol);
    }

    // Start secondary loop
    if (config.secondary && this.scene.cache.audio.exists(config.secondary)) {
      this.startLoop(config.secondary, (config.secondaryVol ?? 0.2) * masterVol);
    }

    // Start procedural layers
    if (config.procedural) {
      for (const layer of config.procedural) {
        this.startProceduralLayer(layer, masterVol);
      }
    }
  }

  /** Stop everything (for scene shutdown). */
  stopAll(): void {
    this.fadeOutAll();
    this.currentRoom = '';
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private startLoop(key: string, volume: number): void {
    if (!this.scene) return;
    try {
      const sound = this.scene.sound.add(key, { loop: true, volume: 0 });
      sound.play();
      // Fade in
      this.scene.tweens.add({
        targets: sound,
        volume,
        duration: CROSSFADE_MS,
      });
      this.activeSounds.push(sound);
    } catch {
      // Audio file not loaded — silently skip
    }
  }

  private fadeOutAll(): void {
    if (!this.scene) return;

    // Fade out Phaser sounds
    for (const sound of this.activeSounds) {
      try {
        this.scene.tweens.add({
          targets: sound,
          volume: 0,
          duration: CROSSFADE_MS,
          onComplete: () => { try { sound.destroy(); } catch { /* ok */ } },
        });
      } catch {
        try { sound.destroy(); } catch { /* ok */ }
      }
    }
    this.activeSounds = [];

    // Stop procedural timers
    for (const timer of this.proceduralTimers) {
      timer.remove(false);
    }
    this.proceduralTimers = [];

    // Stop procedural oscillators
    for (const node of this.proceduralNodes) {
      try {
        node.gain.gain.exponentialRampToValueAtTime(0.001, (this.audioCtx?.currentTime ?? 0) + 0.5);
        setTimeout(() => { try { node.osc.stop(); } catch { /* ok */ } }, 600);
      } catch { /* ok */ }
    }
    this.proceduralNodes = [];
  }

  private getAudioCtx(): AudioContext | null {
    if (!this.audioCtx) {
      try { this.audioCtx = new AudioContext(); } catch { return null; }
    }
    // Resume suspended context (browsers require user gesture)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private startProceduralLayer(layer: ProceduralLayer, masterVol: number): void {
    if (!this.scene) return;
    if (masterVol <= 0) return;

    const effectiveVol = layer.volume * masterVol;

    if (layer.interval && layer.interval > 0) {
      // Repeating event (tick, drip, creak)
      const timer = this.scene.time.addEvent({
        delay: layer.interval,
        loop: true,
        callback: () => this.playProceduralTone(layer, effectiveVol),
      });
      this.proceduralTimers.push(timer);
      // Play one immediately
      this.playProceduralTone(layer, effectiveVol);
    } else {
      // Continuous drone
      this.startContinuousDrone(layer, effectiveVol);
    }
  }

  private playProceduralTone(layer: ProceduralLayer, volume: number): void {
    const ctx = this.getAudioCtx();
    if (!ctx) return;

    // Add randomness to make it feel natural
    const freqVariation = 1 + (Math.random() - 0.5) * 0.1;
    const volVariation = volume * (0.6 + Math.random() * 0.4);
    const dur = layer.duration ?? 0.1;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = layer.wave ?? 'sine';
    osc.frequency.setValueAtTime(layer.freq * freqVariation, ctx.currentTime);
    if (layer.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, layer.freqEnd * freqVariation),
        ctx.currentTime + dur,
      );
    }

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volVariation, ctx.currentTime + dur * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  private startContinuousDrone(layer: ProceduralLayer, volume: number): void {
    const ctx = this.getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = layer.wave ?? 'sine';
    osc.frequency.setValueAtTime(layer.freq, ctx.currentTime);

    // Slow subtle LFO-like frequency wobble for organic feel
    if (layer.freqEnd) {
      osc.frequency.linearRampToValueAtTime(layer.freqEnd, ctx.currentTime + (layer.duration ?? 6));
    }

    // Fade in gently
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);

    this.proceduralNodes.push({ osc, gain });
  }
}
