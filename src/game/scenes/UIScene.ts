import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';
import { drawArtDecoFrame, drawDecoDivider, drawChevronTab, drawCornerOrnament, DecoColors, DecoTextColors } from '../utils/art-deco';

// Height of the bottom toolbar strip (buttons + chapter label)
const TOOLBAR_H = 96;
const BOTTOM_MARGIN = 12; // negative space below toolbar to prevent misclicks

// Journal pagination
const JOURNAL_ENTRIES_PER_PAGE = 5;

// Handwritten journal font
const JOURNAL_FONT = '\'Palatino Linotype\', \'Book Antiqua\', Palatino, Georgia, serif';

// Pre-index items for O(1) lookup
const itemMap = new Map(itemsData.items.map(i => [i.id, i]));

type CaseBookTab = 'journal' | 'evidence';

export class UIScene extends Phaser.Scene {
  // ─── Case Book (unified notebook) ───
  private caseBook!: Phaser.GameObjects.Container;
  private caseBookOpen = false;
  private activeTab: CaseBookTab = 'journal';

  // Tab content containers (swapped when switching tabs)
  private journalContent!: Phaser.GameObjects.Container;
  private evidenceContent!: Phaser.GameObjects.Container;

  // Tab button references for active state styling
  private tabButtons: { tab: CaseBookTab; gfx: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[] = [];

  // Journal pagination state
  private journalPage = 0;
  private journalPageText!: Phaser.GameObjects.Text;
  private journalPrevBtn!: Phaser.GameObjects.Container;
  private journalNextBtn!: Phaser.GameObjects.Container;

  // Evidence detail panel elements
  private detailImage!: Phaser.GameObjects.Image | null;
  private detailName!: Phaser.GameObjects.Text;
  private detailDesc!: Phaser.GameObjects.Text;
  private detailKeyBadge!: Phaser.GameObjects.Container;
  private detailPlaceholder!: Phaser.GameObjects.Text;
  private selectedItemId: string | null = null;
  private itemsGrid!: Phaser.GameObjects.Container;

  // Cached layout dimensions
  private layout = { leftX: 0, contentTop: 0, contentH: 0, leftW: 0, rightW: 0, rightX: 0 };
  private bookLayout = { panelW: 0, panelH: 0, panelX: 0, panelY: 0, contentTop: 0, contentBottom: 0 };

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);

    // ─── Bottom toolbar — solid border with integrated chapter label ───
    const toolbarTop = height - BOTTOM_MARGIN - TOOLBAR_H;
    const barBg = this.add.graphics();

    // Dark fill for the bottom margin area
    barBg.fillStyle(0x060810, 1);
    barBg.fillRect(0, height - BOTTOM_MARGIN, width, BOTTOM_MARGIN);

    // Solid dark background
    barBg.fillStyle(DecoColors.navy, 0.97);
    barBg.fillRect(0, toolbarTop, width, TOOLBAR_H);

    // Subtle gradient fade just above the bar
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

    // ─── Story progress indicator — visual act tracker in toolbar center ───
    this.createProgressIndicator(width, toolbarTop);

    // ─── Toolbar buttons ───
    const buttonY = toolbarTop + 63;

    const buttons = [
      { label: 'EVIDENCE', icon: '◈', color: DecoColors.gold, x: width * 0.12, action: () => this.openCaseBook('evidence') },
      { label: 'SUSPECTS', icon: '◉', color: 0xb4a0d4, x: width * 0.38, action: () => this.launchSuspects() },
      { label: 'MAP', icon: '◇', color: Colors.mapBlue, x: width * 0.62, action: () => this.launchMap() },
      { label: 'JOURNAL', icon: '◆', color: DecoColors.gold, x: width * 0.88, action: () => this.openCaseBook('journal') },
    ];

