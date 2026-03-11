// Custom PNG cursors matching the game's 1920s gold art style
// Each cursor is a 48x48 PNG with a defined hotspot

const pngCursor = (filename: string, hotX: number, hotY: number): string =>
  `url("assets/ui/cursors/${filename}.png") ${hotX} ${hotY}, auto`;

export const Cursors = {
  default: pngCursor('inspect', 28, 16),
  inspect: pngCursor('inspect', 28, 16),
  navigate: pngCursor('navigate', 34, 24),
  talk: pngCursor('talk', 24, 18),
  pickup: pngCursor('grab', 24, 20),
  locked: pngCursor('locked', 24, 28),
} as const;

export type CursorType = keyof typeof Cursors;

/** CSS cursor string for interactive/clickable UI elements (gold hand) */
export const HAND_CURSOR = Cursors.pickup;

// Set cursor on the game canvas
export function setGameCursor(scene: Phaser.Scene, type: CursorType): void {
  scene.input.setDefaultCursor(Cursors[type]);
}

/** Set the default cursor for any scene to the gold spyglass */
export function initSceneCursor(scene: Phaser.Scene): void {
  scene.input.setDefaultCursor(Cursors.default);
}
