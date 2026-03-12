import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import { Colors, TextColors, FONT } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';

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

    // ── Gradient overlay — dark on the right side for title+menu, left shows theater ──
    const gradient = this.add.graphics();

    // Right-side vertical band: dark overlay for readability
    gradient.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0, 0.88, 0, 0.88);
    gradient.fillRect(width * 0.35, 0, width * 0.65, height);

    // Solid dark on far right
    gradient.fillStyle(0x0a0a0f, 0.82);
    gradient.fillRect(width * 0.55, 0, width * 0.45, height);

    // Subtle bottom strip for credits
    gradient.fillStyle(0x0a0a0f, 0.6);
    gradient.fillRect(0, height - 40, width, 40);

    // ── Title graphic — positioned right-of-center, upper area ──
    const contentX = width * 0.72; // right-of-center anchor for title + menu

    if (this.textures.exists('title_graphic')) {
      const titleImg = this.add.image(contentX, height * 0.22, 'title_graphic');
      // Scale to fit nicely — target about 420px wide
      const targetW = Math.min(630, width * 0.42);
      const scale = targetW / titleImg.width;
      titleImg.setScale(scale);

      // Subtle glow pulse
      this.tweens.add({
        targets: titleImg,
        alpha: { from: 1, to: 0.88 },
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Fallback: procedural text title if image missing
      this.add.text(contentX, height * 0.12, 'A  N A N C Y  D R E W  M Y S T E R Y', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#b8a472',
        letterSpacing: 7,
      }).setOrigin(0.5).setAlpha(0.8);

      this.add.text(contentX, height * 0.22, 'THE LAST\nCURTAIN CALL', {
        fontFamily: FONT,
        fontSize: '63px',
        color: '#e8c55a',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 9,
        shadow: { offsetX: 0, offsetY: 0, color: '#c9a84c', blur: 12, fill: true },
      }).setOrigin(0.5);
    }

    // ── Decorative line under title ──
    const decoLine = this.add.graphics();
    decoLine.lineStyle(1, Colors.gold, 0.35);
    const decoW = 420;
    const decoY = height * 0.35;
    decoLine.lineBetween(contentX - decoW / 2, decoY, contentX + decoW / 2, decoY);
    this.drawDiamond(decoLine, contentX - decoW / 2 - 4, decoY, 3, Colors.gold, 0.35);
    this.drawDiamond(decoLine, contentX + decoW / 2 + 4, decoY, 3, Colors.gold, 0.35);

    // ── Menu buttons — right-of-center, below title ──
    const menuX = contentX;
    const btnDisplayW = 510;
    const btnDisplayH = 105;
    const btnGap = 21;

    // Build menu items with texture keys
    const menuItems: { label: string; textureKey: string; action: () => void; primary?: boolean; subtitle?: string }[] = [];

    if (hasSave) {
      save.load();
      const chapterTitle = ChapterSystem.getInstance().getChapterTitle(save.getChapter());
      menuItems.push({
        label: 'Continue',
        textureKey: 'btn_continue',
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
      textureKey: 'btn_new_case',
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
      textureKey: 'btn_howto',
      action: () => this.showHowToPlay(width, height),
    });

    menuItems.push({
      label: 'Settings',
      textureKey: 'btn_settings',
      action: () => this.showSettings(width, height),
    });

    // Calculate menu position — start below the decorative line with comfortable gap
    const menuTopY = decoY + 30;
    const menuStartY = menuTopY + btnDisplayH / 2;

    // Render menu buttons with staggered fade-in
    menuItems.forEach((item, i) => {
      const y = menuStartY + i * (btnDisplayH + btnGap);
      this.createMenuButton(menuX, y, btnDisplayW, btnDisplayH, item.label, item.textureKey, item.action, item.primary, item.subtitle, i);
    });

    // ── Credits ──
    this.add.text(contentX, height - 20, 'Created by Carley Beck', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#555566',
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
    label: string, textureKey: string, onClick: () => void,
    primary?: boolean, subtitle?: string, index?: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setAlpha(0); // start invisible for staggered fade-in

    const hasTexture = this.textures.exists(textureKey);

    if (hasTexture) {
      // ── Image-based button ──
      const btnImg = this.add.image(0, 0, textureKey);
      btnImg.setDisplaySize(w, h);
      container.add(btnImg);

      // Subtitle overlay (e.g., chapter name under Continue)
      if (subtitle) {
        const sub = this.add.text(0, h / 2 + 15, subtitle, {
          fontFamily: FONT,
          fontSize: '17px',
          color: TextColors.goldDim,
          fontStyle: 'italic',
        }).setOrigin(0.5);
        container.add(sub);
      }

      // Invisible hit area covering the button image
      const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0);
      hitArea.setInteractive({ cursor: POINTER_CURSOR });
      container.add(hitArea);

      // ── Hover: golden glow + scale up ──
      hitArea.on('pointerover', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 180,
          ease: 'Back.easeOut',
        });
        btnImg.setTint(0xffeecc); // warm golden tint
      });

      // ── Hover out: spring back to normal ──
      hitArea.on('pointerout', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 250,
          ease: 'Back.easeOut',
        });
        btnImg.clearTint();
      });

      // ── Press: quick scale-down "push" + brightness flash ──
      hitArea.on('pointerdown', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 80,
          ease: 'Power2',
          yoyo: true,
          onYoyo: () => {
            btnImg.setTint(0xffffff); // bright flash
          },
          onComplete: () => {
            btnImg.clearTint();
            onClick();
          },
        });
      });
    } else {
      // ── Fallback: procedural rectangle button ──
      const bg = this.add.rectangle(0, 0, w, h, 0x0e0d16, primary ? 0.9 : 0.75);
      bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : 0x6a5a3a, primary ? 0.8 : 0.4);
      bg.setInteractive({ cursor: POINTER_CURSOR });

      const text = this.add.text(0, subtitle ? -7 : 0, label, {
        fontFamily: FONT,
        fontSize: primary ? '28px' : '24px',
        color: primary ? '#e8c55a' : TextColors.light,
      }).setOrigin(0.5);
      container.add([bg, text]);

      if (subtitle) {
        const sub = this.add.text(0, 12, subtitle, {
          fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, fontStyle: 'italic',
        }).setOrigin(0.5);
        container.add(sub);
      }

      bg.on('pointerover', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 150, ease: 'Back.easeOut' });
        bg.setFillStyle(0x1a1a3e, 0.9);
        bg.setStrokeStyle(2, Colors.gold, 0.9);
        text.setColor('#e8c55a');
      });

      bg.on('pointerout', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
        bg.setFillStyle(0x0e0d16, primary ? 0.9 : 0.75);
        bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : 0x6a5a3a, primary ? 0.8 : 0.4);
        text.setColor(primary ? '#e8c55a' : TextColors.light);
      });

      bg.on('pointerdown', () => {
        this.tweens.add({
          targets: container, scaleX: 0.95, scaleY: 0.95, duration: 80,
          ease: 'Power2', yoyo: true, onComplete: () => onClick(),
        });
      });
    }

    // ── Staggered entrance animation ──
    const delay = (index ?? 0) * 120;
    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      y: { from: y + 20, to: y },
      duration: 400,
      delay: delay + 300, // 300ms initial delay after scene loads
      ease: 'Power2',
    });

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

    const box = this.add.rectangle(0, 0, 780, 510, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -140, 'How to Play', {
      fontFamily: FONT,
      fontSize: '33px',
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
      fontSize: '21px',
      color: TextColors.light,
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: 440 },
    }).setOrigin(0.5);
    container.add(helpText);

    // Close button
    const closeBg = this.add.rectangle(0, 210, 180, 66, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: POINTER_CURSOR });
    const closeText = this.add.text(0, 210, 'Close', {
      fontFamily: FONT,
      fontSize: '24px',
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

    const box = this.add.rectangle(0, 0, 660, 510, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -217, 'Settings', {
      fontFamily: FONT,
      fontSize: '33px',
      color: '#e8c55a',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // ── Divider under title ──
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, Colors.gold, 0.3);
    divGfx.lineBetween(-150, -180, 150, -180);
    container.add(divGfx);

    const rowY = (row: number) => -135 + row * 72;

    // ── 1. Dialogue Speed ──
    // Controls how fast dialogue text types out character by character
    {
      const label = this.add.text(-255, rowY(0), 'Dialogue Speed', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.light,
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

      const valText = this.add.text(210, rowY(0), speedLabels[speeds[idx]], {
        fontFamily: FONT, fontSize: '21px', color: TextColors.gold,
      }).setOrigin(0.5);
      container.add(valText);

      const leftArr = this.add.text(135, rowY(0), '◀', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      const rightArr = this.add.text(285, rowY(0), '▶', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });

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
      const label = this.add.text(-255, rowY(1), 'Clue Shimmer', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const desc = this.add.text(-255, rowY(1) + 24, 'Highlights undiscovered clues', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
      }).setOrigin(0, 0.5);
      container.add(desc);

      let on = save.getFlag('setting_highlights') !== false;
      const valText = this.add.text(210, rowY(1), on ? 'ON' : 'OFF', {
        fontFamily: FONT, fontSize: '21px', color: on ? TextColors.success : TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
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
      const label = this.add.text(-255, rowY(2), 'Auto-Save', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const desc = this.add.text(-255, rowY(2) + 24, 'Saves on room change and puzzle completion', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
      }).setOrigin(0, 0.5);
      container.add(desc);

      // Default auto-save to ON
      let on = save.getFlag('setting_autosave') !== false;
      const valText = this.add.text(210, rowY(2), on ? 'ON' : 'OFF', {
        fontFamily: FONT, fontSize: '21px', color: on ? TextColors.success : TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
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
      const deleteBg = this.add.rectangle(0, rowY(3) + 10, 300, 54, 0x1a0a0a, 0.8);
      deleteBg.setStrokeStyle(1, Colors.error, 0.4);
      deleteBg.setInteractive({ cursor: POINTER_CURSOR });
      const deleteText = this.add.text(0, rowY(3) + 10, 'Delete Save Data', {
        fontFamily: FONT, fontSize: '20px', color: TextColors.error,
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
    const closeBg = this.add.rectangle(0, 210, 180, 60, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: POINTER_CURSOR });
    const closeText = this.add.text(0, 210, 'Close', {
      fontFamily: FONT, fontSize: '22px', color: TextColors.gold,
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

    const box = this.add.rectangle(0, 0, 600, 270, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const text = this.add.text(0, -60, 'Start a new investigation?\nYour current progress will be lost.', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.light,
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    container.add(text);

    // Confirm
    const yesBg = this.add.rectangle(-120, 60, 180, 66, Colors.danger, 0.8);
    yesBg.setStrokeStyle(1, Colors.gold, 0.5);
    yesBg.setInteractive({ cursor: POINTER_CURSOR });
    const yesText = this.add.text(-120, 60, 'Yes', {
      fontFamily: FONT,
      fontSize: '24px',
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
    const noBg = this.add.rectangle(120, 60, 180, 66, Colors.sceneBg, 0.8);
    noBg.setStrokeStyle(1, Colors.gold, 0.5);
    noBg.setInteractive({ cursor: POINTER_CURSOR });
    const noText = this.add.text(120, 60, 'Cancel', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    noBg.on('pointerover', () => noBg.setFillStyle(Colors.hoverBg));
    noBg.on('pointerout', () => noBg.setFillStyle(Colors.sceneBg, 0.8));
    noBg.on('pointerdown', () => container.destroy());
    container.add([noBg, noText]);
  }
}