    buttons.forEach(btn => {
      const container = this.add.container(btn.x, buttonY);
      container.setDepth(Depths.tooltip);

      const btnGfx = this.add.graphics();
      drawChevronTab(btnGfx, 0, 0, 195, 51, {
        fillColor: DecoColors.navy,
        fillAlpha: 0.6,
        strokeColor: btn.color,
        strokeAlpha: 0.4,
        chevronDepth: 5,
      });
      container.add(btnGfx);

      const hitArea = this.add.rectangle(0, 0, 195, 51, 0x000000, 0);
      hitArea.setInteractive({ cursor: POINTER_CURSOR });
      hitArea.on('pointerover', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, 195, 51, {
          fillColor: DecoColors.navyLight,
          fillAlpha: 0.8,
          strokeColor: btn.color,
          strokeAlpha: 0.8,
          chevronDepth: 5,
        });
      });
      hitArea.on('pointerout', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, 195, 51, {
          fillColor: DecoColors.navy,
          fillAlpha: 0.6,
          strokeColor: btn.color,
          strokeAlpha: 0.4,
          chevronDepth: 5,
        });
      });
      hitArea.on('pointerdown', btn.action);
      container.add(hitArea);

      const colorHex = `#${btn.color.toString(16).padStart(6, '0')}`;
      const text = this.add.text(0, 0, btn.label, {
        fontFamily: FONT,
        fontSize: '20px',
        color: colorHex,
        fontStyle: 'bold',
        letterSpacing: 3,
      }).setOrigin(0.5);
      container.add(text);
    });

    // ─── Create the unified Case Book ───
    this.caseBook = this.createCaseBook();
    this.caseBook.setVisible(false);

    // Listen for inventory changes
    const onInventoryChange = () => {
      if (this.caseBookOpen && this.activeTab === 'evidence') this.refreshEvidenceContent();
    };
    InventorySystem.getInstance().onChange(onInventoryChange);
    this.events.on('shutdown', () => {
      InventorySystem.getInstance().offChange(onInventoryChange);
    });
  }

  // ─── Toolbar helpers ──────────────────────────────────────────────────

  private launchSuspects(): void {
    if (this.caseBookOpen) this.closeCaseBook();
    this.scene.launch('SuspectScene');
  }

  private launchMap(): void {
    if (this.caseBookOpen) this.closeCaseBook();
    this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() });
  }

  // ─── Progress indicator (unchanged from original) ─────────────────────

  private createProgressIndicator(width: number, toolbarTop: number): void {
    const TOTAL_ACTS = 5;
    const progressY = toolbarTop + 18;
    const progressContainer = this.add.container(width / 2, progressY);
    progressContainer.setDepth(Depths.tooltip);

    const pipSpacing = 42;
    const totalPipW = (TOTAL_ACTS - 1) * pipSpacing;
    const pipStartX = -totalPipW / 2;
    const pipR = 6;
    const pipGfx = this.add.graphics();
    progressContainer.add(pipGfx);

    const actTooltip = this.add.text(0, 21, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: DecoTextColors.cream,
      fontStyle: 'italic',
      letterSpacing: 1,
    }).setOrigin(0.5, 0).setAlpha(0);
    progressContainer.add(actTooltip);

    const progressHit = this.add.rectangle(0, 0, totalPipW + 60, 30, 0x000000, 0);
    progressHit.setInteractive({ cursor: POINTER_CURSOR });
    progressContainer.add(progressHit);

    const drawProgress = (chapter: number) => {
      pipGfx.clear();
      pipGfx.lineStyle(1, DecoColors.gold, 0.15);
      pipGfx.lineBetween(pipStartX, 0, pipStartX + totalPipW, 0);

      if (chapter > 1) {
        const filledW = ((chapter - 1) / (TOTAL_ACTS - 1)) * totalPipW;
        pipGfx.lineStyle(2, DecoColors.gold, 0.6);
        pipGfx.lineBetween(pipStartX, 0, pipStartX + filledW, 0);
      }

      for (let i = 1; i <= TOTAL_ACTS; i++) {
        const px = pipStartX + (i - 1) * pipSpacing;
        const isComplete = i < chapter;
        const isCurrent = i === chapter;

        if (isCurrent) {
          pipGfx.fillStyle(DecoColors.gold, 0.9);
          pipGfx.fillPoints([
            new Phaser.Geom.Point(px, -pipR - 2),
            new Phaser.Geom.Point(px + pipR + 2, 0),
            new Phaser.Geom.Point(px, pipR + 2),
            new Phaser.Geom.Point(px - pipR - 2, 0),
          ], true);
        } else if (isComplete) {
          pipGfx.fillStyle(DecoColors.gold, 0.6);
          pipGfx.fillCircle(px, 0, pipR);
        } else {
          pipGfx.lineStyle(1, DecoColors.gold, 0.25);
          pipGfx.strokeCircle(px, 0, pipR);
        }
      }
      actTooltip.setText(ChapterSystem.getInstance().getChapterTitle(chapter));
    };

    progressHit.on('pointerover', () => {
      this.tweens.add({ targets: actTooltip, alpha: 1, duration: 150 });
    });
    progressHit.on('pointerout', () => {
      this.tweens.add({ targets: actTooltip, alpha: 0, duration: 150 });
    });

    const updateChapter = () => {
      const ch = SaveSystem.getInstance().getChapter();
      drawProgress(ch);
    };
    updateChapter();
    this.events.on('wake', updateChapter);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UNIFIED CASE BOOK
  // ═══════════════════════════════════════════════════════════════════════

  private openCaseBook(tab: CaseBookTab): void {
    if (this.caseBookOpen && this.activeTab === tab) {
      // Toggle off if same tab clicked
      this.closeCaseBook();
      return;
    }

    UISounds.panelOpen();
    this.caseBookOpen = true;
    this.switchTab(tab);

    this.caseBook.setVisible(true);
    this.caseBook.setAlpha(0);
    this.tweens.add({ targets: this.caseBook, alpha: 1, duration: 200 });
  }

  private closeCaseBook(): void {
    this.caseBookOpen = false;
    this.tweens.add({
      targets: this.caseBook,
      alpha: 0,
      duration: 200,
      onComplete: () => this.caseBook.setVisible(false),
    });
  }

  private switchTab(tab: CaseBookTab): void {
    this.activeTab = tab;

    // Show/hide content
    this.journalContent.setVisible(tab === 'journal');
    this.evidenceContent.setVisible(tab === 'evidence');

    // Refresh content
    if (tab === 'journal') {
      this.refreshJournalContent();
    } else if (tab === 'evidence') {
      this.resetDetailPanel();
      this.refreshEvidenceContent();
    }

    // Update tab button styles
    this.tabButtons.forEach(tb => {
      const isActive = tb.tab === tab;
      tb.gfx.clear();

      if (isActive) {
        // Active tab — paper colored, connected to panel body
        tb.gfx.fillStyle(Colors.paper, 0.95);
        tb.gfx.fillRoundedRect(-75, -18, 150, 40, { tl: 10, tr: 10, bl: 0, br: 0 });
        tb.gfx.lineStyle(2, Colors.paperBorder, 0.6);
        tb.gfx.beginPath();
        tb.gfx.moveTo(-75, 22);
        tb.gfx.lineTo(-75, -8);
        tb.gfx.arc(-65, -8, 10, Math.PI, Math.PI * 1.5);
        tb.gfx.lineTo(65, -18);
        tb.gfx.arc(65, -8, 10, Math.PI * 1.5, 0);
        tb.gfx.lineTo(75, 22);
        tb.gfx.strokePath();
        tb.label.setColor('#3a2a1a');
      } else {
        // Inactive tab — darker, recessed
        tb.gfx.fillStyle(0x2a2218, 0.85);
        tb.gfx.fillRoundedRect(-75, -12, 150, 34, { tl: 8, tr: 8, bl: 0, br: 0 });
        tb.gfx.lineStyle(1, Colors.paperBorder, 0.3);
        tb.gfx.strokeRoundedRect(-75, -12, 150, 34, { tl: 8, tr: 8, bl: 0, br: 0 });
        tb.label.setColor('#a89878');
      }
    });
  }

  private createCaseBook(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    const container = this.add.container(0, 0);
    container.setDepth(Depths.journalPanel);

    // Full-screen dark overlay
    const overlay = createOverlay(this, 0.85);
    container.add(overlay);

    // ─── Book dimensions ───
    const panelW = Math.min(width - 60, 1500);
    const panelH = height - TOOLBAR_H - BOTTOM_MARGIN - 50;
    const panelX = width / 2;
    const panelY = panelH / 2 + 18;
    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;

    this.bookLayout = {
      panelW, panelH, panelX, panelY,
      contentTop: panelTop + 75,
      contentBottom: panelTop + panelH - 20,
    };

    // ─── Book background — aged paper with leather border ───
    // Leather outer border
    const leatherBorder = this.add.rectangle(panelX, panelY, panelW + 16, panelH + 16, 0x3a2218, 0.95);
    leatherBorder.setStrokeStyle(3, 0x1a1008, 0.8);
    container.add(leatherBorder);

    // Gold embossed edge on the leather
    const edgeGfx = this.add.graphics();
    edgeGfx.lineStyle(1.5, DecoColors.gold, 0.3);
    edgeGfx.strokeRect(panelLeft - 4, panelTop - 4, panelW + 8, panelH + 8);
    edgeGfx.lineStyle(0.5, DecoColors.gold, 0.15);
    edgeGfx.strokeRect(panelLeft + 6, panelTop + 6, panelW - 12, panelH - 12);
    container.add(edgeGfx);

    // Paper fill
    const paper = this.add.rectangle(panelX, panelY, panelW, panelH, Colors.paper, 0.96);
    container.add(paper);

    // Spine line down the center (book binding)
    const spineGfx = this.add.graphics();
    spineGfx.lineStyle(2, Colors.paperBorder, 0.3);
    spineGfx.lineBetween(panelX, panelTop + 70, panelX, panelTop + panelH - 15);
    spineGfx.fillStyle(Colors.paperBorder, 0.06);
    spineGfx.fillRect(panelX - 8, panelTop + 70, 16, panelH - 85);
    container.add(spineGfx);

    // Paper texture — ruled lines across both pages
    const linesGfx = this.add.graphics();
    linesGfx.lineStyle(0.5, Colors.paperBorder, 0.12);
    for (let ly = panelTop + 110; ly < panelTop + panelH - 25; ly += 32) {
      linesGfx.lineBetween(panelLeft + 30, ly, panelLeft + panelW - 30, ly);
    }
    // Red margin lines on left page
    linesGfx.lineStyle(1, 0xcc6666, 0.15);
    linesGfx.lineBetween(panelLeft + 60, panelTop + 75, panelLeft + 60, panelTop + panelH - 15);
    // Red margin on right page
    linesGfx.lineBetween(panelX + 30, panelTop + 75, panelX + 30, panelTop + panelH - 15);
    container.add(linesGfx);

    // Subtle stain patches for aged effect
    const stains = this.add.graphics();
    stains.fillStyle(Colors.paperBorder, 0.06);
    stains.fillCircle(panelLeft + panelW * 0.25, panelTop + panelH * 0.3, 50);
    stains.fillCircle(panelLeft + panelW * 0.75, panelTop + panelH * 0.7, 40);
    stains.fillEllipse(panelLeft + panelW * 0.6, panelTop + panelH * 0.2, 70, 30);
    container.add(stains);

    // ─── Tab buttons along the top ───
    const tabs: { tab: CaseBookTab; label: string }[] = [
      { tab: 'journal', label: 'JOURNAL' },
      { tab: 'evidence', label: 'EVIDENCE' },
    ];

    const tabStartX = panelX - (tabs.length - 1) * 85;
    this.tabButtons = [];

    tabs.forEach((t, i) => {
      const tx = tabStartX + i * 170;
      const ty = panelTop;

      const tabGfx = this.add.graphics();
      tabGfx.setPosition(tx, ty);
      container.add(tabGfx);

      const tabLabel = this.add.text(tx, ty - 2, t.label, {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        letterSpacing: 2,
        color: '#3a2a1a',
      }).setOrigin(0.5);
      container.add(tabLabel);

      // Hit area for tab
      const tabHit = this.add.rectangle(tx, ty - 4, 150, 36, 0x000000, 0);
      tabHit.setInteractive({ cursor: POINTER_CURSOR });
      tabHit.on('pointerdown', () => this.switchTab(t.tab));
      container.add(tabHit);

      this.tabButtons.push({ tab: t.tab, gfx: tabGfx, label: tabLabel });
    });

    // ─── Title — "Nancy's Case Book" ───
    const titleText = this.add.text(panelX, panelTop + 40, 'Nancy\'s Case Book', {
      fontFamily: JOURNAL_FONT,
      fontSize: '30px',
      color: '#3a2a1a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(titleText);

    // Title underline with small decorative element
    const titleDeco = this.add.graphics();
    titleDeco.lineStyle(1, 0x3a2a1a, 0.35);
    titleDeco.lineBetween(panelX - 130, panelTop + 62, panelX + 130, panelTop + 62);
    // Small diamond at center
    titleDeco.fillStyle(0x3a2a1a, 0.3);
    titleDeco.fillPoints([
      new Phaser.Geom.Point(panelX, panelTop + 58),
      new Phaser.Geom.Point(panelX + 5, panelTop + 62),
      new Phaser.Geom.Point(panelX, panelTop + 66),
      new Phaser.Geom.Point(panelX - 5, panelTop + 62),
    ], true);
    container.add(titleDeco);

    // Close button
    const closeBtn = createCloseButton(this, panelLeft + panelW - 30, panelTop + 30, () => this.closeCaseBook(), 55);
    container.add(closeBtn);

    // ─── Content containers ───
    this.journalContent = this.add.container(0, 0);
    container.add(this.journalContent);

    this.evidenceContent = this.add.container(0, 0);
    container.add(this.evidenceContent);

    // ─── Build evidence content (persistent layout) ───
    this.buildEvidenceLayout();

    // ─── Build journal pagination controls ───
    this.buildJournalPagination();

    return container;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  JOURNAL TAB — paginated entries across two-page spread
  // ═══════════════════════════════════════════════════════════════════════

  private buildJournalPagination(): void {
    const { panelX, panelH, panelY } = this.bookLayout;
    const bottomY = panelY + panelH / 2 - 30;

    // Page indicator
    this.journalPageText = this.add.text(panelX, bottomY, 'Page 1', {
      fontFamily: JOURNAL_FONT,
      fontSize: '18px',
      color: '#6a5a4a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.journalContent.add(this.journalPageText);

    // Previous page button
    this.journalPrevBtn = this.createPageButton(panelX - 120, bottomY, '◀  Previous', () => {
      if (this.journalPage > 0) {
        this.journalPage--;
        this.refreshJournalContent();
      }
    });
    this.journalContent.add(this.journalPrevBtn);

    // Next page button
    this.journalNextBtn = this.createPageButton(panelX + 120, bottomY, 'Next  ▶', () => {
      this.journalPage++;
      this.refreshJournalContent();
    });
    this.journalContent.add(this.journalNextBtn);
  }

  private createPageButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const text = this.add.text(0, 0, label, {
      fontFamily: JOURNAL_FONT,
      fontSize: '17px',
      color: '#5a4a3a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(text);

    const hitArea = this.add.rectangle(0, 0, 120, 30, 0x000000, 0);
    hitArea.setInteractive({ cursor: POINTER_CURSOR });
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => text.setColor('#2a1a0a'));
    hitArea.on('pointerout', () => text.setColor('#5a4a3a'));
    container.add(hitArea);

    return container;
  }

  private refreshJournalContent(): void {
    // Remove dynamic entries (keep pagination controls = first 3 items)
    while (this.journalContent.length > 3) {
      this.journalContent.removeAt(3, true);
    }

    const { panelW, panelX, panelY, panelH } = this.bookLayout;
    const contentTop = panelY - panelH / 2 + 80;
    const contentH = panelH - 130; // leave room for title and pagination
    const halfW = panelW / 2 - 50;
    const leftPageX = panelX - panelW / 4;
    const rightPageX = panelX + panelW / 4;

    const save = SaveSystem.getInstance();
    const journal = save.getJournal();

    if (journal.length === 0) {
      const empty = this.add.text(panelX, panelY, 'No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy\'s journal.', {
        fontFamily: JOURNAL_FONT,
        fontSize: '22px',
        color: '#6a5a4a',
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5);
      this.journalContent.add(empty);
      this.journalPrevBtn.setVisible(false);
      this.journalNextBtn.setVisible(false);
      this.journalPageText.setText('');
      return;
    }

    // Paginate: JOURNAL_ENTRIES_PER_PAGE entries per page spread
    const totalPages = Math.ceil(journal.length / JOURNAL_ENTRIES_PER_PAGE);
    this.journalPage = Math.min(this.journalPage, totalPages - 1);

    const startIdx = this.journalPage * JOURNAL_ENTRIES_PER_PAGE;
    const pageEntries = journal.slice(startIdx, startIdx + JOURNAL_ENTRIES_PER_PAGE);

    // Split entries across left and right pages
    const leftCount = Math.ceil(pageEntries.length / 2);
    const leftEntries = pageEntries.slice(0, leftCount);
    const rightEntries = pageEntries.slice(leftCount);

    // Render left page entries
    this.renderJournalPageEntries(leftEntries, leftPageX, contentTop + 15, halfW, startIdx);

    // Render right page entries
    if (rightEntries.length > 0) {
      this.renderJournalPageEntries(rightEntries, rightPageX, contentTop + 15, halfW, startIdx + leftCount);
    }

    // Update pagination controls
    this.journalPageText.setText(`Page ${this.journalPage + 1} of ${totalPages}`);
    this.journalPrevBtn.setVisible(this.journalPage > 0);
    this.journalNextBtn.setVisible(this.journalPage < totalPages - 1);
  }

  private renderJournalPageEntries(entries: string[], centerX: number, startY: number, maxW: number, globalStartIdx: number): void {
    let y = startY;
    const textX = centerX - maxW / 2 + 40;

    entries.forEach((entry, i) => {
      const globalIdx = globalStartIdx + i;
      const xJitter = ((globalIdx * 7) % 5) - 2;

      // Entry number
      const bullet = this.add.text(textX - 30 + xJitter, y, `${globalIdx + 1}.`, {
        fontFamily: JOURNAL_FONT,
        fontSize: '21px',
        color: '#5a3a2a',
        fontStyle: 'italic',
      });
      this.journalContent.add(bullet);

      // Entry text
      const text = this.add.text(textX + xJitter, y, entry, {
        fontFamily: JOURNAL_FONT,
        fontSize: '21px',
        color: '#2a1a0a',
        wordWrap: { width: maxW - 70 },
        lineSpacing: 5,
      });
      this.journalContent.add(text);

      y += text.height + 22;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EVIDENCE TAB — item grid + detail panel (largely preserved)
  // ═══════════════════════════════════════════════════════════════════════

  private buildEvidenceLayout(): void {
    const { panelW, panelH, panelX, panelY } = this.bookLayout;
    const panelLeft = panelX - panelW / 2;
    const headerY = panelY - panelH / 2 + 75;

    // Section subtitle
    const subtitle = this.add.text(panelX, headerY - 8, 'CASE FILE — COLLECTED EVIDENCE', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#5a4a3a',
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.evidenceContent.add(subtitle);

    // Divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, Colors.paperBorder, 0.3);
    divGfx.lineBetween(panelLeft + 80, headerY + 10, panelLeft + panelW - 80, headerY + 10);
    this.evidenceContent.add(divGfx);

    // ─── Layout: left item grid + right detail panel ───
    const contentTop = headerY + 22;
    const contentBottom = panelY + panelH / 2 - 25;
    const contentH = contentBottom - contentTop;
    const leftW = panelW * 0.52;
    const rightW = panelW - leftW - 50;
    const leftX = panelLeft + 25;
    const rightX = leftX + leftW + 25;

    // Items grid container
    this.itemsGrid = this.add.container(0, 0);
    this.evidenceContent.add(this.itemsGrid);

    // Right detail panel background
    const detailCenterX = rightX + rightW / 2;
    const detailCenterY = contentTop + contentH / 2;

    const detailBg = this.add.rectangle(detailCenterX, detailCenterY, rightW, contentH, 0x2a2218, 0.3);
    detailBg.setStrokeStyle(1, Colors.paperBorder, 0.2);
    this.evidenceContent.add(detailBg);

    // Placeholder text
    this.detailPlaceholder = this.add.text(detailCenterX, detailCenterY, 'Select an item to inspect', {
      fontFamily: JOURNAL_FONT,
      fontSize: '21px',
      color: '#7a6a5a',
      fontStyle: 'italic',
      align: 'center',
    }).setOrigin(0.5);
    this.evidenceContent.add(this.detailPlaceholder);

    this.detailImage = null;

    // Detail name
    this.detailName = this.add.text(detailCenterX, contentTop + 25, '', {
      fontFamily: JOURNAL_FONT,
      fontSize: '28px',
      color: '#3a2a1a',
      fontStyle: 'bold italic',
      align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailName);

    // Key item badge
    this.detailKeyBadge = this.add.container(detailCenterX, contentTop + 65);
    const badgeBg = this.add.rectangle(0, 0, 150, 30, 0x3a2a1a, 0.12);
    badgeBg.setStrokeStyle(1, 0x3a2a1a, 0.2);
    const badgeText = this.add.text(0, 0, '★  KEY EVIDENCE', {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#5a3a2a',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.detailKeyBadge.add([badgeBg, badgeText]);
    this.detailKeyBadge.setVisible(false);
    this.evidenceContent.add(this.detailKeyBadge);

    // Detail description
    this.detailDesc = this.add.text(detailCenterX, contentTop + 110, '', {
      fontFamily: JOURNAL_FONT,
      fontSize: '20px',
      color: '#2a1a0a',
      wordWrap: { width: rightW - 50 },
      lineSpacing: 5,
      align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailDesc);

    // Usage hint
    const hint = this.add.text(detailCenterX, contentBottom - 25, 'Click an item to select it for use. Click again to deselect.', {
      fontFamily: JOURNAL_FONT,
      fontSize: '16px',
      color: '#8a7a6a',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: rightW - 40 },
      lineSpacing: 2,
    }).setOrigin(0.5, 1);
    this.evidenceContent.add(hint);

    // Store layout
    this.layout = { leftX, contentTop, contentH, leftW, rightW, rightX };
  }

  private refreshEvidenceContent(): void {
    this.itemsGrid.removeAll(true);

    const inventory = InventorySystem.getInstance();
    const items = inventory.getItems();
    const selectedItem = inventory.getSelectedItem();
    const { leftX, contentTop, contentH, leftW } = this.layout;

    const cols = 3;
    const cardW = Math.floor((leftW - 30) / cols) - 12;
    const cardH = cardW + 42;
    const gap = 14;
    const gridStartX = leftX + 15;
    const gridStartY = contentTop + 12;

    if (items.length === 0) {
      const emptyText = this.add.text(
        leftX + leftW / 2, contentTop + contentH / 2,
        'No evidence collected yet.\n\nExplore the theater to find items.',
        {
          fontFamily: JOURNAL_FONT,
          fontSize: '21px',
          color: '#7a6a5a',
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

      // Card background — paper/parchment style
      const cardBg = this.add.rectangle(x, y + 10, cardW, cardH, 0xf5ead0, 0.7);
      const borderColor = isSelected ? 0x4a8a4a : (isInspected ? 0x5a3a2a : Colors.paperBorder);
      const borderAlpha = isSelected ? 0.8 : (isInspected ? 0.6 : 0.25);
      cardBg.setStrokeStyle(isSelected || isInspected ? 2 : 1, borderColor, borderAlpha);
      cardBg.setInteractive({ cursor: POINTER_CURSOR });

      // Item image
      const iconKey = `item_icon_${itemId}`;
      const imgSize = cardW - 30;
      let icon: Phaser.GameObjects.GameObject;
      if (this.textures.exists(iconKey)) {
        const img = this.add.image(x, y, iconKey);
        this.scaleImageToFit(img, imgSize);
        icon = img;
      } else {
        icon = this.add.text(x, y, itemData.icon || '?', {
          fontSize: '60px',
        }).setOrigin(0.5);
      }

      // Item name
      const label = this.add.text(x, y + cardW / 2 + 6, itemData.name, {
        fontFamily: JOURNAL_FONT,
        fontSize: '16px',
        color: isSelected ? '#2a6a2a' : '#3a2a1a',
        align: 'center',
        wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5, 0);

      // Selected indicator
      if (isSelected) {
        const selBadge = this.add.text(x + cardW / 2 - 9, y - cardW / 2 + 15, '✓', {
          fontFamily: FONT,
          fontSize: '21px',
          color: '#2a6a2a',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.itemsGrid.add(selBadge);
      }

      cardBg.on('pointerdown', () => {
        if (selectedItem === itemId) {
          inventory.selectItem(null);
        } else {
          inventory.selectItem(itemId);
        }
        this.showItemDetail(itemId);
      });

      cardBg.on('pointerover', () => {
        cardBg.setFillStyle(0xede0c8, 0.9);
        cardBg.setStrokeStyle(2, 0x5a3a2a, 0.5);
        this.showItemDetail(itemId);
      });
      cardBg.on('pointerout', () => {
        if (this.selectedItemId !== itemId) {
          cardBg.setFillStyle(0xf5ead0, 0.7);
          const bc = isSelected ? 0x4a8a4a : Colors.paperBorder;
          const ba = isSelected ? 0.8 : 0.25;
          cardBg.setStrokeStyle(isSelected ? 2 : 1, bc, ba);
        }
      });

      this.itemsGrid.add([cardBg, icon, label]);
    });
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

    this.detailPlaceholder.setVisible(false);

    this.detailName.setText(itemData.name);
    this.detailName.setVisible(true);

    const isKey = (itemData as { isKeyItem?: boolean }).isKeyItem;
    this.detailKeyBadge.setVisible(!!isKey);

    const descY = isKey ? contentTop + 95 : contentTop + 65;

    const iconKey = `item_icon_${itemId}`;

    if (this.textures.exists(iconKey)) {
      const imgMaxSize = Math.min(rightW - 60, 200);
      if (this.detailImage) {
        this.detailImage.setTexture(iconKey);
        this.detailImage.setPosition(detailCenterX, descY + 15);
      } else {
        const img = this.add.image(detailCenterX, descY + 15, iconKey);
        img.setOrigin(0.5, 0);
        this.detailImage = img;
        this.evidenceContent.add(img);
      }
      this.scaleImageToFit(this.detailImage, imgMaxSize);
      this.detailImage.setVisible(true);

      const tex = this.detailImage.texture.getSourceImage();
      const imgBottom = descY + 15 + tex.height * this.detailImage.scaleY + 12;
      this.detailDesc.setPosition(detailCenterX, imgBottom);
    } else {
      if (this.detailImage) this.detailImage.setVisible(false);
      this.detailDesc.setPosition(detailCenterX, descY + 15);
    }

    this.detailDesc.setText(itemData.description);
    this.detailDesc.setVisible(true);
  }
}
