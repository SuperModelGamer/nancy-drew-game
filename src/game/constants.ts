// ── Colors (hex numbers for Phaser fill/stroke) ──
export const Colors = {
  // Core palette
  gold: 0xc9a84c,
  darkNavy: 0x0a0a1a,
  navy: 0x1a1a2e,
  navyHover: 0x2a2a4e,
  black: 0x000000,

  // Accent
  crimson: 0x8b1a1a,
  success: 0x4ade80,
  error: 0xff6b6b,

  // Suspect colors
  vivian: 0xb4a0d4,
  edwin: 0x7ba3c9,
  ashworth: 0xc97b7b,
  stella: 0xc9947b,
  diego: 0x7bc98a,

  // Evidence board
  cork: 0x6B4F2A,
  corkFrame: 0x4A3520,
  corkInner: 0x7B5F3A,
  corkAccent: 0x8B6914,
  agedPaper: 0xF5E6C8,
  paperBorder: 0x8B7355,
  pushPin: 0xcc2222,
} as const;

// ── Colors (CSS strings for Phaser text) ──
export const TextColors = {
  gold: '#c9a84c',
  cream: '#e0d5c0',
  dim: '#8a7a5a',
  dimmer: '#5a5a5a',
  darkDim: '#3a3a4a',
  white: '#ffffff',
  error: '#ff6b6b',
  success: '#4ade80',
} as const;

// ── Font family ──
export const FONT = 'Georgia, serif';

// ── Depths (z-ordering for scene layers) ──
export const Depths = {
  tooltip: 100,
  selectedItem: 90,
  descriptionBox: 200,
  inventoryPanel: 300,
  itemDesc: 310,
  journalPanel: 350,
  suspectOverlay: 380,
  suspectContent: 381,
  mapOverlay: 390,
  mapContent: 391,
  puzzleOverlay: 400,
  puzzleContent: 401,
  evidenceOverlay: 410,
  evidenceContent: 411,
  evidenceDrag: 412,
  dialogue: 500,
  scriptedEvent: 600,
} as const;

// ── Sizes ──
export const Sizes = {
  minTapTarget: 48,
  fadeDuration: 400,
  fadeInDuration: 500,
} as const;
