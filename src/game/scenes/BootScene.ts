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
    // Primary: new high-quality assets from assets/items/
    const itemIconsHQ: Record<string, string> = {
      master_key: 'nicekey',
      magnifying_glass: 'mglass',
      playbill_1928: '1928page',
      effects_manual: 'stageeffects',
      margaux_diary: 'leatherbook',
      annotated_script: 'Scroll',
      poisoned_teacup: 'Teacup',
      blueprints: 'Page3',
      basement_key: 'Key',
      edwins_notebook: 'EH Book',
      fog_machine_part: 'Machine',
      cecilia_letter: 'Letter',
      stella_records: 'Clipboard',
      ashworth_files: 'Briefcase',
      chemical_receipt: 'Page',
      margaux_locket: 'Locket',
    };
    for (const [itemId, filename] of Object.entries(itemIconsHQ)) {
      this.load.image(`item_icon_${itemId}`, `assets/items/${filename}.png`);
    }

    // Load UI component images (toolbar, dossier, panels, buttons, etc.)
    const uiAssets: Record<string, string> = {
      ui_toolbar_bg: 'toolbar-bg',
      ui_toolbar_btn: 'toolbar-btn',
      ui_close_btn: 'close-btn',
      ui_dossier_bg: 'dossier-bg',
      ui_dossier_header: 'dossier-header',
      ui_tabs: 'tabs',
      ui_portrait_frame: 'portrait-frame',
      ui_info_card_bg: 'info-card-bg',
      ui_facts_panel_bg: 'facts-panel-bg',
      ui_facts_panel_bg_alt: 'facts-panel-bg-alt',
      ui_progress_fill: 'progress-fill',
      ui_progress_track: 'progress-track',
      ui_knob: 'knob',
      ui_chip_bg: 'chip-bg',
      ui_bullet_discovered: 'bullet-discovered',
      ui_bullet_undiscovered: 'bullet-undiscovered',
      ui_divider_gold: 'divider-gold',
    };
    for (const [key, filename] of Object.entries(uiAssets)) {
      this.load.image(key, `assets/ui/${filename}.png`);
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
          file.key.startsWith('ambient_') || file.key.startsWith('music_') ||
          file.key.startsWith('ui_')) {
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
