import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { TitleScene } from './game/scenes/TitleScene';
import { RoomScene } from './game/scenes/RoomScene';
import { UIScene } from './game/scenes/UIScene';
import { PuzzleScene } from './game/scenes/PuzzleScene';
import { ScriptedEventScene } from './game/scenes/ScriptedEventScene';
import { SuspectScene } from './game/scenes/SuspectScene';
import { MapScene } from './game/scenes/MapScene';
import { EndingScene } from './game/scenes/EndingScene';
import { EvidenceBoardScene } from './game/scenes/EvidenceBoardScene';
import { ChapterTransitionScene } from './game/scenes/ChapterTransitionScene';
import { IntroScene } from './game/scenes/IntroScene';
import { CinematicScene } from './game/scenes/CinematicScene';
import { HotspotEditorScene } from './game/scenes/HotspotEditorScene';
import { AuthManager } from './game/systems/AuthManager';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0c1525',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 1920,
    height: 1080,
    min: {
      width: 480,
      height: 270,
    },
  },
  scene: [BootScene, TitleScene, IntroScene, CinematicScene, RoomScene, UIScene, PuzzleScene, ScriptedEventScene, SuspectScene, MapScene, EndingScene, EvidenceBoardScene, ChapterTransitionScene, HotspotEditorScene],
  input: {
    activePointers: 2,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};

const game = new Phaser.Game(config);

// Warn guest users that unsaved progress will be lost when leaving the page
window.addEventListener('beforeunload', (e) => {
  const auth = AuthManager.getInstance();

  // Only warn if: auth is available, user is NOT signed in, and a game scene is active
  if (auth.isAvailable() && !auth.isSignedIn()) {
    const activeScenes = game.scene.getScenes(true);
    const isPlaying = activeScenes.some(
      (s: Phaser.Scene) => s.scene.key === 'RoomScene' || s.scene.key === 'PuzzleScene',
    );
    if (isPlaying) {
      e.preventDefault();
    }
  }
});
