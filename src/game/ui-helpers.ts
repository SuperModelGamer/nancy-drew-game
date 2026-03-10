import Phaser from 'phaser';
import { Colors, TextColors, FONT, Depths } from './constants';

/**
 * Creates a standard close button (✕) with hover effects.
 */
export function createCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClose: () => void,
): Phaser.GameObjects.Text {
  const btn = scene.add.text(x, y, '✕', {
    fontFamily: FONT,
    fontSize: '24px',
    color: TextColors.dim,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  btn.on('pointerdown', onClose);
  btn.on('pointerover', () => btn.setColor(TextColors.gold));
  btn.on('pointerout', () => btn.setColor(TextColors.dim));
  return btn;
}

/**
 * Creates a full-screen dark overlay that blocks clicks through.
 */
export function createOverlay(
  scene: Phaser.Scene,
  alpha = 0.8,
  depth = Depths.puzzleOverlay,
): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.cameras.main;
  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, Colors.black, alpha);
  overlay.setInteractive();
  overlay.setDepth(depth);
  return overlay;
}

/**
 * Creates a standard toolbar button (Items, Journal, Suspects, Map style).
 */
export function createToolbarButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: number,
  textColor: string,
  onClick: () => void,
  width = 80,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, 48, Colors.navy, 0.9);
  bg.setStrokeStyle(1, color, 0.6);
  bg.setInteractive({ useHandCursor: true });
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: '15px',
    color: textColor,
  }).setOrigin(0.5);
  container.add([bg, text]);
  bg.on('pointerdown', onClick);
  return container;
}
