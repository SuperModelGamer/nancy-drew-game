// Custom SVG cursors for point-and-click feel
// Each cursor is an inline SVG data URI so no external files needed

const svgToCursor = (svg: string, hotX: number, hotY: number): string => {
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}") ${hotX} ${hotY}, auto`;
};

// Default magnifying glass — gold outline on dark
const magnifyingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="13" cy="13" r="9" fill="none" stroke="#c9a84c" stroke-width="2.5"/>
  <circle cx="13" cy="13" r="5" fill="#c9a84c" fill-opacity="0.1"/>
  <line x1="20" y1="20" x2="29" y2="29" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

// Inspect — magnifying glass with sparkle
const inspectSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="13" cy="13" r="9" fill="none" stroke="#c9a84c" stroke-width="2.5"/>
  <circle cx="13" cy="13" r="5" fill="#c9a84c" fill-opacity="0.15"/>
  <line x1="20" y1="20" x2="29" y2="29" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="13" y1="8" x2="13" y2="18" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <line x1="8" y1="13" x2="18" y2="13" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
</svg>`;

// Navigate — arrow pointing right through doorway
const navigateSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect x="6" y="4" width="14" height="24" rx="2" fill="none" stroke="#7ba3c9" stroke-width="2"/>
  <rect x="8" y="6" width="10" height="20" rx="1" fill="#7ba3c9" fill-opacity="0.1"/>
  <polyline points="18,16 28,16" fill="none" stroke="#7ba3c9" stroke-width="2.5" stroke-linecap="round"/>
  <polyline points="24,11 29,16 24,21" fill="none" stroke="#7ba3c9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Talk — speech bubble
const talkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M4,6 Q4,3 7,3 L25,3 Q28,3 28,6 L28,18 Q28,21 25,21 L12,21 L7,27 L7,21 L7,21 Q4,21 4,18 Z" fill="#b4a0d4" fill-opacity="0.15" stroke="#b4a0d4" stroke-width="2"/>
  <circle cx="11" cy="12" r="1.5" fill="#b4a0d4"/>
  <circle cx="16" cy="12" r="1.5" fill="#b4a0d4"/>
  <circle cx="21" cy="12" r="1.5" fill="#b4a0d4"/>
</svg>`;

// Pickup — open hand / grab
const pickupSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M10,17 L10,10 Q10,8 12,8 Q14,8 14,10 L14,14" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
  <path d="M14,14 L14,8 Q14,6 16,6 Q18,6 18,8 L18,14" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
  <path d="M18,14 L18,9 Q18,7 20,7 Q22,7 22,9 L22,15" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
  <path d="M22,15 L22,11 Q22,9 24,9 Q26,9 26,11 L26,19 Q26,26 19,26 L15,26 Q9,26 9,20 L9,17" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
  <rect x="8" y="9" width="19" height="18" rx="4" fill="#4ade80" fill-opacity="0.05"/>
</svg>`;

// Locked — keyhole / lock
const lockedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="13" cy="13" r="9" fill="none" stroke="#c9a84c" stroke-width="2.5"/>
  <circle cx="13" cy="13" r="5" fill="#c9a84c" fill-opacity="0.1"/>
  <line x1="20" y1="20" x2="29" y2="29" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="10" y="11" width="6" height="5" rx="1" fill="none" stroke="#c9a84c" stroke-width="1.2"/>
  <path d="M11.5,11 L11.5,9.5 Q11.5,7.5 13,7.5 Q14.5,7.5 14.5,9.5 L14.5,11" fill="none" stroke="#c9a84c" stroke-width="1.2"/>
</svg>`;

export const Cursors = {
  default: svgToCursor(magnifyingSvg, 13, 13),
  inspect: svgToCursor(inspectSvg, 13, 13),
  navigate: svgToCursor(navigateSvg, 16, 16),
  talk: svgToCursor(talkSvg, 10, 12),
  pickup: svgToCursor(pickupSvg, 16, 16),
  locked: svgToCursor(lockedSvg, 13, 13),
} as const;

export type CursorType = keyof typeof Cursors;

// Set cursor on the game canvas
export function setGameCursor(scene: Phaser.Scene, type: CursorType): void {
  scene.input.setDefaultCursor(Cursors[type]);
}
