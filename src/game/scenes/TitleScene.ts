import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Dark moody background
    this.cameras.main.setBackgroundColor('#0a0a0f');

    // Title text
    const title = this.add.text(width / 2, height * 0.3, 'NANCY DREW', {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#c9a84c',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.3 + 70, 'Mystery at Thornwood Manor', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#8a7a5a',
      fontStyle: 'italic',
    });
    subtitle.setOrigin(0.5);

    // Decorative line
    const line = this.add.rectangle(width / 2, height * 0.3 + 110, 200, 1, 0xc9a84c);
    line.setAlpha(0.5);

    // Start button - large tap target for mobile
    const btnBg = this.add.rectangle(width / 2, height * 0.65, 260, 64, 0x1a1a2e);
    btnBg.setStrokeStyle(2, 0xc9a84c);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(width / 2, height * 0.65, 'Begin Investigation', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#c9a84c',
    });
    btnText.setOrigin(0.5);

    // Hover/tap feedback
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x2a2a4e);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x1a1a2e);
    });
    btnBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('RoomScene', { roomId: 'foyer' });
        this.scene.launch('UIScene');
      });
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
}
