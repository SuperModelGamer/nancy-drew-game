import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { POINTER_CURSOR } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';
import { drawArtDecoFrame, drawDecoDivider, drawChevronTab, drawCornerOrnament, DecoColors, DecoTextColors } from '../utils/art-deco';

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
const JOURNAL_ENTRIES_PER_PAGE = 5;

// Case Book tab identifiers
type CaseBookTab = 'journal' | 'evidence';

// Case Book visual constants
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

export class UIScene extends Phaser.Scene {
  private inventoryBar!: Phaser.GameObjects.Container;
  private journalButton!: Phaser.GameObjects.Container;
  private caseBookOpen = false;
  private caseBookContainer!: Phaser.GameObjects.Container;
  private currentTab: CaseBookTab = 'evidence';
  private journalPage = 0;

  // Evidence tab content container (swapped in/out)
  private evidenceContent!: Phaser.GameObjects.Container;
  // Journal tab content container (swapped in/out)
  private journalContent!: Phaser.GameObjects.Container;

  // Tab button references for visual updates
  private tabJournalBg!: Phaser.GameObjects.Graphics;
  private tabJournalText!: Phaser.GameObjects.Text;
  private tabEvidenceBg!: Phaser.GameObjects.Graphics;
  private tabEvidenceText!: Phaser.GameObjects.Text;

  // Detail panel elements (right side of evidence tab)
  private detailImage!: Phaser.GameObjects.Image | null;
  private detailName!: Phaser.GameObjects.Text;
  private detailDesc!: Phaser.GameObjects.Text;
  private detailKeyBadge!: Phaser.GameObjects.Container;
  private detailPlaceholder!: Phaser.GameObjects.Text;
  private selectedItemId: string | null = null;
  // Track items container for refresh
  private itemsGrid!: Phaser.GameObjects.Container;
  // Cached layout dimensions from createCaseBookPanel
  private layout = { leftX: 0, contentTop: 0, contentH: 0, leftW: 0, rightW: 0, rightX: 0 };
  // Case Book panel dimensions (cached for journal use)
  private bookLayout = { panelW: 0, panelH: 0, panelX: 0, panelY: 0, contentTop: 0, contentBottom: 0 };

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    // Don't call initSceneCursor here — UIScene runs alongside RoomScene,
    // and setting the pointer as default would override the magnifying glass.
    // All interactive UI elements already specify their own cursor.
    const barY = height - BOTTOM_MARGIN - TOOLBAR_H / 2;

    // ─── Bottom toolbar — solid border with integrated chapter label ───
    const toolbarTop = height - BOTTOM_MARGIN - TOOLBAR_H;
    const barBg = this.add.graphics();

    // Dark fill for the bottom margin area
    barBg.fillStyle(0x060810, 1);
    barBg.fillRect(0, height - BOTTOM_MARGIN, width, BOTTOM_MARGIN);

    // Solid dark background (feels like a proper frame border, not floating)
    barBg.fillStyle(DecoColors.navy, 0.97);
    barBg.fillRect(0, toolbarTop, width, TOOLBAR_H);

    // Subtle gradient fade just above the bar (12px, very short)
    for (let i = 0; i < 12; i++) {
      barBg.fillStyle(DecoColors.navy, (i / 12) * 0.6);
      barBg.fillRect(0, toolbarTop - 12 + i, width, 1);
    }

    // Gold top border — double line for art deco feel
    barBg.lineStyle(2, DecoColors.gold, 0.5);
    barBg.lineBetween(0, toolbarTop, width, toolbarTop);
    barBg.lineStyle(0.5, DecoColors.gold, 0.2);
    barBg.lineBetween(0, toolbarTop + 4, width, toolbarTop + 4);

