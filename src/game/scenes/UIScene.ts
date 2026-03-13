import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths, FRAME } from '../utils/constants';
import { POINTER_CURSOR } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';
import { drawChevronTab, drawCornerOrnament, DecoColors } from '../utils/art-deco';

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
  private selectedItemId: string | null = null;
  private evidenceLayout = { leftX: 0, contentTop: 0, contentH: 0, leftW: 0, rightW: 0, rightX: 0 };

  // ── Journal panel state ──
  private journalOpen = false;
  private journalContainer!: Phaser.GameObjects.Container;
  private journalContent!: Phaser.GameObjects.Container;
  private journalPage = 0;
  private journalBookLayout = { panelW: 0, panelX: 0, contentTop: 0, contentBottom: 0 };

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // ─── Full-screen art deco frame border ───
    const fTop = FRAME.top;
    const fSide = FRAME.side;
    const toolbarTop = height - BOTTOM_MARGIN - TOOLBAR_H;

    const frameBg = this.add.graphics();

    // Solid opaque fill for all four border strips
    frameBg.fillStyle(DecoColors.navy, 1);
    frameBg.fillRect(0, 0, width, fTop);
    frameBg.fillRect(0, fTop, fSide, height - fTop);
    frameBg.fillRect(width - fSide, fTop, fSide, height - fTop);
    frameBg.fillRect(fSide, toolbarTop, width - 2 * fSide, TOOLBAR_H);
    frameBg.fillStyle(0x060810, 1);
    frameBg.fillRect(0, height - BOTTOM_MARGIN, width, BOTTOM_MARGIN);

    // Outer gold frame rectangle
    frameBg.lineStyle(3, DecoColors.gold, 0.7);
    frameBg.strokeRect(1, 1, width - 2, height - BOTTOM_MARGIN - 1);
    frameBg.lineStyle(1, DecoColors.gold, 0.3);
    frameBg.strokeRect(5, 5, width - 10, height - BOTTOM_MARGIN - 9);

    // Inner frame line (game viewport boundary)
    frameBg.lineStyle(2, DecoColors.gold, 0.5);
    frameBg.strokeRect(fSide, fTop, width - 2 * fSide, toolbarTop - fTop);

    // Center diamond on bottom frame border
    const diamondSize = 9;
    frameBg.fillStyle(DecoColors.gold, 0.6);
    frameBg.fillPoints([
      new Phaser.Geom.Point(width / 2, toolbarTop - diamondSize),
      new Phaser.Geom.Point(width / 2 + diamondSize, toolbarTop),
      new Phaser.Geom.Point(width / 2, toolbarTop + diamondSize),
      new Phaser.Geom.Point(width / 2 - diamondSize, toolbarTop),
    ], true);

    // Corner ornaments where toolbar meets side borders
    const cornerOrnW = 30;
    frameBg.fillStyle(DecoColors.gold, 0.4);
    frameBg.fillTriangle(fSide, toolbarTop - 4, fSide + cornerOrnW, toolbarTop, fSide, toolbarTop + 4);
    frameBg.fillTriangle(width - fSide, toolbarTop - 4, width - fSide - cornerOrnW, toolbarTop, width - fSide, toolbarTop + 4);

    // Four outer corner ornaments
    drawCornerOrnament(frameBg, 6, 6, 24, 'tl', DecoColors.gold, 0.45);
    drawCornerOrnament(frameBg, width - 6, 6, 24, 'tr', DecoColors.gold, 0.45);
    drawCornerOrnament(frameBg, 6, height - BOTTOM_MARGIN - 6, 24, 'bl', DecoColors.gold, 0.45);
    drawCornerOrnament(frameBg, width - 6, height - BOTTOM_MARGIN - 6, 24, 'br', DecoColors.gold, 0.45);

    // Top border center ornament
    const topDiamond = 6;
    frameBg.fillStyle(DecoColors.gold, 0.5);
    frameBg.fillPoints([
      new Phaser.Geom.Point(width / 2, 1),
      new Phaser.Geom.Point(width / 2 + topDiamond, fTop / 2),
      new Phaser.Geom.Point(width / 2, fTop - 1),
      new Phaser.Geom.Point(width / 2 - topDiamond, fTop / 2),
    ], true);

    frameBg.setDepth(Depths.tooltip - 1);

    // ─── Toolbar buttons ───
    const buttonY = toolbarTop + TOOLBAR_H / 2;

    const buttons = [
      { label: 'EVIDENCE', icon: '◈', color: DecoColors.gold, x: width * 0.2, action: () => this.toggleEvidence() },
      { label: 'SUSPECTS', icon: '◉', color: 0xb4a0d4, x: width * 0.4, action: () => this.scene.launch('SuspectScene') },
      { label: 'MAP', icon: '◇', color: Colors.mapBlue, x: width * 0.6, action: () => this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() }) },
      { label: 'JOURNAL', icon: '◆', color: DecoColors.gold, x: width * 0.8, action: () => this.toggleJournal() },
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

    // Listen for inventory changes
    const onInventoryChange = () => {
      if (this.evidenceOpen) this.refreshInventoryGrid();
    };
    InventorySystem.getInstance().onChange(onInventoryChange);
    this.events.on('shutdown', () => {
      InventorySystem.getInstance().offChange(onInventoryChange);
    });
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

    // Stain patches
    const stainGfx = this.add.graphics();
    stainGfx.fillStyle(BOOK_STAIN, 0.06);
    stainGfx.fillCircle(panelX - panelW / 4, panelY - panelH / 5, 55);
    stainGfx.fillCircle(panelX + panelW / 3, panelY + panelH / 6, 40);
    stainGfx.fillEllipse(panelX - panelW / 6, panelY + panelH / 4, 80, 34);
    stainGfx.fillStyle(BOOK_STAIN, 0.04);
    stainGfx.fillCircle(panelX + panelW / 5, panelY - panelH / 3, 35);
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
      fontFamily: JOURNAL_FONT, fontSize: '28px', color: '#3a2a1a',
      fontStyle: 'bold italic', letterSpacing: 5,
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
    const leftW = paperW * 0.55;
    const rightW = paperW - leftW - 45;
    const leftX = paperLeft + 22;
    const rightX = leftX + leftW + 22;

    // Items grid
    this.itemsGrid = this.add.container(0, 0);
    this.evidenceContent.add(this.itemsGrid);

    // Right detail panel
    const detailCenterX = rightX + rightW / 2;
    const detailCenterY = contentTop + contentH / 2;

    const detailBg = this.add.rectangle(detailCenterX, detailCenterY, rightW, contentH, 0x3a2a1a, 0.08);
    detailBg.setStrokeStyle(1, BOOK_LEATHER, 0.2);
    this.evidenceContent.add(detailBg);

    this.detailPlaceholder = this.add.text(detailCenterX, detailCenterY, 'Select an item to inspect', {
      fontFamily: JOURNAL_FONT, fontSize: '21px', color: '#6a5a4a',
      fontStyle: 'italic', align: 'center',
    }).setOrigin(0.5);
    this.evidenceContent.add(this.detailPlaceholder);

    this.detailImage = null;

    this.detailName = this.add.text(detailCenterX, contentTop + 30, '', {
      fontFamily: JOURNAL_FONT, fontSize: '28px', color: '#3a2a1a',
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailName);

    this.detailKeyBadge = this.add.container(detailCenterX, contentTop + 72);
    const badgeBg = this.add.rectangle(0, 0, 150, 33, TAB_GOLD, 0.15);
    badgeBg.setStrokeStyle(1.5, TAB_GOLD, 0.4);
    const badgeText = this.add.text(0, 0, '★  KEY EVIDENCE', {
      fontFamily: FONT, fontSize: '15px', color: TAB_GOLD_STR, letterSpacing: 1,
    }).setOrigin(0.5);
    this.detailKeyBadge.add([badgeBg, badgeText]);
    this.detailKeyBadge.setVisible(false);
    this.evidenceContent.add(this.detailKeyBadge);

    this.detailDesc = this.add.text(detailCenterX, contentTop + 120, '', {
      fontFamily: JOURNAL_FONT, fontSize: '21px', color: BOOK_INK,
      wordWrap: { width: rightW - 60 }, lineSpacing: 5, align: 'center',
    }).setOrigin(0.5, 0);
    this.evidenceContent.add(this.detailDesc);

    const hint = this.add.text(detailCenterX, contentBottom - 30,
      'Click an item to select it for use.\nClick again to deselect.', {
        fontFamily: JOURNAL_FONT, fontSize: '17px', color: '#6a5a4a',
        fontStyle: 'italic', align: 'center', lineSpacing: 2,
      }).setOrigin(0.5, 1);
    this.evidenceContent.add(hint);

    this.evidenceLayout = { leftX, contentTop, contentH, leftW, rightW, rightX };
  }

  private _refreshingGrid = false;

  private refreshInventoryGrid(): void {
    if (this._refreshingGrid) return;
    this._refreshingGrid = true;

    this.itemsGrid.removeAll(true);

    const inventory = InventorySystem.getInstance();
    const items = inventory.getItems();
    const selectedItem = inventory.getSelectedItem();

    const { leftX, contentTop, contentH, leftW } = this.evidenceLayout;

    const cols = 3;
    const cardW = Math.floor((leftW - 30) / cols) - 12;
    const cardH = cardW + 45;
    const gap = 15;
    const gridStartX = leftX + 15;
    const gridStartY = contentTop + 12;

    if (items.length === 0) {
      const emptyText = this.add.text(
        leftX + leftW / 2, contentTop + contentH / 2,
        'No evidence collected yet.\n\nExplore the theater to find items.',
        { fontFamily: JOURNAL_FONT, fontSize: '21px', color: '#6a5a4a',
          fontStyle: 'italic', align: 'center', lineSpacing: 6 }
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

      const label = this.add.text(x, y + cardW / 2 + 6, itemData.name, {
        fontFamily: JOURNAL_FONT, fontSize: '17px',
        color: isSelected ? TextColors.success : '#3a2a1a',
        align: 'center', wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5, 0);

      if (isSelected) {
        const selBadge = this.add.text(x + cardW / 2 - 9, y - cardW / 2 + 15, '✓', {
          fontFamily: FONT, fontSize: '21px', color: TextColors.success, fontStyle: 'bold',
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

    const contentLeft = panelX - panelW / 2 + 30;
    const contentRight = panelX + panelW / 2 - 30;
    const usableW = contentRight - contentLeft;

    // Ruled lines
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
      const empty = this.add.text(panelX, (contentTop + contentBottom) / 2,
        "No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy's journal.", {
          fontFamily: JOURNAL_FONT, fontSize: '21px', color: '#6a5a4a',
          fontStyle: 'italic', align: 'center', lineSpacing: 6,
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

    let y = contentTop + 20;
    const entryLeft = marginX + 15;

    pageEntries.forEach((entry, i) => {
      const globalIdx = startIdx + i;
      const xJitter = ((globalIdx * 7) % 5) - 3;

      const bullet = this.add.text(contentLeft + 10 + xJitter, y, `${globalIdx + 1}.`, {
        fontFamily: JOURNAL_FONT, fontSize: '22px', color: BOOK_BULLET, fontStyle: 'italic',
      });

      const text = this.add.text(entryLeft + xJitter, y, entry, {
        fontFamily: JOURNAL_FONT, fontSize: '22px', color: BOOK_INK,
        wordWrap: { width: usableW - 80 }, lineSpacing: 5,
      });

      this.journalContent.add([bullet, text]);
      y += text.height + 18;
    });

    // Page navigation
    const navY = contentBottom - 20;

    const pageText = this.add.text(panelX, navY, `Page ${this.journalPage + 1} of ${totalPages}`, {
      fontFamily: JOURNAL_FONT, fontSize: '18px', color: BOOK_BULLET, fontStyle: 'italic',
    }).setOrigin(0.5);
    this.journalContent.add(pageText);

    if (this.journalPage > 0) {
      const prevBtn = this.add.text(contentLeft + 20, navY, '← Previous', {
        fontFamily: JOURNAL_FONT, fontSize: '18px', color: '#5a3a2a', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      prevBtn.setInteractive({ cursor: POINTER_CURSOR });
      prevBtn.on('pointerover', () => prevBtn.setColor(TAB_GOLD_STR));
      prevBtn.on('pointerout', () => prevBtn.setColor('#5a3a2a'));
      prevBtn.on('pointerdown', () => { this.journalPage--; this.refreshJournalContent(); });
      this.journalContent.add(prevBtn);
    }

    if (this.journalPage < totalPages - 1) {
      const nextBtn = this.add.text(contentRight - 20, navY, 'Next →', {
        fontFamily: JOURNAL_FONT, fontSize: '18px', color: '#5a3a2a', fontStyle: 'bold',
      }).setOrigin(1, 0.5);
      nextBtn.setInteractive({ cursor: POINTER_CURSOR });
      nextBtn.on('pointerover', () => nextBtn.setColor(TAB_GOLD_STR));
      nextBtn.on('pointerout', () => nextBtn.setColor('#5a3a2a'));
      nextBtn.on('pointerdown', () => { this.journalPage++; this.refreshJournalContent(); });
      this.journalContent.add(nextBtn);
    }
  }
}
