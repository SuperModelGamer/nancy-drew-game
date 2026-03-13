import Phaser from 'phaser';
import { Colors, TextColors, FONT } from './constants';
import { POINTER_CURSOR } from './cursors';

/**
 * Create a close button with the ui_close_btn image asset (or text fallback).
 * Large, interactive with glow effect on hover and press animation.
 * Uses pointer cursor (not hand) since it's a close/dismiss action.
 */
export function createCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClose: () => void,
  size = 120,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  if (scene.textures.exists('ui_close_btn')) {
    // Image-based close button
    const btn = scene.add.image(0, 0, 'ui_close_btn');
    btn.setDisplaySize(size, size);
    container.add(btn);

    // Compute base scale once to avoid compounding on rapid hover
    const baseScale = size / btn.width;

    // Gold glow ring (empty at rest, drawn on hover)
    const glow = scene.add.graphics();
    glow.setAlpha(0);
    container.add(glow);

    // Hit area
    const hitArea = scene.add.circle(0, 0, size / 2 + 6, 0x000000, 0);
    hitArea.setInteractive({ cursor: POINTER_CURSOR });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      scene.tweens.add({
        targets: btn,
        scaleX: baseScale * 1.12,
        scaleY: baseScale * 1.12,
        duration: 150,
        ease: 'Back.easeOut',
      });
      btn.setTint(0xffeecc);
      // Show glow
      glow.clear();
      glow.lineStyle(3, Colors.gold, 0.5);
      glow.strokeCircle(0, 0, size / 2 + 4);
      glow.setAlpha(1);
      scene.tweens.add({
        targets: glow,
        alpha: 1,
        duration: 150,
      });
    });

    hitArea.on('pointerout', () => {
      scene.tweens.add({
        targets: btn,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 200,
        ease: 'Back.easeOut',
      });
      btn.clearTint();
      scene.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 150,
      });
    });

    hitArea.on('pointerdown', () => {
      scene.tweens.add({
        targets: btn,
        scaleX: baseScale * 0.9,
        scaleY: baseScale * 0.9,
        duration: 60,
        yoyo: true,
        ease: 'Power2',
        onComplete: () => onClose(),
      });
      btn.setTint(0xffffff);
    });
  } else {
    // Text fallback — larger and with glow
    const btn = scene.add.text(0, 0, '✕', {
      fontFamily: FONT,
      fontSize: `${Math.round(size * 0.6)}px`,
      color: TextColors.goldDim,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(btn);

    btn.on('pointerover', () => {
      btn.setColor(TextColors.gold);
      btn.setShadow(0, 0, '#d4af37', 8, true, true);
      scene.tweens.add({
        targets: btn,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 150,
        ease: 'Back.easeOut',
      });
    });

    btn.on('pointerout', () => {
      btn.setColor(TextColors.goldDim);
      btn.setShadow(0, 0, '#000000', 4, true, false);
      scene.tweens.add({
        targets: btn,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    });

    btn.on('pointerdown', () => {
      scene.tweens.add({
        targets: btn,
        scaleX: 0.85,
        scaleY: 0.85,
        duration: 60,
        yoyo: true,
        ease: 'Power2',
        onComplete: () => onClose(),
      });
      btn.setColor('#ffffff');
    });
  }

  return container;
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
  btnWidth = 120,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, btnWidth, Sizes.minTapTarget, Colors.sceneBg, 0.9);
  bg.setStrokeStyle(1, accentColor, 0.6);
  bg.setInteractive({ cursor: POINTER_CURSOR });

  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: '22px',
    color: accentColorStr,
  }).setOrigin(0.5);

  container.add([bg, text]);
  bg.on('pointerdown', onClick);

  return container;
}

// Re-export Sizes for convenience
import { Sizes } from './constants';
export { Sizes };
