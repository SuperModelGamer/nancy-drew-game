import puzzlesData from '../data/puzzles.json';

interface PuzzleData {
  id: string;
  name: string;
  type: 'code' | 'sequence' | 'combination' | 'logic';
  description: string;
  answer: string;
  clues: string[];
  unlocks?: string;
}

export class PuzzleSystem {
  private static instance: PuzzleSystem;
  private solvedPuzzles: Set<string> = new Set();

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

    if (answer.trim().toLowerCase() === puzzle.answer.trim().toLowerCase()) {
      this.solvedPuzzles.add(puzzleId);
      return true;
    }
    return false;
  }

  isSolved(puzzleId: string): boolean {
    return this.solvedPuzzles.has(puzzleId);
  }

  getClues(puzzleId: string): string[] {
    const puzzle = this.getPuzzle(puzzleId);
    return puzzle?.clues || [];
  }

  toJSON(): { solvedPuzzles: string[] } {
    return { solvedPuzzles: [...this.solvedPuzzles] };
  }

  loadFromJSON(data: { solvedPuzzles: string[] }): void {
    this.solvedPuzzles = new Set(data.solvedPuzzles || []);
  }
}
