/**
 * Shared scene transition utilities — curtain close, etc.
 */

import { Colors, Depths } from './constants';

/**
 * Theatrical crimson curtain close animation.
 * Used across RoomScene, MapScene, IntroScene, and CinematicScene.
 */
export function playCurtainClose(scene: Phaser.Scene, onComplete: () => void): void {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const curtainColor = 0x4a0a0a;

  const left = scene.add.rectangle(-width / 4, height / 2, width / 2, height, curtainColor, 1);
  const right = scene.add.rectangle(width + width / 4, height / 2, width / 2, height, curtainColor, 1);
  left.setDepth(Depths.scriptedEvent + 10);
  right.setDepth(Depths.scriptedEvent + 10);

  const fringeL = scene.add.rectangle(-width / 4 + width / 4, height / 2, 3, height, Colors.gold, 0.6);
  const fringeR = scene.add.rectangle(width + width / 4 - width / 4, height / 2, 3, height, Colors.gold, 0.6);
  fringeL.setDepth(Depths.scriptedEvent + 11);
  fringeR.setDepth(Depths.scriptedEvent + 11);

  scene.tweens.add({
    targets: [left, fringeL],
    x: `+=${width / 4}`,
    duration: 500,
    ease: 'Power2',
  });
  scene.tweens.add({
    targets: [right, fringeR],
    x: `-=${width / 4}`,
    duration: 500,
    ease: 'Power2',
    onComplete: () => onComplete(),
  });
}
