import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { HAND_CURSOR, initSceneCursor } from '../utils/cursors';
import { UISounds } from '../utils/sounds';

// Height of the bottom toolbar strip
const TOOLBAR_H = 52;

export class UIScene extends Phaser.Scene {
  private inventoryBar!: Phaser.GameObjects.Container;
  private journalButton!: Phaser.GameObjects.Container;
  private inventoryOpen = false;
  private journalOpen = false;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private journalPanel!: Phaser.GameObjects.Container;
  private itemDescPanel!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);
    const barY = height - TOOLBAR_H / 2;
    initSceneCursor(this);

    // ─── Bottom toolbar background strip ───
    // Gradient fade: transparent at top → solid dark at bottom
    const barBg = this.add.graphics();
    // Top fade zone (20px above the bar)
    for (let i = 0; i < 20; i++) {
      const alpha = (i / 20) * 0.85;
      barBg.fillStyle(0x0a0a12, alpha);
      barBg.fillRect(0, height - TOOLBAR_H - 20 + i, width, 1);
    }
    // Solid bar background
    barBg.fillStyle(0x0a0a12, 0.85);
    barBg.fillRect(0, height - TOOLBAR_H, width, TOOLBAR_H);
    // Gold accent line at top of bar
    barBg.lineStyle(1, Colors.gold, 0.25);
    barBg.lineBetween(0, height - TOOLBAR_H, width, height - TOOLBAR_H);
    barBg.setDepth(Depths.tooltip - 1);

    // ─── Toolbar buttons ───
    // All buttons sit on the bar, evenly spaced
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

    // ─── Chapter indicator (top-center, on dark strip) ───
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
    this.inventoryPanel = this.createInventoryPanel();
    this.inventoryPanel.setVisible(false);

    this.journalPanel = this.createJournalPanel();
    this.journalPanel.setVisible(false);

    this.itemDescPanel = this.createItemDescPanel();
    this.itemDescPanel.setVisible(false);

    // Listen for inventory changes
    InventorySystem.getInstance().onChange(() => {
      this.refreshInventoryPanel();
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
      this.refreshInventoryPanel();
      this.inventoryPanel.setVisible(true);
      this.inventoryPanel.setAlpha(0);
      this.tweens.add({ targets: this.inventoryPanel, alpha: 1, duration: 200 });
    } else {
      this.tweens.add({
        targets: this.inventoryPanel,
        alpha: 0,
        duration: 200,
        onComplete: () => this.inventoryPanel.setVisible(false),
      });
      this.itemDescPanel.setVisible(false);
    }
  }

  private toggleJournal(): void {
    if (this.inventoryOpen) {
      this.inventoryOpen = false;
      this.inventoryPanel.setVisible(false);
      this.itemDescPanel.setVisible(false);
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

  private createInventoryPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);
    const panelW = Math.min(width * 0.9, 600);
    const panelH = 220;
    // Position above the toolbar
    const panel = this.add.container(width / 2, height - TOOLBAR_H - panelH / 2 - 10);

    const bg = this.add.rectangle(0, 0, panelW, panelH, Colors.panelBg, 0.95);
    bg.setStrokeStyle(2, Colors.gold, 0.7);
    panel.add(bg);

    const title = this.add.text(0, -panelH / 2 + 20, 'Evidence', {
      fontFamily: FONT,
      fontSize: '18px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    panel.add(title);

    // Deselect hint
    const hint = this.add.text(0, -panelH / 2 + 42, 'Click an item to select it for use. Click again to deselect.', {
      fontFamily: FONT,
      fontSize: '11px',
      color: TextColors.muted,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    panel.add(hint);

    panel.setDepth(Depths.inventoryPanel);
    return panel;
  }

  private createJournalPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);
    const panelW = Math.min(width * 0.9, 600);
    const panelH = 400;
    // Center vertically but stay above toolbar
    const panelY = Math.min(height / 2, height - TOOLBAR_H - panelH / 2 - 15);
    const panel = this.add.container(width / 2, panelY);

    // Aged paper background
    const paper = this.add.rectangle(0, 0, panelW, panelH, Colors.paper, 0.95);
    paper.setStrokeStyle(2, Colors.paperBorder, 0.8);
    paper.setInteractive(); // block clicks through
    panel.add(paper);

    // Paper texture — subtle stain patches for aged feel
    const stains = this.add.graphics();
    stains.fillStyle(Colors.paperBorder, 0.08);
    stains.fillCircle(-panelW / 4, -panelH / 4, 40);
    stains.fillCircle(panelW / 3, panelH / 5, 30);
    stains.fillEllipse(-panelW / 6, panelH / 3, 60, 25);
    // Faint ruled lines
    stains.lineStyle(1, Colors.paperBorder, 0.15);
    for (let ly = -panelH / 2 + 65; ly < panelH / 2 - 20; ly += 22) {
      stains.lineBetween(-panelW / 2 + 25, ly, panelW / 2 - 25, ly);
    }
    // Red margin line
    stains.lineStyle(1, 0xcc6666, 0.2);
    stains.lineBetween(-panelW / 2 + 55, -panelH / 2 + 10, -panelW / 2 + 55, panelH / 2 - 10);
    panel.add(stains);

    const title = this.add.text(0, -panelH / 2 + 25, 'Nancy\'s Journal', {
      fontFamily: '\'Palatino Linotype\', \'Book Antiqua\', Palatino, Georgia, serif',
      fontSize: '22px',
      color: '#3a2a1a',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    panel.add(title);

    // Decorative underline
    const underline = this.add.graphics();
    underline.lineStyle(1, 0x3a2a1a, 0.4);
    underline.lineBetween(-60, -panelH / 2 + 40, 60, -panelH / 2 + 40);
    panel.add(underline);

    // Close button
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

  private createItemDescPanel(): Phaser.GameObjects.Container {
    const { width } = this.cameras.main;
    const panelW = Math.min(width * 0.85, 500);
    const panel = this.add.container(width / 2, 150);

    const bg = this.add.rectangle(0, 0, panelW, 100, Colors.panelBg, 0.95);
    bg.setStrokeStyle(1, Colors.gold, 0.5);
    panel.add(bg);

    const nameText = this.add.text(0, -25, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add(nameText);

    const descText = this.add.text(0, 5, '', {
      fontFamily: FONT,
      fontSize: '13px',
      color: TextColors.light,
      wordWrap: { width: panelW - 40 },
      lineSpacing: 2,
      align: 'center',
    }).setOrigin(0.5, 0);
    panel.add(descText);

    panel.setDepth(Depths.itemDescPanel);
    return panel;
  }

  private refreshInventoryPanel(): void {
    // Clear old item displays (keep bg, title, hint = 3 elements)
    while (this.inventoryPanel.length > 3) {
      this.inventoryPanel.removeAt(3, true);
    }

    const inventory = InventorySystem.getInstance();
    const items = inventory.getItems();
    const allItems = itemsData.items;
    const selectedItem = inventory.getSelectedItem();

    const cols = 6;
    const slotSize = 70;
    const spacing = 80;
    const startX = -(Math.min(items.length, cols) - 1) * spacing / 2;
    const startY = 20;

    items.forEach((itemId, index) => {
      const itemData = allItems.find((i: { id: string }) => i.id === itemId);
      if (!itemData) return;

      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacing;
      const y = startY + row * (slotSize + 20);

      const isSelected = selectedItem === itemId;
      const borderColor = isSelected ? Colors.success : Colors.gold;
      const borderAlpha = isSelected ? 0.9 : 0.4;

      const slot = this.add.rectangle(x, y, slotSize, slotSize, Colors.sceneBg, 0.8);
      slot.setStrokeStyle(isSelected ? 2 : 1, borderColor, borderAlpha);
      slot.setInteractive({ cursor: HAND_CURSOR });

      const label = this.add.text(x, y + slotSize / 2 + 8, itemData.name, {
        fontFamily: FONT,
        fontSize: '10px',
        color: isSelected ? TextColors.success : TextColors.gold,
        align: 'center',
        wordWrap: { width: slotSize + 10 },
      }).setOrigin(0.5, 0);

      // Use procedural icon texture if available, fall back to emoji
      const iconKey = `item_icon_${itemId}`;
      let icon: Phaser.GameObjects.GameObject;
      if (this.textures.exists(iconKey)) {
        const img = this.add.image(x, y, iconKey).setDisplaySize(40, 40);
        icon = img;
      } else {
        icon = this.add.text(x, y, itemData.icon || '?', {
          fontSize: '28px',
        }).setOrigin(0.5);
      }

      // Click to select/deselect
      slot.on('pointerdown', () => {
        if (selectedItem === itemId) {
          inventory.selectItem(null);
          this.itemDescPanel.setVisible(false);
        } else {
          inventory.selectItem(itemId);
          this.showItemDescription(itemData);
        }
      });

      // Hover to show description
      slot.on('pointerover', () => {
        slot.setFillStyle(Colors.hoverBg);
        this.showItemDescription(itemData);
      });
      slot.on('pointerout', () => {
        slot.setFillStyle(Colors.sceneBg, 0.8);
      });

      this.inventoryPanel.add([slot, label, icon]);
    });
  }

  private showItemDescription(itemData: { name: string; description: string }): void {
    const nameText = this.itemDescPanel.getAt(1) as Phaser.GameObjects.Text;
    const descText = this.itemDescPanel.getAt(2) as Phaser.GameObjects.Text;
    nameText.setText(itemData.name);
    descText.setText(itemData.description);

    // Resize bg to fit
    const bg = this.itemDescPanel.getAt(0) as Phaser.GameObjects.Rectangle;
    bg.setSize(bg.width, Math.max(80, descText.height + 50));

    this.itemDescPanel.setVisible(true);
  }

  private refreshJournalPanel(): void {
    // Clear old entries (keep bg, title, underline, stains, closeBtn = 5 elements)
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
      // Slight random offset for handwritten feel
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
