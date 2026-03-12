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

// Pre-index items for O(1) lookup
const itemMap = new Map(itemsData.items.map(i => [i.id, i]));

export class UIScene extends Phaser.Scene {
  private inventoryBar!: Phaser.GameObjects.Container;
  private journalButton!: Phaser.GameObjects.Container;
  private inventoryOpen = false;
  private journalOpen = false;
  private inventoryContainer!: Phaser.GameObjects.Container;
  private journalPanel!: Phaser.GameObjects.Container;
  // Detail panel elements (right side of inventory)
  private detailImage!: Phaser.GameObjects.Image | null;
  private detailName!: Phaser.GameObjects.Text;
  private detailDesc!: Phaser.GameObjects.Text;
  private detailKeyBadge!: Phaser.GameObjects.Container;
  private detailPlaceholder!: Phaser.GameObjects.Text;
  private selectedItemId: string | null = null;
  // Track items container for refresh
  private itemsGrid!: Phaser.GameObjects.Container;
  // Cached layout dimensions from createInventoryPanel
  private layout = { leftX: 0, contentTop: 0, contentH: 0, leftW: 0, rightW: 0, rightX: 0 };

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);

    // Add breathing room below toolbar so it doesn't touch the canvas bottom edge
    const BOTTOM_MARGIN = 12;
    const barY = height - TOOLBAR_H / 2 - BOTTOM_MARGIN;

    // ─── Bottom toolbar — solid border with integrated chapter label ───
    const toolbarTop = height - TOOLBAR_H - BOTTOM_MARGIN;
    const barBg = this.add.graphics();

    // Solid dark background (feels like a proper frame border, not floating)
    barBg.fillStyle(DecoColors.navy, 0.97);
    barBg.fillRect(0, toolbarTop, width, TOOLBAR_H);
    // Fill below the toolbar to the canvas edge
    barBg.fillStyle(0x05050a, 1);
    barBg.fillRect(0, toolbarTop + TOOLBAR_H, width, BOTTOM_MARGIN + 2);

    // Subtle gradient fade just above the bar (12px, very short)
    for (let i = 0; i < 12; i++) {
      barBg.fillStyle(DecoColors.navy, (i / 12) * 0.6);
      barBg.fillRect(0, toolbarTop - 12 + i, width, 1);
    }

    // Gold top border — double line for art deco feel
    barBg.lineStyle(2, DecoColors.gold, 0.5);
    barBg.lineBetween(0, toolbarTop, width, toolbarTop);
    barBg.lineStyle(0.5, DecoColors.gold, 0.2);
    barBg.lineBetween(0, toolbarTop + 6, width, toolbarTop + 6);

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
    const TOTAL_ACTS = 5;
    const progressY = toolbarTop + 18;
    const progressContainer = this.add.container(width / 2, progressY);
    progressContainer.setDepth(Depths.tooltip);

    // Act pip dots with connecting lines
    const pipSpacing = 42;
    const totalPipW = (TOTAL_ACTS - 1) * pipSpacing;
    const pipStartX = -totalPipW / 2;
    const pipR = 6;
    const pipGfx = this.add.graphics();
    progressContainer.add(pipGfx);

    // Tooltip for act title (hidden by default)
    const actTooltip = this.add.text(0, 14, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: DecoTextColors.cream,
      fontStyle: 'italic',
      letterSpacing: 1,
    }).setOrigin(0.5, 0).setAlpha(0);
    progressContainer.add(actTooltip);

    // Hit area for hover to show act title
    const progressHit = this.add.rectangle(0, 0, totalPipW + 60, 30, 0x000000, 0);
    progressHit.setInteractive({ cursor: POINTER_CURSOR });
    progressContainer.add(progressHit);

    const drawProgress = (chapter: number) => {
      pipGfx.clear();

      // Connecting line (track)
      pipGfx.lineStyle(1, DecoColors.gold, 0.15);
      pipGfx.lineBetween(pipStartX, 0, pipStartX + totalPipW, 0);

      // Filled progress line
      if (chapter > 1) {
        const filledW = ((chapter - 1) / (TOTAL_ACTS - 1)) * totalPipW;
        pipGfx.lineStyle(2, DecoColors.gold, 0.6);
        pipGfx.lineBetween(pipStartX, 0, pipStartX + filledW, 0);
      }

      // Act pips
      for (let i = 1; i <= TOTAL_ACTS; i++) {
        const px = pipStartX + (i - 1) * pipSpacing;
        const isComplete = i < chapter;
        const isCurrent = i === chapter;

        if (isCurrent) {
          // Current act — bright gold filled diamond
          pipGfx.fillStyle(DecoColors.gold, 0.9);
          pipGfx.fillPoints([
            new Phaser.Geom.Point(px, -pipR - 1),
            new Phaser.Geom.Point(px + pipR + 1, 0),
            new Phaser.Geom.Point(px, pipR + 1),
            new Phaser.Geom.Point(px - pipR - 1, 0),
          ], true);
        } else if (isComplete) {
          // Completed act — filled gold circle
          pipGfx.fillStyle(DecoColors.gold, 0.6);
          pipGfx.fillCircle(px, 0, pipR);
        } else {
          // Future act — empty circle outline
          pipGfx.lineStyle(1, DecoColors.gold, 0.25);
          pipGfx.strokeCircle(px, 0, pipR);
        }
      }

      // Update tooltip text
      actTooltip.setText(ChapterSystem.getInstance().getChapterTitle(chapter));
    };

    // Show/hide tooltip on hover
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

    // ─── Toolbar buttons — positioned below progress indicator ───
    const buttonY = toolbarTop + 63;

    const buttons = [
      { label: 'EVIDENCE', icon: '◈', color: DecoColors.gold, x: width * 0.12, action: () => this.toggleInventory() },
      { label: 'SUSPECTS', icon: '◉', color: 0xb4a0d4, x: width * 0.38, action: () => this.scene.launch('SuspectScene') },
      { label: 'MAP', icon: '◇', color: Colors.mapBlue, x: width * 0.62, action: () => this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() }) },
      { label: 'JOURNAL', icon: '◆', color: DecoColors.gold, x: width * 0.88, action: () => this.toggleJournal() },
    ];

    buttons.forEach(btn => {
      const container = this.add.container(btn.x, buttonY);
      container.setDepth(Depths.tooltip);

      // Chevron-shaped button background
      const btnGfx = this.add.graphics();
      drawChevronTab(btnGfx, 0, 0, 195, 51, {
        fillColor: DecoColors.navy,
        fillAlpha: 0.6,
        strokeColor: btn.color,
        strokeAlpha: 0.4,
        chevronDepth: 8,
      });
      container.add(btnGfx);

      // Hit area
      const hitArea = this.add.rectangle(0, 0, 195, 51, 0x000000, 0);
      hitArea.setInteractive({ cursor: POINTER_CURSOR });
      hitArea.on('pointerover', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, 195, 51, {
          fillColor: DecoColors.navyLight,
          fillAlpha: 0.8,
          strokeColor: btn.color,
          strokeAlpha: 0.8,
          chevronDepth: 8,
        });
      });
      hitArea.on('pointerout', () => {
        btnGfx.clear();
        drawChevronTab(btnGfx, 0, 0, 195, 51, {
          fillColor: DecoColors.navy,
          fillAlpha: 0.6,
          strokeColor: btn.color,
          strokeAlpha: 0.4,
          chevronDepth: 8,
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
        letterSpacing: 2,
      }).setOrigin(0.5);
      container.add(text);
    });

    // ─── Panels (hidden by default) ───
    this.inventoryContainer = this.createInventoryPanel();
    this.inventoryContainer.setVisible(false);

    this.journalPanel = this.createJournalPanel();
    this.journalPanel.setVisible(false);

    // Listen for inventory changes (clean up on shutdown to prevent leaks)
    const onInventoryChange = () => {
      if (this.inventoryOpen) this.refreshInventoryGrid();
    };
    InventorySystem.getInstance().onChange(onInventoryChange);
    this.events.on('shutdown', () => {
      InventorySystem.getInstance().offChange(onInventoryChange);
    });
  }

  private toggleInventory(): void {
    if (this.journalOpen) {
      this.journalOpen = false;
      this.journalPanel.setVisible(false);
    }

    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) {
      UISounds.panelOpen();
      this.resetDetailPanel();
      this.refreshInventoryGrid();
      this.inventoryContainer.setVisible(true);
      this.inventoryContainer.setAlpha(0);
      this.tweens.add({ targets: this.inventoryContainer, alpha: 1, duration: 200 });
    } else {
      this.tweens.add({
        targets: this.inventoryContainer,
        alpha: 0,
        duration: 200,
        onComplete: () => this.inventoryContainer.setVisible(false),
      });
    }
  }

  private toggleJournal(): void {
    if (this.inventoryOpen) {
      this.inventoryOpen = false;
      this.inventoryContainer.setVisible(false);
    }

    this.journalOpen = !this.journalOpen;
    if (this.journalOpen) {
      UISounds.panelOpen();
      this.refreshJournalPanel();
      this.journalPanel.setVisible(true);
      this.journalPanel.setAlpha(0);
      this.tweens.add({ targets: this.journalPanel, alpha: 1, duration: 200 });
    } else {
      this.tweens.add({
        targets: this.journalPanel,
        alpha: 0,
        duration: 200,
        onComplete: () => this.journalPanel.setVisible(false),
      });
    }
  }

  // ─── Full-screen Evidence Panel ───────────────────────────────────────────

  private createInventoryPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    const container = this.add.container(0, 0);
    container.setDepth(Depths.inventoryPanel);

    // Full-screen dark overlay
    const overlay = createOverlay(this, 0.88);
    container.add(overlay);

    // Main panel dimensions — fill most of the screen, leave room for toolbar
    const panelW = Math.min(width - 60, 1650);
    const panelH = height - TOOLBAR_H - 48;
    const panelX = width / 2;
    const panelY = panelH / 2 + 15;

    // Panel background with art deco frame
    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;
    const decoFrame = drawArtDecoFrame(this, panelLeft, panelTop, panelW, panelH, {
      color: DecoColors.gold,
      alpha: 0.4,
      cornerSize: 32,
      doubleBorder: true,
      fillColor: DecoColors.navyMid,
      fillAlpha: 0.97,
    });
    container.add(decoFrame);

    // ─── Header ───
    const headerH = 72;
    const headerY = panelY - panelH / 2 + headerH / 2;

    const headerBg = this.add.rectangle(panelX, headerY, panelW - 8, headerH, DecoColors.navy, 1);
    container.add(headerBg);

    // Header bottom border
    const headerLineGfx = this.add.graphics();
    headerLineGfx.lineStyle(1, DecoColors.gold, 0.3);
    headerLineGfx.lineBetween(panelLeft + 4, panelTop + headerH, panelLeft + panelW - 4, panelTop + headerH);
    container.add(headerLineGfx);

    const title = this.add.text(panelX, headerY, 'CASE FILE — EVIDENCE', {
      fontFamily: FONT,
      fontSize: '24px',
      color: DecoTextColors.goldBright,
      fontStyle: 'bold',
      letterSpacing: 5,
    }).setOrigin(0.5);
    container.add(title);

    // Decorative divider flanking title
    const divGfx = this.add.graphics();
    drawDecoDivider(divGfx, panelX, headerY, panelW * 0.65, DecoColors.gold, 0.25);
    container.add(divGfx);

    // Close button
    const closeBtn = createCloseButton(this, panelX + panelW / 2 - 33, headerY, () => this.toggleInventory(), 66);
    container.add(closeBtn);

    // ─── Layout: left item grid + right detail panel ───
    const contentTop = headerY + headerH / 2 + 18;
    const contentBottom = panelY + panelH / 2 - 21;
    const contentH = contentBottom - contentTop;
    const leftW = panelW * 0.55;
    const rightW = panelW - leftW - 45;
    const leftX = panelX - panelW / 2 + 22;
    const rightX = leftX + leftW + 22;

    // ─── Items grid container (will be populated by refresh) ───
    this.itemsGrid = this.add.container(0, 0);
    container.add(this.itemsGrid);

    // ─── Right detail panel ───
    const detailCenterX = rightX + rightW / 2;
    const detailCenterY = contentTop + contentH / 2;

    // Detail background
    const detailBg = this.add.rectangle(detailCenterX, detailCenterY, rightW, contentH, 0x0e0d16, 0.7);
    detailBg.setStrokeStyle(1, Colors.gold, 0.15);
    container.add(detailBg);

    // Placeholder text (shown when no item selected)
    this.detailPlaceholder = this.add.text(detailCenterX, detailCenterY, 'Select an item to inspect', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.muted,
      fontStyle: 'italic',
      align: 'center',
    }).setOrigin(0.5);
    container.add(this.detailPlaceholder);

    // Detail image (created on demand)
    this.detailImage = null;

    // Detail name
    this.detailName = this.add.text(detailCenterX, contentTop + 30, '', {
      fontFamily: FONT,
      fontSize: '30px',
      color: TextColors.gold,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(this.detailName);

    // Key item badge
    this.detailKeyBadge = this.add.container(detailCenterX, contentTop + 72);
    const badgeBg = this.add.rectangle(0, 0, 150, 33, Colors.gold, 0.12);
    badgeBg.setStrokeStyle(1, Colors.gold, 0.3);
    const badgeText = this.add.text(0, 0, '★  KEY EVIDENCE', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TextColors.gold,
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.detailKeyBadge.add([badgeBg, badgeText]);
    this.detailKeyBadge.setVisible(false);
    container.add(this.detailKeyBadge);

    // Detail description
    this.detailDesc = this.add.text(detailCenterX, contentTop + 120, '', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.light,
      wordWrap: { width: rightW - 60 },
      lineSpacing: 5,
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(this.detailDesc);

    // Hint at bottom of detail panel
    const hintY = contentBottom - 30;
    const hint = this.add.text(detailCenterX, hintY, 'Click an item to select it for use.\nClick again to deselect.', {
      fontFamily: FONT,
      fontSize: '17px',
      color: TextColors.muted,
      fontStyle: 'italic',
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 1);
    container.add(hint);

    // Store layout info for refresh
    this.layout = { leftX, contentTop, contentH, leftW, rightW, rightX };

    return container;
  }

  private refreshInventoryGrid(): void {
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
          fontFamily: FONT,
          fontSize: '21px',
          color: TextColors.muted,
          fontStyle: 'italic',
          align: 'center',
          lineSpacing: 4,
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

      // Card background
      const cardBg = this.add.rectangle(x, y + 15, cardW, cardH, 0x15141e, 0.9);
      const borderColor = isSelected ? Colors.success : (isInspected ? Colors.gold : Colors.goldDim);
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
        fontFamily: FONT,
        fontSize: '17px',
        color: isSelected ? TextColors.success : TextColors.gold,
        align: 'center',
        wordWrap: { width: cardW - 12 },
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
        cardBg.setFillStyle(0x1e1d2e, 1);
        cardBg.setStrokeStyle(2, Colors.gold, 0.6);
        this.showItemDetail(itemId);
      });
      cardBg.on('pointerout', () => {
        if (this.selectedItemId !== itemId) {
          cardBg.setFillStyle(0x15141e, 0.9);
          const bc = (selectedItem === itemId) ? Colors.success : Colors.goldDim;
          const ba = (selectedItem === itemId) ? 0.9 : 0.2;
          cardBg.setStrokeStyle((selectedItem === itemId) ? 2 : 1, bc, ba);
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

    // Hide placeholder
    this.detailPlaceholder.setVisible(false);

    // Update name
    this.detailName.setText(itemData.name);
    this.detailName.setVisible(true);

    // Update key badge
    const isKey = (itemData as { isKeyItem?: boolean }).isKeyItem;
    this.detailKeyBadge.setVisible(!!isKey);

    // Update description — position below badge or name
    const descY = isKey ? contentTop + 68 : contentTop + 48;

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
        this.inventoryContainer.add(img);
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

  // ─── Journal Panel ──────────────────────────────────────────────────────

  private createJournalPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    const panelW = Math.min(width * 0.9, 900);
    const panelH = 600;
    const panelY = Math.min(height / 2, height - TOOLBAR_H - panelH / 2 - 22);
    const panel = this.add.container(width / 2, panelY);

    // Aged paper background
    const paper = this.add.rectangle(0, 0, panelW, panelH, Colors.paper, 0.95);
    paper.setStrokeStyle(2, Colors.paperBorder, 0.8);
    paper.setInteractive();
    panel.add(paper);

    // Paper texture — subtle stain patches
    const stains = this.add.graphics();
    stains.fillStyle(Colors.paperBorder, 0.08);
    stains.fillCircle(-panelW / 4, -panelH / 4, 60);
    stains.fillCircle(panelW / 3, panelH / 5, 45);
    stains.fillEllipse(-panelW / 6, panelH / 3, 90, 38);
    stains.lineStyle(1, Colors.paperBorder, 0.15);
    for (let ly = -panelH / 2 + 98; ly < panelH / 2 - 30; ly += 33) {
      stains.lineBetween(-panelW / 2 + 38, ly, panelW / 2 - 38, ly);
    }
    stains.lineStyle(1, 0xcc6666, 0.2);
    stains.lineBetween(-panelW / 2 + 82, -panelH / 2 + 15, -panelW / 2 + 82, panelH / 2 - 15);
    panel.add(stains);

    const titleText = this.add.text(0, -panelH / 2 + 38, 'Nancy\'s Journal', {
      fontFamily: '\'Palatino Linotype\', \'Book Antiqua\', Palatino, Georgia, serif',
      fontSize: '33px',
      color: '#3a2a1a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    panel.add(titleText);

    const underline = this.add.graphics();
    underline.lineStyle(1, 0x3a2a1a, 0.4);
    underline.lineBetween(-90, -panelH / 2 + 60, 90, -panelH / 2 + 60);
    panel.add(underline);

    const closeBtn = createCloseButton(this, panelW / 2 - 30, -panelH / 2 + 22, () => this.toggleJournal(), 60);
    panel.add(closeBtn);

    panel.setDepth(Depths.journalPanel);
    return panel;
  }

  private refreshJournalPanel(): void {
    // Clear old entries (keep bg, stains, title, underline, closeBtn = 5 elements)
    while (this.journalPanel.length > 5) {
      this.journalPanel.removeAt(5, true);
    }

    const save = SaveSystem.getInstance();
    const journal = save.getJournal();
    const panelW = Math.min(this.cameras.main.width * 0.9, 900);
    const journalFont = '\'Palatino Linotype\', \'Book Antiqua\', Palatino, Georgia, serif';

    if (journal.length === 0) {
      const empty = this.add.text(0, 0, 'No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy\'s journal.', {
        fontFamily: journalFont,
        fontSize: '21px',
        color: '#6a5a4a',
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);
      this.journalPanel.add(empty);
      return;
    }

    let y = -200;
    journal.forEach((entry, i) => {
      const xJitter = ((i * 7) % 5) - 2;

      const bullet = this.add.text(-panelW / 2 + 62 + xJitter, y, `${i + 1}.`, {
        fontFamily: journalFont,
        fontSize: '23px',
        color: '#5a3a2a',
        fontStyle: 'italic',
      });
      const text = this.add.text(-panelW / 2 + 82 + xJitter, y, entry, {
        fontFamily: journalFont,
        fontSize: '23px',
        color: '#2a1a0a',
        wordWrap: { width: panelW - 130 },
        lineSpacing: 3,
      });
      this.journalPanel.add([bullet, text]);
      y += text.height + 12;
    });
  }
}
