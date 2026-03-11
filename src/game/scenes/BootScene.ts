import Phaser from 'phaser';
import { Colors, TextColors, FONT } from '../utils/constants';
import { generateItemIcons } from '../utils/item-icons';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading bar
    const { width, height } = this.cameras.main;
    const barWidth = width * 0.6;
    const barHeight = 8;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    const bg = this.add.rectangle(width / 2, barY, barWidth, barHeight, 0x222233);
    bg.setOrigin(0.5);

    const bar = this.add.rectangle(barX, barY, 0, barHeight, Colors.gold);
    bar.setOrigin(0, 0.5);

    const loadingText = this.add.text(width / 2, barY - 30, 'Loading...', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TextColors.gold,
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = barWidth * value;
    });

    // Load room background images
    const rooms = ['lobby', 'auditorium', 'backstage', 'dressing_room', 'projection_booth', 'catwalk', 'basement', 'managers_office'];
    for (const room of rooms) {
      this.load.image(`bg_${room}`, `assets/backgrounds/${room}.png`);
    }

    // Load title screen cover image
    this.load.image('cover', 'assets/cover.png');

    // Load character portrait images
    const suspects = ['vivian', 'edwin', 'ashworth', 'stella', 'diego'];
    for (const suspect of suspects) {
      this.load.image(`portrait_${suspect}`, `assets/portraits/${suspect}.png`);
    }

    // Load map room medallion icons
    const mapRooms = ['lobby', 'auditorium', 'backstage', 'dressing_room', 'projection_booth', 'catwalk', 'basement', 'managers_office'];
    for (const room of mapRooms) {
      this.load.image(`map_${room}`, `assets/ui/map/${room}.png`);
    }
  }

  create(): void {
    // Generate procedural item icons as textures
    generateItemIcons(this);
    this.scene.start('TitleScene');
  }
}
