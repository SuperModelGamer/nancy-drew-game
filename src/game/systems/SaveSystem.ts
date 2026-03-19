import { InventorySystem } from './InventorySystem';
import { DialogueSystem } from './DialogueSystem';
import { PuzzleSystem } from './PuzzleSystem';
import { getSupabase } from './SupabaseClient';
import { AuthManager } from './AuthManager';

export interface SaveData {
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

export interface SlotSummary {
  slot: number;
  timestamp: number;
  chapter: number;
  currentRoom: string;
  empty: boolean;
}

const SAVE_VERSION = 1;
const MAX_SLOTS = 1;

// ─── Storage Backend Interface ───────────────────────────────────────────────

interface StorageBackend {
  save(slot: number, data: SaveData): Promise<void>;
  load(slot: number): Promise<SaveData | null>;
  hasSave(slot: number): Promise<boolean>;
  deleteSave(slot: number): Promise<void>;
  listSlots(): Promise<SlotSummary[]>;
}

// ─── LocalStorage Backend ────────────────────────────────────────────────────

class LocalStorageBackend implements StorageBackend {
  private keyFor(slot: number): string {
    return `nancy-drew-save-${slot}`;
  }

  constructor() {
    this.migrateOldSave();
  }

  private migrateOldSave(): void {
    const old = localStorage.getItem('nancy-drew-save');
    if (old && !localStorage.getItem(this.keyFor(0))) {
      localStorage.setItem(this.keyFor(0), old);
      localStorage.removeItem('nancy-drew-save');
    }
  }

  async save(slot: number, data: SaveData): Promise<void> {
    try {
      localStorage.setItem(this.keyFor(slot), JSON.stringify(data));
    } catch {
      console.warn('Failed to save to localStorage');
    }
  }

