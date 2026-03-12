import Phaser from 'phaser';
import { Colors, TextColors, FONT } from './constants';
import { HAND_CURSOR } from './cursors';

/**
 * Create a close button (✕) with hover highlight. Returns the text object.
 */
export function createCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClose: () => void,
  fontSize = '22px',
): Phaser.GameObjects.Text {
  const btn = scene.add.text(x, y, '✕', {
    fontFamily: FONT,
    fontSize,
    color: TextColors.goldDim,
  }).setOrigin(0.5).setInteractive({ cursor: HAND_CURSOR });

  btn.on('pointerover', () => btn.setColor(TextColors.gold));
  btn.on('pointerout', () => btn.setColor(TextColors.goldDim));
  btn.on('pointerdown', onClose);

  return btn;
}

/**
 * Create a full-screen dark overlay that blocks pointer events.
 */
export function createOverlay(
  scene: Phaser.Scene,
  alpha = 0.8,
  depth?: number,
): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.cameras.main;
  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, Colors.darkBg, alpha);
  overlay.setInteractive();
  if (depth !== undefined) overlay.setDepth(depth);
  return overlay;
}

/**
 * Create a toolbar-style button (used in UIScene bottom bar).
 */
export function createToolbarButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  accentColor: number,
  accentColorStr: string,
  onClick: () => void,
  btnWidth = 80,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, btnWidth, Sizes.minTapTarget, Colors.sceneBg, 0.9);
  bg.setStrokeStyle(1, accentColor, 0.6);
  bg.setInteractive({ cursor: HAND_CURSOR });

  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: '15px',
    color: accentColorStr,
  }).setOrigin(0.5);

  container.add([bg, text]);
  bg.on('pointerdown', onClick);

  return container;
}

// Re-export Sizes for convenience
import { Sizes } from './constants';
export { Sizes };
