import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { HAND_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { UISounds } from '../utils/sounds';

// Height of the bottom toolbar strip
const TOOLBAR_H = 52;

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

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);
    const barY = height - TOOLBAR_H / 2;

    // ─── Bottom toolbar background strip ───
    const barBg = this.add.graphics();
    for (let i = 0; i < 20; i++) {
      const alpha = (i / 20) * 0.85;
      barBg.fillStyle(0x0a0a12, alpha);
      barBg.fillRect(0, height - TOOLBAR_H - 20 + i, width, 1);
    }
    barBg.fillStyle(0x0a0a12, 0.85);
    barBg.fillRect(0, height - TOOLBAR_H, width, TOOLBAR_H);
    barBg.lineStyle(1, Colors.gold, 0.25);
    barBg.lineBetween(0, height - TOOLBAR_H, width, height - TOOLBAR_H);
    barBg.setDepth(Depths.tooltip - 1);

    // ─── Toolbar buttons ───
    const btnStyle = { fontFamily: FONT, fontSize: '14px' };
    const buttons = [
      { label: 'Items', color: TextColors.gold, borderColor: Colors.gold, x: width * 0.12, action: () => this.toggleInventory() },
      { label: 'Suspects', color: '#b4a0d4', borderColor: 0xb4a0d4, x: width * 0.38, action: () => this.scene.launch('SuspectScene') },
      { label: 'Map', color: TextColors.edwin, borderColor: Colors.mapBlue, x: width * 0.62, action: () => this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() }) },
      { label: 'Journal', color: TextColors.gold, borderColor: Colors.gold, x: width * 0.88, action: () => this.toggleJournal() },
    ];

    buttons.forEach(btn => {
      const container = this.add.container(btn.x, barY);
      container.setDepth(Depths.tooltip);

      const bg = this.add.rectangle(0, 0, 100, 36, 0x0a0a12, 0);
      bg.setStrokeStyle(1, btn.borderColor as number, 0.4);
      bg.setInteractive({ cursor: HAND_CURSOR });

      const text = this.add.text(0, 0, btn.label, {
        ...btnStyle,
        color: btn.color,
      }).setOrigin(0.5);

      container.add([bg, text]);

      bg.on('pointerover', () => {
        bg.setFillStyle(Colors.hoverBg, 0.6);
        bg.setStrokeStyle(1, btn.borderColor as number, 0.8);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x0a0a12, 0);
        bg.setStrokeStyle(1, btn.borderColor as number, 0.4);
      });
      bg.on('pointerdown', btn.action);
    });

    // ─── Chapter indicator (top-center) ───
    const chapterLabel = this.add.text(width / 2, 12, '', {
      fontFamily: FONT,
      fontSize: '12px',
      color: TextColors.muted,
      fontStyle: 'italic',
    }).setOrigin(0.5, 0).setDepth(50);
    const updateChapter = () => {
      const ch = SaveSystem.getInstance().getChapter();
      chapterLabel.setText(ChapterSystem.getInstance().getChapterTitle(ch));
    };
    updateChapter();
    this.events.on('wake', updateChapter);

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
    const panelW = Math.min(width - 40, 1100);
    const panelH = height - TOOLBAR_H - 30;
    const panelX = width / 2;
    const panelY = panelH / 2 + 10;

    // Panel background
    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x12111a, 0.97);
    panelBg.setStrokeStyle(1.5, Colors.gold, 0.35);
    container.add(panelBg);

    // ─── Header ───
    const headerH = 44;
    const headerY = panelY - panelH / 2 + headerH / 2;

    const headerBg = this.add.rectangle(panelX, headerY, panelW - 2, headerH, 0x0e0d16, 1);
    container.add(headerBg);

    const title = this.add.text(panelX, headerY, 'CASE FILE — EVIDENCE', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TextColors.gold,
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5);
    container.add(title);

    // Decorative header lines
    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1, Colors.gold, 0.25);
    lineGfx.lineBetween(panelX - panelW / 2 + 20, headerY, panelX - 160, headerY);
    lineGfx.lineBetween(panelX + 160, headerY, panelX + panelW / 2 - 20, headerY);
    container.add(lineGfx);

    // Close button
    const closeBtn = createCloseButton(this, panelX + panelW / 2 - 22, headerY, () => this.toggleInventory(), '20px');
    container.add(closeBtn);

    // ─── Layout: left item grid + right detail panel ───
    const contentTop = headerY + headerH / 2 + 12;
    const contentBottom = panelY + panelH / 2 - 14;
    const contentH = contentBottom - contentTop;
    const leftW = panelW * 0.55;
    const rightW = panelW - leftW - 30;
    const leftX = panelX - panelW / 2 + 15;
    const rightX = leftX + leftW + 15;

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
      fontSize: '14px',
      color: TextColors.muted,
      fontStyle: 'italic',
      align: 'center',
    }).setOrigin(0.5);
    container.add(this.detailPlaceholder);

    // Detail image (created on demand)
    this.detailImage = null;

    // Detail name
    this.detailName = this.add.text(detailCenterX, contentTop + 20, '', {
      fontFamily: FONT,
      fontSize: '20px',
      color: TextColors.gold,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(this.detailName);

    // Key item badge
    this.detailKeyBadge = this.add.container(detailCenterX, contentTop + 48);
    const badgeBg = this.add.rectangle(0, 0, 100, 22, Colors.gold, 0.12);
    badgeBg.setStrokeStyle(1, Colors.gold, 0.3);
    const badgeText = this.add.text(0, 0, '★  KEY EVIDENCE', {
      fontFamily: FONT,
      fontSize: '10px',
      color: TextColors.gold,
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.detailKeyBadge.add([badgeBg, badgeText]);
    this.detailKeyBadge.setVisible(false);
    container.add(this.detailKeyBadge);

    // Detail description
    this.detailDesc = this.add.text(detailCenterX, contentTop + 80, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.light,
      wordWrap: { width: rightW - 40 },
      lineSpacing: 5,
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(this.detailDesc);

    // Hint at bottom of detail panel
    const hintY = contentBottom - 20;
    const hint = this.add.text(detailCenterX, hintY, 'Click an item to select it for use.\nClick again to deselect.', {
      fontFamily: FONT,
      fontSize: '11px',
      color: TextColors.muted,
      fontStyle: 'italic',
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 1);
    container.add(hint);

    // Store layout info for refresh
    container.setData('leftX', leftX);
    container.setData('contentTop', contentTop);
    container.setData('contentH', contentH);
    container.setData('leftW', leftW);
    container.setData('rightW', rightW);
    container.setData('rightX', rightX);

    return container;
  }

  private refreshInventoryGrid(): void {
    // Clear old item cards
    this.itemsGrid.removeAll(true);

    const inventory = InventorySystem.getInstance();
    const items = inventory.getItems();
    const selectedItem = inventory.getSelectedItem();

    const leftX = this.inventoryContainer.getData('leftX') as number;
    const contentTop = this.inventoryContainer.getData('contentTop') as number;
    const contentH = this.inventoryContainer.getData('contentH') as number;
    const leftW = this.inventoryContainer.getData('leftW') as number;

    // Grid layout: 3 columns
    const cols = 3;
    const cardW = Math.floor((leftW - 20) / cols) - 8;
    const cardH = cardW + 30; // square image + name below
    const gap = 10;
    const gridStartX = leftX + 10;
    const gridStartY = contentTop + 8;

    if (items.length === 0) {
      const emptyText = this.add.text(
        leftX + leftW / 2, contentTop + contentH / 2,
        'No evidence collected yet.\n\nExplore the theater to find items.',
        {
          fontFamily: FONT,
          fontSize: '14px',
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
      const cardBg = this.add.rectangle(x, y + 10, cardW, cardH, 0x15141e, 0.9);
      const borderColor = isSelected ? Colors.success : (isInspected ? Colors.gold : Colors.goldDim);
      const borderAlpha = isSelected ? 0.9 : (isInspected ? 0.7 : 0.2);
      cardBg.setStrokeStyle(isSelected || isInspected ? 2 : 1, borderColor, borderAlpha);
      cardBg.setInteractive({ cursor: HAND_CURSOR });

      // Item image — larger and prominent
      const iconKey = `item_icon_${itemId}`;
      const imgSize = cardW - 20;
      let icon: Phaser.GameObjects.GameObject;
      if (this.textures.exists(iconKey)) {
        const img = this.add.image(x, y, iconKey);
        // Scale to fit while maintaining aspect ratio
        const tex = this.textures.get(iconKey).getSourceImage();
        const scale = Math.min(imgSize / tex.width, imgSize / tex.height);
        img.setScale(scale);
        icon = img;
      } else {
        icon = this.add.text(x, y, itemData.icon || '?', {
          fontSize: '48px',
        }).setOrigin(0.5);
      }

      // Item name below image
      const label = this.add.text(x, y + cardW / 2 + 4, itemData.name, {
        fontFamily: FONT,
        fontSize: '11px',
        color: isSelected ? TextColors.success : TextColors.gold,
        align: 'center',
        wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5, 0);

      // Selected indicator
      if (isSelected) {
        const selBadge = this.add.text(x + cardW / 2 - 6, y - cardW / 2 + 10, '✓', {
          fontFamily: FONT,
          fontSize: '14px',
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

  private showItemDetail(itemId: string): void {
    if (this.selectedItemId === itemId) return;
    this.selectedItemId = itemId;

    const itemData = itemMap.get(itemId);
    if (!itemData) return;

    const rightX = this.inventoryContainer.getData('rightX') as number;
    const rightW = this.inventoryContainer.getData('rightW') as number;
    const contentTop = this.inventoryContainer.getData('contentTop') as number;
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
      const tex = this.textures.get(iconKey).getSourceImage();
      const scale = Math.min(imgMaxSize / tex.width, imgMaxSize / tex.height);
      this.detailImage.setScale(scale);
      this.detailImage.setVisible(true);

      // Position description below image
      const imgBottom = descY + 20 + tex.height * scale + 16;
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
    const panelW = Math.min(width * 0.9, 600);
    const panelH = 400;
    const panelY = Math.min(height / 2, height - TOOLBAR_H - panelH / 2 - 15);
    const panel = this.add.container(width / 2, panelY);

    // Aged paper background
    const paper = this.add.rectangle(0, 0, panelW, panelH, Colors.paper, 0.95);
    paper.setStrokeStyle(2, Colors.paperBorder, 0.8);
    paper.setInteractive();
    panel.add(paper);

    // Paper texture — subtle stain patches
    const stains = this.add.graphics();
    stains.fillStyle(Colors.paperBorder, 0.08);
    stains.fillCircle(-panelW / 4, -panelH / 4, 40);
    stains.fillCircle(panelW / 3, panelH / 5, 30);
    stains.fillEllipse(-panelW / 6, panelH / 3, 60, 25);
    stains.lineStyle(1, Colors.paperBorder, 0.15);
    for (let ly = -panelH / 2 + 65; ly < panelH / 2 - 20; ly += 22) {
      stains.lineBetween(-panelW / 2 + 25, ly, panelW / 2 - 25, ly);
    }
    stains.lineStyle(1, 0xcc6666, 0.2);
    stains.lineBetween(-panelW / 2 + 55, -panelH / 2 + 10, -panelW / 2 + 55, panelH / 2 - 10);
    panel.add(stains);

    const titleText = this.add.text(0, -panelH / 2 + 25, 'Nancy\'s Journal', {
      fontFamily: '\'Palatino Linotype\', \'Book Antiqua\', Palatino, Georgia, serif',
      fontSize: '22px',
      color: '#3a2a1a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    panel.add(titleText);

    const underline = this.add.graphics();
    underline.lineStyle(1, 0x3a2a1a, 0.4);
    underline.lineBetween(-60, -panelH / 2 + 40, 60, -panelH / 2 + 40);
    panel.add(underline);

    const closeBtn = this.add.text(panelW / 2 - 20, -panelH / 2 + 15, '✕', {
      fontFamily: FONT,
      fontSize: '20px',
      color: '#6a5a4a',
    }).setOrigin(0.5).setInteractive({ cursor: HAND_CURSOR });
    closeBtn.on('pointerdown', () => this.toggleJournal());
    closeBtn.on('pointerover', () => closeBtn.setColor('#3a2a1a'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#6a5a4a'));
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
    const panelW = Math.min(this.cameras.main.width * 0.9, 600);
    const journalFont = '\'Palatino Linotype\', \'Book Antiqua\', Palatino, Georgia, serif';

    if (journal.length === 0) {
      const empty = this.add.text(0, 0, 'No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy\'s journal.', {
        fontFamily: journalFont,
        fontSize: '14px',
        color: '#6a5a4a',
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);
      this.journalPanel.add(empty);
      return;
    }

    let y = -130;
    journal.forEach((entry, i) => {
      const xJitter = ((i * 7) % 5) - 2;

      const bullet = this.add.text(-panelW / 2 + 62 + xJitter, y, `${i + 1}.`, {
        fontFamily: journalFont,
        fontSize: '13px',
        color: '#5a3a2a',
        fontStyle: 'italic',
      });
      const text = this.add.text(-panelW / 2 + 82 + xJitter, y, entry, {
        fontFamily: journalFont,
        fontSize: '13px',
        color: '#2a1a0a',
        wordWrap: { width: panelW - 130 },
        lineSpacing: 3,
      });
      this.journalPanel.add([bullet, text]);
      y += text.height + 12;
    });
  }
}
