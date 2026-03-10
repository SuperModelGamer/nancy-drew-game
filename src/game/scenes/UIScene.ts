import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import itemsData from '../data/items.json';

export class UIScene extends Phaser.Scene {
  private inventoryBar!: Phaser.GameObjects.Container;
  private journalButton!: Phaser.GameObjects.Container;
  private inventoryOpen = false;
  private inventoryPanel!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Inventory button (bottom-left) - 48px minimum tap target
    const invBtn = this.add.container(50, height - 40);
    const invBg = this.add.rectangle(0, 0, 80, 48, 0x1a1a2e, 0.9);
    invBg.setStrokeStyle(1, 0xc9a84c, 0.6);
    invBg.setInteractive({ useHandCursor: true });
    const invText = this.add.text(0, 0, 'Items', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#c9a84c',
    }).setOrigin(0.5);
    invBtn.add([invBg, invText]);

    invBg.on('pointerdown', () => this.toggleInventory());

    // Journal button (bottom-right) - 48px minimum tap target
    this.journalButton = this.add.container(width - 50, height - 40);
    const journalBg = this.add.rectangle(0, 0, 80, 48, 0x1a1a2e, 0.9);
    journalBg.setStrokeStyle(1, 0xc9a84c, 0.6);
    journalBg.setInteractive({ useHandCursor: true });
    const journalText = this.add.text(0, 0, 'Journal', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#c9a84c',
    }).setOrigin(0.5);
    this.journalButton.add([journalBg, journalText]);

    journalBg.on('pointerdown', () => this.toggleJournal());

    // Inventory panel (hidden)
    this.inventoryPanel = this.createInventoryPanel();
    this.inventoryPanel.setVisible(false);

    // Listen for inventory changes
    InventorySystem.getInstance().onChange(() => this.refreshInventoryPanel());
  }

  private toggleInventory(): void {
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
    }
  }

  private toggleJournal(): void {
    // Journal system placeholder - will be implemented
  }

  private createInventoryPanel(): Phaser.GameObjects.Container {
    const { width, height } = this.cameras.main;
    const panelW = Math.min(width * 0.9, 500);
    const panelH = 200;
    const panel = this.add.container(width / 2, height - 180);

    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0a0a1a, 0.95);
    bg.setStrokeStyle(2, 0xc9a84c, 0.7);
    panel.add(bg);

    const title = this.add.text(0, -panelH / 2 + 20, 'Evidence', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c9a84c',
    }).setOrigin(0.5);
    panel.add(title);

    panel.setDepth(300);
    return panel;
  }

  private refreshInventoryPanel(): void {
    // Clear old item displays (keep bg and title)
    while (this.inventoryPanel.length > 2) {
      this.inventoryPanel.removeAt(2, true);
    }

    const inventory = InventorySystem.getInstance();
    const items = inventory.getItems();
    const allItems = itemsData.items;

    const startX = -200;
    const spacing = 90;

    items.forEach((itemId, index) => {
      const itemData = allItems.find((i: { id: string }) => i.id === itemId);
      if (!itemData) return;

      const x = startX + index * spacing;
      const y = 20;

      const slot = this.add.rectangle(x, y, 70, 70, 0x1a1a2e, 0.8);
      slot.setStrokeStyle(1, 0xc9a84c, 0.4);
      slot.setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y + 45, itemData.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#c9a84c',
        align: 'center',
      }).setOrigin(0.5);

      const icon = this.add.text(x, y, itemData.icon || '?', {
        fontSize: '28px',
      }).setOrigin(0.5);

      slot.on('pointerdown', () => {
        inventory.selectItem(itemId);
      });

      this.inventoryPanel.add([slot, label, icon]);
    });
  }
}
