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
    journalEntry: 'The investigation deepens. I\'ve learned about Margaux Fontaine and The Crimson Veil. Time to explore the theater thoroughly — the dressing rooms, projection booth, and anyone who might know more.',
  },
  {
    // Chapter 3: Unlocked after finding key evidence and discovering the ghost is fake
    chapter: 3,
    conditions: [
      { type: 'flag', id: 'basement_key_location' },
      { type: 'item', id: 'margaux_diary' },
      { type: 'flag', id: 'learned_about_cecilia' },
    ],
    journalEntry: 'I know where the basement key is hidden, I have Margaux\'s diary, and I know about Cecilia Drake. The pieces are coming together. Someone is staging a ghost — and I think I know who.',
  },
  {
    // Chapter 4: Unlocked after solving major puzzles and confronting Edwin
    chapter: 4,
    conditions: [
      { type: 'item', id: 'basement_key' },
      { type: 'puzzle', id: 'trunk_puzzle' },
      { type: 'flag', id: 'saw_ghost' },
    ],
    journalEntry: 'I\'ve found the basement key, opened Margaux\'s trunk, and seen the "ghost" firsthand. But something doesn\'t add up — the poisoning and the ghost feel like two different crimes. Time to go below the stage and find out.',
  },
  {
    // Chapter 5: The endgame — after confronting Edwin AND discovering Ashworth's fraud
    chapter: 5,
    conditions: [
      { type: 'flag', id: 'edwin_confronted' },
      { type: 'item', id: 'cecilia_letter' },
      { type: 'flag', id: 'ashworth_motive_revealed' },
    ],
    journalEntry: 'Edwin confessed to the ghost staging — but he didn\'t poison Ashworth. The chemicals don\'t match. The insurance records don\'t lie. And the "victim" ran when I got too close. It\'s time to prove what really happened — and who the real criminal is.',
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

  checkProgression(): number | null {
    const save = SaveSystem.getInstance();
    const inventory = InventorySystem.getInstance();
    const puzzles = PuzzleSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();
    const currentChapter = save.getChapter();
    let newChapter: number | null = null;

    for (const milestone of CHAPTER_MILESTONES) {
      if (milestone.chapter <= currentChapter) continue;
      if (milestone.chapter !== currentChapter + 1) continue;

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

        // When Chapter 5 begins, unlock the evidence board in the basement
        if (milestone.chapter === 5) {
          save.setFlag('case_near_close', true);
        }

        save.save();
        newChapter = milestone.chapter;
      }
    }

    return newChapter;
  }

  getChapterTitle(chapter: number): string {
    // Internal chapters 1-5 map to 3 nights over 72 hours
    // Ch 1-2 = Night 1 (arrive, meet cast, ghost sighting — 72→48 hours)
    // Ch 3   = Night 2 (deep investigation, snooping, catwalk — 48→24 hours)
    // Ch 4-5 = Night 3 (basement, confrontation, evidence board — final 24 hours)
    const titles: Record<number, string> = {
      1: 'Night 1 — 72 Hours Remain',
      2: 'Night 1 — 72 Hours Remain',
      3: 'Night 2 — 48 Hours Remain',
      4: 'Night 3 — 24 Hours Remain',
      5: 'Night 3 — The Final Hours',
    };
    return titles[chapter] || `Night ${chapter}`;
  }
}
