export class InventorySystem {
  private static instance: InventorySystem;
  private items: string[] = [];
  private selectedItem: string | null = null;
  private usedItems: Set<string> = new Set();
  private maxSlots = 12;
  private listeners: Array<() => void> = [];

  static getInstance(): InventorySystem {
    if (!InventorySystem.instance) {
      InventorySystem.instance = new InventorySystem();
    }
    return InventorySystem.instance;
  }

  addItem(itemId: string): boolean {
    if (this.items.length >= this.maxSlots) return false;
    if (this.items.includes(itemId)) return false;

    this.items.push(itemId);
    this.notify();
    return true;
  }

  removeItem(itemId: string): boolean {
    const index = this.items.indexOf(itemId);
    if (index === -1) return false;

    this.items.splice(index, 1);
    if (this.selectedItem === itemId) this.selectedItem = null;
    this.usedItems.add(itemId);
    this.notify();
    return true;
  }

  markUsed(itemId: string): void {
    this.usedItems.add(itemId);
    this.notify();
  }

  isUsed(itemId: string): boolean {
    return this.usedItems.has(itemId);
  }

  getUsedItems(): string[] {
    return [...this.usedItems];
  }

  hasItem(itemId: string): boolean {
    return this.items.includes(itemId);
  }

  getItems(): string[] {
    return [...this.items];
  }

  selectItem(itemId: string | null): void {
    this.selectedItem = itemId;
    this.notify();
  }

  getSelectedItem(): string | null {
    return this.selectedItem;
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  offChange(listener: () => void): void {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  toJSON(): { items: string[]; selectedItem: string | null; usedItems: string[] } {
    return { items: [...this.items], selectedItem: this.selectedItem, usedItems: [...this.usedItems] };
  }

  loadFromJSON(data: { items: string[]; selectedItem: string | null; usedItems?: string[] }): void {
    this.items = data.items || [];
    this.selectedItem = data.selectedItem || null;
    this.usedItems = new Set(data.usedItems || []);
    this.notify();
  }
}
