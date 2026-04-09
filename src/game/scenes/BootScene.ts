import Phaser from 'phaser';
import { Colors, TextColors, FONT } from '../utils/constants';
import { generateItemIcons } from '../utils/item-icons';
// Ambient audio loading disabled
import { preloadSFX } from '../utils/sounds';

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

    // Load alternate room backgrounds (state-dependent variants)
    // Each room can have multiple perspectives/states triggered by story progression.
    // Format: bg_{roomId}_{variant} → assets/backgrounds/{roomId}_{variant}.png
    const altBackgrounds: Record<string, string[]> = {
      managers_office: ['empty'],
      lobby: ['night', 'after_ghost', 'vivian_gone'],
      auditorium: ['ghost_aftermath', 'lights_on', 'empty_stage'],
      backstage: ['ransacked', 'fog_active', 'stella_gone'],
      dressing_room: ['trunk_open', 'mirror_revealed', 'passage_found'],
      projection_booth: ['diego_working', 'film_scattered'],
      catwalk: ['lights_active', 'notebook_found'],
      basement: ['discovered', 'edwin_caught', 'passage_open'],
    };
    for (const [room, variants] of Object.entries(altBackgrounds)) {
      for (const variant of variants) {
        this.load.image(`bg_${room}_${variant}`, `assets/backgrounds/${room}_${variant}.png`);
      }
    }

    // Load puzzle illustration backgrounds (shown behind puzzle modals)
    // Format: puzzle_{puzzleId} → assets/puzzles/{puzzleId}.png
    const puzzleIds = [
      'trunk_puzzle', 'script_cipher', 'lighting_sequence', 'evidence_board',
      'mirror_puzzle', 'film_puzzle', 'lockbox_puzzle', 'office_safe_puzzle',
      'passage_navigation', 'tea_analysis',
    ];
    for (const id of puzzleIds) {
      this.load.image(`puzzle_${id}`, `assets/puzzles/${id}.png`);
    }

    // Load clue investigation close-up images (shown alongside inspect descriptions)
    // Format: clue_{hotspotId} → assets/clues/{hotspotId}.png
    const clueImages = [
      'lobby_chandelier', 'lobby_ticket_booth', 'lobby_playbills',
      'aud_stage', 'aud_curtain', 'aud_seats',
      'bs_fog_machine', 'bs_rigging', 'bs_costume_rack',
      'dr_vanity', 'dr_mirror', 'dr_trunk', 'dr_flowers',
      'pb_projector', 'pb_film', 'pb_scratches',
      'mo_desk', 'mo_blueprints', 'mo_teacup', 'mo_safe',
      'cw_lights', 'cw_railing', 'cw_notebook',
      'bm_trapdoor', 'bm_fog_controls', 'bm_costume', 'bm_passage',
    ];
    for (const id of clueImages) {
      this.load.image(`clue_${id}`, `assets/clues/${id}.png`);
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

    // Load expression variants for dialogue portraits
    const expressions: Record<string, string[]> = {
      ashworth: ['annoyed', 'angry', 'shocked', 'suspicious'],
      vivian: ['sad', 'warm', 'worried', 'happy'],
      edwin: ['thoughtful', 'passionate', 'worried', 'defensive'],
    };
    for (const [char, exprs] of Object.entries(expressions)) {
      for (const expr of exprs) {
        this.load.image(`portrait_${char}_${expr}`, `assets/portraits/${char}-${expr}.png`);
      }
    }

    // Load map room medallion icons
    const mapRooms = ['lobby', 'auditorium', 'backstage', 'dressing_room', 'projection_booth', 'catwalk', 'basement', 'managers_office'];
    for (const room of mapRooms) {
      this.load.image(`map_${room}`, `assets/ui/map/${room}.png`);
    }

    // Load real item icons (texture key matches item_icon_{id} so procedural fallback is skipped)
    // Primary: new high-quality assets from assets/items/
    const itemIconsHQ: Record<string, string> = {
      master_key: 'master-key',
      magnifying_glass: 'magnifying-glass',
      playbill_1928: 'playbill-1928',
      effects_manual: 'effects-manual',
      margaux_diary: 'diary',
      annotated_script: 'script',
      poisoned_teacup: 'teacup',
      blueprints: 'blueprints',
      basement_key: 'basement-key',
      edwins_notebook: 'notebook',
      fog_machine_part: 'fog-machine',
      cecilia_letter: 'letter',
      stella_records: 'clipboard',
      ashworth_files: 'briefcase',
      chemical_receipt: 'receipt',
      margaux_locket: 'locket',
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
      'intro_newspaper', 'intro_marquee_lights', 'intro_backstage',
      'intro_poison_bottle', 'intro_demolition', 'intro_ghost_stage',
      'intro_nancy_car',
    ];
    for (const key of introImages) {
      this.load.image(key, `assets/intro/${key}.png`);
    }

    // Intro/cinematic audio — SFX files removed; will be re-added when user supplies replacements
    // Only attempt music_intro which may exist independently
    this.load.audio('music_intro', ['audio/music_intro.mp3', 'audio/music_intro.ogg']);

    // Load intro voiceover narration (gracefully skipped if files don't exist)
    const voSlides = [
      'vo_intro_01', 'vo_intro_02', 'vo_intro_03', 'vo_intro_04', 'vo_intro_05',
      'vo_intro_06', 'vo_intro_07', 'vo_intro_08', 'vo_intro_09', 'vo_intro_10',
      'vo_intro_11', 'vo_intro_12', 'vo_intro_13', 'vo_intro_14', 'vo_intro_15',
      'vo_intro_16', 'vo_intro_17', 'vo_intro_18',
    ];
    for (const key of voSlides) {
      this.load.audio(key, [`assets/vo/intro/${key}.mp3`, `assets/vo/intro/${key}.ogg`]);
    }

    // Ambient audio disabled — music handles atmosphere, SFX on clicks/triggers only

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

    // Intro cinematic video is played via native HTML <video> in IntroScene
    // (bypasses Phaser's broken video system for reliable 1920×1080 playback)

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

    // Load dialogue voiceover audio files (optional — dialogue works without VO)
    // Named VO files in public/audio/vo/
    const voFiles = [
      // Vivian intro — dialogue lines
      'vo_vivian_start_01', 'vo_vivian_start_02', 'vo_vivian_start_03',
      'vo_vivian_margaux_01', 'vo_vivian_margaux_02',
      'vo_vivian_ashworth_01', 'vo_vivian_ashworth_02',
      'vo_vivian_others_01', 'vo_vivian_others_02',
      'vo_vivian_end_01',
      // Nancy intro — dialogue lines
      'vo_nancy_start_01', 'vo_nancy_start_02',
      'vo_nancy_margaux_01', 'vo_nancy_ashworth_01',
      // Nancy intro — choice lines
      'vo_nancy_choice_margaux', 'vo_nancy_choice_ashworth',
      'vo_nancy_choice_others', 'vo_nancy_choice_ashworth2',
      'vo_nancy_choice_investigate',
      // Phone call — Carson Drew (Dad)
      'vo_carson_phone_01', 'vo_carson_phone_02',
      'vo_carson_phone_03', 'vo_carson_phone_04',
      // Phone call — Nancy
      'vo_nancy_phone_pickup',
      'vo_nancy_phone_01', 'vo_nancy_phone_02', 'vo_nancy_phone_03',
      // Vivian intro revisit — dialogue lines
      'vo_vivian_revisit_01', 'vo_vivian_revisit_02', 'vo_vivian_revisit_03',
      'vo_vivian_holding_01', 'vo_vivian_holding_02', 'vo_vivian_holding_03', 'vo_vivian_holding_04',
      'vo_vivian_history_01', 'vo_vivian_history_02', 'vo_vivian_history_03', 'vo_vivian_history_04',
      'vo_vivian_strange_01', 'vo_vivian_strange_02', 'vo_vivian_strange_03', 'vo_vivian_strange_04',
      'vo_vivian_farewell_01',
      // Nancy revisit — dialogue lines
      'vo_nancy_revisit_01',
      'vo_nancy_holding_01', 'vo_nancy_holding_02',
      'vo_nancy_history_01',
      'vo_nancy_strange_01', 'vo_nancy_strange_02',
      // Nancy revisit — choice lines
      'vo_nancy_choice_diary', 'vo_nancy_choice_locket', 'vo_nancy_choice_mirror',
      'vo_nancy_choice_holding_up', 'vo_nancy_choice_history',
      'vo_nancy_choice_strange', 'vo_nancy_choice_keep_investigating',
      // Edwin auditorium — Edwin lines
      'vo_edwin_start_01', 'vo_edwin_start_02', 'vo_edwin_start_03',
      'vo_edwin_crimson_01', 'vo_edwin_crimson_02', 'vo_edwin_crimson_03',
      'vo_edwin_diary_01', 'vo_edwin_diary_02', 'vo_edwin_diary_03', 'vo_edwin_diary_04',
      'vo_edwin_ghost_01', 'vo_edwin_ghost_02', 'vo_edwin_ghost_03',
      'vo_edwin_effects_01', 'vo_edwin_effects_02', 'vo_edwin_effects_03', 'vo_edwin_effects_04',
      'vo_edwin_props_01', 'vo_edwin_props_02', 'vo_edwin_props_03', 'vo_edwin_props_04',
      'vo_edwin_lastnight_01', 'vo_edwin_lastnight_02', 'vo_edwin_lastnight_03', 'vo_edwin_lastnight_04',
      'vo_edwin_grandfather_01', 'vo_edwin_grandfather_02', 'vo_edwin_grandfather_03',
      'vo_edwin_grandfather_04', 'vo_edwin_grandfather_05',
      'vo_edwin_cecilia_01', 'vo_edwin_cecilia_02',
      'vo_edwin_end_01', 'vo_edwin_end_02',
      // Edwin auditorium — Nancy lines
      'vo_nancy_edwin_01', 'vo_nancy_crimson_01',
      'vo_nancy_diary_edwin_01', 'vo_nancy_effects_01',
      'vo_nancy_props_01', 'vo_nancy_props_02', 'vo_nancy_props_03',
      'vo_nancy_lastnight_01', 'vo_nancy_lastnight_02', 'vo_nancy_lastnight_03',
      'vo_nancy_grandfather_01', 'vo_nancy_grandfather_02',
      'vo_nancy_cecilia_01',
      // Edwin auditorium — Nancy choice lines
      'vo_nancy_choice_crimson', 'vo_nancy_choice_ghost', 'vo_nancy_choice_lastnight',
      'vo_nancy_choice_grandfather', 'vo_nancy_choice_props',
      'vo_nancy_choice_cecilia', 'vo_nancy_choice_diary_edwin', 'vo_nancy_choice_effects',
      'vo_nancy_choice_investigate_edwin',
      // Ashworth office — Ashworth lines
      'vo_ashworth_start_01', 'vo_ashworth_start_02', 'vo_ashworth_start_03',
      'vo_ashworth_night_01', 'vo_ashworth_night_02', 'vo_ashworth_night_03', 'vo_ashworth_night_04',
      'vo_ashworth_poison_01', 'vo_ashworth_poison_02', 'vo_ashworth_poison_03',
      'vo_ashworth_insurance_01', 'vo_ashworth_insurance_02', 'vo_ashworth_insurance_03',
      'vo_ashworth_blueprints_01', 'vo_ashworth_blueprints_02', 'vo_ashworth_blueprints_03',
      'vo_ashworth_intruder_01', 'vo_ashworth_intruder_02', 'vo_ashworth_intruder_03', 'vo_ashworth_intruder_04',
      'vo_ashworth_end_01', 'vo_ashworth_end_02',
      // Ashworth office — Nancy lines
      'vo_nancy_office_01',
      'vo_nancy_night_01', 'vo_nancy_night_02',
      'vo_nancy_poison_01', 'vo_nancy_poison_02',
      'vo_nancy_insurance_01', 'vo_nancy_insurance_02',
      'vo_nancy_blueprints_01',
      'vo_nancy_intruder_01',
      // Ashworth office — Nancy choice lines
      'vo_nancy_choice_the_night', 'vo_nancy_choice_blueprints', 'vo_nancy_choice_intruder',
      'vo_nancy_choice_insurance', 'vo_nancy_choice_poison', 'vo_nancy_choice_see_blueprints',
      'vo_nancy_choice_examine', 'vo_nancy_choice_about_intruder', 'vo_nancy_choice_thank_ashworth',
      // Vivian diary / locket / revisit / post-ashworth / idle
      'vo_vivian_diary_01', 'vo_vivian_diary_02',
      'vo_vivian_cecilia_01', 'vo_vivian_cecilia_02', 'vo_vivian_cecilia_03', 'vo_vivian_cecilia_04',
      'vo_vivian_trunk_01', 'vo_vivian_trunk_02', 'vo_vivian_trunk_03',
      'vo_vivian_lover_01', 'vo_vivian_lover_02',
      'vo_vivian_promise_01',
      'vo_vivian_locket_silence', 'vo_vivian_locket_01', 'vo_vivian_locket_02', 'vo_vivian_locket_03',
      'vo_vivian_trust_01', 'vo_vivian_trust_02', 'vo_vivian_trust_03',
      'vo_vivian_suspicion_01', 'vo_vivian_suspicion_02', 'vo_vivian_suspicion_03',
      'vo_vivian_mirror_01', 'vo_vivian_mirror_02', 'vo_vivian_mirror_03',
      'vo_vivian_post_ash_01', 'vo_vivian_post_ash_02', 'vo_vivian_post_ash_03', 'vo_vivian_post_ash_04',
      'vo_vivian_done_01', 'vo_vivian_idle_01',
      // Nancy — Vivian scenes
      'vo_nancy_heard_her',
      'vo_nancy_diary_found', 'vo_nancy_diary_poisoned',
      'vo_nancy_choice_cd', 'vo_nancy_choice_trunk', 'vo_nancy_choice_lover',
      'vo_nancy_after_margaux', 'vo_nancy_october',
      'vo_nancy_hale_edwin', 'vo_nancy_changes_everything',
      'vo_nancy_found_locket', 'vo_nancy_choice_show_locket',
      'vo_nancy_choice_protect', 'vo_nancy_choice_who_killed',
      'vo_nancy_find_proof', 'vo_nancy_wax_hidden',
      'vo_nancy_post_ash_leads',
    ];
    for (const key of voFiles) {
      this.load.audio(key, [`audio/vo/${key}.mp3`]);
    }

    // Video cinematics are played via native HTML <video> (see VideoCinematicScene),
    // so no Phaser preloading is needed for them.

    // Suppress load errors for optional assets (images, audio, video)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (file.key.startsWith('intro_') || file.key.startsWith('sfx_') ||
          file.key.startsWith('ambient_') || file.key.startsWith('music_') ||
          file.key.startsWith('amb_') || file.key.startsWith('cine_') ||
          file.key.startsWith('ui_') || file.key.startsWith('dlg_') ||
          file.key.startsWith('vo_') || file.key.startsWith('puzzle_') ||
          file.key.startsWith('clue_') || file.key.startsWith('bg_') ||
          file.key.startsWith('cinematic_') || file.key.startsWith('Cutscene')) {
        // Silently ignore — scenes work without these assets
        return;
      }
    });
  }

  create(): void {
    // Generate procedural item icons as textures
    generateItemIcons(this);
    // Preload real SFX audio files (non-blocking — game starts immediately)
    preloadSFX();
    this.scene.start('TitleScene');
  }
}