  async load(slot: number): Promise<SaveData | null> {
    try {
      const raw = localStorage.getItem(this.keyFor(slot));
      if (!raw) return null;
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  async hasSave(slot: number): Promise<boolean> {
    return localStorage.getItem(this.keyFor(slot)) !== null;
  }

  async deleteSave(slot: number): Promise<void> {
    localStorage.removeItem(this.keyFor(slot));
  }

  async listSlots(): Promise<SlotSummary[]> {
    const summaries: SlotSummary[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const raw = localStorage.getItem(this.keyFor(i));
      if (raw) {
        try {
          const data: SaveData = JSON.parse(raw);
          summaries.push({
            slot: i,
            timestamp: data.timestamp,
            chapter: data.chapter,
            currentRoom: data.currentRoom,
            empty: false,
          });
        } catch {
          summaries.push({ slot: i, timestamp: 0, chapter: 0, currentRoom: '', empty: true });
        }
      } else {
        summaries.push({ slot: i, timestamp: 0, chapter: 0, currentRoom: '', empty: true });
      }
    }
    return summaries;
  }
}

// ─── Supabase Backend ────────────────────────────────────────────────────────

class SupabaseBackend implements StorageBackend {
  async save(slot: number, data: SaveData): Promise<void> {
    const supabase = getSupabase();
    const user = AuthManager.getInstance().getUser();
    if (!supabase || !user) return;

    await supabase.from('save_slots').upsert({
      user_id: user.id,
      slot_number: slot,
      save_data: data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,slot_number' });
  }

  async load(slot: number): Promise<SaveData | null> {
    const supabase = getSupabase();
    const user = AuthManager.getInstance().getUser();
    if (!supabase || !user) return null;

    const { data, error } = await supabase
      .from('save_slots')
      .select('save_data')
      .eq('user_id', user.id)
      .eq('slot_number', slot)
      .single();

    if (error || !data) return null;
    const saveData = data.save_data as SaveData;
    if (saveData.version !== SAVE_VERSION) return null;
    return saveData;
  }

  async hasSave(slot: number): Promise<boolean> {
    const supabase = getSupabase();
    const user = AuthManager.getInstance().getUser();
    if (!supabase || !user) return false;

    const { count } = await supabase
      .from('save_slots')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('slot_number', slot);

    return (count ?? 0) > 0;
  }

  async deleteSave(slot: number): Promise<void> {
    const supabase = getSupabase();
    const user = AuthManager.getInstance().getUser();
    if (!supabase || !user) return;

    await supabase
      .from('save_slots')
      .delete()
      .eq('user_id', user.id)
      .eq('slot_number', slot);
  }

  async listSlots(): Promise<SlotSummary[]> {
    const supabase = getSupabase();
    const user = AuthManager.getInstance().getUser();
    if (!supabase || !user) return this.emptySlots();

    const { data, error } = await supabase
      .from('save_slots')
      .select('slot_number, save_data')
      .eq('user_id', user.id)
      .order('slot_number');

    if (error || !data) return this.emptySlots();

    const slotMap = new Map<number, SlotSummary>();
    for (const row of data) {
      const sd = row.save_data as SaveData;
      slotMap.set(row.slot_number, {
        slot: row.slot_number,
        timestamp: sd.timestamp,
        chapter: sd.chapter,
        currentRoom: sd.currentRoom,
        empty: false,
      });
    }

    const summaries: SlotSummary[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      summaries.push(slotMap.get(i) ?? { slot: i, timestamp: 0, chapter: 0, currentRoom: '', empty: true });
    }
    return summaries;
  }

  private emptySlots(): SlotSummary[] {
    return Array.from({ length: MAX_SLOTS }, (_, i) => ({
      slot: i, timestamp: 0, chapter: 0, currentRoom: '', empty: true,
    }));
  }
}

// ─── SaveSystem ──────────────────────────────────────────────────────────────

export class SaveSystem {
  private static instance: SaveSystem;
  private currentRoom = 'foyer';
  private chapter = 1;
  private journal: string[] = [];
  private flags: Record<string, boolean | string> = {};
  private discoveredRooms: Set<string> = new Set(['lobby']);
  private listeners: Array<() => void> = [];

  private localStorage = new LocalStorageBackend();
  private cloudBackend = new SupabaseBackend();
  private activeSlot = 0;

  static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem();
    }
    return SaveSystem.instance;
  }

  // ── Slot management ──

  setActiveSlot(slot: number): void {
    this.activeSlot = Math.max(0, Math.min(slot, MAX_SLOTS - 1));
  }

  getActiveSlot(): number {
    return this.activeSlot;
  }

  async getSlotSummaries(): Promise<SlotSummary[]> {
    if (AuthManager.getInstance().isSignedIn()) {
      try {
        return await this.cloudBackend.listSlots();
      } catch {
        return this.localStorage.listSlots();
      }
    }
    return this.localStorage.listSlots();
  }

  // ── Cloud sync ──

  async syncFromCloud(): Promise<void> {
    if (!AuthManager.getInstance().isSignedIn()) return;

    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      try {
        const cloudData = await this.cloudBackend.load(slot);
        const localData = await this.localStorage.load(slot);

        if (cloudData && !localData) {
          // Cloud has data, local doesn't — pull down
          await this.localStorage.save(slot, cloudData);
        } else if (!cloudData && localData) {
          // Local has data, cloud doesn't — push up
          await this.cloudBackend.save(slot, localData);
        } else if (cloudData && localData) {
          // Both exist — latest timestamp wins
          if (cloudData.timestamp > localData.timestamp) {
            await this.localStorage.save(slot, cloudData);
          } else if (localData.timestamp > cloudData.timestamp) {
            await this.cloudBackend.save(slot, localData);
          }
        }
      } catch {
        console.warn(`Sync failed for slot ${slot}`);
      }
    }
  }

  // ── Change listeners ──

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

  // ── Game state accessors (unchanged API) ──

  setCurrentRoom(roomId: string): void {
    this.currentRoom = roomId;
    this.discoveredRooms.add(roomId);
    this.notify();
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
    this.notify();
  }

  getFlag(flag: string): boolean | string {
    return this.flags[flag] ?? false;
  }

  // ── Save/Load (synchronous API preserved) ──

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

    // Write to localStorage synchronously (existing callers unaffected)
    try {
      localStorage.setItem(`nancy-drew-save-${this.activeSlot}`, JSON.stringify(data));
    } catch {
      console.warn('Failed to save game data');
    }

    // Fire-and-forget cloud push if signed in
    if (AuthManager.getInstance().isSignedIn()) {
      this.cloudBackend.save(this.activeSlot, data).catch(() => {
        console.warn('Cloud save failed (will retry on next save)');
      });
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(`nancy-drew-save-${this.activeSlot}`);
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
    return localStorage.getItem(`nancy-drew-save-${this.activeSlot}`) !== null;
  }

  hasAnySave(): boolean {
    return this.hasSave();
  }

  deleteSave(): void {
    localStorage.removeItem(`nancy-drew-save-${this.activeSlot}`);

    // Also delete from cloud
    if (AuthManager.getInstance().isSignedIn()) {
      this.cloudBackend.deleteSave(this.activeSlot).catch(() => {});
    }

    // Reset in-memory state so a new game starts clean
    this.currentRoom = 'lobby';
    this.chapter = 1;
    this.journal = [];
    this.flags = {};
    this.discoveredRooms = new Set(['lobby']);
    InventorySystem.getInstance().loadFromJSON({ items: [], selectedItem: null });
    DialogueSystem.getInstance().loadFromJSON({ triggeredEvents: [] });
    PuzzleSystem.getInstance().loadFromJSON({ solvedPuzzles: [] });
  }
}
