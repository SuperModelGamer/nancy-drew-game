import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import roomsData from '../data/rooms.json';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths, computeViewfinderLayout, BOTTOM_BAR_H } from '../utils/constants';
import { POINTER_CURSOR } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';
import { drawChevronTab, drawCornerOrnament, DecoColors } from '../utils/art-deco';
import { AuthManager } from '../systems/AuthManager';
import { MusicSystem, MUSIC_TRACKS } from '../systems/MusicSystem';
import { createAuthFormElements, submitAuthForm } from '../ui/AuthFormOverlay';

// Height of the bottom toolbar strip (buttons + chapter label)
const TOOLBAR_H = 112;
const BTN_W = 260;
const BTN_H = 66;
const BTN_FONT = '24px';
const BTN_CHEVRON = 6;

// Pre-index items for O(1) lookup
const itemMap = new Map(itemsData.items.map(i => [i.id, i]));

// Items that can be equipped to the cursor (used as requiredItem on hotspots)
const equippableItems = new Set<string>();
for (const room of (roomsData as { rooms: { hotspots?: { requiredItem?: string }[] }[] }).rooms) {
  for (const hs of room.hotspots || []) {
    if (hs.requiredItem) equippableItems.add(hs.requiredItem);
  }
}

// Book visual constants (shared by Evidence + Journal panels)
const BOOK_LEATHER = 0x3a2a1a;
const BOOK_PAPER = 0xF5E6C8;
const BOOK_INK = '#2a1a0a';
const BOOK_BULLET = '#5a3a2a';
const BOOK_SPINE = 0x2a1a0a;
const BOOK_MARGIN_RED = 0xcc6666;
const BOOK_STAIN = 0x8B7355;
const JOURNAL_FONT = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";
const JOURNAL_HAND = "'Caveat', cursive";
const JOURNAL_TITLE = "'Playfair Display SC', Georgia, serif";
const TAB_GOLD = 0xc9a84c;
const TAB_GOLD_STR = '#c9a84c';
const LEATHER_BORDER = 14;

/** Shared panel geometry returned by drawBookPanel. */
interface BookPanelLayout {
  panelLeft: number;
  panelTop: number;
  panelW: number;
  panelH: number;
  panelX: number;
  panelY: number;
  paperLeft: number;
  paperTop: number;
  paperW: number;
  paperH: number;
  contentTop: number;
  contentBottom: number;
  headerY: number;
}

export class UIScene extends Phaser.Scene {
  // ── Evidence panel state ──
  private evidenceOpen = false;
  private evidenceContainer!: Phaser.GameObjects.Container;
  private evidenceContent!: Phaser.GameObjects.Container;
  private itemsGrid!: Phaser.GameObjects.Container;
  private detailImage!: Phaser.GameObjects.Image | null;
  private detailName!: Phaser.GameObjects.Text;
  private detailDesc!: Phaser.GameObjects.Text;
  private detailKeyBadge!: Phaser.GameObjects.Container;
  private detailPlaceholder!: Phaser.GameObjects.Text;
  private detailLoreText: Phaser.GameObjects.Text | null = null;
  private detailLoreDivider: Phaser.GameObjects.Graphics | null = null;
  private detailUsedBadge: Phaser.GameObjects.Container | null = null;
  private hotspotCounterText: Phaser.GameObjects.Text | null = null;
  private roomItemCounterText: Phaser.GameObjects.Text | null = null;
  private selectedItemId: string | null = null;
  private evidenceLayout = { leftX: 0, contentTop: 0, contentH: 0, contentBottom: 0, leftW: 0, rightW: 0, rightX: 0 };
  private evidenceGridScroll = 0;
  private evidenceGridMaxScroll = 0;

  // ── Journal panel state ──
  private journalOpen = false;
  private journalContainer!: Phaser.GameObjects.Container;
  private journalContent!: Phaser.GameObjects.Container;
  private journalPage = 0;
  private journalBookLayout = { panelW: 0, panelH: 0, panelX: 0, panelY: 0, panelLeft: 0, panelTop: 0, paperLeft: 0, paperTop: 0, paperW: 0, paperH: 0, contentTop: 0, contentBottom: 0, headerY: 0 };

  // ── Settings panel state ──
  private settingsOpen = false;
  private settingsContainer!: Phaser.GameObjects.Container;

  // ── Bottom panel state ──
  private toolbarExpanded = false;
  private toolbarContainer!: Phaser.GameObjects.Container;  // expandable info section
  private bottomBarContainer!: Phaser.GameObjects.Container; // always-visible button bar
  private menuToggleLabel!: Phaser.GameObjects.Text;
  private autoCollapseTimer: Phaser.Time.TimerEvent | null = null;
  private volumeSliderContainer: Phaser.GameObjects.Container | null = null;
  private volumeSliderFill: Phaser.GameObjects.Graphics | null = null;
  private updateAudioIcon: (() => void) | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ─── Full-screen game viewport with minimal frame ───
    const vf = computeViewfinderLayout(width, height);
    const fLeft = vf.leftMargin;
    const fTop = vf.topMargin;

    const frameBg = this.add.graphics();

    // Solid opaque fill for border strips
    frameBg.fillStyle(DecoColors.navy, 1);
    frameBg.fillRect(0, 0, width, fTop);                                // top (thin)
    frameBg.fillRect(0, fTop, fLeft, height - fTop);                    // left (thin)
    frameBg.fillRect(width - fLeft, fTop, fLeft, height - fTop);        // right (thin)
    // bottom strip is drawn by the always-visible bottom bar

    // Outer gold frame rectangle (full canvas)
    frameBg.lineStyle(2, DecoColors.gold, 0.5);
    frameBg.strokeRect(1, 1, width - 2, height - 2);

    // Inner frame line (game viewport boundary)
    frameBg.lineStyle(1.5, DecoColors.gold, 0.4);
    frameBg.strokeRect(fLeft, fTop, vf.renderedW, vf.viewportH);

    // Four outer corner ornaments
    drawCornerOrnament(frameBg, 4, 4, 18, 'tl', DecoColors.gold, 0.4);
    drawCornerOrnament(frameBg, width - 4, 4, 18, 'tr', DecoColors.gold, 0.4);
    drawCornerOrnament(frameBg, 4, height - 4, 18, 'bl', DecoColors.gold, 0.4);
    drawCornerOrnament(frameBg, width - 4, height - 4, 18, 'br', DecoColors.gold, 0.4);

    frameBg.setDepth(Depths.tooltip - 1);

    // ─── Combined collapsible bottom panel (HUD + toolbar) ───
    this.createBottomPanel(width, height, vf);

    // ─── Evidence panel (hidden by default) ───
    this.evidenceContainer = this.createEvidencePanel();
    this.evidenceContainer.setVisible(false);

    // ─── Journal panel (hidden by default) ───
    this.journalContainer = this.createJournalPanel();
    this.journalContainer.setVisible(false);

    // ─── Settings panel (hidden by default) ───
    this.settingsContainer = this.createSettingsPanel();
    this.settingsContainer.setVisible(false);

