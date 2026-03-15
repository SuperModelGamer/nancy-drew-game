import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import roomsData from '../data/rooms.json';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths, computeViewfinderLayout } from '../utils/constants';
import { POINTER_CURSOR } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';
import { drawChevronTab, drawCornerOrnament, drawDecoDivider, drawSunburst, drawGeoBorder, DecoColors } from '../utils/art-deco';

// Height of the bottom toolbar strip (buttons + chapter label)
const TOOLBAR_H = 112;
const BOTTOM_MARGIN = 12; // negative space below toolbar to prevent misclicks
const BTN_W = 260;
const BTN_H = 66;
const BTN_FONT = '24px';
const BTN_CHEVRON = 6;

// Pre-index items for O(1) lookup
const itemMap = new Map(itemsData.items.map(i => [i.id, i]));

// Journal pagination
const JOURNAL_ENTRIES_PER_PAGE = 4;

// Book visual constants (shared by Evidence + Journal panels)
const BOOK_LEATHER = 0x3a2a1a;
const BOOK_PAPER = 0xF5E6C8;
const BOOK_INK = '#2a1a0a';
const BOOK_BULLET = '#5a3a2a';
const BOOK_SPINE = 0x2a1a0a;
const BOOK_MARGIN_RED = 0xcc6666;
const BOOK_STAIN = 0x8B7355;
const JOURNAL_FONT = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";
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

  // ── Journal panel state ──
  private journalOpen = false;
  private journalContainer!: Phaser.GameObjects.Container;
  private journalContent!: Phaser.GameObjects.Container;
  private journalPage = 0;
  private journalBookLayout = { panelW: 0, panelX: 0, contentTop: 0, contentBottom: 0 };

  // ── Settings panel state ──
  private settingsOpen = false;
  private settingsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ─── Viewfinder frame — thin left border, thick right info panel ───
    const vf = computeViewfinderLayout(width, height);
    const fLeft = vf.leftMargin;
    const fTop = vf.topMargin;
    const toolbarTop = vf.viewportY + vf.viewportH;
    const rpX = vf.rightPanelX; // right panel left edge
    const rpW = vf.rightPanelW; // right panel width
    const rpCx = rpX + rpW / 2; // right panel center X

    const frameBg = this.add.graphics();

    // Solid opaque fill for border strips
    frameBg.fillStyle(DecoColors.navy, 1);
    frameBg.fillRect(0, 0, width, fTop);                                // top
    frameBg.fillRect(0, fTop, fLeft, toolbarTop - fTop);                // left (thin)
    frameBg.fillRect(rpX, fTop, rpW, toolbarTop - fTop);                // right panel
    frameBg.fillRect(0, toolbarTop, width, TOOLBAR_H);                  // toolbar
    frameBg.fillStyle(0x060810, 1);
    frameBg.fillRect(0, height - BOTTOM_MARGIN, width, BOTTOM_MARGIN);

    // Outer gold frame rectangle
    frameBg.lineStyle(3, DecoColors.gold, 0.7);
    frameBg.strokeRect(1, 1, width - 2, height - BOTTOM_MARGIN - 1);
    frameBg.lineStyle(1, DecoColors.gold, 0.3);
    frameBg.strokeRect(5, 5, width - 10, height - BOTTOM_MARGIN - 9);

    // Inner frame line (game viewport boundary — uses renderedW, not full viewport)
    frameBg.lineStyle(2, DecoColors.gold, 0.5);
    frameBg.strokeRect(fLeft, fTop, vf.renderedW, vf.viewportH);

    // Vertical separator between viewport and right panel
    frameBg.lineStyle(1.5, DecoColors.gold, 0.35);
    frameBg.lineBetween(rpX, fTop + 6, rpX, toolbarTop - 6);

    // Four outer corner ornaments
    drawCornerOrnament(frameBg, 6, 6, 24, 'tl', DecoColors.gold, 0.45);
    drawCornerOrnament(frameBg, width - 6, 6, 24, 'tr', DecoColors.gold, 0.45);
    drawCornerOrnament(frameBg, 6, height - BOTTOM_MARGIN - 6, 24, 'bl', DecoColors.gold, 0.45);
    drawCornerOrnament(frameBg, width - 6, height - BOTTOM_MARGIN - 6, 24, 'br', DecoColors.gold, 0.45);

    // Top border ornament centered over rendered game area
    const vpCenterX = fLeft + vf.renderedW / 2;
    const topDiamond = 6;
    frameBg.fillStyle(DecoColors.gold, 0.5);
    frameBg.fillPoints([
      new Phaser.Geom.Point(vpCenterX, 1),
      new Phaser.Geom.Point(vpCenterX + topDiamond, fTop / 2),
      new Phaser.Geom.Point(vpCenterX, fTop - 1),
      new Phaser.Geom.Point(vpCenterX - topDiamond, fTop / 2),
    ], true);

    frameBg.setDepth(Depths.tooltip - 1);

    // ─── Right info panel content ───
    this.createRightInfoPanel(rpX, rpW, rpCx, fTop, toolbarTop);

    // ─── Toolbar buttons (centered under the rendered game image) ───
    const toolbarCenterX = fLeft + vf.renderedW / 2;
    const buttonY = toolbarTop + TOOLBAR_H / 2;
    const btnSpacing = vf.renderedW / 5; // spread across rendered game width

    const buttons = [
      { label: 'EVIDENCE', icon: '◈', color: DecoColors.gold, x: toolbarCenterX - btnSpacing * 1.5, action: () => this.toggleEvidence() },
      { label: 'SUSPECTS', icon: '◉', color: 0xb4a0d4, x: toolbarCenterX - btnSpacing * 0.5, action: () => {
        // Pass current dialogue speaker so Suspects defaults to their page
        const speaker = DialogueSystem.getInstance().getLastSpeaker();
        const speakerToSuspect: Record<string, string> = {
          'Vivian': 'vivian', 'Edwin': 'edwin', 'Stella': 'stella',
          'Ashworth': 'ashworth', 'Diego': 'diego',
        };
        this.registry.set('currentDialogueSuspect', speakerToSuspect[speaker] || null);
        this.scene.launch('SuspectScene');
      }},
      { label: 'MAP', icon: '◇', color: Colors.mapBlue, x: toolbarCenterX + btnSpacing * 0.5, action: () => this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() }) },
      { label: 'JOURNAL', icon: '◆', color: DecoColors.gold, x: toolbarCenterX + btnSpacing * 1.5, action: () => this.toggleJournal() },
    ];

    buttons.forEach(btn => {
      const container = this.add.container(btn.x, buttonY);
      container.setDepth(Depths.tooltip);

      const btnGfx = this.add.graphics();
      drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
        fillColor: DecoColors.navy, fillAlpha: 0.6,
        strokeColor: btn.color, strokeAlpha: 0.4, chevronDepth: BTN_CHEVRON,
      });
      container.add(btnGfx);

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
      hitArea.on('pointerdown', btn.action);
      container.add(hitArea);

      const colorHex = `#${btn.color.toString(16).padStart(6, '0')}`;
      const text = this.add.text(0, 0, btn.label, {
        fontFamily: FONT, fontSize: BTN_FONT, color: colorHex,
        fontStyle: 'bold', letterSpacing: 4,
      }).setOrigin(0.5);
      container.add(text);
    });

    // ─── Evidence panel (hidden by default) ───
    this.evidenceContainer = this.createEvidencePanel();
    this.evidenceContainer.setVisible(false);

    // ─── Journal panel (hidden by default) ───
    this.journalContainer = this.createJournalPanel();
    this.journalContainer.setVisible(false);

    // ─── Settings panel (hidden by default) ───
    this.settingsContainer = this.createSettingsPanel();
    this.settingsContainer.setVisible(false);

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

  // ─── Right info panel ───────────────────────────────────────────────────────

  private borderItemCountText!: Phaser.GameObjects.Text;
  private borderClueCountText!: Phaser.GameObjects.Text;
  private borderRoomNameText!: Phaser.GameObjects.Text;
  private borderRoomClueCountText!: Phaser.GameObjects.Text;
  private borderTotalItemCountText!: Phaser.GameObjects.Text;
  private borderProgressBar!: Phaser.GameObjects.Graphics;
  private borderProgressPct!: Phaser.GameObjects.Text;
  private borderChapterText!: Phaser.GameObjects.Text;

  private createRightInfoPanel(
    rpX: number, rpW: number, rpCx: number, fTop: number, toolbarTop: number,
  ): void {
    const panelH = toolbarTop - fTop;
    const contentX = rpCx;
    const pad = 18;
    const decoGfx = this.add.graphics().setDepth(Depths.tooltip);

    // ── Subtle sunburst behind center of panel ──
    drawSunburst(decoGfx, rpCx, fTop + panelH * 0.35, 110, 16, DecoColors.gold, 0.04);

    // ── Top corner ornaments ──
    drawCornerOrnament(decoGfx, rpX + 6, fTop + 6, 16, 'tl', DecoColors.gold, 0.2);
    drawCornerOrnament(decoGfx, rpX + rpW - 6, fTop + 6, 16, 'tr', DecoColors.gold, 0.2);

    // ─── Layout: vertically center content within panel ───
    // Total content height estimate for balanced spacing
    const totalContentH = 620; // approximate height of all elements
    let y = fTop + Math.max(pad, (panelH - totalContentH) / 2);

    // ── Chapter indicator ──
    this.borderChapterText = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '10px', color: TextColors.mutedBlue,
      letterSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 22;

    // ── Room name ──
    this.borderRoomNameText = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '17px', color: '#c9a84c',
      fontStyle: 'bold', align: 'center', letterSpacing: 2,
      wordWrap: { width: rpW - pad * 2 },
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 48;

    // ── Art deco divider ──
    drawDecoDivider(decoGfx, contentX, y, rpW - pad * 2, DecoColors.gold, 0.3);
    y += 28;

    // ── ITEMS (per-room) ──
    this.add.text(contentX, y, 'ITEMS IN ROOM', {
      fontFamily: FONT, fontSize: '12px', color: TextColors.mutedBlue,
      letterSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 22;

    this.borderItemCountText = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '30px', color: '#c9a84c',
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 50;

    // ── Places to check in this room (gold) ──
    this.add.text(contentX, y, 'PLACES TO CHECK', {
      fontFamily: FONT, fontSize: '10px', color: '#c9a84c',
      letterSpacing: 3, align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 22;

    this.borderRoomClueCountText = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '26px', color: '#c9a84c',
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 46;

    // ── Thin gold line ──
    decoGfx.lineStyle(1, DecoColors.gold, 0.15);
    decoGfx.lineBetween(rpX + pad + 16, y, rpX + rpW - pad - 16, y);
    y += 22;

    // ── Items total (white) ──
    this.add.text(contentX, y, 'ITEMS TOTAL', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff',
      letterSpacing: 3, align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 22;

    this.borderTotalItemCountText = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '22px', color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 42;

    // ── Thin gold line ──
    decoGfx.lineStyle(1, DecoColors.gold, 0.15);
    decoGfx.lineBetween(rpX + pad + 16, y, rpX + rpW - pad - 16, y);
    y += 22;

    // ── CLUES (global) ──
    this.add.text(contentX, y, 'CLUES TOTAL', {
      fontFamily: FONT, fontSize: '12px', color: TextColors.mutedBlue,
      letterSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 24;

    this.borderClueCountText = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '26px', color: '#7a8a9a',
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 46;

    // ── Progress bar ──
    this.add.text(contentX, y, 'PROGRESS', {
      fontFamily: FONT, fontSize: '9px', color: TextColors.mutedBlue,
      letterSpacing: 3, align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 20;

    const barW = rpW - pad * 2 - 20;
    const barH = 6;
    const barX = rpX + pad + 10;
    // Bar background
    decoGfx.fillStyle(0x1a1a2e, 0.8);
    decoGfx.fillRoundedRect(barX, y, barW, barH, 3);
    decoGfx.lineStyle(1, DecoColors.gold, 0.2);
    decoGfx.strokeRoundedRect(barX, y, barW, barH, 3);

    // Progress fill (drawn separately so we can update it)
    this.borderProgressBar = this.add.graphics().setDepth(Depths.tooltip);
    this.borderProgressBar.setData('barX', barX);
    this.borderProgressBar.setData('barY', y);
    this.borderProgressBar.setData('barW', barW);
    this.borderProgressBar.setData('barH', barH);

    y += barH + 8;
    this.borderProgressPct = this.add.text(contentX, y, '', {
      fontFamily: FONT, fontSize: '10px', color: TextColors.goldDim,
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    y += 28;

    // ── Art deco divider before gear ──
    drawDecoDivider(decoGfx, contentX, y, rpW - pad * 2 - 10, DecoColors.gold, 0.2);
    y += 26;

    // ── Settings gear (enlarged, below counters) ──
    const gearBtn = this.add.text(contentX, y, '⚙', {
      fontSize: '48px', color: TextColors.mutedBlue,
    }).setOrigin(0.5, 0).setDepth(Depths.tooltip);
    gearBtn.setInteractive({ cursor: POINTER_CURSOR, hitArea: new Phaser.Geom.Rectangle(-8, -8, 64, 64), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    gearBtn.on('pointerover', () => gearBtn.setColor(TextColors.gold));
    gearBtn.on('pointerout', () => gearBtn.setColor(TextColors.mutedBlue));
    gearBtn.on('pointerdown', () => { UISounds.click(); this.toggleSettings(); });

    // ── Bottom corner ornaments ──
    drawCornerOrnament(decoGfx, rpX + 6, toolbarTop - 6, 16, 'bl', DecoColors.gold, 0.2);
    drawCornerOrnament(decoGfx, rpX + rpW - 6, toolbarTop - 6, 16, 'br', DecoColors.gold, 0.2);

    // ── Zigzag geo border at very bottom ──
    drawGeoBorder(decoGfx, rpX + pad, toolbarTop - 24, rpW - pad * 2, DecoColors.gold, 0.12, 10, 3);

    this.updateRightPanelStats();
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
        this.borderRoomClueCountText.setText(`${roomClueFound} / ${roomClueTotal}`);
      } else {
        this.borderRoomClueCountText.setText(`${roomClueTotal} / ${roomClueTotal} ✓`);
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
      this.borderTotalItemCountText.setText(`${foundItemsAll} / ${totalItemsAll}`);
    }

    // Global clue counter (all clues regardless of progression, but respecting hideWhen)
    let totalClues = 0;
    let foundClues = 0;
    for (const room of rooms) {
      for (const hs of room.hotspots) {
        const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
        if (!isClueType) continue;
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
  }

  // ─── Toggle methods ──────────────────────────────────────────────────────────

  private toggleEvidence(): void {
    if (this.evidenceOpen) {
      this.closeEvidence();
    } else {
      // Close journal if open
      if (this.journalOpen) this.closeJournal();
      this.openEvidence();
    }
  }

  private toggleJournal(): void {
    if (this.journalOpen) {
      this.closeJournal();
    } else {
      // Close evidence if open
      if (this.evidenceOpen) this.closeEvidence();
      this.openJournal();
    }
  }

  private openEvidence(): void {
    this.evidenceOpen = true;
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
    const panelH = height - TOOLBAR_H - BOTTOM_MARGIN - 45;
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

    // Items grid
    this.itemsGrid = this.add.container(0, 0);
    this.evidenceContent.add(this.itemsGrid);

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

    const hint = this.add.text(detailCenterX, contentBottom - 28,
      'Click an item to select it for use.\nClick again to deselect.', {
        fontFamily: JOURNAL_FONT, fontSize: '22px', color: '#6a5a4a',
        fontStyle: 'italic', align: 'center', lineSpacing: 3,
      }).setOrigin(0.5, 1);
    this.evidenceContent.add(hint);

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
        if (this.selectedItemId === itemId) {
          // Toggle: clicking the already-inspected item selects/deselects it for use
          if (selectedItem === itemId) {
            inventory.selectItem(null);
          } else {
            inventory.selectItem(itemId);
          }
          this.refreshInventoryGrid();
        } else {
          // First click: inspect the item
          this.showItemDetail(itemId);
          this.refreshInventoryGrid();
        }
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

    // Hotspot discovery counter (across all rooms, respecting hideWhen)
    let totalHotspots = 0;
    let discoveredHotspots = 0;
    for (const room of rooms) {
      for (const hs of room.hotspots) {
        const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
        if (!isClueType) continue;
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
        (hs: { type: string; hideWhen?: string }) => {
          const isClueType = hs.type === 'inspect' || hs.type === 'pickup' || hs.type === 'locked' || hs.type === 'talk';
          return isClueType && !this.isHotspotHidden(hs.hideWhen);
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

    // Reserve space for the hint text at the bottom (two lines ~50px + padding)
    const maxLoreBottom = contentBottom - 60;
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

    // Crop the lore text if it overflows available space
    if (this.detailLoreText.height > availableH) {
      this.detailLoreText.setCrop(0, 0, this.detailLoreText.width, availableH);
    }
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

    this.journalBookLayout = {
      panelW: layout.paperW,
      panelX: layout.panelX,
      contentTop: layout.contentTop,
      contentBottom: layout.contentBottom,
    };

    this.journalContent = this.add.container(0, 0);
    container.add(this.journalContent);

    return container;
  }

  private refreshJournalContent(): void {
    this.journalContent.removeAll(true);

    const { panelW, panelX, contentTop, contentBottom } = this.journalBookLayout;
    const save = SaveSystem.getInstance();
    const journal = save.getJournal();

    const contentLeft = panelX - panelW / 2 + 40;
    const contentRight = panelX + panelW / 2 - 40;
    const usableW = contentRight - contentLeft;

    // Ruled lines — notebook style, consistent spacing
    const ruledGfx = this.add.graphics();
    const lineSpacing = 36;
    const ruledStart = contentTop + 12;
    const ruledEnd = contentBottom - 50;
    ruledGfx.lineStyle(1, BOOK_STAIN, 0.18);
    for (let ly = ruledStart; ly < ruledEnd; ly += lineSpacing) {
      ruledGfx.lineBetween(contentLeft, ly, contentRight, ly);
    }
    // Red margin line
    const marginX = contentLeft + 60;
    ruledGfx.lineStyle(1.5, BOOK_MARGIN_RED, 0.28);
    ruledGfx.lineBetween(marginX, contentTop + 4, marginX, contentBottom - 45);
    this.journalContent.add(ruledGfx);

    if (journal.length === 0) {
      const empty = this.add.text(panelX, (contentTop + contentBottom) / 2,
        "No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy's journal.", {
          fontFamily: JOURNAL_FONT, fontSize: '28px', color: '#6a5a4a',
          fontStyle: 'italic', align: 'center', lineSpacing: 10,
        }).setOrigin(0.5);
      this.journalContent.add(empty);
      return;
    }

    // Pagination
    const totalPages = Math.ceil(journal.length / JOURNAL_ENTRIES_PER_PAGE);
    if (this.journalPage >= totalPages) this.journalPage = totalPages - 1;
    if (this.journalPage < 0) this.journalPage = 0;

    const startIdx = this.journalPage * JOURNAL_ENTRIES_PER_PAGE;
    const endIdx = Math.min(startIdx + JOURNAL_ENTRIES_PER_PAGE, journal.length);
    const pageEntries = journal.slice(startIdx, endIdx);

    const entryLeft = marginX + 18;
    const entryTextW = usableW - 90;
    const fontSize = 28;
    const entryGap = 14; // gap between entries

    // Flow entries naturally from the top — no artificial even spacing
    let y = ruledStart + 6;

    pageEntries.forEach((entry, i) => {
      const globalIdx = startIdx + i;
      const xJitter = ((globalIdx * 7) % 3) - 1;

      // Entry number — positioned in the margin area
      const bullet = this.add.text(contentLeft + 8 + xJitter, y, `${globalIdx + 1}.`, {
        fontFamily: JOURNAL_FONT, fontSize: `${fontSize}px`, color: BOOK_BULLET, fontStyle: 'italic',
      });

      // Entry text — flows naturally, line spacing matches ruled lines
      const text = this.add.text(entryLeft + xJitter, y, entry, {
        fontFamily: JOURNAL_FONT, fontSize: `${fontSize}px`, color: BOOK_INK,
        wordWrap: { width: entryTextW }, lineSpacing: lineSpacing - fontSize,
      });

      this.journalContent.add([bullet, text]);

      // Next entry starts after this text, with a small gap
      y += text.height + entryGap;
    });

    // Page navigation — styled like a book footer
    const navY = contentBottom - 18;

    const pageText = this.add.text(panelX, navY, `— page ${this.journalPage + 1} of ${totalPages} —`, {
      fontFamily: JOURNAL_FONT, fontSize: '22px', color: '#7a6a5a', fontStyle: 'italic',
    }).setOrigin(0.5);
    this.journalContent.add(pageText);

    if (this.journalPage > 0) {
      const prevBtn = this.add.text(contentLeft + 20, navY, '◀  Previous', {
        fontFamily: JOURNAL_FONT, fontSize: '24px', color: '#5a3a2a', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      prevBtn.setInteractive({ cursor: POINTER_CURSOR });
      prevBtn.on('pointerover', () => prevBtn.setColor(TAB_GOLD_STR));
      prevBtn.on('pointerout', () => prevBtn.setColor('#5a3a2a'));
      prevBtn.on('pointerdown', () => { this.journalPage--; this.refreshJournalContent(); });
      this.journalContent.add(prevBtn);
    }

    if (this.journalPage < totalPages - 1) {
      const nextBtn = this.add.text(contentRight - 20, navY, 'Next  ▶', {
        fontFamily: JOURNAL_FONT, fontSize: '24px', color: '#5a3a2a', fontStyle: 'bold',
      }).setOrigin(1, 0.5);
      nextBtn.setInteractive({ cursor: POINTER_CURSOR });
      nextBtn.on('pointerover', () => nextBtn.setColor(TAB_GOLD_STR));
      nextBtn.on('pointerout', () => nextBtn.setColor('#5a3a2a'));
      nextBtn.on('pointerdown', () => { this.journalPage++; this.refreshJournalContent(); });
      this.journalContent.add(nextBtn);
    }
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
      fontFamily: FONT, fontSize: '18px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 40;

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
      fontFamily: FONT, fontSize: '22px', color: TAB_GOLD_STR, fontStyle: 'bold',
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

    // ── Text Speed ──
    this.settingsContent.add(this.add.text(cx, y, 'TEXT SPEED', {
      fontFamily: FONT, fontSize: '18px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 40;

    const speedPresets: Array<{ label: string; value: 'slow' | 'normal' | 'fast' | 'instant' }> = [
      { label: 'Slow', value: 'slow' },
      { label: 'Normal', value: 'normal' },
      { label: 'Fast', value: 'fast' },
      { label: 'Instant', value: 'instant' },
    ];
    const btnW = 100;
    const btnH = 38;
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
        fontFamily: FONT, fontSize: '16px',
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
      fontFamily: FONT, fontSize: '18px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 40;

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

    const toggleW = 160;
    const toggleH = 38;
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
        fontFamily: FONT, fontSize: '15px',
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
      fontFamily: FONT, fontSize: '18px', color: '#5a4a3a',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5, 0));
    y += 40;

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

    // ── Credits / About ──
    this.settingsContent.add(this.add.text(cx, y,
      'Nancy Drew: The Last Curtain Call\nA mystery by @supermodelgamer', {
        fontFamily: FONT, fontSize: '17px', color: '#6a5a4a',
        fontStyle: 'italic', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0));
  }
}
