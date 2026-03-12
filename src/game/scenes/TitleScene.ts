import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import { Colors, TextColors, FONT } from '../utils/constants';
import { HAND_CURSOR, initSceneCursor } from '../utils/cursors';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.getInstance();
    const hasSave = save.hasSave();

    // ── Cover image background ──
    this.cameras.main.setBackgroundColor('#0a0a0f');
    if (this.textures.exists('cover')) {
      const cover = this.add.image(width / 2, height / 2, 'cover');
      cover.setDisplaySize(width, height);
      cover.setAlpha(0.6);
    }

    // ── Gradient overlays — dark at top and bottom, clear middle to show theater ──
    const gradient = this.add.graphics();

    // Top band: solid-to-transparent (title area)
    gradient.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0.92, 0.92, 0, 0);
    gradient.fillRect(0, 0, width, height * 0.28);

    // Bottom band: transparent-to-solid (menu area)
    gradient.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0, 0, 0.95, 0.95);
    gradient.fillRect(0, height * 0.42, width, height * 0.58);

    // Extra solid band at very bottom for menu readability
    gradient.fillStyle(0x0a0a0f, 0.85);
    gradient.fillRect(0, height * 0.72, width, height * 0.28);

    // ── Title lockup — positioned in the top band ──
    const titleCenterY = height * 0.10;

    // "A Nancy Drew Mystery" subtitle
    const subtitle = this.add.text(width / 2, titleCenterY, 'A  N A N C Y  D R E W  M Y S T E R Y', {
      fontFamily: FONT,
      fontSize: '11px',
      color: '#b8a472',
      letterSpacing: 5,
    }).setOrigin(0.5).setAlpha(0.8);

    // Decorative line
    const lineAbove = this.add.graphics();
    lineAbove.lineStyle(1, Colors.gold, 0.4);
    const lineW = subtitle.width + 40;
    lineAbove.lineBetween(width / 2 - lineW / 2, titleCenterY + 14, width / 2 + lineW / 2, titleCenterY + 14);

    // Small diamond accents at line ends
    this.drawDiamond(lineAbove, width / 2 - lineW / 2 - 4, titleCenterY + 14, 3, Colors.gold, 0.4);
    this.drawDiamond(lineAbove, width / 2 + lineW / 2 + 4, titleCenterY + 14, 3, Colors.gold, 0.4);

    // Main title — larger, with warm glow effect
    // Shadow layer (warm amber glow behind text)
    const titleShadow = this.add.text(width / 2, titleCenterY + 48, 'THE LAST\nCURTAIN CALL', {
      fontFamily: FONT,
      fontSize: '48px',
      color: '#4a3a1a',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.6);

    // Main title text
    const title = this.add.text(width / 2, titleCenterY + 48, 'THE LAST\nCURTAIN CALL', {
      fontFamily: FONT,
      fontSize: '48px',
      color: '#e8c55a',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#c9a84c',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5);

    // Subtle glow pulse
    this.tweens.add({
      targets: [title, titleShadow],
      alpha: { from: 1, to: 0.85 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Line below title
    const lineBelow = this.add.graphics();
    lineBelow.lineStyle(1, Colors.gold, 0.35);
    lineBelow.lineBetween(width / 2 - lineW / 2, titleCenterY + 96, width / 2 + lineW / 2, titleCenterY + 96);
    this.drawDiamond(lineBelow, width / 2 - lineW / 2 - 4, titleCenterY + 96, 3, Colors.gold, 0.35);
    this.drawDiamond(lineBelow, width / 2 + lineW / 2 + 4, titleCenterY + 96, 3, Colors.gold, 0.35);

    // ── Menu buttons — positioned in the bottom band ──
    const menuX = width / 2;
    const btnWidth = 260;
    const btnHeight = 46;
    const btnGap = 10;

    // Build menu items
    const menuItems: { label: string; action: () => void; primary?: boolean; subtitle?: string }[] = [];

    if (hasSave) {
      save.load();
      const chapterTitle = ChapterSystem.getInstance().getChapterTitle(save.getChapter());
      menuItems.push({
        label: 'Continue',
        subtitle: chapterTitle,
        primary: true,
        action: () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            const roomId = save.getCurrentRoom() || 'lobby';
            this.scene.start('RoomScene', { roomId });
            this.scene.launch('UIScene');
          });
        },
      });
    }

    menuItems.push({
      label: hasSave ? 'New Investigation' : 'Begin Investigation',
      primary: !hasSave,
      action: () => {
        if (hasSave) {
          this.showConfirmDialog(width, height, () => {
            save.deleteSave();
            this.startNewGame();
          });
        } else {
          this.startNewGame();
        }
      },
    });

    menuItems.push({
      label: 'How to Play',
      action: () => this.showHowToPlay(width, height),
    });

    menuItems.push({
      label: 'Settings',
      action: () => this.showSettings(width, height),
    });

    // Calculate menu position — anchor from bottom of screen, push up
    const totalMenuH = menuItems.length * (btnHeight + btnGap) - btnGap;
    const menuBottomMargin = 60; // space above credits line
    const menuStartY = height - menuBottomMargin - totalMenuH + btnHeight / 2;

    // Render menu buttons
    menuItems.forEach((item, i) => {
      const y = menuStartY + i * (btnHeight + btnGap);
      this.createMenuButton(menuX, y, btnWidth, btnHeight, item.label, item.action, item.primary, item.subtitle);
    });

    // ── Credits ──
    this.add.text(width / 2, height - 20, 'Created by Carley Beck', {
      fontFamily: FONT,
      fontSize: '10px',
      color: '#444455',
    }).setOrigin(0.5);

    // Set custom cursor
    initSceneCursor(this);

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private drawDiamond(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number, size: number,
    color: number, alpha: number,
  ): void {
    gfx.fillStyle(color, alpha);
    gfx.fillTriangle(cx, cy - size, cx + size, cy, cx, cy + size);
    gfx.fillTriangle(cx, cy - size, cx - size, cy, cx, cy + size);
  }

  private createMenuButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
    primary?: boolean, subtitle?: string,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, w, h, 0x0e0d16, primary ? 0.9 : 0.75);
    bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : 0x6a5a3a, primary ? 0.8 : 0.4);
    bg.setInteractive({ cursor: HAND_CURSOR });

    // Button label
    const text = this.add.text(0, subtitle ? -7 : 0, label, {
      fontFamily: FONT,
      fontSize: primary ? '19px' : '16px',
      color: primary ? '#e8c55a' : TextColors.light,
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Subtitle (e.g., chapter name under Continue)
    if (subtitle) {
      const sub = this.add.text(0, 12, subtitle, {
        fontFamily: FONT,
        fontSize: '10px',
        color: TextColors.goldDim,
        fontStyle: 'italic',
      }).setOrigin(0.5);
      container.add(sub);
    }

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(0x1a1a3e, 0.9);
      bg.setStrokeStyle(2, Colors.gold, 0.9);
      text.setColor('#e8c55a');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x0e0d16, primary ? 0.9 : 0.75);
      bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : 0x6a5a3a, primary ? 0.8 : 0.4);
      text.setColor(primary ? '#e8c55a' : TextColors.light);
    });

    bg.on('pointerdown', onClick);

    return container;
  }

  private startNewGame(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('IntroScene');
    });
  }

  private showHowToPlay(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.8);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 520, 340, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -140, 'How to Play', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#e8c55a',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    const helpLines = [
      'Click or tap highlighted areas to investigate.',
      'Pick up items and select them from your inventory.',
      'Use items on locked objects to progress.',
      'Talk to suspects to gather clues.',
      'Solve puzzles to unlock new areas.',
      'Check your journal (J) for clues and progress.',
      'Open the map (M) to travel between locations.',
    ];

    const helpText = this.add.text(0, -10, helpLines.join('\n\n'), {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.light,
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: 440 },
    }).setOrigin(0.5);
    container.add(helpText);

    // Close button
    const closeBg = this.add.rectangle(0, 140, 120, 44, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: HAND_CURSOR });
    const closeText = this.add.text(0, 140, 'Close', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    closeBg.on('pointerover', () => closeBg.setFillStyle(Colors.hoverBg));
    closeBg.on('pointerout', () => closeBg.setFillStyle(Colors.sceneBg, 0.9));
    closeBg.on('pointerdown', () => container.destroy());
    container.add([closeBg, closeText]);
  }

  private showSettings(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);
    const save = SaveSystem.getInstance();

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.8);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 440, 340, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -145, 'Settings', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#e8c55a',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // ── Divider under title ──
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, Colors.gold, 0.3);
    divGfx.lineBetween(-100, -120, 100, -120);
    container.add(divGfx);

    const rowY = (row: number) => -90 + row * 48;

    // ── 1. Dialogue Speed ──
    // Controls how fast dialogue text types out character by character
    {
      const label = this.add.text(-170, rowY(0), 'Dialogue Speed', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const speeds = ['slow', 'normal', 'fast'];
      const speedLabels: Record<string, string> = {
        slow: 'SLOW',
        normal: 'NORMAL',
        fast: 'FAST',
      };
      const raw = save.getFlag('setting_text_speed') || 'normal';
      let idx = speeds.indexOf(raw as string);
      if (idx === -1) idx = 1;

      const valText = this.add.text(140, rowY(0), speedLabels[speeds[idx]], {
        fontFamily: FONT, fontSize: '14px', color: TextColors.gold,
      }).setOrigin(0.5);
      container.add(valText);

      const leftArr = this.add.text(90, rowY(0), '◀', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: HAND_CURSOR });
      const rightArr = this.add.text(190, rowY(0), '▶', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: HAND_CURSOR });

      const update = (dir: number) => {
        idx = (idx + dir + speeds.length) % speeds.length;
        valText.setText(speedLabels[speeds[idx]]);
        save.setFlag('setting_text_speed', speeds[idx]);
      };
      leftArr.on('pointerdown', () => update(-1));
      rightArr.on('pointerdown', () => update(1));
      container.add([leftArr, rightArr]);
    }

    // ── 2. Clue Shimmer ──
    // When ON, undiscovered hotspots gently shimmer so the player knows where to look
    {
      const label = this.add.text(-170, rowY(1), 'Clue Shimmer', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const desc = this.add.text(-170, rowY(1) + 16, 'Highlights undiscovered clues', {
        fontFamily: FONT, fontSize: '9px', color: TextColors.mutedBlue,
      }).setOrigin(0, 0.5);
      container.add(desc);

      let on = save.getFlag('setting_highlights') !== false;
      const valText = this.add.text(140, rowY(1), on ? 'ON' : 'OFF', {
        fontFamily: FONT, fontSize: '14px', color: on ? TextColors.success : TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: HAND_CURSOR });
      container.add(valText);

      valText.on('pointerdown', () => {
        on = !on;
        valText.setText(on ? 'ON' : 'OFF');
        valText.setColor(on ? TextColors.success : TextColors.goldDim);
        save.setFlag('setting_highlights', on);
      });
    }

    // ── 3. Auto-Save ──
    // When ON, the game auto-saves when entering a new room or completing a puzzle
    {
      const label = this.add.text(-170, rowY(2), 'Auto-Save', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const desc = this.add.text(-170, rowY(2) + 16, 'Saves on room change and puzzle completion', {
        fontFamily: FONT, fontSize: '9px', color: TextColors.mutedBlue,
      }).setOrigin(0, 0.5);
      container.add(desc);

      // Default auto-save to ON
      let on = save.getFlag('setting_autosave') !== false;
      const valText = this.add.text(140, rowY(2), on ? 'ON' : 'OFF', {
        fontFamily: FONT, fontSize: '14px', color: on ? TextColors.success : TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: HAND_CURSOR });
      container.add(valText);

      valText.on('pointerdown', () => {
        on = !on;
        valText.setText(on ? 'ON' : 'OFF');
        valText.setColor(on ? TextColors.success : TextColors.goldDim);
        save.setFlag('setting_autosave', on);
      });
    }

    // ── Divider above danger zone ──
    const divGfx2 = this.add.graphics();
    divGfx2.lineStyle(1, Colors.error, 0.2);
    divGfx2.lineBetween(-150, rowY(3) - 8, 150, rowY(3) - 8);
    container.add(divGfx2);

    // ── Delete save data ──
    {
      const deleteBg = this.add.rectangle(0, rowY(3) + 10, 200, 36, 0x1a0a0a, 0.8);
      deleteBg.setStrokeStyle(1, Colors.error, 0.4);
      deleteBg.setInteractive({ cursor: HAND_CURSOR });
      const deleteText = this.add.text(0, rowY(3) + 10, 'Delete Save Data', {
        fontFamily: FONT, fontSize: '13px', color: TextColors.error,
      }).setOrigin(0.5);

      deleteBg.on('pointerover', () => deleteBg.setFillStyle(0x2a0a0a, 0.9));
      deleteBg.on('pointerout', () => deleteBg.setFillStyle(0x1a0a0a, 0.8));
      deleteBg.on('pointerdown', () => {
        container.destroy();
        this.showConfirmDialog(width, height, () => {
          save.deleteSave();
          this.scene.restart();
        });
      });
      container.add([deleteBg, deleteText]);
    }

    // ── Close button ──
    const closeBg = this.add.rectangle(0, 140, 120, 40, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: HAND_CURSOR });
    const closeText = this.add.text(0, 140, 'Close', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.gold,
    }).setOrigin(0.5);
    closeBg.on('pointerover', () => closeBg.setFillStyle(Colors.hoverBg));
    closeBg.on('pointerout', () => closeBg.setFillStyle(Colors.sceneBg, 0.9));
    closeBg.on('pointerdown', () => container.destroy());
    container.add([closeBg, closeText]);
  }

  private showConfirmDialog(width: number, height: number, onConfirm: () => void): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.7);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 400, 180, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const text = this.add.text(0, -40, 'Start a new investigation?\nYour current progress will be lost.', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.light,
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    container.add(text);

    // Confirm
    const yesBg = this.add.rectangle(-80, 40, 120, 44, Colors.danger, 0.8);
    yesBg.setStrokeStyle(1, Colors.gold, 0.5);
    yesBg.setInteractive({ cursor: HAND_CURSOR });
    const yesText = this.add.text(-80, 40, 'Yes', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.light,
    }).setOrigin(0.5);
    yesBg.on('pointerover', () => yesBg.setFillStyle(0xaa0000));
    yesBg.on('pointerout', () => yesBg.setFillStyle(Colors.danger, 0.8));
    yesBg.on('pointerdown', () => {
      container.destroy();
      onConfirm();
    });
    container.add([yesBg, yesText]);

    // Cancel
    const noBg = this.add.rectangle(80, 40, 120, 44, Colors.sceneBg, 0.8);
    noBg.setStrokeStyle(1, Colors.gold, 0.5);
    noBg.setInteractive({ cursor: HAND_CURSOR });
    const noText = this.add.text(80, 40, 'Cancel', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    noBg.on('pointerover', () => noBg.setFillStyle(Colors.hoverBg));
    noBg.on('pointerout', () => noBg.setFillStyle(Colors.sceneBg, 0.8));
    noBg.on('pointerdown', () => container.destroy());
    container.add([noBg, noText]);
  }
}
