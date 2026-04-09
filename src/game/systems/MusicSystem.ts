/**
 * MusicSystem — Background music player using real audio tracks.
 *
 * Uses royalty-free music files loaded as HTML5 Audio.
 * Each track is a professionally produced piece mapped to a game mood.
 * Supports crossfading between tracks, volume control, and looping.
 *
 * Track sources & licenses:
 *  CC BY 4.0 (Shane Ivers - silvermansound.com):
 *    - signs_to_nowhere: Noir jazz — bass, vibraphone, muted trumpet, drums
 *    - speakeasy: Uptempo 1920s jazz combo
 *    - mystery_unsolved: Piano, strings, theremin — investigation energy
 *
 *  CC BY 3.0 (Kevin MacLeod - incompetech.com):
 *    - ghost_story: Classic haunting atmosphere
 *    - comfortable_mystery: Vintage electric piano, surreal arpeggios
 *    - darkest_child: Dark, unsettling tension
 *    - dreamy_flashback: Soft emotional revelation
 *    - crypto: Moody, building tension
 *
 *  Mixkit Stock Music Free License:
 *    - lobby_elegant: "Wedding 01" by Francisco Alvear
 *    - gentle_piano: "Zanarkand Forest" by Alejandro Magaña
 */

import { UISounds } from '../utils/sounds';

// ─── Track Definitions ──────────────────────────────────────────────────────

export interface MusicTrackDef {
  id: string;
  name: string;
  description: string;
  /** Path to the audio file (relative to public/) */
  file: string;
  /** Per-track gain multiplier (default 1.0). Normalizes tracks mastered at different levels. */
  gain?: number;
}

export const MUSIC_TRACKS: MusicTrackDef[] = [
  {
    id: 'signs_to_nowhere',
    name: 'Grand Lobby',
    description: 'Noir jazz — bass, vibraphone, muted trumpet',
    file: '/music/signs_to_nowhere.mp3',
  },
  {
    id: 'speakeasy',
    name: 'The Speakeasy',
    description: 'Uptempo 1920s jazz combo',
    file: '/music/speakeasy.mp3',
  },
  {
    id: 'lobby_elegant',
    name: 'Chandelier Dreams',
    description: 'Warm, elegant strings and piano',
    file: '/music/lobby_elegant.mp3',
  },
  {
    id: 'mystery_unsolved',
    name: 'The Investigation',
    description: 'Piano, strings, and theremin — detective energy',
    file: '/music/mystery_unsolved.mp3',
  },
  {
    id: 'crypto',
    name: 'Velvet Curtain',
    description: 'Moody, building tension',
    file: '/music/crypto.mp3',
    gain: 1.4,
  },
  {
    id: 'ghost_story',
    name: 'The Empty Stage',
    description: 'Classic haunting atmosphere',
    file: '/music/ghost_story.mp3',
    gain: 1.2,
  },
  {
    id: 'darkest_child',
    name: 'Gaslight',
    description: 'Dark, unsettling — something lurks below',
    file: '/music/darkest_child.mp3',
    gain: 1.2,
  },
  {
    id: 'comfortable_mystery',
    name: 'The Study',
    description: 'Vintage electric piano — surreal and contemplative',
    file: '/music/comfortable_mystery.mp3',
    gain: 1.3,
  },
  {
    id: 'dreamy_flashback',
    name: 'Crimson Veil',
    description: 'Soft, emotional — uncovering the truth',
    file: '/music/dreamy_flashback.mp3',
  },
  {
    id: 'gentle_piano',
    name: 'Midnight Theatre',
    description: 'Gentle piano — quiet reflection',
    file: '/music/gentle_piano.mp3',
  },
];

// ─── Music System ───────────────────────────────────────────────────────────

export class MusicSystem {
  private static instance: MusicSystem;

  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private currentTrack: MusicTrackDef | null = null;
  private playing = false;
  private fadeTimer: number = 0;
  private targetVolume = 1;
  private ducked = false;

  /** Effective volume accounting for per-track gain. */
  private get effectiveVolume(): number {
    const gain = this.currentTrack?.gain ?? 1;
    return Math.max(0, Math.min(1, this.targetVolume * gain));
  }
  private duckTimer: number = 0;
  /** Multiplier applied when VO is playing to keep music from competing. */
  private static readonly DUCK_LEVEL = 0.3;

  static getInstance(): MusicSystem {
    if (!MusicSystem.instance) {
      MusicSystem.instance = new MusicSystem();
    }
    return MusicSystem.instance;
  }

  /** Start playing a track by ID. Crossfades if already playing. */
  play(trackId?: string): void {
    const id = trackId ?? UISounds.getMusicTrack();
    const track = MUSIC_TRACKS.find(t => t.id === id) ?? MUSIC_TRACKS[0];

    if (this.playing && this.currentTrack?.id === track.id) return;

    this.targetVolume = UISounds.getMusicVolume() * UISounds.getVolume();

    if (this.playing && this.currentAudio) {
      // Crossfade: fade out current, start new
      this.crossfadeTo(track);
    } else {
      this.startTrack(track);
    }
  }

