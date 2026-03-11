import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import itemsData from '../data/items.json';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';

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

    // Inventory button (bottom-left) - 48px minimum tap target
    const invBtn = this.add.container(50, height - 40);
    const invBg = this.add.rectangle(0, 0, 80, 48, Colors.sceneBg, 0.9);
    invBg.setStrokeStyle(1, Colors.gold, 0.6);
    invBg.setInteractive({ useHandCursor: true });
    const invText = this.add.text(0, 0, 'Items', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    invBtn.add([invBg, invText]);

    invBg.on('pointerdown', () => this.toggleInventory());

    // Chapter indicator (top-center)
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
    // Refresh chapter display when scene resumes (room change)
    this.events.on('wake', updateChapter);

    // Journal button (bottom-right) - 48px minimum tap target
    this.journalButton = this.add.container(width - 50, height - 40);
    const journalBg = this.add.rectangle(0, 0, 80, 48, Colors.sceneBg, 0.9);
    journalBg.setStrokeStyle(1, Colors.gold, 0.6);
    journalBg.setInteractive({ useHandCursor: true });
    const journalText = this.add.text(0, 0, 'Journal', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    this.journalButton.add([journalBg, journalText]);

    journalBg.on('pointerdown', () => this.toggleJournal());

    // Suspects button (bottom-center-left)
    const suspectsBtn = this.add.container(width / 2 - 55, height - 40);
    const suspectsBg = this.add.rectangle(0, 0, 90, 48, Colors.sceneBg, 0.9);
    suspectsBg.setStrokeStyle(1, 0xb4a0d4, 0.6);
    suspectsBg.setInteractive({ useHandCursor: true });
    const suspectsText = this.add.text(0, 0, 'Suspects', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#b4a0d4',
    }).setOrigin(0.5);
    suspectsBtn.add([suspectsBg, suspectsText]);
    suspectsBg.on('pointerdown', () => {
      this.scene.launch('SuspectScene');
    });

    // Map button (bottom-center-right)
    const mapBtn = this.add.container(width / 2 + 55, height - 40);
    const mapBg = this.add.rectangle(0, 0, 80, 48, Colors.sceneBg, 0.9);
    mapBg.setStrokeStyle(1, Colors.mapBlue, 0.6);
    mapBg.setInteractive({ useHandCursor: true });
    const mapText = this.add.text(0, 0, 'Map', {
      fontFamily: FONT,
      fontSize: '15px',
      color: TextColors.edwin,
    }).setOrigin(0.5);
    mapBtn.add([mapBg, mapText]);
    mapBg.on('pointerdown', () => {
      this.scene.launch('MapScene', { currentRoom: SaveSystem.getInstance().getCurrentRoom() });
    });

    // Inventory panel (hidden)
    this.inventoryPanel = this.createInventoryPanel();
    this.inventoryPanel.setVisible(false);

    // Journal panel (hidden)
    this.journalPanel = this.createJournalPanel();
    this.journalPanel.setVisible(false);

    // Item description panel (hidden)
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
    const panelW = Math.min(width * 0.9, 600);
    const panelH = 220;
    const panel = this.add.container(width / 2, height - 190);

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
    const panelW = Math.min(width * 0.9, 600);
    const panelH = 400;
    const panel = this.add.container(width / 2, height / 2);

    const bg = this.add.rectangle(0, 0, panelW, panelH, Colors.panelBg, 0.97);
    bg.setStrokeStyle(2, Colors.gold, 0.7);
    bg.setInteractive(); // block clicks through
    panel.add(bg);

    const title = this.add.text(0, -panelH / 2 + 25, 'Nancy\'s Journal', {
      fontFamily: FONT,
      fontSize: '20px',
      color: TextColors.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add(title);

    // Close button
    const closeBtn = this.add.text(panelW / 2 - 20, -panelH / 2 + 15, '✕', {
      fontFamily: FONT,
      fontSize: '20px',
      color: TextColors.goldDim,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleJournal());
    closeBtn.on('pointerover', () => closeBtn.setColor(TextColors.gold));
    closeBtn.on('pointerout', () => closeBtn.setColor(TextColors.goldDim));
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
      slot.setInteractive({ useHandCursor: true });

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
    // Clear old entries (keep bg, title, closeBtn = 3 elements)
    while (this.journalPanel.length > 3) {
      this.journalPanel.removeAt(3, true);
    }

    const save = SaveSystem.getInstance();
    const journal = save.getJournal();
    const panelW = Math.min(this.cameras.main.width * 0.9, 600);

    if (journal.length === 0) {
      const empty = this.add.text(0, 0, 'No entries yet.\n\nExplore the theater and talk to people\nto fill Nancy\'s journal.', {
        fontFamily: FONT,
        fontSize: '14px',
        color: TextColors.muted,
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);
      this.journalPanel.add(empty);
      return;
    }

    let y = -130;
    journal.forEach((entry, i) => {
      const bullet = this.add.text(-panelW / 2 + 30, y, `${i + 1}.`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: TextColors.gold,
      });
      const text = this.add.text(-panelW / 2 + 55, y, entry, {
        fontFamily: FONT,
        fontSize: '13px',
        color: TextColors.light,
        wordWrap: { width: panelW - 100 },
        lineSpacing: 2,
      });
      this.journalPanel.add([bullet, text]);
      y += text.height + 10;
    });
  }
}
