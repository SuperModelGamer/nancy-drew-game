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

/** Maps condition IDs to atmospheric Nancy-voice hints for unmet conditions. */
const CONDITION_HINTS: Record<string, string> = {
  // Chapter 2 conditions
  learned_about_margaux: 'I still need to learn about Margaux Fontaine.',
  learned_about_crimson_veil: 'There\'s a play called The Crimson Veil — I should find out more.',
  // Chapter 3 conditions
  basement_key_location: 'Someone in this theater knows where the basement key is hidden.',
  margaux_diary: 'Margaux\'s diary must be somewhere in this theater.',
  learned_about_cecilia: 'I keep hearing the name Cecilia Drake. I need to find out who she was.',
  // Chapter 4 conditions
  basement_key: 'I need to get my hands on that basement key.',
  trunk_puzzle: 'That old trunk in the dressing room — there has to be a way to open it.',
  saw_ghost: 'I haven\'t seen the ghost yet. Maybe I need to be in the right place at the right time.',
  // Chapter 5 conditions
  edwin_personal_revealed: 'Edwin is hiding something personal. I need to press him.',
  cecilia_letter: 'There\'s a letter from Cecilia out there. I can feel it.',
};

export class ChapterSystem {
  private static instance: ChapterSystem;

  static getInstance(): ChapterSystem {
    if (!ChapterSystem.instance) {
      ChapterSystem.instance = new ChapterSystem();
    }
    return ChapterSystem.instance;
  }

  /**
   * Returns partial-progress info for the next chapter milestone.
   * If the player is already at the last chapter, returns null.
   */
  getNextChapterProgress(): { total: number; met: number; unmetHints: string[] } | null {
    const save = SaveSystem.getInstance();
    const inventory = InventorySystem.getInstance();
    const puzzles = PuzzleSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();
    const currentChapter = save.getChapter();

    const milestone = CHAPTER_MILESTONES.find(m => m.chapter === currentChapter + 1);
    if (!milestone) return null;

    const unmetHints: string[] = [];
    let met = 0;

    for (const cond of milestone.conditions) {
      let satisfied = false;
      switch (cond.type) {
        case 'flag':
          satisfied = !!(save.getFlag(cond.id) || dialogue.hasTriggeredEvent(cond.id));
          break;
        case 'item':
          satisfied = inventory.hasItem(cond.id);
          break;
        case 'puzzle':
          satisfied = puzzles.isSolved(cond.id);
          break;
        case 'event':
          satisfied = dialogue.hasTriggeredEvent(cond.id);
          break;
      }

      if (satisfied) {
        met++;
      } else {
        const hint = CONDITION_HINTS[cond.id];
        if (hint) unmetHints.push(hint);
      }
    }

    return { total: milestone.conditions.length, met, unmetHints };
  }

  /**
   * Returns a formatted nudge string when the player has partial progress
   * toward the next chapter, or null if no nudge is appropriate.
   */
  getProgressSummary(): string | null {
    const progress = this.getNextChapterProgress();
    if (!progress || progress.met === 0) return null;

    const remaining = progress.total - progress.met;
    if (remaining <= 0) return null;

    const prefix = remaining === 1
      ? 'Almost there. One more piece of the puzzle...'
      : `Getting closer. ${remaining} things left to uncover...`;

    const hint = progress.unmetHints[0];
    return hint ? `${prefix}\n${hint}` : prefix;
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