  /** Stop the current track. */
  async stop(fade = true): Promise<void> {
    if (!this.playing || !this.currentAudio) {
      this.cleanup();
      return;
    }

    // Capture the audio element we're stopping so that if play() starts a
    // new track during the fadeout, cleanup only kills the OLD element.
    const stoppingAudio = this.currentAudio;
    this.playing = false;
    this.currentTrack = null;
    this.currentAudio = null;

    if (fade) {
      await this.fadeOut(stoppingAudio, 1.5);
    }

    // Only clean up the element we faded — don't touch currentAudio
    // which may have been set to a new track by play() in the meantime
    try { stoppingAudio.pause(); stoppingAudio.src = ''; } catch { /* ok */ }
  }

  /** Update volume in real-time. */
  updateVolume(): void {
    this.targetVolume = UISounds.getMusicVolume() * UISounds.getVolume();
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, this.effectiveVolume));
    }
  }

  isPlaying(): boolean { return this.playing; }
  getCurrentTrack(): MusicTrackDef | null { return this.currentTrack; }

  /** Duck music volume while VO is playing. Call from DialogueSystem. */
  duck(): void {
    if (this.ducked || !this.currentAudio) return;
    this.ducked = true;
    window.clearInterval(this.duckTimer);
    const target = this.effectiveVolume * MusicSystem.DUCK_LEVEL;
    const steps = 15;
    const interval = 300 / steps;
    let step = 0;
    const startVol = this.currentAudio.volume;
    const decrement = (startVol - target) / steps;
    this.duckTimer = window.setInterval(() => {
      step++;
      if (step >= steps || !this.currentAudio) {
        if (this.currentAudio) this.currentAudio.volume = Math.max(0, target);
        window.clearInterval(this.duckTimer);
        return;
      }
      this.currentAudio.volume = Math.max(0, startVol - decrement * step);
    }, interval);
  }

  /** Restore music volume after VO finishes. */
  unduck(): void {
    if (!this.ducked || !this.currentAudio) return;
    this.ducked = false;
    window.clearInterval(this.duckTimer);
    const steps = 20;
    const interval = 600 / steps;
    let step = 0;
    const startVol = this.currentAudio.volume;
    const increment = (this.effectiveVolume - startVol) / steps;
    this.duckTimer = window.setInterval(() => {
      step++;
      if (step >= steps || !this.currentAudio) {
        if (this.currentAudio) this.currentAudio.volume = Math.max(0, Math.min(1, this.effectiveVolume));
        window.clearInterval(this.duckTimer);
        return;
      }
      this.currentAudio.volume = Math.max(0, Math.min(1, startVol + increment * step));
    }, interval);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private startTrack(track: MusicTrackDef): void {
    this.cleanup();

    this.currentTrack = track;
    this.playing = true;

    const audio = new Audio(track.file);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';

    this.currentAudio = audio;

    // Start playback and fade in
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        this.fadeIn(audio, 2.0);
      }).catch(() => {
        // Autoplay blocked — try again on next user interaction
        const resume = () => {
          audio.play().then(() => this.fadeIn(audio, 2.0)).catch(() => {});
          document.removeEventListener('click', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      });
    }
  }

  private crossfadeTo(track: MusicTrackDef): void {
    const oldAudio = this.currentAudio;
    this.currentTrack = track;

    // Create and start new audio
    const newAudio = new Audio(track.file);
    newAudio.loop = true;
    newAudio.volume = 0;
    newAudio.preload = 'auto';
    this.currentAudio = newAudio;

    const duration = 2.0; // crossfade duration in seconds

    const startCrossfade = () => {
      // Fade in new
      this.fadeIn(newAudio, duration);
      // Fade out old
      if (oldAudio) {
        this.fadeOut(oldAudio, duration).then(() => {
          oldAudio.pause();
          oldAudio.src = '';
        });
      }
    };

    const playPromise = newAudio.play();
    if (playPromise) {
      playPromise.then(startCrossfade).catch(() => {
        // Autoplay blocked
        const resume = () => {
          newAudio.play().then(startCrossfade).catch(() => {});
          document.removeEventListener('click', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      });
    }
  }

  private fadeIn(audio: HTMLAudioElement, duration: number): void {
    const steps = 30;
    const interval = (duration * 1000) / steps;
    const vol = this.effectiveVolume;
    const increment = vol / steps;
    let step = 0;

    const timer = window.setInterval(() => {
      step++;
      if (step >= steps || audio.paused) {
        audio.volume = Math.max(0, Math.min(1, vol));
        window.clearInterval(timer);
        return;
      }
      audio.volume = Math.max(0, Math.min(1, increment * step));
    }, interval);
  }

  private fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise(resolve => {
      const steps = 30;
      const interval = (duration * 1000) / steps;
      const startVol = audio.volume;
      const decrement = startVol / steps;
      let step = 0;

      const timer = window.setInterval(() => {
        step++;
        if (step >= steps || audio.paused) {
          audio.volume = 0;
          window.clearInterval(timer);
          resolve();
          return;
        }
        audio.volume = Math.max(0, startVol - decrement * step);
      }, interval);
    });
  }

  private cleanup(): void {
    this.playing = false;
    window.clearInterval(this.fadeTimer);

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch { /* ok */ }
      this.currentAudio = null;
    }

    if (this.nextAudio) {
      try {
        this.nextAudio.pause();
        this.nextAudio.src = '';
      } catch { /* ok */ }
      this.nextAudio = null;
    }
  }
}
