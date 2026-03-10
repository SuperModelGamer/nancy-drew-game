import { SaveSystem } from './SaveSystem';
import { InventorySystem } from './InventorySystem';
import { PuzzleSystem } from './PuzzleSystem';
import { DialogueSystem } from './DialogueSystem';

interface ChapterMilestone {
  chapter: number;
  conditions: ChapterCondition[];
  journalEntry: string;
}

interface ChapterCondition {
  type: 'flag' | 'item' | 'puzzle' | 'event';
  id: string;
}

const CHAPTER_MILESTONES: ChapterMilestone[] = [
  {
    // Chapter 2: Unlocked after talking to Vivian and Edwin, and entering the auditorium
    chapter: 2,
    conditions: [
      { type: 'flag', id: 'learned_about_margaux' },
      { type: 'flag', id: 'learned_about_crimson_veil' },
    ],
    journalEntry: 'Chapter 2: The investigation deepens. I\'ve learned about Margaux Fontaine and The Crimson Veil. Time to explore the theater thoroughly — the dressing rooms, projection booth, and anyone who might know more.',
  },
  {
    // Chapter 3: Unlocked after finding key evidence and discovering the ghost is fake
    chapter: 3,
    conditions: [
      { type: 'flag', id: 'basement_key_location' },
      { type: 'item', id: 'margaux_diary' },
      { type: 'flag', id: 'learned_about_cecilia' },
    ],
    journalEntry: 'Chapter 3: I know where the basement key is hidden, I have Margaux\'s diary, and I know about Cecilia Drake. The pieces are coming together. Someone is staging a ghost — and I think I know who.',
  },
  {
    // Chapter 4: Unlocked after solving major puzzles and confronting Edwin
    chapter: 4,
    conditions: [
      { type: 'item', id: 'basement_key' },
      { type: 'puzzle', id: 'trunk_puzzle' },
      { type: 'flag', id: 'saw_ghost' },
    ],
    journalEntry: 'Chapter 4: I\'ve found the basement key, opened Margaux\'s trunk, and seen the "ghost" firsthand. It\'s time to go below the stage and confront whoever is behind all of this.',
  },
  {
    // Chapter 5: The endgame — after confronting Edwin
    chapter: 5,
    conditions: [
      { type: 'flag', id: 'edwin_personal_revealed' },
      { type: 'item', id: 'cecilia_letter' },
    ],
    journalEntry: 'Chapter 5: Edwin has confessed. The 1928 murder is solved — Cecilia Drake poisoned Margaux Fontaine. Now I have to decide what happens next. Justice, exposure, or mercy.',
  },
];

export class ChapterSystem {
  private static instance: ChapterSystem;

  static getInstance(): ChapterSystem {
    if (!ChapterSystem.instance) {
      ChapterSystem.instance = new ChapterSystem();
    }
    return ChapterSystem.instance;
  }

  checkProgression(): boolean {
    const save = SaveSystem.getInstance();
    const inventory = InventorySystem.getInstance();
    const puzzles = PuzzleSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();
    const currentChapter = save.getChapter();
    let advanced = false;

    for (const milestone of CHAPTER_MILESTONES) {
      if (milestone.chapter <= currentChapter) continue;
      if (milestone.chapter !== currentChapter + 1) continue; // Only advance one chapter at a time

      const allMet = milestone.conditions.every(cond => {
        switch (cond.type) {
          case 'flag':
            return save.getFlag(cond.id) || dialogue.hasTriggeredEvent(cond.id);
          case 'item':
            return inventory.hasItem(cond.id);
          case 'puzzle':
            return puzzles.isSolved(cond.id);
          case 'event':
            return dialogue.hasTriggeredEvent(cond.id);
          default:
            return false;
        }
      });

      if (allMet) {
        save.setChapter(milestone.chapter);
        save.addJournalEntry(milestone.journalEntry);
        save.save();
        advanced = true;
      }
    }

    return advanced;
  }

  getChapterTitle(chapter: number): string {
    const titles: Record<number, string> = {
      1: 'Act I — The Invitation',
      2: 'Act II — Behind the Curtain',
      3: 'Act III — The Ghost\'s Secret',
      4: 'Act IV — Beneath the Stage',
      5: 'Act V — The Final Curtain',
    };
    return titles[chapter] || `Chapter ${chapter}`;
  }
}
