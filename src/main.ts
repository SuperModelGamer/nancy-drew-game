import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { TitleScene } from './game/scenes/TitleScene';
import { RoomScene } from './game/scenes/RoomScene';
import { UIScene } from './game/scenes/UIScene';
import { PuzzleScene } from './game/scenes/PuzzleScene';
import { ScriptedEventScene } from './game/scenes/ScriptedEventScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    min: {
      width: 320,
      height: 180,
    },
  },
  scene: [BootScene, TitleScene, RoomScene, UIScene, PuzzleScene, ScriptedEventScene],
  input: {
    activePointers: 2,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};

new Phaser.Game(config);
