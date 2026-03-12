import Phaser from 'phaser';
import { Colors, TextColors, FONT, Depths } from './constants';
import { HAND_CURSOR } from './cursors';
import { SaveSystem } from '../systems/SaveSystem';

const TUTORIAL_FLAG = 'tutorial_seen';

/**
 * Shows a brief how-to-play overlay on first room entry.
 * Only shows once, then sets a flag in SaveSystem.
 */
export function showTutorialIfNeeded(scene: Phaser.Scene): void {
  const save = SaveSystem.getInstance();
  if (save.getFlag(TUTORIAL_FLAG)) return;

  save.setFlag(TUTORIAL_FLAG, true);

  const { width, height } = scene.cameras.main;
  const container = scene.add.container(0, 0);
  container.setDepth(Depths.puzzleOverlay + 50); // Above everything

  // Semi-transparent overlay
  const dimmer = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
  dimmer.setInteractive();
  container.add(dimmer);

  // Panel
  const panelW = 520;
  const panelH = 420;
  const panel = scene.add.rectangle(width / 2, height / 2, panelW, panelH, Colors.panelBg, 0.97);
  panel.setStrokeStyle(2, Colors.gold, 0.5);
  container.add(panel);

  // Title
  const title = scene.add.text(width / 2, height / 2 - panelH / 2 + 30, 'How to Investigate', {
    fontFamily: FONT,
    fontSize: '22px',
    color: TextColors.gold,
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(title);

  // Decorative line
  const line = scene.add.rectangle(width / 2, height / 2 - panelH / 2 + 55, 200, 1, Colors.gold);
  line.setAlpha(0.3);
  container.add(line);

  // Tutorial items
  const tips = [
    { icon: '🔍', text: 'Click glowing hotspots to examine objects and discover clues' },
    { icon: '🗣️', text: 'Talk to suspects — their stories hold contradictions' },
    { icon: '🎒', text: 'Open Items to view and select evidence from your inventory' },
    { icon: '🗺️', text: 'Use the Map to travel between rooms in the theater' },
    { icon: '📓', text: 'Check the Journal to review what you\'ve discovered' },
    { icon: '🧩', text: 'Solve puzzles by combining clues from different sources' },
    { icon: '💡', text: 'Select an item, then click a hotspot to use it there' },
  ];

  const startY = height / 2 - panelH / 2 + 80;
  tips.forEach((tip, i) => {
    const y = startY + i * 40;

    const icon = scene.add.text(width / 2 - panelW / 2 + 40, y, tip.icon, {
      fontSize: '18px',
    }).setOrigin(0, 0);
    container.add(icon);

    const text = scene.add.text(width / 2 - panelW / 2 + 75, y + 2, tip.text, {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.light,
      wordWrap: { width: panelW - 100 },
    }).setOrigin(0, 0);
    container.add(text);
  });

  // Dismiss button
  const btnY = height / 2 + panelH / 2 - 45;
  const btnBg = scene.add.rectangle(width / 2, btnY, 200, 44, Colors.sceneBg);
  btnBg.setStrokeStyle(2, Colors.gold, 0.6);
  btnBg.setInteractive({ cursor: HAND_CURSOR });
  container.add(btnBg);

  const btnText = scene.add.text(width / 2, btnY, 'Begin Investigation', {
    fontFamily: FONT,
    fontSize: '16px',
    color: TextColors.gold,
  }).setOrigin(0.5);
  container.add(btnText);

  btnBg.on('pointerover', () => btnBg.setFillStyle(Colors.hoverBg));
  btnBg.on('pointerout', () => btnBg.setFillStyle(Colors.sceneBg));
  btnBg.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 400,
      onComplete: () => container.destroy(),
    });
  });

  // Also allow clicking anywhere outside to dismiss
  dimmer.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 400,
      onComplete: () => container.destroy(),
    });
  });

  // Fade in
  container.setAlpha(0);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 500,
    delay: 500, // Let the room load first
  });
}
