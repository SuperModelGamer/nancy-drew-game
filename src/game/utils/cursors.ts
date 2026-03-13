// Custom PNG cursors matching the game's 1920s gold art deco style
// Each cursor is a 64x64 PNG with a defined hotspot (x, y from top-left)

const pngCursor = (filename: string, hotX: number, hotY: number): string =>
  `url("assets/ui/cursors/${filename}.png") ${hotX} ${hotY}, auto`;

export const Cursors = {
  /** Default scene cursor — gold art deco pointer arrow */
  default: pngCursor('pointer', 6, 3),

  /** Inspecting clues and objects — gold spyglass */
  inspect: pngCursor('spyglass', 32, 32),

  /** Room navigation / doorways — gold door with arrow */
  navigate: pngCursor('door', 32, 32),

  /** Talking to NPCs — gold speech bubble */
  talk: pngCursor('chat', 32, 32),

  /** Picking up items — gold grabbing hand */
  pickup: pngCursor('grab', 32, 32),

  /** Locked objects — gold padlock */
  locked: pngCursor('lock', 32, 32),
} as const;

export type CursorType = keyof typeof Cursors;

/** CSS cursor string for clickable UI elements (buttons, close, menu) — gold open hand */
export const HAND_CURSOR = pngCursor('hand', 32, 12);

/** CSS cursor string for the default gold pointer — use for close/X buttons instead of hand */
export const POINTER_CURSOR = Cursors.default;

/** Set cursor on the game canvas */
export function setGameCursor(scene: Phaser.Scene, type: CursorType): void {
  scene.input.setDefaultCursor(Cursors[type]);
}

/** Set the default cursor for any scene to the gold pointer */
export function initSceneCursor(scene: Phaser.Scene): void {
  scene.input.setDefaultCursor(Cursors.default);
}

/**
 * Generate a glowing version of a cursor image at runtime using canvas.
 * Draws the source PNG with a golden shadowBlur to create a soft glow effect.
 * Returns a CSS cursor string (data URL) once the image loads.
 */
let _glowCursorCache: string | null = null;
export async function createGlowSpyglass(): Promise<string> {
  if (_glowCursorCache) return _glowCursorCache;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const glowSize = 4;
      const pad = glowSize * 2;
      const canvas = document.createElement('canvas');
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2;
      const ctx = canvas.getContext('2d')!;

      // Draw golden glow (multiple passes for stronger effect)
      ctx.shadowColor = '#c9a84c';
      ctx.shadowBlur = glowSize;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      for (let i = 0; i < 3; i++) {
        ctx.drawImage(img, pad, pad);
      }

      const dataUrl = canvas.toDataURL('image/png');
      // Hotspot offset accounts for the padding added around the image
      const hotX = 32 + pad;
      const hotY = 32 + pad;
      _glowCursorCache = `url("${dataUrl}") ${hotX} ${hotY}, auto`;
      resolve(_glowCursorCache);
    };
    img.onerror = () => {
      // Fallback to regular spyglass if image fails to load
      resolve(Cursors.inspect);
    };
    img.src = 'assets/ui/cursors/spyglass.png';
  });
}

/**
 * Generate a cursor from a Phaser texture (item icon asset).
 * Renders the item image at 48×48 with a subtle golden glow, cached per key.
 * Must be called from a scene that has the texture loaded.
 * Returns a CSS cursor string (data URL), or the pickup cursor as fallback.
 */
const _itemCursorCache = new Map<string, string>();
export function createItemCursor(scene: Phaser.Scene, textureKey: string): string {
  if (_itemCursorCache.has(textureKey)) return _itemCursorCache.get(textureKey)!;

  if (!scene.textures.exists(textureKey)) return Cursors.pickup;

  const size = 48;
  const pad = 6; // space for glow
  const totalSize = size + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d')!;

  // Get the source image from the Phaser texture
  const sourceImage = scene.textures.get(textureKey).getSourceImage() as HTMLImageElement;

  // Compute uniform scale to fit in cursor size
  const scale = Math.min(size / sourceImage.width, size / sourceImage.height);
  const drawW = sourceImage.width * scale;
  const drawH = sourceImage.height * scale;
  const drawX = pad + (size - drawW) / 2;
  const drawY = pad + (size - drawH) / 2;

  // Golden glow
  ctx.shadowColor = '#c9a84c';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(sourceImage, drawX, drawY, drawW, drawH);
  // Second pass for stronger glow
  ctx.drawImage(sourceImage, drawX, drawY, drawW, drawH);

  const dataUrl = canvas.toDataURL('image/png');
  const hotX = totalSize / 2;
  const hotY = totalSize / 2;
  const cursor = `url("${dataUrl}") ${hotX} ${hotY}, auto`;
  _itemCursorCache.set(textureKey, cursor);
  return cursor;
}
