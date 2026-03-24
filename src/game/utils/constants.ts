// Shared color palette — hex values used across all scenes
export const Colors = {
  // Backgrounds
  panelBg: 0x0a0a1a,
  sceneBg: 0x1a1a2e,
  hoverBg: 0x2a2a4e,
  darkBg: 0x000000,

  // Gold theme
  gold: 0xc9a84c,
  goldDim: 0x8a7a5a,
  goldBorder: 0xc9a84c,

  // Status
  success: 0x4ade80,
  error: 0xff6b6b,
  danger: 0x8b0000,

  // Suspect accent colors
  vivian: 0xb4a0d4,
  edwin: 0x7ba3c9,
  ashworth: 0xc97b7b,
  stella: 0xc9947b,
  diego: 0x7bc98a,

  // Hotspot type colors
  hotspotInspect: 0xc9a84c,   // gold
  hotspotPickup: 0x4ade80,    // green
  hotspotNavigate: 0x7ba3c9,  // blue
  hotspotTalk: 0xb4a0d4,      // purple
  hotspotLocked: 0xc97b7b,    // warm red

  // Map / UI accents
  mapBlue: 0x7ba3c9,
  suspectPurple: 0xb4a0d4,

  // Evidence board
  corkboard: 0x6B4F2A,
  corkboardDark: 0x4A3520,
  corkboardLight: 0x7B5F3A,
  corkboardAccent: 0x8B6914,
  paper: 0xF5E6C8,
  paperBorder: 0x8B7355,
  pushPin: 0xcc2222,
  redString: 0x8b1a1a,

  // Ghost / Scripted event
  fog: 0x8888aa,
  spotlight: 0xffffcc,
  ghostWhite: 0xffffff,
  ghostGlow: 0xccccff,
} as const;

// Text color strings for Phaser text objects
export const TextColors = {
  gold: '#c9a84c',
  goldDim: '#8a7a5a',
  light: '#e0d5c0',
  muted: '#5a5a5a',
  mutedBlue: '#5a5a6a',
  white: '#ffffff',
  dark: '#2a2a2a',
  darkMuted: '#4a4a4a',
  hidden: '#3a3a4a',
  success: '#4ade80',
  error: '#ff6b6b',
  credit: '#555566',
  vivian: '#b4a0d4',
  edwin: '#7ba3c9',
  ashworth: '#c97b7b',
  stella: '#c9947b',
  diego: '#7bc98a',
} as const;

// Font family constant
export const FONT = 'Georgia, serif';

// Z-depth layers
export const Depths = {
  tooltip: 100,
  descriptionBox: 200,
  inventoryPanel: 300,
  itemDescPanel: 310,
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
  dialogueBox: 500,
  scriptedEvent: 600,
} as const;

// Common sizes
export const Sizes = {
  minTapTarget: 48,
  buttonHeight: 48,
  panelBorderWidth: 2,
  toolbarY: 40, // offset from bottom
} as const;

// Total height reserved at the bottom for the UI toolbar bar (toolbar + margin).
// Used by RoomScene to clip its camera viewport above the bar.
export const UI_BAR_RESERVED = 124; // TOOLBAR_H (112) + BOTTOM_MARGIN (12)

// ─── Viewfinder Frame Layout ───
// The game fills the area between the frame borders and the right info panel.
// No camera zoom — the viewport IS the game area and content is placed directly
// in viewport-pixel coordinates.
//
//  ┌──────────────── 1920 ────────────────┐
//  │ top border (FRAME_TOP)                │
//  │ ┌───┌─────────────────┐──right──┐    │
//  │ │   │  game viewport  │  info   │    │
//  │ │   │  (no zoom)      │  panel  │    │
//  │ │   └─────────────────┘─────────┘    │
//  │ toolbar (FRAME_BOTTOM)                │
//  └──────────────────────────────────────┘

export const FRAME_TOP = 6;
export const FRAME_BOTTOM = 124; // toolbar + margin
export const FRAME_LEFT = 6;    // thin border
export const RIGHT_PANEL_W = 0; // no sidebar — full-screen game view with floating HUD

/** Compute the viewfinder layout from the canvas dimensions (1920×1080). */
export function computeViewfinderLayout(canvasW: number, canvasH: number) {
  const availH = canvasH - FRAME_TOP - FRAME_BOTTOM;
  const gameW = canvasW - FRAME_LEFT * 2;  // symmetric thin borders, full-width game area

  return {
    zoom: 1,                              // no zoom — viewport = game area
    viewportX: FRAME_LEFT,
    viewportY: FRAME_TOP,
    viewportW: gameW,                     // exact game area width
    viewportH: availH,                    // exact game area height
    renderedW: gameW,
    leftMargin: FRAME_LEFT,
    rightPanelX: canvasW,                 // no panel — off-screen
    rightPanelW: 0,
    topMargin: FRAME_TOP,
    bottomMargin: FRAME_BOTTOM,
  };
}

// Legacy alias kept for any old references
export const FRAME = {
  top: FRAME_TOP,
  side: FRAME_LEFT,
  bottom: FRAME_BOTTOM,
} as const;
