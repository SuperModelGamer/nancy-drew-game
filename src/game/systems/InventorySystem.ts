export class InventorySystem {
  private static instance: InventorySystem;
  private items: string[] = [];
  private selectedItem: string | null = null;
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
    this.notify();
    return true;
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

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  toJSON(): { items: string[]; selectedItem: string | null } {
    return { items: [...this.items], selectedItem: this.selectedItem };
  }

  loadFromJSON(data: { items: string[]; selectedItem: string | null }): void {
    this.items = data.items || [];
    this.selectedItem = data.selectedItem || null;
    this.notify();
  }
}
