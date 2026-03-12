// Custom PNG cursors matching the game's 1920s gold art style
// Each cursor is a 48x48 PNG with a defined hotspot (x, y from top-left)

const pngCursor = (filename: string, hotX: number, hotY: number): string =>
  `url("assets/ui/cursors/${filename}.png") ${hotX} ${hotY}, auto`;

export const Cursors = {
  /** Default scene cursor — gold spyglass (general exploration) */
  default: pngCursor('spyglass', 20, 16),

  /** Inspecting clues and objects — gold spyglass */
  inspect: pngCursor('spyglass', 20, 16),

  /** Room navigation / doorways — gold door with arrow */
  navigate: pngCursor('door', 30, 24),

  /** Talking to NPCs — gold speech bubble */
  talk: pngCursor('chat', 24, 18),

  /** Picking up items — gold grabbing hand */
  pickup: pngCursor('grab', 24, 20),

  /** Locked objects — gold padlock */
  locked: pngCursor('lock', 24, 24),
} as const;

export type CursorType = keyof typeof Cursors;

/** CSS cursor string for clickable UI elements (buttons, close, menu) — gold open hand */
export const HAND_CURSOR = pngCursor('hand', 24, 8);

/** Set cursor on the game canvas */
export function setGameCursor(scene: Phaser.Scene, type: CursorType): void {
  scene.input.setDefaultCursor(Cursors[type]);
}

/** Set the default cursor for any scene to the gold spyglass */
export function initSceneCursor(scene: Phaser.Scene): void {
  scene.input.setDefaultCursor(Cursors.default);
}
