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

    // Load real item icons (texture key matches item_icon_{id} so procedural fallback is skipped)
    const itemIcons: Record<string, string> = {
      master_key: 'master_key',
      magnifying_glass: 'magnifying_glass',
      playbill_1928: 'playbill_1928',
      effects_manual: 'stage_effects_manual',
      margaux_diary: 'diary',
      annotated_script: 'annotated_script',
      poisoned_teacup: 'teacup',
      blueprints: 'blueprint',
      basement_key: 'basement_key',
      edwins_notebook: 'eh_notebook',
      fog_machine_part: 'fog_machine_part',
      cecilia_letter: 'sealed_envelope',
      stella_records: 'clipboard',
      ashworth_files: 'briefcase',
      chemical_receipt: 'torn_receipt',
      margaux_locket: 'gold_locket',
    };
    for (const [itemId, filename] of Object.entries(itemIcons)) {
      this.load.image(`item_icon_${itemId}`, `assets/ui/items/${filename}.png`);
    }

    // Load intro cinematic background images (gracefully skipped if files don't exist)
    const introImages = [
      'intro_stage_1928', 'intro_goblet', 'intro_stage_empty',
      'intro_exterior', 'intro_lobby_dark', 'intro_ghost',
      'intro_phone', 'intro_doors',
    ];
    for (const key of introImages) {
      this.load.image(key, `assets/intro/${key}.png`);
    }

    // Load intro audio (gracefully skipped if files don't exist)
    const introAudio = [
      'ambient_theater', 'sfx_goblet', 'sfx_thud',
      'sfx_ghost_whisper', 'sfx_phone_ring', 'sfx_door_creak',
      'sfx_heartbeat', 'music_intro',
    ];
    for (const key of introAudio) {
      this.load.audio(key, [`audio/${key}.mp3`, `audio/${key}.ogg`]);
    }

    // Suppress load errors for optional intro assets (images + audio)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (file.key.startsWith('intro_') || file.key.startsWith('sfx_') ||
          file.key.startsWith('ambient_') || file.key.startsWith('music_')) {
        // Silently ignore — intro works without these assets
        return;
      }
    });
  }

  create(): void {
    // Generate procedural item icons as textures
    generateItemIcons(this);
    this.scene.start('TitleScene');
  }
}
