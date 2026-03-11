import Phaser from 'phaser';

// Hand-drawn-style item icons rendered as Phaser textures
// Uses gold (#c9a84c) on dark background to match 1920s aesthetic

const ICON_SIZE = 48;
const GOLD = 0xc9a84c;
const CREAM = 0xe0d5c0;
const DARK = 0x1a1a2e;

type DrawFn = (g: Phaser.GameObjects.Graphics) => void;

const iconDrawers: Record<string, DrawFn> = {
  master_key: (g) => {
    // Ornate key
    g.lineStyle(2.5, GOLD, 1);
    g.strokeCircle(16, 14, 7);
    g.strokeCircle(16, 14, 3);
    g.lineBetween(16, 21, 16, 38);
    g.lineBetween(16, 30, 22, 30);
    g.lineBetween(16, 35, 20, 35);
  },

  magnifying_glass: (g) => {
    g.lineStyle(2.5, GOLD, 1);
    g.strokeCircle(20, 18, 10);
    g.fillStyle(GOLD, 0.1);
    g.fillCircle(20, 18, 10);
    g.lineStyle(3, GOLD, 1);
    g.lineBetween(27, 25, 38, 36);
  },

  playbill_1928: (g) => {
    // Theater masks
    g.lineStyle(2, GOLD, 1);
    // Happy mask
    g.strokeCircle(16, 20, 9);
    g.beginPath();
    g.arc(16, 22, 5, 0.2, Math.PI - 0.2, false);
    g.strokePath();
    g.fillStyle(GOLD, 1);
    g.fillCircle(13, 17, 1.5);
    g.fillCircle(19, 17, 1.5);
    // Sad mask (overlapping)
    g.lineStyle(2, CREAM, 0.6);
    g.strokeCircle(30, 22, 9);
    g.beginPath();
    g.arc(30, 28, 5, Math.PI + 0.2, -0.2, false);
    g.strokePath();
    g.fillStyle(CREAM, 0.6);
    g.fillCircle(27, 19, 1.5);
    g.fillCircle(33, 19, 1.5);
  },

  effects_manual: (g) => {
    // Open book
    g.lineStyle(2, GOLD, 1);
    g.strokeRect(6, 10, 16, 26);
    g.strokeRect(22, 10, 16, 26);
    g.lineBetween(22, 10, 22, 36);
    // Page lines
    g.lineStyle(1, GOLD, 0.4);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(9, 17 + i * 5, 19, 17 + i * 5);
      g.lineBetween(25, 17 + i * 5, 35, 17 + i * 5);
    }
  },

  margaux_diary: (g) => {
    // Leather diary with clasp
    g.fillStyle(GOLD, 0.15);
    g.fillRoundedRect(10, 8, 24, 30, 3);
    g.lineStyle(2, GOLD, 1);
    g.strokeRoundedRect(10, 8, 24, 30, 3);
    // Spine
    g.lineStyle(2.5, GOLD, 0.8);
    g.lineBetween(10, 8, 10, 38);
    // M.F. initials
    g.lineStyle(1.5, CREAM, 0.7);
    g.lineBetween(17, 20, 19, 26);
    g.lineBetween(19, 26, 21, 20);
    g.lineBetween(21, 20, 23, 26);
    g.lineBetween(23, 20, 23, 26);
    g.lineBetween(26, 20, 26, 26);
    g.lineBetween(26, 20, 29, 20);
    g.lineBetween(26, 23, 28, 23);
  },

  annotated_script: (g) => {
    // Scroll/script
    g.lineStyle(2, GOLD, 1);
    g.beginPath();
    g.arc(12, 12, 4, Math.PI * 0.5, Math.PI * 1.5, false);
    g.strokePath();
    g.strokeRect(12, 8, 22, 28);
    g.beginPath();
    g.arc(34, 36, 4, -Math.PI * 0.5, Math.PI * 0.5, false);
    g.strokePath();
    // Text lines
    g.lineStyle(1, GOLD, 0.4);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(16, 15 + i * 6, 30, 15 + i * 6);
    }
    // Red annotation mark
    g.lineStyle(1.5, 0xcc4444, 0.8);
    g.strokeCircle(27, 15, 3);
  },

  poisoned_teacup: (g) => {
    // Teacup
    g.lineStyle(2, GOLD, 1);
    g.beginPath();
    g.arc(22, 28, 12, Math.PI, 0, false);
    g.strokePath();
    g.lineBetween(10, 28, 34, 28);
    // Saucer
    g.beginPath();
    g.arc(22, 34, 15, Math.PI + 0.3, -0.3, false);
    g.strokePath();
    // Handle
    g.beginPath();
    g.arc(35, 24, 5, -Math.PI * 0.4, Math.PI * 0.4, false);
    g.strokePath();
    // Steam wisps
    g.lineStyle(1, GOLD, 0.3);
    g.beginPath();
    g.arc(18, 14, 3, 0, Math.PI, true);
    g.strokePath();
    g.beginPath();
    g.arc(26, 12, 3, 0, Math.PI, true);
    g.strokePath();
  },

  blueprints: (g) => {
    // Rolled blueprint
    g.fillStyle(GOLD, 0.1);
    g.fillRoundedRect(8, 10, 28, 26, 2);
    g.lineStyle(2, GOLD, 1);
    g.strokeRoundedRect(8, 10, 28, 26, 2);
    // Grid lines
    g.lineStyle(1, GOLD, 0.3);
    for (let i = 1; i < 4; i++) {
      g.lineBetween(8 + i * 7, 10, 8 + i * 7, 36);
      g.lineBetween(8, 10 + i * 6.5, 36, 10 + i * 6.5);
    }
    // Room outline
    g.lineStyle(1.5, CREAM, 0.6);
    g.strokeRect(14, 15, 10, 8);
    g.lineBetween(14, 26, 28, 26);
    g.lineBetween(14, 26, 14, 32);
  },

  basement_key: (g) => {
    // Heavy iron key
    g.lineStyle(3, GOLD, 0.8);
    g.strokeCircle(16, 14, 8);
    g.fillStyle(DARK, 1);
    g.fillCircle(16, 14, 4);
    g.lineStyle(3, GOLD, 0.8);
    g.lineBetween(16, 22, 16, 40);
    g.lineBetween(16, 32, 24, 32);
    g.lineBetween(16, 37, 22, 37);
  },

  edwins_notebook: (g) => {
    // Notebook with spiral
    g.fillStyle(GOLD, 0.12);
    g.fillRoundedRect(12, 6, 22, 32, 2);
    g.lineStyle(2, GOLD, 1);
    g.strokeRoundedRect(12, 6, 22, 32, 2);
    // Spiral binding
    for (let i = 0; i < 5; i++) {
      g.lineStyle(1.5, GOLD, 0.6);
      g.strokeCircle(12, 11 + i * 6, 2.5);
    }
    // "E.H." text
    g.lineStyle(1.5, CREAM, 0.6);
    g.lineBetween(18, 18, 18, 24);
    g.lineBetween(18, 18, 22, 18);
    g.lineBetween(18, 21, 21, 21);
    g.lineBetween(25, 18, 25, 24);
    g.lineBetween(25, 21, 29, 21);
    g.lineBetween(29, 18, 29, 24);
  },

  fog_machine_part: (g) => {
    // Remote control
    g.fillStyle(GOLD, 0.15);
    g.fillRoundedRect(14, 6, 18, 34, 4);
    g.lineStyle(2, GOLD, 1);
    g.strokeRoundedRect(14, 6, 18, 34, 4);
    // Buttons
    g.fillStyle(GOLD, 0.5);
    g.fillCircle(23, 16, 4);
    g.fillStyle(GOLD, 0.3);
    g.fillCircle(19, 26, 2.5);
    g.fillCircle(27, 26, 2.5);
    g.fillCircle(19, 33, 2.5);
    g.fillCircle(27, 33, 2.5);
    // Antenna
    g.lineStyle(1.5, GOLD, 0.7);
    g.lineBetween(28, 6, 32, 0);
  },

  cecilia_letter: (g) => {
    // Envelope
    g.fillStyle(GOLD, 0.1);
    g.fillRect(6, 12, 32, 22);
    g.lineStyle(2, GOLD, 1);
    g.strokeRect(6, 12, 32, 22);
    // Envelope flap
    g.lineBetween(6, 12, 22, 24);
    g.lineBetween(38, 12, 22, 24);
    // Wax seal
    g.fillStyle(0xcc4444, 0.6);
    g.fillCircle(22, 28, 4);
    g.lineStyle(1, 0xcc4444, 0.8);
    g.strokeCircle(22, 28, 4);
  },

  margaux_locket: (g) => {
    // Heart-shaped locket
    g.lineStyle(2.5, GOLD, 1);
    g.beginPath();
    g.arc(17, 18, 7, Math.PI, 0, false);
    g.strokePath();
    g.beginPath();
    g.arc(29, 18, 7, Math.PI, 0, false);
    g.strokePath();
    g.lineBetween(10, 18, 23, 34);
    g.lineBetween(36, 18, 23, 34);
    // Chain
    g.lineStyle(1, GOLD, 0.5);
    g.beginPath();
    g.arc(23, 8, 10, Math.PI + 0.3, -0.3, false);
    g.strokePath();
  },

  stella_records: (g) => {
    // Clipboard
    g.fillStyle(GOLD, 0.1);
    g.fillRoundedRect(10, 10, 24, 30, 2);
    g.lineStyle(2, GOLD, 1);
    g.strokeRoundedRect(10, 10, 24, 30, 2);
    // Clip
    g.fillStyle(GOLD, 0.5);
    g.fillRect(17, 6, 10, 8);
    g.lineStyle(2, GOLD, 1);
    g.strokeRect(17, 6, 10, 8);
    // Lines
    g.lineStyle(1, GOLD, 0.4);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(14, 20 + i * 5, 30, 20 + i * 5);
    }
  },

  ashworth_files: (g) => {
    // Briefcase
    g.fillStyle(GOLD, 0.12);
    g.fillRoundedRect(6, 16, 32, 20, 3);
    g.lineStyle(2, GOLD, 1);
    g.strokeRoundedRect(6, 16, 32, 20, 3);
    // Handle
    g.lineStyle(2.5, GOLD, 0.8);
    g.beginPath();
    g.arc(22, 16, 6, Math.PI, 0, false);
    g.strokePath();
    // Clasp
    g.fillStyle(GOLD, 0.6);
    g.fillRect(19, 24, 6, 4);
    g.lineStyle(1, GOLD, 1);
    g.strokeRect(19, 24, 6, 4);
  },

  chemical_receipt: (g) => {
    // Receipt paper
    g.fillStyle(CREAM, 0.15);
    g.fillRect(12, 6, 20, 34);
    g.lineStyle(2, GOLD, 0.8);
    g.strokeRect(12, 6, 20, 34);
    // Torn bottom edge
    g.lineStyle(2, GOLD, 0.8);
    g.beginPath();
    g.moveTo(12, 40);
    for (let i = 0; i < 5; i++) {
      g.lineTo(14 + i * 4, i % 2 === 0 ? 38 : 40);
    }
    g.strokePath();
    // Dollar sign
    g.lineStyle(1.5, GOLD, 0.5);
    g.beginPath();
    g.arc(22, 20, 4, -0.5, Math.PI + 0.5, false);
    g.strokePath();
    g.beginPath();
    g.arc(22, 24, 4, Math.PI - 0.5, 0.5, false);
    g.strokePath();
    g.lineBetween(22, 14, 22, 30);
  },
};

export function generateItemIcons(scene: Phaser.Scene): void {
  for (const [itemId, draw] of Object.entries(iconDrawers)) {
    const key = `item_icon_${itemId}`;
    if (scene.textures.exists(key)) continue;

    const rt = scene.add.renderTexture(0, 0, ICON_SIZE, ICON_SIZE);
    rt.setVisible(false);

    const g = scene.add.graphics();
    draw(g);
    rt.draw(g, 0, 0);
    rt.saveTexture(key);

    g.destroy();
    rt.destroy();
  }
}
