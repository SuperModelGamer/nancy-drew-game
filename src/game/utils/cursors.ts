// Custom PNG cursors matching the game's 1920s art style
// Each cursor is a 32x32 PNG with a defined hotspot

const pngCursor = (filename: string, hotX: number, hotY: number): string =>
  `url("assets/ui/cursors/${filename}.png") ${hotX} ${hotY}, auto`;

export const Cursors = {
  default: pngCursor('inspect', 13, 12),
  inspect: pngCursor('inspect', 13, 12),
  navigate: pngCursor('navigate', 22, 15),
  talk: pngCursor('talk', 9, 10),
  pickup: pngCursor('grab', 16, 12),
  locked: pngCursor('locked', 16, 16),
} as const;

export type CursorType = keyof typeof Cursors;

// Set cursor on the game canvas
export function setGameCursor(scene: Phaser.Scene, type: CursorType): void {
  scene.input.setDefaultCursor(Cursors[type]);
}
