import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';

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
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#c9a84c',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.25 + 70, 'The Last Curtain Call', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#8a7a5a',
      fontStyle: 'italic',
    });
    subtitle.setOrigin(0.5);

    // Decorative line
    const line = this.add.rectangle(width / 2, height * 0.25 + 110, 200, 1, 0xc9a84c);
    line.setAlpha(0.5);

    // Continue button (if save exists)
    if (hasSave) {
      save.load();
      const chapterTitle = ChapterSystem.getInstance().getChapterTitle(save.getChapter());

      const contBtnBg = this.add.rectangle(width / 2, height * 0.55, 260, 64, 0x1a1a2e);
      contBtnBg.setStrokeStyle(2, 0xc9a84c);
      contBtnBg.setInteractive({ useHandCursor: true });

      const contBtnText = this.add.text(width / 2, height * 0.55, 'Continue', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#c9a84c',
      }).setOrigin(0.5);

      // Chapter info below continue
      this.add.text(width / 2, height * 0.55 + 42, chapterTitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#8a7a5a',
        fontStyle: 'italic',
      }).setOrigin(0.5);

      contBtnBg.on('pointerover', () => contBtnBg.setFillStyle(0x2a2a4e));
      contBtnBg.on('pointerout', () => contBtnBg.setFillStyle(0x1a1a2e));
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
    const newBtnBg = this.add.rectangle(width / 2, newY, 260, 64, 0x1a1a2e);
    newBtnBg.setStrokeStyle(2, hasSave ? 0x5a5a5a : 0xc9a84c);
    newBtnBg.setInteractive({ useHandCursor: true });

    const newBtnText = this.add.text(width / 2, newY, hasSave ? 'New Investigation' : 'Begin Investigation', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: hasSave ? '#8a7a5a' : '#c9a84c',
    }).setOrigin(0.5);

    newBtnBg.on('pointerover', () => newBtnBg.setFillStyle(0x2a2a4e));
    newBtnBg.on('pointerout', () => newBtnBg.setFillStyle(0x1a1a2e));
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
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#555566',
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

    const dimmer = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 400, 180, 0x0a0a1a, 0.97);
    box.setStrokeStyle(2, 0xc9a84c, 0.7);
    container.add(box);

    const text = this.add.text(0, -40, 'Start a new investigation?\nYour current progress will be lost.', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e0d5c0',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    container.add(text);

    // Confirm
    const yesBg = this.add.rectangle(-80, 40, 120, 44, 0x8b0000, 0.8);
    yesBg.setStrokeStyle(1, 0xc9a84c, 0.5);
    yesBg.setInteractive({ useHandCursor: true });
    const yesText = this.add.text(-80, 40, 'Yes', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e0d5c0',
    }).setOrigin(0.5);
    yesBg.on('pointerover', () => yesBg.setFillStyle(0xaa0000));
    yesBg.on('pointerout', () => yesBg.setFillStyle(0x8b0000, 0.8));
    yesBg.on('pointerdown', () => {
      container.destroy();
      onConfirm();
    });
    container.add([yesBg, yesText]);

    // Cancel
    const noBg = this.add.rectangle(80, 40, 120, 44, 0x1a1a2e, 0.8);
    noBg.setStrokeStyle(1, 0xc9a84c, 0.5);
    noBg.setInteractive({ useHandCursor: true });
    const noText = this.add.text(80, 40, 'Cancel', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#c9a84c',
    }).setOrigin(0.5);
    noBg.on('pointerover', () => noBg.setFillStyle(0x2a2a4e));
    noBg.on('pointerout', () => noBg.setFillStyle(0x1a1a2e, 0.8));
    noBg.on('pointerdown', () => container.destroy());
    container.add([noBg, noText]);
  }
}
