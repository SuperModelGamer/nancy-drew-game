import Phaser from 'phaser';
import { Colors, TextColors, FONT } from '../utils/constants';
import { generateItemIcons } from '../utils/item-icons';
import { getAmbientAudioManifest } from '../systems/AmbientAudioSystem';

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
      fontSize: '27px',
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

    // Load title screen cover image, title graphic, and menu buttons
    this.load.image('cover', 'assets/cover.png');
    this.load.image('title_graphic', 'assets/title.png');
    this.load.image('btn_continue', 'assets/continue.png');
    this.load.image('btn_new_case', 'assets/New case.png');
    this.load.image('btn_howto', 'assets/howto.png');
    this.load.image('btn_settings', 'assets/settings.png');

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
      ui_portrait_frame: 'frame',
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

    // Load intro/cinematic audio — remap existing ambient files to SFX keys where possible
    // Files that don't exist are silently suppressed by the loaderror handler below
    const introAudio: Record<string, string[]> = {
      ambient_theater: ['assets/audio/ambient_horror.ogg'],
      sfx_ghost_whisper: ['assets/audio/ghost_whisper.wav'],
      sfx_door_creak: ['assets/audio/wood_creak.ogg'],
      // These use procedural fallbacks from UISounds but attempt file load too
      sfx_goblet: ['audio/sfx_goblet.mp3', 'audio/sfx_goblet.ogg'],
      sfx_thud: ['audio/sfx_thud.mp3', 'audio/sfx_thud.ogg'],
      sfx_phone_ring: ['audio/sfx_phone_ring.mp3', 'audio/sfx_phone_ring.ogg'],
      sfx_heartbeat: ['audio/sfx_heartbeat.mp3', 'audio/sfx_heartbeat.ogg'],
      music_intro: ['audio/music_intro.mp3', 'audio/music_intro.ogg'],
      // Cinematic-specific audio
      cine_ambient_ghost: ['assets/audio/creepy_ambient.mp3'],
    };
    for (const [key, paths] of Object.entries(introAudio)) {
      this.load.audio(key, paths);
    }

    // Load ambient audio for room soundscapes (optional — procedural fallback exists)
    for (const { key, path } of getAmbientAudioManifest()) {
      this.load.audio(key, [path]);
    }

    // Load dialogue UI assets (optional — procedural fallbacks exist)
    const dlgAssets: Record<string, string> = {
      dlg_box: 'dialogue-box',
      dlg_nameplate: 'nameplate',
      dlg_portrait_frame: '../frame',
      dlg_choice_btn: 'choice-btn',
      dlg_continue_arrow: 'continue-arrow',
    };
    for (const [key, filename] of Object.entries(dlgAssets)) {
      this.load.image(key, `assets/ui/dialogue/${filename}.png`);
    }

    // Load intro cinematic video (optional — intro degrades gracefully to slides only)
    this.load.video('intro_monarch_video', 'assets/cinematics/Monarch.mp4', true);

    // Load cinematic slide backgrounds (optional — cinematics degrade gracefully without images)
    const cinematicImages: Record<string, string> = {
      cine_ghost_fog: 'ghost-fog',
      cine_ghost_figure: 'ghost-figure',
      cine_ghost_face: 'ghost-face',
      cine_ghost_empty: 'ghost-empty-stage',
    };
    for (const [key, filename] of Object.entries(cinematicImages)) {
      this.load.image(key, `assets/cinematics/${filename}.png`);
    }

    // Suppress load errors for optional intro/cinematic assets (images + audio)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (file.key.startsWith('intro_') || file.key.startsWith('sfx_') ||
          file.key.startsWith('ambient_') || file.key.startsWith('music_') ||
          file.key.startsWith('amb_') || file.key.startsWith('cine_') ||
          file.key.startsWith('ui_') || file.key.startsWith('dlg_') ||
          file.key === 'intro_monarch_video') {
        // Silently ignore — scenes work without these assets
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
