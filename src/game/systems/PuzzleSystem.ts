import puzzlesData from '../data/puzzles.json';
import { SaveSystem } from './SaveSystem';

interface PuzzleData {
  id: string;
  name: string;
  type: 'code' | 'sequence' | 'combination' | 'logic' | 'mirror_reveal' | 'cipher' | 'lighting_board' | 'film_assembly' | 'symbol_match' | 'maze' | 'chemistry';
  description: string;
  answer: string;
  clues: string[];
  hints?: string[];
  unlocks?: string;
  interactiveData?: Record<string, unknown>;
}

export class PuzzleSystem {
  private static instance: PuzzleSystem;
  private solvedPuzzles: Set<string> = new Set();
  private puzzleAttempts: Map<string, number> = new Map();

  static getInstance(): PuzzleSystem {
    if (!PuzzleSystem.instance) {
      PuzzleSystem.instance = new PuzzleSystem();
    }
    return PuzzleSystem.instance;
  }

  getPuzzle(puzzleId: string): PuzzleData | undefined {
    return (puzzlesData.puzzles as PuzzleData[]).find(p => p.id === puzzleId);
  }

  checkAnswer(puzzleId: string, answer: string): boolean {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle) return false;

    const attempts = (this.puzzleAttempts.get(puzzleId) || 0) + 1;
    this.puzzleAttempts.set(puzzleId, attempts);

    if (answer.trim().toLowerCase() === puzzle.answer.trim().toLowerCase()) {
      this.solvedPuzzles.add(puzzleId);
      if (puzzle.unlocks) {
        SaveSystem.getInstance().setFlag(puzzle.unlocks, true);
      }
      return true;
    }
    return false;
  }

  /**
   * Marks a puzzle as solved without comparing answers.
   * Used by interactive puzzle types that validate internally.
   */
  solvePuzzle(puzzleId: string): boolean {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle) return false;

    this.solvedPuzzles.add(puzzleId);
    if (puzzle.unlocks) {
      SaveSystem.getInstance().setFlag(puzzle.unlocks, true);
    }
    return true;
  }

  isSolved(puzzleId: string): boolean {
    return this.solvedPuzzles.has(puzzleId);
  }

  getClues(puzzleId: string): string[] {
    const puzzle = this.getPuzzle(puzzleId);
    return puzzle?.clues || [];
  }

  getHint(puzzleId: string): string | null {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle?.hints || puzzle.hints.length === 0) return null;

    const attempts = this.puzzleAttempts.get(puzzleId) || 0;
    const hintIndex = Math.min(Math.floor(attempts / 2), puzzle.hints.length - 1);
    return puzzle.hints[hintIndex];
  }

  getAttempts(puzzleId: string): number {
    return this.puzzleAttempts.get(puzzleId) || 0;
  }

  toJSON(): { solvedPuzzles: string[] } {
    return { solvedPuzzles: [...this.solvedPuzzles] };
  }

  loadFromJSON(data: { solvedPuzzles: string[] }): void {
    this.solvedPuzzles = new Set(data.solvedPuzzles || []);
  }
}