    // Evidence panel scroll
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (!this.evidenceOpen || this.evidenceGridMaxScroll <= 0) return;
      this.evidenceGridScroll = Phaser.Math.Clamp(this.evidenceGridScroll + dy * 0.5, 0, this.evidenceGridMaxScroll);
      this.itemsGrid.setY(-this.evidenceGridScroll);
    });

    // Listen for inventory changes — update both evidence panel and right panel stats
    const onInventoryChange = () => {
      if (this.evidenceOpen) this.refreshInventoryGrid();
      this.updateRightPanelStats();
    };
    InventorySystem.getInstance().onChange(onInventoryChange);

    // Listen for save system changes (room transitions, flag changes) — update right panel
    const onSaveChange = () => {
      this.updateRightPanelStats();
    };
    SaveSystem.getInstance().onChange(onSaveChange);

    this.events.on('shutdown', () => {
      InventorySystem.getInstance().offChange(onInventoryChange);
      SaveSystem.getInstance().offChange(onSaveChange);
    });

  }

  // ─── Combined bottom panel (HUD stats + action buttons) ─────────────────

  private borderItemCountText!: Phaser.GameObjects.Text;
  private borderClueCountText!: Phaser.GameObjects.Text;
  private borderRoomNameText!: Phaser.GameObjects.Text;
  private borderRoomClueCountText!: Phaser.GameObjects.Text;
  private borderTotalItemCountText!: Phaser.GameObjects.Text;
  private borderProgressBar!: Phaser.GameObjects.Graphics;
  private borderProgressPct!: Phaser.GameObjects.Text;
  private borderChapterText!: Phaser.GameObjects.Text;
  private borderQuestHintText!: Phaser.GameObjects.Text;
  private panelH = 0; // total height of the slide-up panel

  // Always-visible bottom bar stats
  private barRoomClueText!: Phaser.GameObjects.Text;
  private barProgressTrack!: Phaser.GameObjects.Graphics;
  private barProgressFill!: Phaser.GameObjects.Graphics;
  private barProgressPct!: Phaser.GameObjects.Text;

  private createBottomPanel(canvasW: number, canvasH: number, vf: ReturnType<typeof computeViewfinderLayout>): void {
    const PAD = 28;
    const barTop = canvasH - BOTTOM_BAR_H; // y where the permanent bar starts

    // ════════════════════════════════════════════════════════════════════════
    // Always-visible bottom bar (action buttons + audio/settings + menu toggle)
    // ════════════════════════════════════════════════════════════════════════
    this.bottomBarContainer = this.add.container(0, barTop);
    this.bottomBarContainer.setDepth(Depths.tooltip + 1);

    // Bar background
    const barBgGfx = this.add.graphics();
    barBgGfx.fillStyle(DecoColors.navy, 0.96);
    barBgGfx.fillRect(0, 0, canvasW, BOTTOM_BAR_H);
    barBgGfx.lineStyle(1.5, DecoColors.gold, 0.4);
    barBgGfx.lineBetween(0, 0, canvasW, 0); // gold top border
    drawCornerOrnament(barBgGfx, 8, 8, 12, 'tl', DecoColors.gold, 0.3);
    drawCornerOrnament(barBgGfx, canvasW - 8, 8, 12, 'tr', DecoColors.gold, 0.3);
    this.bottomBarContainer.add(barBgGfx);

    // Menu toggle — folio tab shape protruding above the bar
    const menuTabW = 160;
    const menuTabH = 32;
    const menuTabY = -menuTabH / 2 + 2; // sits above the bar top edge

    const menuTabGfx = this.add.graphics();
    const drawMenuTab = (hover: boolean) => {
      menuTabGfx.clear();
      // Folio tab shape — rounded trapezoid
      const cx = canvasW / 2;
      const halfW = menuTabW / 2;
      const halfNarrow = halfW - 12; // narrower at top
      menuTabGfx.fillStyle(DecoColors.navy, 0.96);
      menuTabGfx.beginPath();
      menuTabGfx.moveTo(cx - halfW, menuTabY + menuTabH); // bottom-left
      menuTabGfx.lineTo(cx - halfNarrow, menuTabY + 4);    // top-left (angled)
      menuTabGfx.lineTo(cx + halfNarrow, menuTabY + 4);    // top-right (angled)
      menuTabGfx.lineTo(cx + halfW, menuTabY + menuTabH); // bottom-right
      menuTabGfx.closePath();
      menuTabGfx.fillPath();
      menuTabGfx.lineStyle(1.5, DecoColors.gold, hover ? 0.8 : 0.4);
      menuTabGfx.beginPath();
      menuTabGfx.moveTo(cx - halfW, menuTabY + menuTabH);
      menuTabGfx.lineTo(cx - halfNarrow, menuTabY + 4);
      menuTabGfx.lineTo(cx + halfNarrow, menuTabY + 4);
      menuTabGfx.lineTo(cx + halfW, menuTabY + menuTabH);
      menuTabGfx.strokePath();
    };
    drawMenuTab(false);
    this.bottomBarContainer.add(menuTabGfx);

    this.menuToggleLabel = this.add.text(canvasW / 2, menuTabY + menuTabH / 2 + 2, '\u25B2 MENU', {
      fontFamily: FONT, fontSize: '16px', color: '#c9a84c',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);
    this.bottomBarContainer.add(this.menuToggleLabel);

    // Prominent glow hint for first-time players — draws attention to the MENU toggle
    const hasOpenedMenu = SaveSystem.getInstance().getFlag('opened_menu');
    let menuGlowElements: Phaser.GameObjects.GameObject[] = [];
    if (!hasOpenedMenu) {
      // Outer wide glow
      const outerGlow = this.add.rectangle(canvasW / 2, menuTabY + menuTabH / 2 + 2, 320, 34, 0xc9a84c, 0.12);
      outerGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.bottomBarContainer.add(outerGlow);

      // Inner bright glow
      const innerGlow = this.add.rectangle(canvasW / 2, menuTabY + menuTabH / 2 + 2, 200, 26, 0xe8c55a, 0.2);
      innerGlow.setBlendMode(Phaser.BlendModes.ADD);
      this.bottomBarContainer.add(innerGlow);

      // Pulsing hint text below the MENU label
      const hintText = this.add.text(canvasW / 2, menuTabY + menuTabH + 6, 'Click here to open your tools', {
        fontFamily: FONT, fontSize: '13px', color: '#e8c55a',
        fontStyle: 'italic',
      }).setOrigin(0.5);
      this.bottomBarContainer.add(hintText);

      // Pulse the glows and hint text
      this.tweens.add({
        targets: [outerGlow, innerGlow],
        alpha: '+=0.25',
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: hintText,
        alpha: { from: 0.5, to: 1 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Gentle bounce on the MENU label itself
      this.tweens.add({
        targets: this.menuToggleLabel,
        y: { from: menuTabY + menuTabH / 2 + 2, to: menuTabY + menuTabH / 2 - 2 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      menuGlowElements = [outerGlow, innerGlow, hintText];
    }

    const tabHit = this.add.rectangle(canvasW / 2, menuTabY + menuTabH / 2 + 2, menuTabW, menuTabH, 0x000000, 0);
    tabHit.setInteractive({ cursor: POINTER_CURSOR });
    tabHit.on('pointerdown', () => {
      UISounds.click();
      this.toggleToolbar();
      this.menuToggleLabel.setText(this.toolbarExpanded ? '\u25BC MENU' : '\u25B2 MENU');
      // Stop the glow hint after first click
      if (menuGlowElements.length > 0) {
        this.tweens.killTweensOf(this.menuToggleLabel);
        this.menuToggleLabel.setY(menuTabY + menuTabH / 2 + 2);
        menuGlowElements.forEach(el => {
          this.tweens.killTweensOf(el);
          el.destroy();
        });
        menuGlowElements = [];
        SaveSystem.getInstance().setFlag('opened_menu', true);
      }
    });
    tabHit.on('pointerover', () => { this.menuToggleLabel.setColor('#ffe0a0'); drawMenuTab(true); });
    tabHit.on('pointerout', () => { this.menuToggleLabel.setColor('#c9a84c'); drawMenuTab(false); });
    this.bottomBarContainer.add(tabHit);

    // ── Action buttons + audio/settings ──
    // Buttons are centered vertically in the space below the toggle label
    const btnAreaTop = 28;
    const btnCenterY = btnAreaTop + (BOTTOM_BAR_H - btnAreaTop - 8) / 2; // centered with bottom padding
    const btnSpacing = Math.min(vf.renderedW / 7, 260);
    const btnCenterX = canvasW / 2;

    // Audio toggle (left of buttons) + volume slider
    const musicSys = MusicSystem.getInstance();
    const audioBtnX = btnCenterX - btnSpacing * 2.3;
    const audioBtn = this.add.text(audioBtnX, btnCenterY, '\u{1F50A}', {
      fontSize: '44px',
    }).setOrigin(0.5, 0.5);
    audioBtn.setInteractive({ cursor: POINTER_CURSOR });

    const updateAudioIcon = () => {
      const vol = UISounds.getVolume();
      const muted = vol <= 0;
      audioBtn.setText(muted ? '\u{1F507}' : '\u{1F50A}');
      audioBtn.setColor(muted ? '#4a4a5a' : '#8a8a9a');
      this.updateVolumeSlider();
    };
    this.updateAudioIcon = updateAudioIcon;
    updateAudioIcon();

    audioBtn.on('pointerover', () => audioBtn.setColor(TextColors.gold));
    audioBtn.on('pointerout', () => updateAudioIcon());
    audioBtn.on('pointerdown', () => {
      UISounds.click();
      const currentVol = UISounds.getVolume();
      if (currentVol > 0) {
        audioBtn.setData('prevVol', currentVol);
        UISounds.setVolume(0);
        UISounds.setMusicVolume(0);
      } else {
        const prev = (audioBtn.getData('prevVol') as number) || 0.8;
        UISounds.setVolume(prev);
        UISounds.setMusicVolume(prev);
      }
      musicSys.updateVolume();
      updateAudioIcon();
    });
    this.bottomBarContainer.add(audioBtn);

    // Volume slider (horizontal bar right of speaker icon, capped before EVIDENCE btn)
    const sliderX = audioBtnX + 32;
    const evidenceLeftEdge = btnCenterX - btnSpacing * 1.5 - BTN_W / 2;
    const sliderW = Math.min(80, evidenceLeftEdge - sliderX - 16); // 16px gap before button
    const sliderH = 8;
    this.volumeSliderContainer = this.add.container(0, btnCenterY);

    // Slider track background
    const sliderTrack = this.add.graphics();
    sliderTrack.fillStyle(0x1a1a2e, 0.8);
    sliderTrack.fillRoundedRect(sliderX, -sliderH / 2, sliderW, sliderH, 4);
    sliderTrack.lineStyle(1, DecoColors.gold, 0.3);
    sliderTrack.strokeRoundedRect(sliderX, -sliderH / 2, sliderW, sliderH, 4);
    this.volumeSliderContainer.add(sliderTrack);

    // Slider fill
    this.volumeSliderFill = this.add.graphics();
    this.volumeSliderFill.setData('sliderX', sliderX);
    this.volumeSliderFill.setData('sliderW', sliderW);
    this.volumeSliderContainer.add(this.volumeSliderFill);
    this.updateVolumeSlider();

    // Slider hit area (slightly taller for easy dragging)
    const sliderHit = this.add.rectangle(sliderX + sliderW / 2, 0, sliderW + 12, 28, 0x000000, 0);
    sliderHit.setInteractive({ cursor: POINTER_CURSOR, draggable: true });
    const setVolumeFromPointer = (pointerX: number) => {
      const localX = pointerX - this.bottomBarContainer.x;
      const pct = Phaser.Math.Clamp((localX - sliderX) / sliderW, 0, 1);
      UISounds.setVolume(pct);
      UISounds.setMusicVolume(pct);
      musicSys.updateVolume();
      updateAudioIcon();
    };
    sliderHit.on('pointerdown', (pointer: Phaser.Input.Pointer) => setVolumeFromPointer(pointer.x));
    sliderHit.on('drag', (pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) => setVolumeFromPointer(pointer.x));
    this.volumeSliderContainer.add(sliderHit);

    this.bottomBarContainer.add(this.volumeSliderContainer);

    // 4 action buttons (centered)
    const buttons = [
      { label: 'EVIDENCE', color: DecoColors.gold, x: btnCenterX - btnSpacing * 1.5, action: () => this.toggleEvidence() },
      { label: 'SUSPECTS', color: 0xb4a0d4, x: btnCenterX - btnSpacing * 0.5, action: () => {
        const speaker = DialogueSystem.getInstance().getLastNPCSpeaker();
        const speakerToSuspect: Record<string, string> = {
          'Vivian': 'vivian', 'Vivian Delacroix': 'vivian',
          'Edwin': 'edwin', 'Edwin Hale': 'edwin',
          'Stella': 'stella', 'Stella Morrow': 'stella',
          'Ashworth': 'ashworth', 'Roland Ashworth': 'ashworth',
          'Diego': 'diego', 'Diego Reyes': 'diego',
          'Carson Drew': '', 'Ned': '',
        };
        this.registry.set('currentDialogueSuspect', speakerToSuspect[speaker] || null);
        this.scene.launch('SuspectScene');
      }},
      { label: 'MAP', color: Colors.mapBlue, x: btnCenterX + btnSpacing * 0.5, action: () => this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() }) },
      { label: 'JOURNAL', color: DecoColors.gold, x: btnCenterX + btnSpacing * 1.5, action: () => this.toggleJournal() },
    ];

    buttons.forEach(btn => {
      const btnContainer = this.add.container(btn.x, btnCenterY);

      const btnGfx = this.add.graphics();
      drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
        fillColor: DecoColors.navy, fillAlpha: 0.6,
        strokeColor: btn.color, strokeAlpha: 0.4, chevronDepth: BTN_CHEVRON,
      });
      btnContainer.add(btnGfx);

      const hitArea = this.add.rectangle(0, 0, BTN_W, BTN_H, 0x000000, 0);
      hitArea.setInteractive({ cursor: POINTER_CURSOR });
      hitArea.on('pointerover', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
          fillColor: DecoColors.navyLight, fillAlpha: 0.8,
          strokeColor: btn.color, strokeAlpha: 0.8, chevronDepth: BTN_CHEVRON,
        });
      });
      hitArea.on('pointerout', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
          fillColor: DecoColors.navy, fillAlpha: 0.6,
          strokeColor: btn.color, strokeAlpha: 0.4, chevronDepth: BTN_CHEVRON,
        });
      });
      hitArea.on('pointerdown', () => {
        UISounds.click();
        btn.action();
      });
      btnContainer.add(hitArea);

      const colorHex = `#${btn.color.toString(16).padStart(6, '0')}`;
      const text = this.add.text(0, 0, btn.label, {
        fontFamily: FONT, fontSize: BTN_FONT, color: colorHex,
        fontStyle: 'bold', letterSpacing: 4,
      }).setOrigin(0.5);
      btnContainer.add(text);

      this.bottomBarContainer.add(btnContainer);
    });

    // Settings gear (right of buttons)
    const gearBtn = this.add.text(btnCenterX + btnSpacing * 2.3, btnCenterY - 2, '\u2699', {
      fontSize: '54px', color: '#8a8a9a',
    }).setOrigin(0.5, 0.5);
    gearBtn.setInteractive({
      cursor: POINTER_CURSOR,
      hitArea: new Phaser.Geom.Rectangle(-28, -28, 80, 80),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });
    gearBtn.on('pointerover', () => gearBtn.setColor(TextColors.gold));
    gearBtn.on('pointerout', () => gearBtn.setColor('#8a8a9a'));
    gearBtn.on('pointerdown', () => { UISounds.click(); this.toggleSettings(); });
    this.bottomBarContainer.add(gearBtn);

    // ── Always-visible room clue counter (far left, outside speaker icon) ──
    const clueBarX = audioBtnX - 50; // left of speaker icon
    this.barRoomClueText = this.add.text(clueBarX, btnCenterY, '', {
      fontFamily: FONT, fontSize: '18px', color: '#8a9aaa',
      fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(1, 0.5); // right-aligned so it grows leftward
    this.bottomBarContainer.add(this.barRoomClueText);

    // ── Always-visible progress bar (far right, outside settings gear) ──
    const gearRightEdge = btnCenterX + btnSpacing * 2.3 + 36;
    const pBarW = 120;
    const pBarH = 10;
    const pBarX = gearRightEdge + 12;
    const pBarY = btnCenterY + 6;

    // Progress label
    const pLabel = this.add.text(pBarX, btnCenterY - 12, 'PROGRESS', {
      fontFamily: FONT, fontSize: '11px', color: TextColors.mutedBlue,
      letterSpacing: 3,
    }).setOrigin(0, 0);
    this.bottomBarContainer.add(pLabel);

    // Track background
    this.barProgressTrack = this.add.graphics();
    this.barProgressTrack.fillStyle(0x1a1a2e, 0.8);
    this.barProgressTrack.fillRoundedRect(pBarX, pBarY, pBarW, pBarH, 5);
    this.barProgressTrack.lineStyle(1, DecoColors.gold, 0.25);
    this.barProgressTrack.strokeRoundedRect(pBarX, pBarY, pBarW, pBarH, 5);
    this.bottomBarContainer.add(this.barProgressTrack);

    // Fill bar
    this.barProgressFill = this.add.graphics();
    this.barProgressFill.setData('barX', pBarX);
    this.barProgressFill.setData('barY', pBarY);
    this.barProgressFill.setData('barW', pBarW);
    this.barProgressFill.setData('barH', pBarH);
    this.bottomBarContainer.add(this.barProgressFill);

    // Percentage text (right of progress bar)
    this.barProgressPct = this.add.text(pBarX + pBarW + 8, btnCenterY, '', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.goldDim,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.bottomBarContainer.add(this.barProgressPct);

    // ════════════════════════════════════════════════════════════════════════
    // Expandable info panel (slides up from above the bottom bar)
    // Contains: Chapter / Room / Objective / Stats / Progress
    // ════════════════════════════════════════════════════════════════════════
    this.toolbarContainer = this.add.container(0, 0);
    this.toolbarContainer.setDepth(Depths.tooltip);
    this.toolbarContainer.setVisible(false);

    const infoY = PAD;
    const leftZoneX = PAD + 20;
    const centerZoneX = canvasW / 2;
    const rightZoneX = canvasW - PAD - 20;

    // -- LEFT: Chapter + Room --
    this.borderChapterText = this.add.text(leftZoneX, infoY, '', {
      fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
      letterSpacing: 5,
    }).setOrigin(0, 0);
    this.toolbarContainer.add(this.borderChapterText);

    this.borderRoomNameText = this.add.text(leftZoneX, infoY + 22, '', {
      fontFamily: FONT, fontSize: '30px', color: '#c9a84c',
      fontStyle: 'bold', letterSpacing: 3,
      wordWrap: { width: 320 },
    }).setOrigin(0, 0);
    this.toolbarContainer.add(this.borderRoomNameText);

    // Room clue count below room name
    this.borderRoomClueCountText = this.add.text(leftZoneX, infoY + 62, '', {
      fontFamily: FONT, fontSize: '16px', color: '#7a8a9a',
    }).setOrigin(0, 0);
    this.toolbarContainer.add(this.borderRoomClueCountText);

    // -- CENTER: Objective --
    const objLabel = this.add.text(centerZoneX, infoY, '\u2756 OBJECTIVE \u2756', {
      fontFamily: FONT, fontSize: '16px', color: '#c9a84c',
      letterSpacing: 3, align: 'center',
    }).setOrigin(0.5, 0);
    this.toolbarContainer.add(objLabel);

    this.borderQuestHintText = this.add.text(centerZoneX, infoY + 28, '', {
      fontFamily: FONT, fontSize: '20px', color: '#f0e0b8',
      fontStyle: 'italic', align: 'center',
      wordWrap: { width: 460 },
      lineSpacing: 5,
    }).setOrigin(0.5, 0);
    this.toolbarContainer.add(this.borderQuestHintText);

    // -- RIGHT: Stats block (right-aligned) --
    const statsX = rightZoneX;

    const itemsLabel = this.add.text(statsX - 180, infoY, 'ITEMS', {
      fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue, letterSpacing: 3,
    }).setOrigin(0, 0);
    this.toolbarContainer.add(itemsLabel);

    this.borderItemCountText = this.add.text(statsX - 180, infoY + 22, '', {
      fontFamily: FONT, fontSize: '32px', color: '#c9a84c', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.toolbarContainer.add(this.borderItemCountText);

    const cluesLabel = this.add.text(statsX - 80, infoY, 'CLUES', {
      fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue, letterSpacing: 3,
    }).setOrigin(0, 0);
    this.toolbarContainer.add(cluesLabel);

    this.borderClueCountText = this.add.text(statsX - 80, infoY + 22, '', {
      fontFamily: FONT, fontSize: '32px', color: '#8a9aaa', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.toolbarContainer.add(this.borderClueCountText);

    // Total items count
    this.borderTotalItemCountText = this.add.text(statsX, infoY + 62, '', {
      fontFamily: FONT, fontSize: '16px', color: '#7a8a9a',
    }).setOrigin(1, 0);
    this.toolbarContainer.add(this.borderTotalItemCountText);

    // Progress bar — spans the right zone
    const barW = 220;
    const barH = 12;
    const barX = statsX - barW;
    const barY = infoY + 86;

    const progressBgGfx = this.add.graphics();
    progressBgGfx.fillStyle(0x1a1a2e, 0.8);
    progressBgGfx.fillRoundedRect(barX, barY, barW, barH, 6);
    progressBgGfx.lineStyle(1, DecoColors.gold, 0.25);
    progressBgGfx.strokeRoundedRect(barX, barY, barW, barH, 6);
    this.toolbarContainer.add(progressBgGfx);

    this.borderProgressBar = this.add.graphics();
    this.borderProgressBar.setData('barX', barX);
    this.borderProgressBar.setData('barY', barY);
    this.borderProgressBar.setData('barW', barW);
    this.borderProgressBar.setData('barH', barH);
    this.toolbarContainer.add(this.borderProgressBar);

    this.borderProgressPct = this.add.text(statsX, barY + barH + 6, '', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.toolbarContainer.add(this.borderProgressPct);

    // ── Calculate info panel height and add background ──
    this.panelH = infoY + 120 + PAD; // info section + bottom padding

    const infoBgGfx = this.add.graphics();
    infoBgGfx.fillStyle(DecoColors.navy, 0.96);
    infoBgGfx.fillRect(0, 0, canvasW, this.panelH);
    infoBgGfx.lineStyle(1.5, DecoColors.gold, 0.4);
    infoBgGfx.lineBetween(0, 0, canvasW, 0); // gold top border
    drawCornerOrnament(infoBgGfx, 8, 8, 12, 'tl', DecoColors.gold, 0.3);
    drawCornerOrnament(infoBgGfx, canvasW - 8, 8, 12, 'tr', DecoColors.gold, 0.3);
    this.toolbarContainer.add(infoBgGfx);
    this.toolbarContainer.sendToBack(infoBgGfx);

    // Position info panel off-screen (hidden behind bottom bar)
    this.toolbarContainer.setY(barTop);

    this.updateRightPanelStats();
  }

  private toggleToolbar(): void {
    this.toolbarExpanded = !this.toolbarExpanded;
    const canvasH = this.cameras.main.height;
    const barTop = canvasH - BOTTOM_BAR_H;

    this.tweens.killTweensOf(this.toolbarContainer);

    if (this.toolbarExpanded) {
      this.toolbarContainer.setVisible(true);
      this.toolbarContainer.setY(barTop);
      this.tweens.add({
        targets: this.toolbarContainer,
        y: barTop - this.panelH,
        duration: 300,
        ease: 'Cubic.easeOut',
      });
      // Start auto-collapse timer (collapses after 5s of no interaction)
      this.resetAutoCollapseTimer();
    } else {
      // Cancel any pending auto-collapse
      if (this.autoCollapseTimer) {
        this.autoCollapseTimer.remove(false);
        this.autoCollapseTimer = null;
      }
      if (this.evidenceOpen) this.closeEvidence();
      if (this.journalOpen) this.closeJournal();
      this.tweens.add({
        targets: this.toolbarContainer,
        y: barTop,
        duration: 250,
        ease: 'Power2',
        onComplete: () => { if (!this.toolbarExpanded) this.toolbarContainer.setVisible(false); },
      });
    }
  }

  /** Reset auto-collapse timer — call whenever the user interacts with the expanded panel. */
  private resetAutoCollapseTimer(): void {
    if (this.autoCollapseTimer) {
      this.autoCollapseTimer.remove(false);
      this.autoCollapseTimer = null;
    }
    if (!this.toolbarExpanded) return;
    // Start a new 5-second timer to collapse the expanded info panel
    this.autoCollapseTimer = this.time.delayedCall(5000, () => {
      if (this.toolbarExpanded && !this.evidenceOpen && !this.journalOpen && !this.settingsOpen) {
        this.toolbarExpanded = false;
        this.menuToggleLabel.setText('\u25B2 MENU');
        const canvasH = this.cameras.main.height;
        const barTop = canvasH - BOTTOM_BAR_H;
        this.tweens.killTweensOf(this.toolbarContainer);
        this.tweens.add({
          targets: this.toolbarContainer,
          y: barTop,
          duration: 250,
          ease: 'Power2',
          onComplete: () => { if (!this.toolbarExpanded) this.toolbarContainer.setVisible(false); },
        });
      }
    });
  }

  /** Update the volume slider fill bar to match current volume. */
  private updateVolumeSlider(): void {
    if (!this.volumeSliderFill) return;
    const vol = UISounds.getVolume();
    const sliderW = (this.volumeSliderFill.getData('sliderW') as number) || 80;
    const sliderH = 8;
    const sliderX = (this.volumeSliderFill.getData('sliderX') as number) || 0;

    this.volumeSliderFill.clear();
    if (vol > 0) {
      const fillW = Math.max(2, sliderW * vol);
      this.volumeSliderFill.fillStyle(DecoColors.gold, 0.7);
      this.volumeSliderFill.fillRoundedRect(sliderX, -sliderH / 2, fillW, sliderH, 4);
    }
  }

  /** Check whether a hotspot's hideWhen condition is met (should be hidden). */
  private isHotspotHidden(hideWhen: string | undefined): boolean {
    if (!hideWhen) return false;
    const save = SaveSystem.getInstance();
    if (save.getFlag(hideWhen)) return true;
    try { if (DialogueSystem.getInstance().hasTriggeredEvent(hideWhen)) return true; } catch { /* dialogue not ready */ }
    return false;
  }

  /** Check whether a hotspot's showWhen condition is currently met. */
  private isHotspotAvailable(showWhen: string | undefined): boolean {
    if (!showWhen) return true;
    const save = SaveSystem.getInstance();
    if (save.getFlag(showWhen)) return true;
    try { if (DialogueSystem.getInstance().hasTriggeredEvent(showWhen)) return true; } catch { /* dialogue not ready */ }
    if (showWhen.startsWith('chapter_')) {
      const m = showWhen.match(/^chapter_(\d+)$/);
      if (m) return (save.getChapter?.() ?? 1) >= parseInt(m[1], 10);
    }
    return false;
  }

  private updateRightPanelStats(): void {
    if (!this.borderItemCountText) return;

    const save = SaveSystem.getInstance();
    const inventory = InventorySystem.getInstance();
    const currentRoomId = save.getCurrentRoom();
    const rooms = roomsData.rooms as { id: string; name: string; hotspots: { id: string; type: string; itemId?: string; showWhen?: string; hideWhen?: string }[] }[];
    const currentRoom = rooms.find(r => r.id === currentRoomId);

    // Chapter
    if (this.borderChapterText) {
      const chapter = save.getChapter?.() ?? 1;
      this.borderChapterText.setText(`CHAPTER ${chapter}`);
    }

    // Room name
    if (currentRoom && this.borderRoomNameText) {
      const parts = currentRoom.name.split('—');
      const shortName = (parts[1] || parts[0]).trim().toUpperCase();
      this.borderRoomNameText.setText(shortName);
    }

    // Per-room item counter (only hotspots available at current story progression)
    let roomPickupTotal = 0;
    let roomPickupFound = 0;
    if (currentRoom) {
      const roomPickups = currentRoom.hotspots.filter(
        hs => hs.type === 'pickup' && hs.itemId && this.isHotspotAvailable(hs.showWhen),
      );
      roomPickupTotal = roomPickups.length;
      roomPickupFound = roomPickups.filter(hs => inventory.hasItem(hs.itemId!) || inventory.isUsed(hs.itemId!)).length;
      this.borderItemCountText.setText(`${roomPickupFound} / ${roomPickupTotal}`);
    }

    // Per-room clue counter (inspect + pickup + locked + talk hotspots)
    // Includes talk hotspots so players know they still need to speak with NPCs
    let roomClueTotal = 0;
    let roomClueFound = 0;
    if (currentRoom) {
      for (const hs of currentRoom.hotspots) {
        const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
        if (!isClueType) continue;
        if (!this.isHotspotAvailable(hs.showWhen)) continue;
        if (this.isHotspotHidden(hs.hideWhen)) continue;
        roomClueTotal++;
        if (save.getFlag('used_hotspot_' + hs.id)) roomClueFound++;
      }
    }
    if (this.borderRoomClueCountText) {
      const remaining = roomClueTotal - roomClueFound;
      if (remaining > 0) {
        this.borderRoomClueCountText.setText(`Room: ${roomClueFound}/${roomClueTotal} clues`);
      } else {
        this.borderRoomClueCountText.setText(`Room: ${roomClueTotal}/${roomClueTotal} \u2713`);
      }
    }

    // Always-visible bottom bar — room clue counter
    if (this.barRoomClueText) {
      const remaining = roomClueTotal - roomClueFound;
      if (remaining > 0) {
        this.barRoomClueText.setText(`\u{1F50D} ${roomClueFound}/${roomClueTotal} CLUES`);
        this.barRoomClueText.setColor('#8a9aaa');
      } else {
        this.barRoomClueText.setText(`\u2713 ${roomClueTotal}/${roomClueTotal} CLUES`);
        this.barRoomClueText.setColor('#7acc7a');
      }
    }

    // Total items across all rooms (all items regardless of progression)
    let totalItemsAll = 0;
    let foundItemsAll = 0;
    for (const room of rooms) {
      for (const hs of room.hotspots) {
        if (hs.type === 'pickup' && hs.itemId) {
          totalItemsAll++;
          if (inventory.hasItem(hs.itemId!) || inventory.isUsed(hs.itemId!)) foundItemsAll++;
        }
      }
    }
    if (this.borderTotalItemCountText) {
      this.borderTotalItemCountText.setText(`Total items: ${foundItemsAll}/${totalItemsAll}`);
    }

    // Global clue counter (only clues currently available to the player)
    let totalClues = 0;
    let foundClues = 0;
    for (const room of rooms) {
      for (const hs of room.hotspots) {
        const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
        if (!isClueType) continue;
        if (!this.isHotspotAvailable((hs as { showWhen?: string }).showWhen)) continue;
        if (this.isHotspotHidden(hs.hideWhen)) continue;
        totalClues++;
        if (save.getFlag('used_hotspot_' + hs.id)) foundClues++;
      }
    }
    this.borderClueCountText.setText(`${foundClues} / ${totalClues}`);

    // Progress bar
    if (this.borderProgressBar) {
      const barX = this.borderProgressBar.getData('barX') as number;
      const barY = this.borderProgressBar.getData('barY') as number;
      const barW = this.borderProgressBar.getData('barW') as number;
      const barH = this.borderProgressBar.getData('barH') as number;
      const pct = totalClues > 0 ? foundClues / totalClues : 0;

      this.borderProgressBar.clear();
      if (pct > 0) {
        this.borderProgressBar.fillStyle(DecoColors.gold, 0.7);
        this.borderProgressBar.fillRoundedRect(barX, barY, Math.max(barH, barW * pct), barH, 3);
      }
    }
    if (this.borderProgressPct) {
      const pct = totalClues > 0 ? Math.round((foundClues / totalClues) * 100) : 0;
      this.borderProgressPct.setText(`${pct}%`);
    }

    // Always-visible bottom bar — progress bar
    if (this.barProgressFill) {
      const bX = this.barProgressFill.getData('barX') as number;
      const bY = this.barProgressFill.getData('barY') as number;
      const bW = this.barProgressFill.getData('barW') as number;
      const bH = this.barProgressFill.getData('barH') as number;
      const pct = totalClues > 0 ? foundClues / totalClues : 0;
      this.barProgressFill.clear();
      if (pct > 0) {
        this.barProgressFill.fillStyle(DecoColors.gold, 0.7);
        this.barProgressFill.fillRoundedRect(bX, bY, Math.max(bH, bW * pct), bH, 5);
      }
    }
    if (this.barProgressPct) {
      const pct = totalClues > 0 ? Math.round((foundClues / totalClues) * 100) : 0;
      this.barProgressPct.setText(`${pct}%`);
    }

    // Quest hint
    if (this.borderQuestHintText) {
      this.borderQuestHintText.setText(this.getQuestHint());
    }
  }

  // ─── Quest Hint System ──────────────────────────────────────────────────────

  private static readonly QUEST_HINTS: { check: (s: SaveSystem, i: InventorySystem) => boolean; hint: string }[] = [
    // Chapter 1
    { check: (s) => s.getChapter() === 1 && !s.getFlag('learned_about_margaux'),
      hint: 'Talk to Vivian in the lobby. She knows this theater better than anyone.' },
    { check: (s) => s.getChapter() === 1 && !s.getFlag('learned_about_crimson_veil'),
      hint: 'Find Edwin in the auditorium. He may know about The Crimson Veil.' },
    { check: (s) => s.getChapter() === 1 && !!s.getFlag('learned_about_margaux') && !!s.getFlag('learned_about_crimson_veil'),
      hint: 'Explore the theater thoroughly. Every room has secrets.' },
    // Chapter 2
    { check: (s, i) => s.getChapter() === 2 && !i.hasItem('margaux_diary'),
      hint: 'Find Margaux\u2019s diary. Her dressing room hasn\u2019t been touched since 1928.' },
    { check: (s) => s.getChapter() === 2 && !s.getFlag('learned_about_cecilia'),
      hint: 'Someone named C. keeps appearing. Find out who Cecilia was.' },
    { check: (s) => s.getChapter() === 2 && !s.getFlag('basement_key_location'),
      hint: 'There must be a way into the basement. Someone here knows where the key is.' },
    { check: (s) => s.getChapter() === 2,
      hint: 'Getting closer. Keep searching \u2014 every room has secrets.' },
    // Chapter 3
    { check: (s, i) => s.getChapter() === 3 && !i.hasItem('basement_key'),
      hint: 'Retrieve the basement key from its hiding place.' },
    { check: (s) => s.getChapter() === 3 && !s.getFlag('saw_ghost'),
      hint: 'Someone is staging a ghost. Catch them in the act.' },
    { check: (s) => s.getChapter() === 3,
      hint: 'The pieces are coming together. Find the key, open the trunk, and prove the ghost is fake.' },
    // Chapter 4
    { check: (s) => s.getChapter() === 4 && !s.getFlag('edwin_personal_revealed'),
      hint: 'Go beneath the stage and confront whoever is behind this.' },
    { check: (s, i) => s.getChapter() === 4 && !i.hasItem('cecilia_letter'),
      hint: 'Find Cecilia\u2019s letter. The truth about 1928 is down here.' },
    { check: (s) => s.getChapter() === 4,
      hint: 'Edwin is hiding something. Get him to confess.' },
    // Chapter 5
    { check: (s) => s.getChapter() === 5,
      hint: 'The case is solved. Decide: justice, exposure, or mercy.' },
  ];

  private getQuestHint(): string {
    const save = SaveSystem.getInstance();
    const inventory = InventorySystem.getInstance();
    for (const entry of UIScene.QUEST_HINTS) {
      if (entry.check(save, inventory)) return entry.hint;
    }
    return '';
  }

  // ─── Toggle methods ──────────────────────────────────────────────────────────

  private toggleEvidence(): void {
    if (this.evidenceOpen) {
      this.closeEvidence();
    } else {
      if (this.journalOpen) this.closeJournal();
      this.openEvidence();
    }
    this.resetAutoCollapseTimer();
  }

  private toggleJournal(): void {
    if (this.journalOpen) {
      this.closeJournal();
    } else {
      if (this.evidenceOpen) this.closeEvidence();
      this.openJournal();
    }
    this.resetAutoCollapseTimer();
  }

  private openEvidence(): void {
    this.evidenceOpen = true;
    this.evidenceGridScroll = 0;
    UISounds.panelOpen();
    this.resetDetailPanel();
    this.refreshInventoryGrid();
    this.tweens.killTweensOf(this.evidenceContainer);
    this.evidenceContainer.setVisible(true);
    this.evidenceContainer.setAlpha(0);
    this.tweens.add({ targets: this.evidenceContainer, alpha: 1, duration: 200 });
  }

  private closeEvidence(): void {
    this.evidenceOpen = false;
    this.tweens.killTweensOf(this.evidenceContainer);
    this.tweens.add({
      targets: this.evidenceContainer, alpha: 0, duration: 200,
      onComplete: () => { if (!this.evidenceOpen) this.evidenceContainer.setVisible(false); },
    });
  }

  private openJournal(): void {
    this.journalOpen = true;
    UISounds.panelOpen();
    this.journalPage = 0;
    this.refreshJournalContent();
    this.tweens.killTweensOf(this.journalContainer);
    this.journalContainer.setVisible(true);
    this.journalContainer.setAlpha(0);
    this.tweens.add({ targets: this.journalContainer, alpha: 1, duration: 200 });
  }

  private closeJournal(): void {
    this.journalOpen = false;
    this.tweens.killTweensOf(this.journalContainer);
    this.tweens.add({
      targets: this.journalContainer, alpha: 0, duration: 200,
      onComplete: () => { if (!this.journalOpen) this.journalContainer.setVisible(false); },
    });
  }

  // ─── Shared book panel background ────────────────────────────────────────────

  private drawBookPanel(
    container: Phaser.GameObjects.Container,
    title: string,
    onClose: () => void,
  ): BookPanelLayout {
    const { width, height } = this.cameras.main;

    // Full-screen dark overlay
    const overlay = createOverlay(this, 0.88);
    container.add(overlay);

    // Panel dimensions
    const panelW = Math.min(width - 60, 1650);
    const panelH = height - 60; // full height minus padding
    const panelX = width / 2;
    const panelY = panelH / 2 + 15;

    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;

    // Leather-bound book background
    const bookGfx = this.add.graphics();
    bookGfx.fillStyle(BOOK_LEATHER, 1);
    bookGfx.fillRoundedRect(panelLeft, panelTop, panelW, panelH, 8);

    const paperLeft = panelLeft + LEATHER_BORDER;
    const paperTop = panelTop + LEATHER_BORDER;
    const paperW = panelW - LEATHER_BORDER * 2;
    const paperH = panelH - LEATHER_BORDER * 2;
    bookGfx.fillStyle(BOOK_PAPER, 1);
    bookGfx.fillRoundedRect(paperLeft, paperTop, paperW, paperH, 4);

    // Spine binding
    const spineX = panelLeft + LEATHER_BORDER + 6;
    bookGfx.lineStyle(3, BOOK_SPINE, 0.5);
    bookGfx.lineBetween(spineX, paperTop + 8, spineX, paperTop + paperH - 8);
    bookGfx.lineStyle(1, BOOK_SPINE, 0.25);
    bookGfx.lineBetween(spineX + 4, paperTop + 8, spineX + 4, paperTop + paperH - 8);

    // Leather edge
    bookGfx.lineStyle(1, 0x5a4a3a, 0.4);
    bookGfx.strokeRoundedRect(panelLeft + 1, panelTop + 1, panelW - 2, panelH - 2, 8);
    bookGfx.lineStyle(1, 0x1a0e08, 0.6);
    bookGfx.strokeRoundedRect(panelLeft, panelTop, panelW, panelH, 8);
    container.add(bookGfx);

    // Subtle aged paper texture — very faint stains
    const stainGfx = this.add.graphics();
    stainGfx.fillStyle(BOOK_STAIN, 0.03);
    stainGfx.fillEllipse(panelX - panelW / 4, panelY - panelH / 5, 90, 40);
    stainGfx.fillEllipse(panelX + panelW / 3, panelY + panelH / 6, 70, 30);
    stainGfx.fillEllipse(panelX - panelW / 6, panelY + panelH / 4, 80, 34);
    stainGfx.fillStyle(BOOK_STAIN, 0.02);
    stainGfx.fillEllipse(panelX + panelW / 5, panelY - panelH / 3, 60, 25);
    container.add(stainGfx);

    // Header
    const headerH = 72;
    const headerY = panelTop + LEATHER_BORDER + headerH / 2;

    const headerBg = this.add.rectangle(panelX, headerY, paperW, headerH, 0x3a2a1a, 0.15);
    container.add(headerBg);

    const headerLineGfx = this.add.graphics();
    headerLineGfx.lineStyle(1.5, BOOK_LEATHER, 0.3);
    headerLineGfx.lineBetween(paperLeft + 20, paperTop + headerH, paperLeft + paperW - 20, paperTop + headerH);
    container.add(headerLineGfx);

    const titleText = this.add.text(panelX, headerY, title, {
      fontFamily: JOURNAL_FONT, fontSize: '32px', color: '#3a2a1a',
      fontStyle: 'bold italic', letterSpacing: 6,
    }).setOrigin(0.5);
    container.add(titleText);

    // Decorative flourish
    const flourishGfx = this.add.graphics();
    flourishGfx.lineStyle(1, 0x3a2a1a, 0.3);
    const flourishW = 140;
    flourishGfx.lineBetween(panelX - flourishW, headerY + 18, panelX + flourishW, headerY + 18);
    flourishGfx.fillStyle(0x3a2a1a, 0.4);
    const fd = 4;
    flourishGfx.fillPoints([
      new Phaser.Geom.Point(panelX, headerY + 18 - fd),
      new Phaser.Geom.Point(panelX + fd, headerY + 18),
      new Phaser.Geom.Point(panelX, headerY + 18 + fd),
      new Phaser.Geom.Point(panelX - fd, headerY + 18),
    ], true);
    container.add(flourishGfx);

    // Close button
    const closeBtn = createCloseButton(this, panelLeft + panelW - LEATHER_BORDER - 30, headerY, onClose, 120);
    container.add(closeBtn);

    // Content area
    const contentTop = paperTop + headerH + 18;
    const contentBottom = panelTop + panelH - LEATHER_BORDER - 18;

    return {
      panelLeft, panelTop, panelW, panelH, panelX, panelY,
      paperLeft, paperTop, paperW, paperH,
      contentTop, contentBottom, headerY,
    };
  }

  // ─── Evidence Panel ──────────────────────────────────────────────────────────

  private createEvidencePanel(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setDepth(Depths.inventoryPanel);

    const layout = this.drawBookPanel(container, 'COLLECTED EVIDENCE', () => this.closeEvidence());

    this.evidenceContent = this.add.container(0, 0);
    container.add(this.evidenceContent);
    this.createEvidenceContent(layout);

    return container;
  }

  private createEvidenceContent(layout: BookPanelLayout): void {
    const { paperLeft, paperW, contentTop, contentBottom } = layout;
    const contentH = contentBottom - contentTop;
    const leftW = paperW * 0.52;
    const rightW = paperW - leftW - 50;
    const leftX = paperLeft + 26;
    const rightX = leftX + leftW + 26;

    // Items grid (scrollable)
    this.itemsGrid = this.add.container(0, 0);
    this.evidenceContent.add(this.itemsGrid);

    // Mask the items grid to the left column area
    const gridMaskGfx = this.make.graphics({});
    gridMaskGfx.fillRect(leftX, contentTop, leftW, contentH);
    const gridMask = new Phaser.Display.Masks.GeometryMask(this, gridMaskGfx);
    this.itemsGrid.setMask(gridMask);

    // Right detail panel — subtle inset
    const detailCenterX = rightX + rightW / 2;
    const detailCenterY = contentTop + contentH / 2;

    const detailBg = this.add.rectangle(detailCenterX, detailCenterY, rightW, contentH, 0x3a2a1a, 0.06);
    detailBg.setStrokeStyle(1, BOOK_LEATHER, 0.15);
    this.evidenceContent.add(detailBg);

    this.detailPlaceholder = this.add.text(detailCenterX, detailCenterY,
      'Select an item to inspect', {
      fontFamily: JOURNAL_FONT, fontSize: '28px', color: '#6a5a4a',
      fontStyle: 'italic', align: 'center',
    }).setOrigin(0.5);
    this.evidenceContent.add(this.detailPlaceholder);

    this.detailImage = null;

    this.detailName = this.add.text(detailCenterX, contentTop + 32, '', {
      fontFamily: JOURNAL_FONT, fontSize: '34px', color: '#3a2a1a',
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailName);

    this.detailKeyBadge = this.add.container(detailCenterX, contentTop + 80);
    const badgeBg = this.add.rectangle(0, 0, 180, 38, TAB_GOLD, 0.15);
    badgeBg.setStrokeStyle(1.5, TAB_GOLD, 0.4);
    const badgeText = this.add.text(0, 0, '★  KEY EVIDENCE', {
      fontFamily: JOURNAL_FONT, fontSize: '18px', color: TAB_GOLD_STR, letterSpacing: 2,
    }).setOrigin(0.5);
    this.detailKeyBadge.add([badgeBg, badgeText]);
    this.detailKeyBadge.setVisible(false);
    this.evidenceContent.add(this.detailKeyBadge);

    this.detailDesc = this.add.text(detailCenterX, contentTop + 120, '', {
      fontFamily: JOURNAL_FONT, fontSize: '26px', color: BOOK_INK,
      wordWrap: { width: rightW - 60 }, lineSpacing: 7, align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailDesc);

    // ── Discovery counters (bottom of left panel) ──
    this.hotspotCounterText = this.add.text(leftX + leftW / 2, contentBottom - 55, '', {
      fontFamily: JOURNAL_FONT, fontSize: '22px', color: '#5a4a3a',
      align: 'center',
    }).setOrigin(0.5, 1);
    this.evidenceContent.add(this.hotspotCounterText);

    this.roomItemCounterText = this.add.text(leftX + leftW / 2, contentBottom - 28, '', {
      fontFamily: JOURNAL_FONT, fontSize: '22px', color: '#5a4a3a',
      align: 'center',
    }).setOrigin(0.5, 1);
    this.evidenceContent.add(this.roomItemCounterText);

    this.evidenceLayout = { leftX, contentTop, contentH, contentBottom, leftW, rightW, rightX };
  }

  private _refreshingGrid = false;

  private refreshInventoryGrid(): void {
    if (this._refreshingGrid) return;
    this._refreshingGrid = true;
    try {

    this.itemsGrid.removeAll(true);

    const inventory = InventorySystem.getInstance();
    // Show all collected items: current inventory + previously used items
    const currentItems = inventory.getItems();
    const usedItems = inventory.getUsedItems().filter(id => !currentItems.includes(id));
    const items = [...currentItems, ...usedItems];
    const selectedItem = inventory.getSelectedItem();

    const { leftX, contentTop, contentH, leftW } = this.evidenceLayout;

    const cols = 3;
    const cardW = Math.floor((leftW - 40) / cols) - 14;
    const cardH = cardW + 50;
    const gap = 16;
    const gridStartX = leftX + 18;
    const gridStartY = contentTop + 16;

    if (items.length === 0) {
      const emptyText = this.add.text(
        leftX + leftW / 2, contentTop + contentH / 2,
        'No evidence collected yet.\n\nExplore the theater to find items.',
        { fontFamily: JOURNAL_FONT, fontSize: '26px', color: '#6a5a4a',
          fontStyle: 'italic', align: 'center', lineSpacing: 8 }
      ).setOrigin(0.5);
      this.itemsGrid.add(emptyText);
      this._refreshingGrid = false;
      return;
    }

    items.forEach((itemId, index) => {
      const itemData = itemMap.get(itemId);
      if (!itemData) return;

      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = gridStartX + col * (cardW + gap) + cardW / 2;
      const y = gridStartY + row * (cardH + gap) + cardW / 2;

      const isSelected = selectedItem === itemId;
      const isInspected = this.selectedItemId === itemId;

      const cardBg = this.add.rectangle(x, y + 10, cardW, cardH, 0x3a2a1a, 0.08);
      const borderColor = isSelected ? Colors.success : (isInspected ? TAB_GOLD : BOOK_LEATHER);
      const borderAlpha = isSelected ? 0.9 : (isInspected ? 0.7 : 0.2);
      cardBg.setStrokeStyle(isSelected || isInspected ? 2 : 1, borderColor, borderAlpha);
      cardBg.setInteractive({ cursor: POINTER_CURSOR });

      const iconKey = `item_icon_${itemId}`;
      const imgSize = cardW - 30;
      let icon: Phaser.GameObjects.GameObject;
      if (this.textures.exists(iconKey)) {
        const img = this.add.image(x, y, iconKey);
        this.scaleImageToFit(img, imgSize);
        icon = img;
      } else {
        icon = this.add.text(x, y, itemData.icon || '?', { fontSize: '72px' }).setOrigin(0.5);
      }

      const label = this.add.text(x, y + cardW / 2 + 8, itemData.name, {
        fontFamily: JOURNAL_FONT, fontSize: '22px',
        color: isSelected ? TextColors.success : '#3a2a1a',
        align: 'center', wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5, 0);

      if (isSelected) {
        const selBadge = this.add.text(x + cardW / 2 - 9, y - cardW / 2 + 15, '✓', {
          fontFamily: FONT, fontSize: '21px', color: TextColors.success, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.itemsGrid.add(selBadge);
      }

      // Show "USED" badge for consumed items
      if (inventory.isUsed(itemId)) {
        const usedBg = this.add.rectangle(x, y + cardW / 2 - 6, 60, 22, 0x5a3a2a, 0.85);
        usedBg.setStrokeStyle(1, 0x8a6a4a, 0.5);
        const usedLabel = this.add.text(x, y + cardW / 2 - 6, 'USED', {
          fontFamily: FONT, fontSize: '13px', color: '#c9a84c', fontStyle: 'bold', letterSpacing: 2,
        }).setOrigin(0.5);
        this.itemsGrid.add([usedBg, usedLabel]);
      }

      cardBg.on('pointerdown', () => {
        if (this.selectedItemId === itemId && selectedItem === itemId) {
          // Already inspected and equipped — unequip
          inventory.selectItem(null);
        } else {
          this.showItemDetail(itemId);
          // Only equip items that are actually usable on hotspots
          if (equippableItems.has(itemId) && !inventory.isUsed(itemId)) {
            inventory.selectItem(itemId);
          }
        }
        this.refreshInventoryGrid();
      });

      cardBg.on('pointerover', () => {
        cardBg.setFillStyle(0x3a2a1a, 0.12);
        cardBg.setStrokeStyle(2, TAB_GOLD, 0.5);
      });
      cardBg.on('pointerout', () => {
        const isCurrentlyInspected = this.selectedItemId === itemId;
        if (!isCurrentlyInspected) {
          cardBg.setFillStyle(0x3a2a1a, 0.08);
          const bc = (selectedItem === itemId) ? Colors.success : BOOK_LEATHER;
          const ba = (selectedItem === itemId) ? 0.9 : 0.2;
          cardBg.setStrokeStyle((selectedItem === itemId) ? 2 : 1, bc, ba);
        }
      });

      this.itemsGrid.add([cardBg, icon, label]);
    });

    // Calculate grid scroll bounds
    const totalRows = Math.ceil(items.length / cols);
    const gridTotalH = gridStartY + totalRows * (cardH + gap) + 20;
    const visibleBottom = contentTop + contentH - 60; // leave room for counters
    this.evidenceGridMaxScroll = Math.max(0, gridTotalH - visibleBottom);
    this.evidenceGridScroll = Math.min(this.evidenceGridScroll, this.evidenceGridMaxScroll);
    this.itemsGrid.setY(-this.evidenceGridScroll);

    // Update discovery counters
    this.updateDiscoveryCounters();

    } finally {
      this._refreshingGrid = false;
    }
  }

  private updateDiscoveryCounters(): void {
    const save = SaveSystem.getInstance();
    const currentRoomId = save.getCurrentRoom();
    const rooms = roomsData.rooms as { id: string; hotspots: { id: string; type: string; itemId?: string; hideWhen?: string }[] }[];
    const currentRoom = rooms.find(r => r.id === currentRoomId);

    // Hotspot discovery counter (across all rooms, only currently available clues)
    let totalHotspots = 0;
    let discoveredHotspots = 0;
    for (const room of rooms) {
      for (const hs of room.hotspots) {
        const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
        if (!isClueType) continue;
        if (!this.isHotspotAvailable((hs as { showWhen?: string }).showWhen)) continue;
        if (this.isHotspotHidden(hs.hideWhen)) continue;
        totalHotspots++;
        if (save.getFlag('used_hotspot_' + hs.id)) {
          discoveredHotspots++;
        }
      }
    }
    if (this.hotspotCounterText) {
      this.hotspotCounterText.setText(`🔍 Clues Discovered: ${discoveredHotspots} / ${totalHotspots}`);
    }

    // Per-room clue counter (all interactive hotspot types, consistent with total counter)
    if (currentRoom && this.roomItemCounterText) {
      const roomHotspots = currentRoom.hotspots.filter(
        (hs: { type: string; showWhen?: string; hideWhen?: string }) => {
          const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
          return isClueType && this.isHotspotAvailable(hs.showWhen) && !this.isHotspotHidden(hs.hideWhen);
        }
      );
      const foundInRoom = roomHotspots.filter(
        (hs: { id: string }) => save.getFlag('used_hotspot_' + hs.id)
      ).length;
      const remaining = roomHotspots.length - foundInRoom;
      const roomName = currentRoomId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      if (remaining > 0) {
        this.roomItemCounterText.setText(`📍 ${roomName}: ${foundInRoom} / ${roomHotspots.length} places to check`);
      } else {
        this.roomItemCounterText.setText(`📍 ${roomName}: All ${roomHotspots.length} places checked ✓`);
      }
    }
  }

  private resetDetailPanel(): void {
    this.selectedItemId = null;
    this.detailPlaceholder.setVisible(true);
    this.detailName.setVisible(false);
    this.detailKeyBadge.setVisible(false);
    this.detailDesc.setVisible(false);
    if (this.detailImage) this.detailImage.setVisible(false);
    this.hideLoreText();
    this.hideUsedBadgeInDetail();
  }

  private scaleImageToFit(img: Phaser.GameObjects.Image, maxSize: number): void {
    const tex = img.texture.getSourceImage();
    const scale = Math.min(maxSize / tex.width, maxSize / tex.height);
    img.setScale(scale);
  }

  private showItemDetail(itemId: string): void {
    if (this.selectedItemId === itemId) return;
    this.selectedItemId = itemId;

    const itemData = itemMap.get(itemId);
    if (!itemData) return;

    const { rightX, rightW, contentTop } = this.evidenceLayout;
    const detailCenterX = rightX + rightW / 2;

    this.detailPlaceholder.setVisible(false);

    this.detailName.setText(itemData.name);
    this.detailName.setVisible(true);

    const isKey = (itemData as { isKeyItem?: boolean }).isKeyItem;
    this.detailKeyBadge.setVisible(!!isKey);

    const descY = isKey ? contentTop + 102 : contentTop + 72;

    const iconKey = `item_icon_${itemId}`;
    if (this.textures.exists(iconKey)) {
      const imgMaxSize = Math.min(rightW - 60, 280);
      if (this.detailImage) {
        this.detailImage.setTexture(iconKey);
        this.detailImage.setPosition(detailCenterX, descY + 20);
      } else {
        const img = this.add.image(detailCenterX, descY + 20, iconKey);
        img.setOrigin(0.5, 0);
        this.detailImage = img;
        this.evidenceContent.add(img);
      }
      this.scaleImageToFit(this.detailImage, imgMaxSize);
      this.detailImage.setVisible(true);

      const tex = this.detailImage.texture.getSourceImage();
      const imgBottom = descY + 20 + tex.height * this.detailImage.scaleY + 16;
      this.detailDesc.setPosition(detailCenterX, imgBottom);
    } else {
      if (this.detailImage) this.detailImage.setVisible(false);
      this.detailDesc.setPosition(detailCenterX, descY + 20);
    }

    this.detailDesc.setText(itemData.description);
    this.detailDesc.setVisible(true);

    // Show lore text below description if available
    const lore = (itemData as { lore?: string }).lore;
    if (lore) {
      this.showLoreText(detailCenterX, lore);
    } else {
      this.hideLoreText();
    }

    // Show "USED" indicator in detail panel if item was consumed
    if (InventorySystem.getInstance().isUsed(itemId)) {
      this.showUsedBadgeInDetail(detailCenterX, contentTop);
    } else {
      this.hideUsedBadgeInDetail();
    }
  }

  // ─── Lore text helpers ──────────────────────────────────────────────────────

  private showLoreText(centerX: number, lore: string): void {
    this.hideLoreText();

    const { rightW, contentBottom } = this.evidenceLayout;
    const descBottom = this.detailDesc.y + this.detailDesc.height + 16;

    const maxLoreBottom = contentBottom - 10;
    const availableH = maxLoreBottom - descBottom - 14;
    if (availableH <= 0) return; // no room for lore

    // Divider line
    this.detailLoreDivider = this.add.graphics();
    this.detailLoreDivider.lineStyle(1, 0x5a4a3a, 0.3);
    this.detailLoreDivider.lineBetween(centerX - (rightW - 80) / 2, descBottom, centerX + (rightW - 80) / 2, descBottom);
    this.evidenceContent.add(this.detailLoreDivider);

    this.detailLoreText = this.add.text(centerX, descBottom + 14, lore, {
      fontFamily: JOURNAL_FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'italic', wordWrap: { width: rightW - 70 }, lineSpacing: 5, align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailLoreText);

  }

  private hideLoreText(): void {
    if (this.detailLoreText) { this.detailLoreText.destroy(); this.detailLoreText = null; }
    if (this.detailLoreDivider) { this.detailLoreDivider.destroy(); this.detailLoreDivider = null; }
  }

  private showUsedBadgeInDetail(centerX: number, contentTop: number): void {
    this.hideUsedBadgeInDetail();
    this.detailUsedBadge = this.add.container(centerX, contentTop + 8);
    const bg = this.add.rectangle(0, 0, 100, 28, 0x5a3a2a, 0.7);
    bg.setStrokeStyle(1, 0x8a6a4a, 0.5);
    const txt = this.add.text(0, 0, '✦ USED', {
      fontFamily: FONT, fontSize: '14px', color: '#c9a84c', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5);
    this.detailUsedBadge.add([bg, txt]);
    this.evidenceContent.add(this.detailUsedBadge);
  }

  private hideUsedBadgeInDetail(): void {
    if (this.detailUsedBadge) { this.detailUsedBadge.destroy(); this.detailUsedBadge = null; }
  }

  // ─── Journal Panel ───────────────────────────────────────────────────────────

  private createJournalPanel(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setDepth(Depths.journalPanel);

    const layout = this.drawBookPanel(container, "NANCY'S JOURNAL", () => this.closeJournal());

    // Replace the default title with Playfair Display SC for the journal
    const children = container.list as Phaser.GameObjects.GameObject[];
    for (const child of children) {
      if (child instanceof Phaser.GameObjects.Text && child.text === "NANCY'S JOURNAL") {
        child.setFontFamily(JOURNAL_TITLE);
        child.setFontSize(34);
        child.setLetterSpacing(8);
        break;
      }
    }

    this.journalBookLayout = { ...layout };

    // Draw center spine dividing the two pages
    const spineGfx = this.add.graphics();
    const spineX = layout.panelX;
    spineGfx.lineStyle(3, BOOK_SPINE, 0.45);
    spineGfx.lineBetween(spineX, layout.contentTop - 4, spineX, layout.contentBottom + 4);
    spineGfx.lineStyle(1, BOOK_SPINE, 0.2);
    spineGfx.lineBetween(spineX - 4, layout.contentTop - 4, spineX - 4, layout.contentBottom + 4);
    spineGfx.lineBetween(spineX + 4, layout.contentTop - 4, spineX + 4, layout.contentBottom + 4);
    // Shadow along spine
    spineGfx.fillStyle(0x000000, 0.06);
    spineGfx.fillRect(spineX - 12, layout.contentTop - 4, 24, layout.contentBottom - layout.contentTop + 8);
    container.add(spineGfx);

    this.journalContent = this.add.container(0, 0);
    container.add(this.journalContent);

    return container;
  }

  /** Render one page of journal entries. Returns the number of entries actually rendered. */
  private renderJournalPage(
    entries: string[],
    startGlobalIdx: number,
    pageLeft: number,
    pageW: number,
    pageTop: number,
    pageBottom: number,
  ): number {
    const pad = 24;
    const entryLeft = pageLeft + pad;
    const entryTextW = pageW - pad * 2;
    const entryGap = 14;

    let y = pageTop + 8;
    let count = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const globalIdx = startGlobalIdx + i;
      const isThinking = entry.startsWith('Thinking:');
      const isEvidence = entry.startsWith('Found ');

      let displayText = entry;
      if (isThinking) displayText = entry.replace(/^Thinking:\s*/, '');

      const xJitter = ((globalIdx * 7) % 5) - 2;

      let fontSize: number;
      let color: string;
      let prefix: string;

      if (isThinking) {
        fontSize = 26; color = '#5a4a3a'; prefix = '— ';
      } else if (isEvidence) {
        fontSize = 26; color = '#3a2a1a'; prefix = '• ';
      } else {
        fontSize = 28; color = '#2a1a0a'; prefix = '';
      }

      const text = this.add.text(entryLeft + xJitter, y, prefix + displayText, {
        fontFamily: JOURNAL_HAND,
        fontSize: `${fontSize}px`,
        color,
        fontStyle: isThinking ? 'normal' : 'bold',
        wordWrap: { width: isThinking ? entryTextW - 16 : entryTextW },
        lineSpacing: 6,
      });

      // Check if this entry would overflow the page
      if (y + text.height > pageBottom && count > 0) {
        text.destroy();
        break;
      }

      const angle = ((globalIdx * 13 + 5) % 7 - 3) * 0.08;
      text.setRotation(angle * Math.PI / 180);

      this.journalContent.add(text);
      y += text.height + entryGap;
      count++;
    }

    return count;
  }

  private refreshJournalContent(): void {
    this.journalContent.removeAll(true);

    const { panelX, paperLeft, paperW, contentTop, contentBottom } = this.journalBookLayout;
    const save = SaveSystem.getInstance();
    const journal = save.getJournal();

    // ─── Two-page geometry ───
    const pageGutter = 22;
    const leftPageLeft = paperLeft + 20;
    const leftPageRight = panelX - pageGutter;
    const rightPageLeft = panelX + pageGutter;
    const rightPageRight = paperLeft + paperW - 20;
    const leftPageW = leftPageRight - leftPageLeft;
    const rightPageW = rightPageRight - rightPageLeft;

    const pageTop = contentTop + 8;
    const pageBottom = contentBottom - 10;

    if (journal.length === 0) {
      const empty = this.add.text(
        panelX, (pageTop + pageBottom) / 2,
        "Nothing yet...\n\nExplore the theater and talk to people\nto fill this journal.", {
          fontFamily: JOURNAL_HAND, fontSize: '30px', color: '#8a7a6a',
          align: 'center', lineSpacing: 8,
        }).setOrigin(0.5);
      this.journalContent.add(empty);
      return;
    }

    // ── Render-based pagination: render left page, then right page ──
    // We skip forward by this.journalPage spreads worth of entries.
    // To find where each spread starts, we render off-screen to measure.
    let spreadStart = 0;
    for (let s = 0; s < this.journalPage; s++) {
      const leftFit = this.measurePageCapacity(journal, spreadStart, leftPageW, pageBottom - pageTop);
      const rightFit = this.measurePageCapacity(journal, spreadStart + leftFit, rightPageW, pageBottom - pageTop);
      spreadStart += leftFit + rightFit;
      if (spreadStart >= journal.length) { spreadStart = 0; break; }
    }

    // Render left page
    const leftEntries = journal.slice(spreadStart);
    const leftRendered = this.renderJournalPage(leftEntries, spreadStart, leftPageLeft, leftPageW, pageTop, pageBottom);

    // Render right page
    const rightStart = spreadStart + leftRendered;
    const rightEntries = journal.slice(rightStart);
    let rightRendered = 0;
    if (rightEntries.length > 0) {
      rightRendered = this.renderJournalPage(rightEntries, rightStart, rightPageLeft, rightPageW, pageTop, pageBottom);
    }

    const totalOnSpread = leftRendered + rightRendered;
    const hasMore = rightStart + rightRendered < journal.length;
    const hasPrev = this.journalPage > 0;

    // ── Page navigation — centered at bottom across both pages ──
    if (hasMore || hasPrev) {
      const navY = pageBottom + 2;
      const totalSpreads = this.countTotalSpreads(journal, leftPageW, rightPageW, pageBottom - pageTop);

      const pageText = this.add.text(panelX, navY, `— ${this.journalPage + 1} / ${totalSpreads} —`, {
        fontFamily: JOURNAL_HAND, fontSize: '22px', color: '#8a7a6a',
      }).setOrigin(0.5);
      this.journalContent.add(pageText);

      if (hasPrev) {
        const prevBtn = this.add.text(panelX - 120, navY, '< prev', {
          fontFamily: JOURNAL_HAND, fontSize: '24px', color: '#5a3a2a', fontStyle: 'bold',
        }).setOrigin(1, 0.5);
        prevBtn.setInteractive({ cursor: POINTER_CURSOR });
        prevBtn.on('pointerover', () => prevBtn.setColor(TAB_GOLD_STR));
        prevBtn.on('pointerout', () => prevBtn.setColor('#5a3a2a'));
        prevBtn.on('pointerdown', () => { this.journalPage--; this.refreshJournalContent(); });
        this.journalContent.add(prevBtn);
      }

      if (hasMore) {
        const nextBtn = this.add.text(panelX + 120, navY, 'next >', {
          fontFamily: JOURNAL_HAND, fontSize: '24px', color: '#5a3a2a', fontStyle: 'bold',
        }).setOrigin(0, 0.5);
        nextBtn.setInteractive({ cursor: POINTER_CURSOR });
        nextBtn.on('pointerover', () => nextBtn.setColor(TAB_GOLD_STR));
        nextBtn.on('pointerout', () => nextBtn.setColor('#5a3a2a'));
        nextBtn.on('pointerdown', () => { this.journalPage++; this.refreshJournalContent(); });
        this.journalContent.add(nextBtn);
      }
    }
  }

  /** Measure how many entries fit on a page by creating temporary text objects. */
  private measurePageCapacity(entries: string[], startIdx: number, pageW: number, maxH: number): number {
    const pad = 24;
    const entryTextW = pageW - pad * 2;
    const entryGap = 14;
    let y = 8;
    let count = 0;

    for (let i = startIdx; i < entries.length; i++) {
      const entry = entries[i];
      const isThinking = entry.startsWith('Thinking:');
      let displayText = isThinking ? entry.replace(/^Thinking:\s*/, '') : entry;
      const prefix = isThinking ? '— ' : entry.startsWith('Found ') ? '• ' : '';
      const fontSize = (isThinking || entry.startsWith('Found ')) ? 26 : 28;

      const temp = this.add.text(0, 0, prefix + displayText, {
        fontFamily: JOURNAL_HAND,
        fontSize: `${fontSize}px`,
        fontStyle: isThinking ? 'normal' : 'bold',
        wordWrap: { width: isThinking ? entryTextW - 16 : entryTextW },
        lineSpacing: 6,
      }).setVisible(false);

      const h = temp.height;
      temp.destroy();

      if (y + h > maxH && count > 0) break;
      y += h + entryGap;
      count++;
    }

    return Math.max(count, startIdx < entries.length ? 1 : 0);
  }

  /** Count total spreads for page numbering. */
  private countTotalSpreads(entries: string[], leftW: number, rightW: number, pageH: number): number {
    let idx = 0;
    let spreads = 0;
    while (idx < entries.length) {
      const leftFit = this.measurePageCapacity(entries, idx, leftW, pageH);
      const rightFit = this.measurePageCapacity(entries, idx + leftFit, rightW, pageH);
      idx += leftFit + rightFit;
      spreads++;
    }
    return Math.max(1, spreads);
  }

  // ─── Settings Panel ──────────────────────────────────────────────────────────

  private toggleSettings(): void {
    if (this.settingsOpen) {
      this.closeSettings();
    } else {
      if (this.evidenceOpen) this.closeEvidence();
      if (this.journalOpen) this.closeJournal();
      this.openSettings();
    }
  }

  private openSettings(): void {
    this.settingsOpen = true;
    UISounds.panelOpen();
    this.refreshSettingsContent();
    this.tweens.killTweensOf(this.settingsContainer);
    this.settingsContainer.setVisible(true);
    this.settingsContainer.setAlpha(0);
    this.tweens.add({ targets: this.settingsContainer, alpha: 1, duration: 200 });
  }

  private closeSettings(): void {
    this.settingsOpen = false;
    this.tweens.killTweensOf(this.settingsContainer);
    this.tweens.add({
      targets: this.settingsContainer, alpha: 0, duration: 200,
      onComplete: () => { if (!this.settingsOpen) this.settingsContainer.setVisible(false); },
    });
  }

  private settingsContent!: Phaser.GameObjects.Container;
  private settingsBookLayout = { panelW: 0, panelX: 0, contentTop: 0, contentBottom: 0, paperLeft: 0, paperW: 0 };
  private settingsScrollY = 0;
  private settingsMaxScroll = 0;

  private createSettingsPanel(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setDepth(Depths.journalPanel + 5);

    const layout = this.drawBookPanel(container, 'SETTINGS', () => this.closeSettings());
    this.settingsBookLayout = {
      panelW: layout.paperW,
      panelX: layout.panelX,
      contentTop: layout.contentTop,
      contentBottom: layout.contentBottom,
      paperLeft: layout.paperLeft,
      paperW: layout.paperW,
    };

    this.settingsContent = this.add.container(0, 0);
    container.add(this.settingsContent);

    // Mask to clip content within the book panel content area
    const maskShape = this.add.graphics();
    maskShape.setVisible(false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(layout.paperLeft, layout.contentTop, layout.paperW, layout.contentBottom - layout.contentTop);
    const mask = maskShape.createGeometryMask();
    container.add(maskShape);
    this.settingsContent.setMask(mask);

    // Scroll with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (!this.settingsOpen) return;
      this.settingsScrollY = Phaser.Math.Clamp(
        this.settingsScrollY - deltaY * 0.8,
        -this.settingsMaxScroll,
        0,
      );
      this.settingsContent.setY(this.settingsScrollY);
    });

    return container;
  }

  private refreshSettingsContent(): void {
    this.settingsContent.removeAll(true);

    const { panelX, paperLeft, paperW, contentTop, contentBottom } = this.settingsBookLayout;
    const cx = panelX;
    const contentLeft = paperLeft + 40;
    const contentRight = paperLeft + paperW - 40;
    const usableW = contentRight - contentLeft;
    let y = contentTop + 30;

    // ── Sound Volume ──
    this.settingsContent.add(this.add.text(cx, y, 'SOUND VOLUME', {
      fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 44;

    const sliderW = Math.min(usableW - 60, 400);
    const sliderX = cx - sliderW / 2;
    const sliderH = 8;
    const currentVol = UISounds.getVolume();

    // Track background
    const trackBg = this.add.rectangle(cx, y, sliderW, sliderH, 0x3a2a1a, 0.3);
    trackBg.setStrokeStyle(1, 0x5a4a3a, 0.3);
    this.settingsContent.add(trackBg);

    // Fill
    const fillW = sliderW * currentVol;
    const fill = this.add.rectangle(sliderX + fillW / 2, y, fillW, sliderH, TAB_GOLD, 0.6);
    this.settingsContent.add(fill);

    // Thumb
    const thumbX = sliderX + sliderW * currentVol;
    const thumb = this.add.circle(thumbX, y, 14, TAB_GOLD, 0.9);
    thumb.setStrokeStyle(2, 0x3a2a1a, 0.4);
    this.settingsContent.add(thumb);

    // Volume percentage label
    const volLabel = this.add.text(cx, y + 28, `${Math.round(currentVol * 100)}%`, {
      fontFamily: FONT, fontSize: '24px', color: TAB_GOLD_STR, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.settingsContent.add(volLabel);

    // Interactive slider zone
    const sliderZone = this.add.rectangle(cx, y, sliderW + 28, 44, 0x000000, 0);
    sliderZone.setInteractive({ draggable: false, cursor: POINTER_CURSOR });
    this.settingsContent.add(sliderZone);

    const updateSlider = (pointerX: number) => {
      const pct = Phaser.Math.Clamp((pointerX - sliderX) / sliderW, 0, 1);
      UISounds.setVolume(pct);
      fill.setDisplaySize(sliderW * pct, sliderH);
      fill.setPosition(sliderX + (sliderW * pct) / 2, y);
      thumb.setPosition(sliderX + sliderW * pct, y);
      volLabel.setText(`${Math.round(pct * 100)}%`);
    };

    let dragging = false;
    sliderZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      updateSlider(pointer.x);
      UISounds.click();
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (dragging) updateSlider(pointer.x);
    });
    this.input.on('pointerup', () => { dragging = false; });

    y += 80;

    // ── Divider ──
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, 0x5a4a3a, 0.2);
    divGfx.lineBetween(cx - sliderW / 2, y, cx + sliderW / 2, y);
    this.settingsContent.add(divGfx);
    y += 30;

    // ── Music Volume ──
    this.settingsContent.add(this.add.text(cx, y, 'MUSIC VOLUME', {
      fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 44;

    const mSliderW = sliderW;
    const mSliderX = cx - mSliderW / 2;
    const mSliderH = 8;
    const currentMusicVol = UISounds.getMusicVolume();

    const mTrackBg = this.add.rectangle(cx, y, mSliderW, mSliderH, 0x3a2a1a, 0.3);
    mTrackBg.setStrokeStyle(1, 0x5a4a3a, 0.3);
    this.settingsContent.add(mTrackBg);

    const mFillW = mSliderW * currentMusicVol;
    const mFill = this.add.rectangle(mSliderX + mFillW / 2, y, mFillW, mSliderH, TAB_GOLD, 0.6);
    this.settingsContent.add(mFill);

    const mThumbX = mSliderX + mSliderW * currentMusicVol;
    const mThumb = this.add.circle(mThumbX, y, 14, TAB_GOLD, 0.9);
    mThumb.setStrokeStyle(2, 0x3a2a1a, 0.4);
    this.settingsContent.add(mThumb);

    const mVolLabel = this.add.text(cx, y + 28, `${Math.round(currentMusicVol * 100)}%`, {
      fontFamily: FONT, fontSize: '24px', color: TAB_GOLD_STR, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.settingsContent.add(mVolLabel);

    const mSliderZone = this.add.rectangle(cx, y, mSliderW + 28, 44, 0x000000, 0);
    mSliderZone.setInteractive({ draggable: false, cursor: POINTER_CURSOR });
    this.settingsContent.add(mSliderZone);

    const updateMusicSlider = (pointerX: number) => {
      const pct = Phaser.Math.Clamp((pointerX - mSliderX) / mSliderW, 0, 1);
      UISounds.setMusicVolume(pct);
      mFill.setDisplaySize(mSliderW * pct, mSliderH);
      mFill.setPosition(mSliderX + (mSliderW * pct) / 2, y);
      mThumb.setPosition(mSliderX + mSliderW * pct, y);
      mVolLabel.setText(`${Math.round(pct * 100)}%`);
      MusicSystem.getInstance().updateVolume();
    };

    let mDragging = false;
    mSliderZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      mDragging = true;
      updateMusicSlider(pointer.x);
      UISounds.click();
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (mDragging) updateMusicSlider(pointer.x);
    });
    this.input.on('pointerup', () => { mDragging = false; });

    y += 80;

    // ── Music Track Selector (compact carousel) ──
    this.settingsContent.add(this.add.text(cx, y, 'MUSIC TRACK', {
      fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 40;

    // Build track list: "Room Default" first, then all tracks
    const allChoices: Array<{ id: string; name: string; description: string }> = [
      { id: '__room_default__', name: 'Room Default', description: 'Each room plays its own track' },
      ...MUSIC_TRACKS,
    ];
    const isOverride = UISounds.getMusicOverride();
    const currentTrackId = isOverride ? UISounds.getMusicTrack() : '__room_default__';
    let currentIdx = allChoices.findIndex(c => c.id === currentTrackId);
    if (currentIdx < 0) currentIdx = 0;

    const carouselW = Math.min(usableW - 40, 420);
    const arrowSize = 40;
    const nameW = carouselW - arrowSize * 2 - 20;

    // Left arrow
    const leftArrow = this.add.text(cx - carouselW / 2 + arrowSize / 2, y + 18, '\u25C0', {
      fontFamily: FONT, fontSize: '32px', color: TAB_GOLD_STR,
    }).setOrigin(0.5);
    leftArrow.setInteractive({ cursor: POINTER_CURSOR });
    this.settingsContent.add(leftArrow);

    // Right arrow
    const rightArrow = this.add.text(cx + carouselW / 2 - arrowSize / 2, y + 18, '\u25B6', {
      fontFamily: FONT, fontSize: '32px', color: TAB_GOLD_STR,
    }).setOrigin(0.5);
    rightArrow.setInteractive({ cursor: POINTER_CURSOR });
    this.settingsContent.add(rightArrow);

    // Track name (centered between arrows)
    const trackNameText = this.add.text(cx, y + 10, allChoices[currentIdx].name, {
      fontFamily: FONT, fontSize: '22px', color: TAB_GOLD_STR,
      fontStyle: 'bold', align: 'center',
      wordWrap: { width: nameW },
    }).setOrigin(0.5, 0);
    this.settingsContent.add(trackNameText);

    // Track description (below name)
    const trackDescText = this.add.text(cx, y + 38, allChoices[currentIdx].description, {
      fontFamily: FONT, fontSize: '15px', color: '#7a6a5a',
      fontStyle: 'italic', align: 'center',
      wordWrap: { width: nameW },
    }).setOrigin(0.5, 0);
    this.settingsContent.add(trackDescText);

    // Playing indicator
    const playingNote = this.add.text(cx, y + 62, '\u266A  Now Playing', {
      fontFamily: FONT, fontSize: '13px', color: '#6a8a5a',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0);
    playingNote.setVisible(currentIdx > 0); // visible when a specific track is selected
    this.settingsContent.add(playingNote);

    const selectTrack = (idx: number) => {
      const choice = allChoices[idx];
      trackNameText.setText(choice.name);
      trackDescText.setText(choice.description);

      if (choice.id === '__room_default__') {
        UISounds.setMusicOverride(false);
        playingNote.setVisible(false);
      } else {
        UISounds.setMusicTrack(choice.id);
        UISounds.setMusicOverride(true);
        MusicSystem.getInstance().play(choice.id);
        playingNote.setVisible(true);
      }
      UISounds.click();
    };

    leftArrow.on('pointerdown', () => {
      currentIdx = (currentIdx - 1 + allChoices.length) % allChoices.length;
      selectTrack(currentIdx);
    });
    rightArrow.on('pointerdown', () => {
      currentIdx = (currentIdx + 1) % allChoices.length;
      selectTrack(currentIdx);
    });
    leftArrow.on('pointerover', () => leftArrow.setColor('#e0d0a0'));
    leftArrow.on('pointerout', () => leftArrow.setColor(TAB_GOLD_STR));
    rightArrow.on('pointerover', () => rightArrow.setColor('#e0d0a0'));
    rightArrow.on('pointerout', () => rightArrow.setColor(TAB_GOLD_STR));

    y += 90;

    // ── Divider ──
    const divGfxMusic = this.add.graphics();
    divGfxMusic.lineStyle(1, 0x5a4a3a, 0.2);
    divGfxMusic.lineBetween(cx - sliderW / 2, y, cx + sliderW / 2, y);
    this.settingsContent.add(divGfxMusic);
    y += 30;

    // ── Text Speed ──
    this.settingsContent.add(this.add.text(cx, y, 'TEXT SPEED', {
      fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 44;

    const speedPresets: Array<{ label: string; value: 'slow' | 'normal' | 'fast' | 'instant' }> = [
      { label: 'Slow', value: 'slow' },
      { label: 'Normal', value: 'normal' },
      { label: 'Fast', value: 'fast' },
      { label: 'Instant', value: 'instant' },
    ];
    const btnW = 110;
    const btnH = 42;
    const btnGap = 12;
    const totalBtnsW = speedPresets.length * btnW + (speedPresets.length - 1) * btnGap;
    let bx = cx - totalBtnsW / 2 + btnW / 2;
    const currentSpeed = UISounds.getTextSpeed();

    for (const preset of speedPresets) {
      const isActive = preset.value === currentSpeed;
      const bg = this.add.rectangle(bx, y + btnH / 2, btnW, btnH,
        isActive ? TAB_GOLD : 0x3a2a1a, isActive ? 0.7 : 0.2);
      bg.setStrokeStyle(1.5, TAB_GOLD, isActive ? 0.8 : 0.3);
      bg.setInteractive({ cursor: POINTER_CURSOR });
      this.settingsContent.add(bg);

      const txt = this.add.text(bx, y + btnH / 2, preset.label, {
        fontFamily: FONT, fontSize: '18px',
        color: isActive ? '#2a1a0a' : TAB_GOLD_STR,
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      this.settingsContent.add(txt);

      bg.on('pointerdown', () => {
        UISounds.setTextSpeed(preset.value);
        UISounds.click();
        this.refreshSettingsContent();
      });
      bg.on('pointerover', () => { if (preset.value !== UISounds.getTextSpeed()) bg.setFillStyle(0x3a2a1a, 0.4); });
      bg.on('pointerout', () => { if (preset.value !== UISounds.getTextSpeed()) bg.setFillStyle(0x3a2a1a, 0.2); });

      bx += btnW + btnGap;
    }
    y += btnH + 40;

    // ── Divider ──
    const divGfx1b = this.add.graphics();
    divGfx1b.lineStyle(1, 0x5a4a3a, 0.2);
    divGfx1b.lineBetween(cx - sliderW / 2, y, cx + sliderW / 2, y);
    this.settingsContent.add(divGfx1b);
    y += 30;

    // ── Toggles Row: Particles & Fullscreen ──
    this.settingsContent.add(this.add.text(cx, y, 'DISPLAY', {
      fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 44;

    const toggles: Array<{ label: string; active: boolean; onToggle: () => void }> = [
      {
        label: 'Particles',
        active: UISounds.getParticlesEnabled(),
        onToggle: () => {
          UISounds.setParticlesEnabled(!UISounds.getParticlesEnabled());
          this.refreshSettingsContent();
        },
      },
      {
        label: 'Fullscreen',
        active: !!document.fullscreenElement,
        onToggle: () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          this.time.delayedCall(200, () => this.refreshSettingsContent());
        },
      },
    ];

    const toggleW = 170;
    const toggleH = 42;
    const toggleGap = 24;
    const totalTogglesW = toggles.length * toggleW + (toggles.length - 1) * toggleGap;
    let tx = cx - totalTogglesW / 2 + toggleW / 2;

    for (const toggle of toggles) {
      const isOn = toggle.active;
      const tbg = this.add.rectangle(tx, y + toggleH / 2, toggleW, toggleH,
        isOn ? TAB_GOLD : 0x3a2a1a, isOn ? 0.7 : 0.2);
      tbg.setStrokeStyle(1.5, TAB_GOLD, isOn ? 0.8 : 0.3);
      tbg.setInteractive({ cursor: POINTER_CURSOR });
      this.settingsContent.add(tbg);

      const stateLabel = isOn ? 'ON' : 'OFF';
      const ttxt = this.add.text(tx, y + toggleH / 2, `${toggle.label}: ${stateLabel}`, {
        fontFamily: FONT, fontSize: '18px',
        color: isOn ? '#2a1a0a' : TAB_GOLD_STR,
        fontStyle: isOn ? 'bold' : 'normal',
      }).setOrigin(0.5);
      this.settingsContent.add(ttxt);

      tbg.on('pointerdown', () => { UISounds.click(); toggle.onToggle(); });
      tbg.on('pointerover', () => tbg.setFillStyle(isOn ? TAB_GOLD : 0x3a2a1a, isOn ? 0.85 : 0.4));
      tbg.on('pointerout', () => tbg.setFillStyle(isOn ? TAB_GOLD : 0x3a2a1a, isOn ? 0.7 : 0.2));

      tx += toggleW + toggleGap;
    }
    y += toggleH + 40;

    // ── Divider ──
    const divGfx1c = this.add.graphics();
    divGfx1c.lineStyle(1, 0x5a4a3a, 0.2);
    divGfx1c.lineBetween(cx - sliderW / 2, y, cx + sliderW / 2, y);
    this.settingsContent.add(divGfx1c);
    y += 30;

    // ── Clear Save Data ──
    this.settingsContent.add(this.add.text(cx, y, 'SAVE DATA', {
      fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 44;

    const clearBtnW = 220;
    const clearBtnH = 48;
    const clearBg = this.add.rectangle(cx, y + clearBtnH / 2, clearBtnW, clearBtnH, 0x3a1a1a, 0.3);
    clearBg.setStrokeStyle(1.5, Colors.danger, 0.4);
    clearBg.setInteractive({ cursor: POINTER_CURSOR });
    this.settingsContent.add(clearBg);

    const clearText = this.add.text(cx, y + clearBtnH / 2, 'Clear Save', {
      fontFamily: FONT, fontSize: '20px', color: TextColors.error, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.settingsContent.add(clearText);

    let confirmPending = false;
    clearBg.on('pointerover', () => {
      if (!confirmPending) {
        clearBg.setFillStyle(0x5a1a1a, 0.5);
        clearBg.setStrokeStyle(1.5, Colors.danger, 0.7);
      }
    });
    clearBg.on('pointerout', () => {
      if (!confirmPending) {
        clearBg.setFillStyle(0x3a1a1a, 0.3);
        clearBg.setStrokeStyle(1.5, Colors.danger, 0.4);
        clearText.setText('Clear Save');
      }
    });
    clearBg.on('pointerdown', () => {
      if (!confirmPending) {
        confirmPending = true;
        clearText.setText('Are you sure?');
        clearBg.setFillStyle(Colors.danger, 0.5);
        clearBg.setStrokeStyle(2, Colors.error, 0.8);
      } else {
        // Confirmed — delete save and restart
        SaveSystem.getInstance().deleteSave();
        window.location.reload();
      }
    });

    y += clearBtnH + 50;

    // ── Divider ──
    const divGfx2 = this.add.graphics();
    divGfx2.lineStyle(1, 0x5a4a3a, 0.2);
    divGfx2.lineBetween(cx - sliderW / 2, y, cx + sliderW / 2, y);
    this.settingsContent.add(divGfx2);
    y += 30;

    // ── Account / Cloud Saves ──
    const auth = AuthManager.getInstance();
    if (auth.isAvailable()) {
      this.settingsContent.add(this.add.text(cx, y, 'ACCOUNT', {
        fontFamily: FONT, fontSize: '22px', color: '#5a4a3a',
        fontStyle: 'bold', letterSpacing: 4,
      }).setOrigin(0.5, 0));
      y += 35;

      if (auth.isSignedIn()) {
        // Show connected status
        this.settingsContent.add(this.add.text(cx, y, `Signed in as ${auth.getDisplayName()}`, {
          fontFamily: FONT, fontSize: '16px', color: '#4a6a4a', fontStyle: 'italic',
        }).setOrigin(0.5, 0));
        y += 30;

        this.settingsContent.add(this.add.text(cx, y, 'Your progress is saved automatically.', {
          fontFamily: FONT, fontSize: '14px', color: '#6a5a4a', fontStyle: 'italic',
        }).setOrigin(0.5, 0));
        y += 40;
      } else {
        // Guest user — show create account button
        this.settingsContent.add(this.add.text(cx, y, 'Playing as guest — progress is local only.', {
          fontFamily: FONT, fontSize: '15px', color: '#7a4a3a', fontStyle: 'italic',
        }).setOrigin(0.5, 0));
        y += 35;

        const acctBtnW = 260;
        const acctBtnH = 48;
        const acctBg = this.add.rectangle(cx, y + acctBtnH / 2, acctBtnW, acctBtnH, 0x1a2a1a, 0.4);
        acctBg.setStrokeStyle(1.5, TAB_GOLD, 0.6);
        acctBg.setInteractive({ cursor: POINTER_CURSOR });
        this.settingsContent.add(acctBg);

        const acctText = this.add.text(cx, y + acctBtnH / 2, 'Create Account', {
          fontFamily: FONT, fontSize: '20px', color: TAB_GOLD_STR, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.settingsContent.add(acctText);

        acctBg.on('pointerover', () => {
          acctBg.setFillStyle(0x2a3a2a, 0.6);
          acctBg.setStrokeStyle(1.5, TAB_GOLD, 0.9);
        });
        acctBg.on('pointerout', () => {
          acctBg.setFillStyle(0x1a2a1a, 0.4);
          acctBg.setStrokeStyle(1.5, TAB_GOLD, 0.6);
        });
        acctBg.on('pointerdown', () => {
          UISounds.click();
          this.closeSettings();
          this.showInGameAuthDialog();
        });

        y += acctBtnH + 40;
      }

      // ── Divider ──
      const divGfx3 = this.add.graphics();
      divGfx3.lineStyle(1, 0x5a4a3a, 0.2);
      divGfx3.lineBetween(cx - sliderW / 2, y, cx + sliderW / 2, y);
      this.settingsContent.add(divGfx3);
      y += 30;
    }

    // ── Credits / About ──
    this.settingsContent.add(this.add.text(cx, y,
      'Nancy Drew: The Last Curtain Call\nA mystery by @supermodelgamer', {
        fontFamily: FONT, fontSize: '17px', color: '#6a5a4a',
        fontStyle: 'italic', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0));
    y += 60;

    // ── Calculate scroll bounds ──
    const visibleH = contentBottom - contentTop;
    const totalContentH = y - contentTop;
    this.settingsMaxScroll = Math.max(0, totalContentH - visibleH);
    this.settingsScrollY = 0;
    this.settingsContent.setY(0);
  }

  // ── In-game auth dialog for guest users ──
  private authFormRef: { destroy: () => void } | null = null;

  private showInGameAuthDialog(): void {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 2);
    container.setDepth(Depths.dialogueBox + 50);
    container.setAlpha(0);

    // Full-screen dimmer
    const dimmer = this.add.rectangle(0, 0, width, height, 0x02010a, 0.92);
    dimmer.setInteractive();
    container.add(dimmer);

    // Panel
    const panelW = 560;
    const panelH = 520;
    const box = this.add.rectangle(0, 0, panelW, panelH, 0x0a0918, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.55);
    container.add(box);

    // Header
    container.add(this.add.text(0, -220, 'CREATE ACCOUNT', {
      fontFamily: FONT, fontSize: '22px', color: TextColors.gold,
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5));

    container.add(this.add.text(0, -185, 'Save your progress to the cloud', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5));

    // Tab toggle: SIGN IN | REGISTER
    let mode: 'signin' | 'signup' = 'signup';
    const tabY = -145;

    const signInTab = this.add.text(-80, tabY, 'SIGN IN', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.muted,
      letterSpacing: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(signInTab);

    const tabSep = this.add.graphics();
    tabSep.lineStyle(1.5, Colors.gold, 0.35);
    tabSep.lineBetween(0, tabY - 12, 0, tabY + 12);
    container.add(tabSep);

    const registerTab = this.add.text(80, tabY, 'REGISTER', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.gold,
      letterSpacing: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(registerTab);

    const updateTabs = () => {
      signInTab.setColor(mode === 'signin' ? TextColors.gold : TextColors.muted);
      registerTab.setColor(mode === 'signup' ? TextColors.gold : TextColors.muted);
      submitLabel.setText(mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT');
    };
    signInTab.on('pointerdown', () => { mode = 'signin'; updateTabs(); });
    registerTab.on('pointerdown', () => { mode = 'signup'; updateTabs(); });

    // DOM form inputs
    const formX = width / 2;
    const formY = height / 2 - 60;
    const formW = 400;
    const form = createAuthFormElements(this, formX, formY, formW);
    this.authFormRef = form;

    // Submit button
    const submitY = 60;
    const submitBg = this.add.rectangle(0, submitY, 400, 54, 0x14132e, 0.95);
    submitBg.setStrokeStyle(2, Colors.gold, 0.8);
    submitBg.setInteractive({ cursor: POINTER_CURSOR });
    const submitLabel = this.add.text(0, submitY, 'CREATE ACCOUNT', {
      fontFamily: FONT, fontSize: '20px', color: '#e8c55a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);
    container.add([submitBg, submitLabel]);

    let submitting = false;
    submitBg.on('pointerover', () => submitBg.setFillStyle(0x1e1d3e, 1));
    submitBg.on('pointerout', () => submitBg.setFillStyle(0x14132e, 0.95));
    submitBg.on('pointerdown', async () => {
      if (submitting) return;
      submitting = true;
      submitLabel.setText('...');
      form.errorDiv.textContent = '';

      const error = await submitAuthForm(form.emailInput.value, form.passwordInput.value, mode);
      if (error) {
        form.errorDiv.textContent = error;
        updateTabs();
        submitting = false;
      } else {
        form.destroy();
        this.authFormRef = null;
        container.destroy();
        // Sync existing local save to cloud
        await SaveSystem.getInstance().syncFromCloud();
        // Save current progress to cloud immediately
        SaveSystem.getInstance().save();
      }
    });

    // Cancel button
    const cancelY = 140;
    const cancelBg = this.add.rectangle(0, cancelY, 400, 48, 0x0e0d1e, 0.9);
    cancelBg.setStrokeStyle(1.5, Colors.gold, 0.4);
    cancelBg.setInteractive({ cursor: POINTER_CURSOR });
    const cancelLabel = this.add.text(0, cancelY, 'CANCEL', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.light,
      letterSpacing: 4,
    }).setOrigin(0.5);
    container.add([cancelBg, cancelLabel]);

    cancelBg.on('pointerover', () => cancelBg.setFillStyle(0x1a1a3e, 1));
    cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x0e0d1e, 0.9));
    cancelBg.on('pointerdown', () => {
      form.destroy();
      this.authFormRef = null;
      container.destroy();
    });

    // Fade in
    this.tweens.add({ targets: container, alpha: 1, duration: 400, ease: 'Power2' });

    // Clean up DOM on scene shutdown
    this.events.once('shutdown', () => {
      if (this.authFormRef) {
        this.authFormRef.destroy();
        this.authFormRef = null;
      }
    });
  }
}
