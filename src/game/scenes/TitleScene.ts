import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import { Colors, TextColors, FONT } from '../utils/constants';

export class TitleScene extends Phaser.Scene {
  private settingsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.getInstance();
    const hasSave = save.hasSave();

    // Cover image background
    this.cameras.main.setBackgroundColor('#0a0a0f');
    if (this.textures.exists('cover')) {
      const cover = this.add.image(width / 2, height / 2, 'cover');
      cover.setDisplaySize(width, height);
      cover.setAlpha(0.55);
    }

    // Dark vignette overlay for readability
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
    vignette.fillRect(0, 0, width, height * 0.15);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
    vignette.fillRect(0, height * 0.45, width, height * 0.55);

    // ── Title lockup ──
    const titleY = height * 0.18;

    // Small "A Nancy Drew Mystery" label
    this.add.text(width / 2, titleY - 10, 'A  N A N C Y  D R E W  M Y S T E R Y', {
      fontFamily: FONT,
      fontSize: '13px',
      color: TextColors.goldDim,
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Decorative line above title
    const lineTop = this.add.rectangle(width / 2, titleY + 10, 320, 1, Colors.gold);
    lineTop.setAlpha(0.4);

    // Main title
    const title = this.add.text(width / 2, titleY + 45, 'THE LAST\nCURTAIN CALL', {
      fontFamily: FONT,
      fontSize: '52px',
      color: TextColors.gold,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Subtle glow pulse on title
    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.85 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Decorative line below title
    const lineBottom = this.add.rectangle(width / 2, titleY + 105, 320, 1, Colors.gold);
    lineBottom.setAlpha(0.4);

    // ── Menu buttons ──
    const menuX = width / 2;
    const btnWidth = 280;
    const btnHeight = 50;
    const btnGap = 12;
    const menuStartY = height * 0.52;

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

    // Render menu buttons
    menuItems.forEach((item, i) => {
      const y = menuStartY + i * (btnHeight + btnGap);
      this.createMenuButton(menuX, y, btnWidth, btnHeight, item.label, item.action, item.primary, item.subtitle);
    });

    // ── Credits ──
    this.add.text(width / 2, height - 24, 'Created by Carley Beck', {
      fontFamily: FONT,
      fontSize: '11px',
      color: TextColors.credit,
    }).setOrigin(0.5);

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private createMenuButton(
    x: number, y: number, w: number, h: number,
    label: string, onClick: () => void,
    primary?: boolean, subtitle?: string,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background — semi-transparent dark panel
    const bg = this.add.rectangle(0, 0, w, h, 0x0a0a1a, primary ? 0.85 : 0.7);
    bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : Colors.goldDim, primary ? 0.8 : 0.4);
    bg.setInteractive({ useHandCursor: true });

    // Button label
    const text = this.add.text(0, subtitle ? -7 : 0, label, {
      fontFamily: FONT,
      fontSize: primary ? '20px' : '17px',
      color: primary ? TextColors.gold : TextColors.light,
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Subtitle (e.g., chapter name under Continue)
    if (subtitle) {
      const sub = this.add.text(0, 13, subtitle, {
        fontFamily: FONT,
        fontSize: '11px',
        color: TextColors.goldDim,
        fontStyle: 'italic',
      }).setOrigin(0.5);
      container.add(sub);
    }

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(0x1a1a3e, 0.9);
      bg.setStrokeStyle(2, Colors.gold, 0.9);
      text.setColor(TextColors.gold);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x0a0a1a, primary ? 0.85 : 0.7);
      bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : Colors.goldDim, primary ? 0.8 : 0.4);
      text.setColor(primary ? TextColors.gold : TextColors.light);
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
      color: TextColors.gold,
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
    closeBg.setInteractive({ useHandCursor: true });
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
    this.settingsContainer = container;

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.8);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 420, 280, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -110, 'Settings', {
      fontFamily: FONT,
      fontSize: '22px',
      color: TextColors.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // Text speed setting
    const save = SaveSystem.getInstance();
    const textSpeed = save.getFlag('setting_text_speed') || 'normal';

    this.add.text(-150, -50, 'Text Speed', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.light,
    }).setOrigin(0, 0.5);

    const speeds = ['slow', 'normal', 'fast'];
    let currentSpeed = speeds.indexOf(textSpeed as string);
    if (currentSpeed === -1) currentSpeed = 1;

    const speedLabel = this.add.text(150, -50, (speeds[currentSpeed] as string).toUpperCase(), {
      fontFamily: FONT, fontSize: '15px', color: TextColors.gold,
    }).setOrigin(1, 0.5);

    const speedLeft = this.add.text(80, -50, '◀', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const speedRight = this.add.text(170, -50, '▶', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const updateSpeed = (dir: number) => {
      currentSpeed = (currentSpeed + dir + speeds.length) % speeds.length;
      speedLabel.setText((speeds[currentSpeed] as string).toUpperCase());
      save.setFlag('setting_text_speed', speeds[currentSpeed] as string);
    };
    speedLeft.on('pointerdown', () => updateSpeed(-1));
    speedRight.on('pointerdown', () => updateSpeed(1));

    container.add([speedLabel, speedLeft, speedRight]);

    // Hotspot highlights toggle
    const highlightsOn = save.getFlag('setting_highlights') !== false;
    let hlState = highlightsOn;

    this.add.text(-150, 0, 'Hotspot Highlights', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.light,
    }).setOrigin(0, 0.5);

    const hlLabel = this.add.text(150, 0, hlState ? 'ON' : 'OFF', {
      fontFamily: FONT, fontSize: '15px', color: hlState ? TextColors.success : TextColors.goldDim,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    hlLabel.on('pointerdown', () => {
      hlState = !hlState;
      hlLabel.setText(hlState ? 'ON' : 'OFF');
      hlLabel.setColor(hlState ? TextColors.success : TextColors.goldDim);
      save.setFlag('setting_highlights', hlState);
    });

    container.add(hlLabel);

    // Delete save data
    const deleteBg = this.add.rectangle(0, 60, 200, 38, 0x1a0a0a, 0.8);
    deleteBg.setStrokeStyle(1, Colors.error, 0.4);
    deleteBg.setInteractive({ useHandCursor: true });
    const deleteText = this.add.text(0, 60, 'Delete Save Data', {
      fontFamily: FONT, fontSize: '14px', color: TextColors.error,
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

    // Close button
    const closeBg = this.add.rectangle(0, 110, 120, 44, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ useHandCursor: true });
    const closeText = this.add.text(0, 110, 'Close', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.gold,
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
    yesBg.setInteractive({ useHandCursor: true });
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
    noBg.setInteractive({ useHandCursor: true });
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
