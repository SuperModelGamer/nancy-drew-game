import { InventorySystem } from './InventorySystem';
import { DialogueSystem } from './DialogueSystem';
import { PuzzleSystem } from './PuzzleSystem';

interface SaveData {
  version: number;
  timestamp: number;
  currentRoom: string;
  chapter: number;
  inventory: ReturnType<InventorySystem['toJSON']>;
  dialogue: ReturnType<DialogueSystem['toJSON']>;
  puzzles: ReturnType<PuzzleSystem['toJSON']>;
  journal: string[];
  flags: Record<string, boolean | string>;
  discoveredRooms?: string[];
}

const SAVE_KEY = 'nancy-drew-save';
const SAVE_VERSION = 1;

export class SaveSystem {
  private static instance: SaveSystem;
  private currentRoom = 'foyer';
  private chapter = 1;
  private journal: string[] = [];
  private flags: Record<string, boolean | string> = {};
  private discoveredRooms: Set<string> = new Set(['lobby']);

  static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem();
    }
    return SaveSystem.instance;
  }

  setCurrentRoom(roomId: string): void {
    this.currentRoom = roomId;
    this.discoveredRooms.add(roomId);
  }

  getCurrentRoom(): string {
    return this.currentRoom;
  }

  setChapter(chapter: number): void {
    this.chapter = chapter;
  }

  getChapter(): number {
    return this.chapter;
  }

  addJournalEntry(entry: string): void {
    if (!this.journal.includes(entry)) {
      this.journal.push(entry);
    }
  }

  getJournal(): string[] {
    return [...this.journal];
  }

  discoverRoom(roomId: string): void {
    this.discoveredRooms.add(roomId);
  }

  isRoomDiscovered(roomId: string): boolean {
    return this.discoveredRooms.has(roomId);
  }

  getDiscoveredRooms(): string[] {
    return [...this.discoveredRooms];
  }

  setFlag(flag: string, value: boolean | string): void {
    this.flags[flag] = value;
  }

  getFlag(flag: string): boolean | string {
    return this.flags[flag] ?? false;
  }

  save(): void {
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      currentRoom: this.currentRoom,
      chapter: this.chapter,
      inventory: InventorySystem.getInstance().toJSON(),
      dialogue: DialogueSystem.getInstance().toJSON(),
      puzzles: PuzzleSystem.getInstance().toJSON(),
      journal: [...this.journal],
      flags: { ...this.flags },
      discoveredRooms: [...this.discoveredRooms],
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      console.warn('Failed to save game data');
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) return false;

      this.currentRoom = data.currentRoom;
      this.chapter = data.chapter;
      this.journal = data.journal || [];
      this.flags = data.flags || {};
      this.discoveredRooms = new Set(data.discoveredRooms ?? ['lobby']);

      InventorySystem.getInstance().loadFromJSON(data.inventory);
      DialogueSystem.getInstance().loadFromJSON(data.dialogue);
      PuzzleSystem.getInstance().loadFromJSON(data.puzzles);

      return true;
    } catch {
      console.warn('Failed to load save data');
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