    // Center diamond accent on the top border
    barBg.fillStyle(DecoColors.gold, 0.5);
    barBg.fillPoints([
      new Phaser.Geom.Point(width / 2, toolbarTop - 7),
      new Phaser.Geom.Point(width / 2 + 7, toolbarTop),
      new Phaser.Geom.Point(width / 2, toolbarTop + 7),
      new Phaser.Geom.Point(width / 2 - 7, toolbarTop),
    ], true);

    barBg.setDepth(Depths.tooltip - 1);

    // ─── Toolbar buttons — centered vertically in toolbar ───
    const buttonY = toolbarTop + TOOLBAR_H / 2;

    const buttons = [
      { label: 'EVIDENCE', icon: '◈', color: DecoColors.gold, x: width * 0.2, action: () => this.toggleInventory() },
      { label: 'SUSPECTS', icon: '◉', color: 0xb4a0d4, x: width * 0.4, action: () => this.scene.launch('SuspectScene') },
      { label: 'MAP', icon: '◇', color: Colors.mapBlue, x: width * 0.6, action: () => this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() }) },
      { label: 'JOURNAL', icon: '◆', color: DecoColors.gold, x: width * 0.8, action: () => this.toggleJournal() },
    ];

    buttons.forEach(btn => {
      const container = this.add.container(btn.x, buttonY);
      container.setDepth(Depths.tooltip);

      // Chevron-shaped button background
      const btnGfx = this.add.graphics();
      drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
        fillColor: DecoColors.navy,
        fillAlpha: 0.6,
        strokeColor: btn.color,
        strokeAlpha: 0.4,
        chevronDepth: BTN_CHEVRON,
      });
      container.add(btnGfx);

      // Hit area
      const hitArea = this.add.rectangle(0, 0, BTN_W, BTN_H, 0x000000, 0);
      hitArea.setInteractive({ cursor: POINTER_CURSOR });
      hitArea.on('pointerover', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
          fillColor: DecoColors.navyLight,
          fillAlpha: 0.8,
          strokeColor: btn.color,
          strokeAlpha: 0.8,
          chevronDepth: BTN_CHEVRON,
        });
      });
      hitArea.on('pointerout', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, BTN_W, BTN_H, {
          fillColor: DecoColors.navy,
          fillAlpha: 0.6,
          strokeColor: btn.color,
          strokeAlpha: 0.4,
          chevronDepth: BTN_CHEVRON,
        });
      });
      hitArea.on('pointerdown', btn.action);
      container.add(hitArea);

      const colorHex = `#${btn.color.toString(16).padStart(6, '0')}`;
      const text = this.add.text(0, 0, btn.label, {
        fontFamily: FONT,
        fontSize: BTN_FONT,
        color: colorHex,
        fontStyle: 'bold',
        letterSpacing: 4,
      }).setOrigin(0.5);
      container.add(text);
    });

    // ─── Case Book panel (hidden by default) ───
    this.caseBookContainer = this.createCaseBookPanel();
    this.caseBookContainer.setVisible(false);

    // Listen for inventory changes (clean up on shutdown to prevent leaks)
    const onInventoryChange = () => {
      if (this.caseBookOpen && this.currentTab === 'evidence') this.refreshInventoryGrid();
    };
    InventorySystem.getInstance().onChange(onInventoryChange);
    this.events.on('shutdown', () => {
      InventorySystem.getInstance().offChange(onInventoryChange);
    });
  }

  private toggleInventory(): void {
    if (this.caseBookOpen && this.currentTab === 'evidence') {
      // Already open on evidence tab — close it
      this.closeCaseBook();
    } else if (this.caseBookOpen && this.currentTab === 'journal') {
      // Open on journal tab — switch to evidence
      this.switchTab('evidence');
    } else {
      // Closed — open to evidence tab
      this.openCaseBook('evidence');
    }
  }

  private toggleJournal(): void {
    if (this.caseBookOpen && this.currentTab === 'journal') {
      // Already open on journal tab — close it
      this.closeCaseBook();
    } else if (this.caseBookOpen && this.currentTab === 'evidence') {
      // Open on evidence tab — switch to journal
      this.switchTab('journal');
    } else {
      // Closed — open to journal tab
      this.openCaseBook('journal');
    }
  }

  private openCaseBook(tab: CaseBookTab): void {
    this.caseBookOpen = true;
    this.currentTab = tab;
    UISounds.panelOpen();

    if (tab === 'evidence') {
      this.resetDetailPanel();
      this.refreshInventoryGrid();
    } else {
      this.journalPage = 0;
      this.refreshJournalContent();
    }

    this.updateTabVisuals();
    this.evidenceContent.setVisible(tab === 'evidence');
    this.journalContent.setVisible(tab === 'journal');

    this.caseBookContainer.setVisible(true);
    this.caseBookContainer.setAlpha(0);
    this.tweens.add({ targets: this.caseBookContainer, alpha: 1, duration: 200 });
  }

  private closeCaseBook(): void {
    this.caseBookOpen = false;
    this.tweens.add({
      targets: this.caseBookContainer,
      alpha: 0,
      duration: 200,
      onComplete: () => this.caseBookContainer.setVisible(false),
    });
  }

  private switchTab(tab: CaseBookTab): void {
    this.currentTab = tab;
    this.updateTabVisuals();

    if (tab === 'evidence') {
      this.resetDetailPanel();
      this.refreshInventoryGrid();
      this.evidenceContent.setVisible(true);
      this.journalContent.setVisible(false);
    } else {
      this.journalPage = 0;
      this.refreshJournalContent();
      this.evidenceContent.setVisible(false);
      this.journalContent.setVisible(true);
    }
  }

  private updateTabVisuals(): void {
    const isJournal = this.currentTab === 'journal';
    const isEvidence = this.currentTab === 'evidence';

    // Journal tab
    this.tabJournalBg.clear();
    if (isJournal) {
      this.tabJournalBg.fillStyle(TAB_GOLD, 1);
      this.tabJournalBg.fillRoundedRect(-75, -18, 150, 36, 6);
      this.tabJournalText.setColor('#1a1008');
      this.tabJournalText.setFontStyle('bold');
    } else {
      this.tabJournalBg.lineStyle(1.5, TAB_GOLD, 0.6);
      this.tabJournalBg.strokeRoundedRect(-75, -18, 150, 36, 6);
      this.tabJournalText.setColor(TAB_GOLD_STR);
      this.tabJournalText.setFontStyle('bold');
    }

    // Evidence tab
    this.tabEvidenceBg.clear();
    if (isEvidence) {
      this.tabEvidenceBg.fillStyle(TAB_GOLD, 1);
      this.tabEvidenceBg.fillRoundedRect(-75, -18, 150, 36, 6);
      this.tabEvidenceText.setColor('#1a1008');
      this.tabEvidenceText.setFontStyle('bold');
    } else {
      this.tabEvidenceBg.lineStyle(1.5, TAB_GOLD, 0.6);
      this.tabEvidenceBg.strokeRoundedRect(-75, -18, 150, 36, 6);
      this.tabEvidenceText.setColor(TAB_GOLD_STR);
      this.tabEvidenceText.setFontStyle('bold');
    }
  }

  // ─── Unified Case Book Panel ───────────────────────────────────────────────

  private createCaseBookPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    const container = this.add.container(0, 0);
    container.setDepth(Depths.inventoryPanel);

    // Full-screen dark overlay
    const overlay = createOverlay(this, 0.88);
    container.add(overlay);

    // Main panel dimensions — same as old inventory panel
    const panelW = Math.min(width - 60, 1650);
    const panelH = height - TOOLBAR_H - BOTTOM_MARGIN - 45;
    const panelX = width / 2;
    const panelY = panelH / 2 + 15;

    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;
    const panelRight = panelLeft + panelW;
    const panelBottom = panelTop + panelH;

    // ─── Leather-bound book background ───
    const bookGfx = this.add.graphics();

    // Outer leather border
    bookGfx.fillStyle(BOOK_LEATHER, 1);
    bookGfx.fillRoundedRect(panelLeft, panelTop, panelW, panelH, 8);

    // Inner aged paper fill (inset by leather border width)
    const leatherBorder = 14;
    const paperLeft = panelLeft + leatherBorder;
    const paperTop = panelTop + leatherBorder;
    const paperW = panelW - leatherBorder * 2;
    const paperH = panelH - leatherBorder * 2;
    bookGfx.fillStyle(BOOK_PAPER, 1);
    bookGfx.fillRoundedRect(paperLeft, paperTop, paperW, paperH, 4);

    // Spine binding line (vertical line down the center-left area, like a real book spine)
    const spineX = panelLeft + leatherBorder + 6;
    bookGfx.lineStyle(3, BOOK_SPINE, 0.5);
    bookGfx.lineBetween(spineX, paperTop + 8, spineX, paperTop + paperH - 8);
    bookGfx.lineStyle(1, BOOK_SPINE, 0.25);
    bookGfx.lineBetween(spineX + 4, paperTop + 8, spineX + 4, paperTop + paperH - 8);

    // Leather edge highlight (subtle bevel)
    bookGfx.lineStyle(1, 0x5a4a3a, 0.4);
    bookGfx.strokeRoundedRect(panelLeft + 1, panelTop + 1, panelW - 2, panelH - 2, 8);
    bookGfx.lineStyle(1, 0x1a0e08, 0.6);
    bookGfx.strokeRoundedRect(panelLeft, panelTop, panelW, panelH, 8);

    container.add(bookGfx);

    // ─── Subtle stain patches on the paper ───
    const stainGfx = this.add.graphics();
    stainGfx.fillStyle(BOOK_STAIN, 0.06);
    stainGfx.fillCircle(panelX - panelW / 4, panelY - panelH / 5, 55);
    stainGfx.fillCircle(panelX + panelW / 3, panelY + panelH / 6, 40);
    stainGfx.fillEllipse(panelX - panelW / 6, panelY + panelH / 4, 80, 34);
    stainGfx.fillStyle(BOOK_STAIN, 0.04);
    stainGfx.fillCircle(panelX + panelW / 5, panelY - panelH / 3, 35);
    container.add(stainGfx);

    // ─── Header ───
    const headerH = 72;
    const headerY = panelTop + leatherBorder + headerH / 2;
    const headerContentTop = paperTop;

    // Header background (darker paper strip)
    const headerBg = this.add.rectangle(panelX, headerY, paperW, headerH, 0x3a2a1a, 0.15);
    container.add(headerBg);

    // Header bottom divider
    const headerLineGfx = this.add.graphics();
    headerLineGfx.lineStyle(1.5, BOOK_LEATHER, 0.3);
    headerLineGfx.lineBetween(paperLeft + 20, headerContentTop + headerH, paperLeft + paperW - 20, headerContentTop + headerH);
    container.add(headerLineGfx);

    const title = this.add.text(panelX, headerY, "NANCY'S CASE BOOK", {
      fontFamily: JOURNAL_FONT,
      fontSize: '28px',
      color: '#3a2a1a',
      fontStyle: 'bold italic',
      letterSpacing: 5,
    }).setOrigin(0.5);
    container.add(title);

    // Decorative underline flourishes
    const flourishGfx = this.add.graphics();
    flourishGfx.lineStyle(1, 0x3a2a1a, 0.3);
    const flourishW = 140;
    flourishGfx.lineBetween(panelX - flourishW, headerY + 18, panelX + flourishW, headerY + 18);
    flourishGfx.fillStyle(0x3a2a1a, 0.4);
    // Small diamond at center of flourish
    const fd = 4;
    flourishGfx.fillPoints([
      new Phaser.Geom.Point(panelX, headerY + 18 - fd),
      new Phaser.Geom.Point(panelX + fd, headerY + 18),
      new Phaser.Geom.Point(panelX, headerY + 18 + fd),
      new Phaser.Geom.Point(panelX - fd, headerY + 18),
    ], true);
    container.add(flourishGfx);

    // Close button
    const closeBtn = createCloseButton(this, panelLeft + panelW - leatherBorder - 30, headerY, () => this.closeCaseBook(), 80);
    container.add(closeBtn);

    // ─── Tab buttons (below header) ───
    const tabY = headerContentTop + headerH + 30;
    const tabSpacing = 170;

    // JOURNAL tab
    const journalTabContainer = this.add.container(panelX - tabSpacing / 2, tabY);
    this.tabJournalBg = this.add.graphics();
    journalTabContainer.add(this.tabJournalBg);
    this.tabJournalText = this.add.text(0, 0, 'JOURNAL', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TAB_GOLD_STR,
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    journalTabContainer.add(this.tabJournalText);
    const journalTabHit = this.add.rectangle(0, 0, 150, 36, 0x000000, 0);
    journalTabHit.setInteractive({ cursor: POINTER_CURSOR });
    journalTabHit.on('pointerdown', () => {
      if (this.currentTab !== 'journal') this.switchTab('journal');
    });
    journalTabContainer.add(journalTabHit);
    container.add(journalTabContainer);

    // EVIDENCE tab
    const evidenceTabContainer = this.add.container(panelX + tabSpacing / 2, tabY);
    this.tabEvidenceBg = this.add.graphics();
    evidenceTabContainer.add(this.tabEvidenceBg);
    this.tabEvidenceText = this.add.text(0, 0, 'EVIDENCE', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TAB_GOLD_STR,
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    evidenceTabContainer.add(this.tabEvidenceText);
    const evidenceTabHit = this.add.rectangle(0, 0, 150, 36, 0x000000, 0);
    evidenceTabHit.setInteractive({ cursor: POINTER_CURSOR });
    evidenceTabHit.on('pointerdown', () => {
      if (this.currentTab !== 'evidence') this.switchTab('evidence');
    });
    evidenceTabContainer.add(evidenceTabHit);
    container.add(evidenceTabContainer);

    // ─── Content area starts below tabs ───
    const contentTop = tabY + 30;
    const contentBottom = panelBottom - leatherBorder - 18;
    const contentH = contentBottom - contentTop;

    // Store book layout for journal use
    this.bookLayout = { panelW: paperW, panelH: paperH, panelX, panelY, contentTop, contentBottom };

    // ─── Evidence content container ───
    this.evidenceContent = this.add.container(0, 0);
    container.add(this.evidenceContent);
    this.createEvidenceContent(panelX, paperLeft, paperW, contentTop, contentH, contentBottom);

    // ─── Journal content container ───
    this.journalContent = this.add.container(0, 0);
    container.add(this.journalContent);

    return container;
  }

  // ─── Evidence tab content (grid + detail panel) ─────────────────────────────

  private createEvidenceContent(
    panelX: number, paperLeft: number, paperW: number,
    contentTop: number, contentH: number, contentBottom: number,
  ): void {
    const leftW = paperW * 0.55;
    const rightW = paperW - leftW - 45;
    const leftX = paperLeft + 22;
    const rightX = leftX + leftW + 22;

    // ─── Items grid container (will be populated by refresh) ───
    this.itemsGrid = this.add.container(0, 0);
    this.evidenceContent.add(this.itemsGrid);

    // ─── Right detail panel ───
    const detailCenterX = rightX + rightW / 2;
    const detailCenterY = contentTop + contentH / 2;

    // Detail background — parchment style
    const detailBg = this.add.rectangle(detailCenterX, detailCenterY, rightW, contentH, 0x3a2a1a, 0.08);
    detailBg.setStrokeStyle(1, BOOK_LEATHER, 0.2);
    this.evidenceContent.add(detailBg);

    // Placeholder text (shown when no item selected)
    this.detailPlaceholder = this.add.text(detailCenterX, detailCenterY, 'Select an item to inspect', {
      fontFamily: JOURNAL_FONT,
      fontSize: '21px',
      color: '#6a5a4a',
      fontStyle: 'italic',
      align: 'center',
    }).setOrigin(0.5);
    this.evidenceContent.add(this.detailPlaceholder);

    // Detail image (created on demand)
    this.detailImage = null;

    // Detail name
    this.detailName = this.add.text(detailCenterX, contentTop + 30, '', {
      fontFamily: JOURNAL_FONT,
      fontSize: '28px',
      color: '#3a2a1a',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailName);

    // Key item badge
    this.detailKeyBadge = this.add.container(detailCenterX, contentTop + 72);
    const badgeBg = this.add.rectangle(0, 0, 150, 33, TAB_GOLD, 0.15);
    badgeBg.setStrokeStyle(1.5, TAB_GOLD, 0.4);
    const badgeText = this.add.text(0, 0, '★  KEY EVIDENCE', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TAB_GOLD_STR,
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.detailKeyBadge.add([badgeBg, badgeText]);
    this.detailKeyBadge.setVisible(false);
    this.evidenceContent.add(this.detailKeyBadge);

    // Detail description
    this.detailDesc = this.add.text(detailCenterX, contentTop + 120, '', {
      fontFamily: JOURNAL_FONT,
      fontSize: '21px',
      color: BOOK_INK,
      wordWrap: { width: rightW - 60 },
      lineSpacing: 5,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailDesc);

    // Hint at bottom of detail panel
    const hintY = contentBottom - 30;
    const hint = this.add.text(detailCenterX, hintY, 'Click an item to select it for use.\nClick again to deselect.', {
      fontFamily: JOURNAL_FONT,
      fontSize: '17px',
      color: '#6a5a4a',
      fontStyle: 'italic',
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 1);
    this.evidenceContent.add(hint);

    // Store layout info for refresh
    this.layout = { leftX, contentTop, contentH, leftW, rightW, rightX };
  }

  private _refreshingGrid = false;

  private refreshInventoryGrid(): void {
    // Guard against re-entrant calls (selectItem → notify → refresh loop)
    if (this._refreshingGrid) return;
    this._refreshingGrid = true;

    // Clear old item cards
    this.itemsGrid.removeAll(true);

    const inventory = InventorySystem.getInstance();
    const items = inventory.getItems();
    const selectedItem = inventory.getSelectedItem();

    const { leftX, contentTop, contentH, leftW } = this.layout;

    // Grid layout: 3 columns
    const cols = 3;
    const cardW = Math.floor((leftW - 30) / cols) - 12;
    const cardH = cardW + 45; // square image + name below
    const gap = 15;
    const gridStartX = leftX + 15;
    const gridStartY = contentTop + 12;

    if (items.length === 0) {
      const emptyText = this.add.text(
        leftX + leftW / 2, contentTop + contentH / 2,
        'No evidence collected yet.\n\nExplore the theater to find items.',
        {
          fontFamily: JOURNAL_FONT,
          fontSize: '21px',
          color: '#6a5a4a',
          fontStyle: 'italic',
          align: 'center',
          lineSpacing: 6,
        }
      ).setOrigin(0.5);
      this.itemsGrid.add(emptyText);
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

      // Card background — parchment card style
      const cardBg = this.add.rectangle(x, y + 10, cardW, cardH, 0x3a2a1a, 0.08);
      const borderColor = isSelected ? Colors.success : (isInspected ? TAB_GOLD : BOOK_LEATHER);
      const borderAlpha = isSelected ? 0.9 : (isInspected ? 0.7 : 0.2);
      cardBg.setStrokeStyle(isSelected || isInspected ? 2 : 1, borderColor, borderAlpha);
      cardBg.setInteractive({ cursor: POINTER_CURSOR });

      // Item image — larger and prominent
      const iconKey = `item_icon_${itemId}`;
      const imgSize = cardW - 30;
      let icon: Phaser.GameObjects.GameObject;
      if (this.textures.exists(iconKey)) {
        const img = this.add.image(x, y, iconKey);
        this.scaleImageToFit(img, imgSize);
        icon = img;
      } else {
        icon = this.add.text(x, y, itemData.icon || '?', {
          fontSize: '72px',
        }).setOrigin(0.5);
      }

      // Item name below image
      const label = this.add.text(x, y + cardW / 2 + 6, itemData.name, {
        fontFamily: JOURNAL_FONT,
        fontSize: '17px',
        color: isSelected ? TextColors.success : '#3a2a1a',
        align: 'center',
        wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5, 0);

      // Selected indicator
      if (isSelected) {
        const selBadge = this.add.text(x + cardW / 2 - 9, y - cardW / 2 + 15, '✓', {
          fontFamily: FONT,
          fontSize: '21px',
          color: TextColors.success,
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.itemsGrid.add(selBadge);
      }

      // Click to select/deselect for use + show detail
      cardBg.on('pointerdown', () => {
        if (selectedItem === itemId) {
          inventory.selectItem(null);
        } else {
          inventory.selectItem(itemId);
        }
        this.showItemDetail(itemId);
      });

      // Hover effects
      cardBg.on('pointerover', () => {
        cardBg.setFillStyle(0x3a2a1a, 0.15);
        cardBg.setStrokeStyle(2, TAB_GOLD, 0.6);
        this.showItemDetail(itemId);
      });
      cardBg.on('pointerout', () => {
        if (this.selectedItemId !== itemId) {
          cardBg.setFillStyle(0x3a2a1a, 0.08);
          const bc = (selectedItem === itemId) ? Colors.success : BOOK_LEATHER;
          const ba = (selectedItem === itemId) ? 0.9 : 0.2;
          cardBg.setStrokeStyle((selectedItem === itemId) ? 2 : 1, bc, ba);
        }
      });

      this.itemsGrid.add([cardBg, icon, label]);
    });

    this._refreshingGrid = false;
  }

  private resetDetailPanel(): void {
    this.selectedItemId = null;
    this.detailPlaceholder.setVisible(true);
    this.detailName.setVisible(false);
    this.detailKeyBadge.setVisible(false);
    this.detailDesc.setVisible(false);
    if (this.detailImage) this.detailImage.setVisible(false);
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

    const { rightX, rightW, contentTop } = this.layout;
    const detailCenterX = rightX + rightW / 2;

    // Hide placeholder
    this.detailPlaceholder.setVisible(false);

    // Update name
    this.detailName.setText(itemData.name);
    this.detailName.setVisible(true);

    // Update key badge
    const isKey = (itemData as { isKeyItem?: boolean }).isKeyItem;
    this.detailKeyBadge.setVisible(!!isKey);

    // Update description — position below badge or name
    const descY = isKey ? contentTop + 102 : contentTop + 72;

    // Update or create detail image — reuse existing object when possible
    const iconKey = `item_icon_${itemId}`;

    if (this.textures.exists(iconKey)) {
      const imgMaxSize = Math.min(rightW - 60, 220);
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

      // Position description below image
      const tex = this.detailImage.texture.getSourceImage();
      const imgBottom = descY + 20 + tex.height * this.detailImage.scaleY + 16;
      this.detailDesc.setPosition(detailCenterX, imgBottom);
    } else {
      if (this.detailImage) this.detailImage.setVisible(false);
      this.detailDesc.setPosition(detailCenterX, descY + 20);
    }

    this.detailDesc.setText(itemData.description);
    this.detailDesc.setVisible(true);
  }

  // ─── Journal Tab Content ──────────────────────────────────────────────────

  private refreshJournalContent(): void {
    // Clear previous journal content
    this.journalContent.removeAll(true);

    const { panelW, panelX, contentTop, contentBottom } = this.bookLayout;
    const save = SaveSystem.getInstance();
    const journal = save.getJournal();

    const contentLeft = panelX - panelW / 2 + 30;
    const contentRight = panelX + panelW / 2 - 30;
    const usableW = contentRight - contentLeft;

    // ─── Ruled lines on the journal page ───
    const ruledGfx = this.add.graphics();
    const lineSpacing = 33;
    const ruledStart = contentTop + 10;
    const ruledEnd = contentBottom - 50;
    ruledGfx.lineStyle(1, BOOK_STAIN, 0.12);
    for (let ly = ruledStart; ly < ruledEnd; ly += lineSpacing) {
      ruledGfx.lineBetween(contentLeft, ly, contentRight, ly);
    }
    // Red margin line
    const marginX = contentLeft + 55;
    ruledGfx.lineStyle(1, BOOK_MARGIN_RED, 0.2);
    ruledGfx.lineBetween(marginX, contentTop, marginX, contentBottom - 45);
    this.journalContent.add(ruledGfx);

    if (journal.length === 0) {
      const empty = this.add.text(panelX, (contentTop + contentBottom) / 2, "No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy's journal.", {
        fontFamily: JOURNAL_FONT,
        fontSize: '21px',
        color: '#6a5a4a',
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 6,
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

    // Render entries
    let y = contentTop + 20;
    const entryLeft = marginX + 15;

    pageEntries.forEach((entry, i) => {
      const globalIdx = startIdx + i;
      const xJitter = ((globalIdx * 7) % 5) - 3;

      const bullet = this.add.text(contentLeft + 10 + xJitter, y, `${globalIdx + 1}.`, {
        fontFamily: JOURNAL_FONT,
        fontSize: '22px',
        color: BOOK_BULLET,
        fontStyle: 'italic',
      });

      const text = this.add.text(entryLeft + xJitter, y, entry, {
        fontFamily: JOURNAL_FONT,
        fontSize: '22px',
        color: BOOK_INK,
        wordWrap: { width: usableW - 80 },
        lineSpacing: 5,
      });

      this.journalContent.add([bullet, text]);
      y += text.height + 18;
    });

    // ─── Page indicator and navigation ───
    const navY = contentBottom - 20;

    // Page indicator
    const pageText = this.add.text(panelX, navY, `Page ${this.journalPage + 1} of ${totalPages}`, {
      fontFamily: JOURNAL_FONT,
      fontSize: '18px',
      color: BOOK_BULLET,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.journalContent.add(pageText);

    // Previous button
    if (this.journalPage > 0) {
      const prevBtn = this.add.text(contentLeft + 20, navY, '← Previous', {
        fontFamily: JOURNAL_FONT,
        fontSize: '18px',
        color: '#5a3a2a',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      prevBtn.setInteractive({ cursor: POINTER_CURSOR });
      prevBtn.on('pointerover', () => prevBtn.setColor(TAB_GOLD_STR));
      prevBtn.on('pointerout', () => prevBtn.setColor('#5a3a2a'));
      prevBtn.on('pointerdown', () => {
        this.journalPage--;
        this.refreshJournalContent();
      });
      this.journalContent.add(prevBtn);
    }

    // Next button
    if (this.journalPage < totalPages - 1) {
      const nextBtn = this.add.text(contentRight - 20, navY, 'Next →', {
        fontFamily: JOURNAL_FONT,
        fontSize: '18px',
        color: '#5a3a2a',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);
      nextBtn.setInteractive({ cursor: POINTER_CURSOR });
      nextBtn.on('pointerover', () => nextBtn.setColor(TAB_GOLD_STR));
      nextBtn.on('pointerout', () => nextBtn.setColor('#5a3a2a'));
      nextBtn.on('pointerdown', () => {
        this.journalPage++;
        this.refreshJournalContent();
      });
      this.journalContent.add(nextBtn);
    }
  }
}
