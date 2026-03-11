import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import { Colors, TextColors, FONT } from '../utils/constants';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.getInstance();
    const hasSave = save.hasSave();

    // Dark moody background
    this.cameras.main.setBackgroundColor('#0a0a0f');

    // Title text
    const title = this.add.text(width / 2, height * 0.25, 'NANCY DREW', {
      fontFamily: FONT,
      fontSize: '64px',
      color: TextColors.gold,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.25 + 70, 'The Last Curtain Call', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    });
    subtitle.setOrigin(0.5);

    // Decorative line
    const line = this.add.rectangle(width / 2, height * 0.25 + 110, 200, 1, Colors.gold);
    line.setAlpha(0.5);

    // Continue button (if save exists)
    if (hasSave) {
      save.load();
      const chapterTitle = ChapterSystem.getInstance().getChapterTitle(save.getChapter());

      const contBtnBg = this.add.rectangle(width / 2, height * 0.55, 260, 64, Colors.sceneBg);
      contBtnBg.setStrokeStyle(2, Colors.gold);
      contBtnBg.setInteractive({ useHandCursor: true });

      const contBtnText = this.add.text(width / 2, height * 0.55, 'Continue', {
        fontFamily: FONT,
        fontSize: '22px',
        color: TextColors.gold,
      }).setOrigin(0.5);

      // Chapter info below continue
      this.add.text(width / 2, height * 0.55 + 42, chapterTitle, {
        fontFamily: FONT,
        fontSize: '13px',
        color: TextColors.goldDim,
        fontStyle: 'italic',
      }).setOrigin(0.5);

      contBtnBg.on('pointerover', () => contBtnBg.setFillStyle(Colors.hoverBg));
      contBtnBg.on('pointerout', () => contBtnBg.setFillStyle(Colors.sceneBg));
      contBtnBg.on('pointerdown', () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
          const roomId = save.getCurrentRoom() || 'lobby';
          this.scene.start('RoomScene', { roomId });
          this.scene.launch('UIScene');
        });
      });
    }

    // New Game button
    const newY = hasSave ? height * 0.7 : height * 0.6;
    const newBtnBg = this.add.rectangle(width / 2, newY, 260, 64, Colors.sceneBg);
    newBtnBg.setStrokeStyle(2, hasSave ? 0x5a5a5a : Colors.gold);
    newBtnBg.setInteractive({ useHandCursor: true });

    const newBtnText = this.add.text(width / 2, newY, hasSave ? 'New Investigation' : 'Begin Investigation', {
      fontFamily: FONT,
      fontSize: '22px',
      color: hasSave ? TextColors.goldDim : TextColors.gold,
    }).setOrigin(0.5);

    newBtnBg.on('pointerover', () => newBtnBg.setFillStyle(Colors.hoverBg));
    newBtnBg.on('pointerout', () => newBtnBg.setFillStyle(Colors.sceneBg));
    newBtnBg.on('pointerdown', () => {
      if (hasSave) {
        // Confirm before erasing save
        this.showConfirmDialog(width, height, () => {
          save.deleteSave();
          this.startNewGame();
        });
      } else {
        this.startNewGame();
      }
    });

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Credits
    this.add.text(width / 2, height - 30, 'Created by Carley Beck', {
      fontFamily: FONT,
      fontSize: '12px',
      color: TextColors.credit,
    }).setOrigin(0.5);
  }

  private startNewGame(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('RoomScene', { roomId: 'lobby' });
      this.scene.launch('UIScene');
    });
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
