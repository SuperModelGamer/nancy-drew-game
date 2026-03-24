/**
 * MusicSystem — Background music player using real audio tracks.
 *
 * Uses royalty-free music files (Mixkit License) loaded as HTML5 Audio.
 * Each track is a professionally produced piece mapped to a game mood.
 * Supports crossfading between tracks, volume control, and looping.
 *
 * Track sources (all Mixkit Stock Music Free License):
 *  - lobby_elegant: "Wedding 01" by Francisco Alvear
 *  - elegant_classical: "Cristales" by Eugenio Mininni
 *  - exploration_dreamy: "Forest Mist Whispers" by Alejandro Magaña
 *  - investigation_suspense: "Echoes" by Andrew Ev
 *  - noir_tension: "Fallen (Asper)" by Eugenio Mininni
 *  - eerie_ghost: "Spirit in the Woods" by Alejandro Magaña
 *  - calm_thinking: "Opalescent" by Eugenio Mininni
 *  - discovery_emotional: "Charlotte" by Eugenio Mininni
 *  - valley_sunset: "Valley Sunset" by Alejandro Magaña
 *  - gentle_piano: "Zanarkand Forest" by Alejandro Magaña
 */

import { UISounds } from '../utils/sounds';

// ─── Track Definitions ──────────────────────────────────────────────────────

export interface MusicTrackDef {
  id: string;
  name: string;
  description: string;
  /** Path to the audio file (relative to public/) */
  file: string;
}

export const MUSIC_TRACKS: MusicTrackDef[] = [
  {
    id: 'lobby_elegant',
    name: 'Grand Lobby',
    description: 'Warm and elegant — perfect for the theater lobby',
    file: '/music/lobby_elegant.mp3',
  },
  {
    id: 'elegant_classical',
    name: 'Chandelier Dreams',
    description: 'Classical elegance with sweeping strings',
    file: '/music/elegant_classical.mp3',
  },
  {
    id: 'exploration_dreamy',
    name: 'Whispered Clues',
    description: 'Dreamy and curious — for exploring new rooms',
    file: '/music/exploration_dreamy.mp3',
  },
  {
    id: 'investigation_suspense',
    name: 'The Investigation',
    description: 'Atmospheric tension — gathering evidence',
    file: '/music/investigation_suspense.mp3',
  },
  {
    id: 'noir_tension',
    name: 'Velvet Curtain',
    description: 'Dark noir atmosphere — something is not right',
    file: '/music/noir_tension.mp3',
  },
  {
    id: 'eerie_ghost',
    name: 'The Empty Stage',
    description: 'Mysterious and eerie — ghostly encounters',
    file: '/music/eerie_ghost.mp3',
  },
  {
    id: 'calm_thinking',
    name: 'The Study',
    description: 'Contemplative ambient — solving puzzles',
    file: '/music/calm_thinking.mp3',
  },
  {
    id: 'discovery_emotional',
    name: 'Crimson Veil',
    description: 'Emotional and moving — uncovering the truth',
    file: '/music/discovery_emotional.mp3',
  },
  {
    id: 'valley_sunset',
    name: 'Midnight Theatre',
    description: 'Mysterious warmth — the theater at night',
    file: '/music/valley_sunset.mp3',
  },
  {
    id: 'gentle_piano',
    name: 'Gaslight',
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

    if (fade) {
      await this.fadeOut(this.currentAudio, 1.5);
    }

    this.cleanup();
  }

  /** Update volume in real-time. */
  updateVolume(): void {
    this.targetVolume = UISounds.getMusicVolume() * UISounds.getVolume();
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, this.targetVolume));
    }
  }

  isPlaying(): boolean { return this.playing; }
  getCurrentTrack(): MusicTrackDef | null { return this.currentTrack; }

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
    const increment = this.targetVolume / steps;
    let step = 0;

    const timer = window.setInterval(() => {
      step++;
      if (step >= steps || audio.paused) {
        audio.volume = Math.max(0, Math.min(1, this.targetVolume));
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
