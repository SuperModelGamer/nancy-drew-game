// Procedural Art Deco UI drawing utilities
// Geometric patterns, corner ornaments, and decorative frames
// inspired by 1920s–30s Streamline Moderne / Nancy Drew aesthetic

import Phaser from 'phaser';

// ─── Art Deco Color Palette ──────────────────────────────────────────────────
export const DecoColors = {
  // Backgrounds
  navy: 0x0c1525,          // deep midnight navy
  navyMid: 0x141f33,       // mid navy for panels
  navyLight: 0x1a2940,     // lighter navy for content areas
  cream: 0xf0e6cc,         // warm ivory/cream for paper panels
  creamDark: 0xddd0b0,     // darker cream for borders/accents

  // Accents
  gold: 0xc9a84c,          // primary burnished gold
  goldBright: 0xe8c55a,    // bright gold for highlights
  goldDim: 0x8a7a5a,       // muted gold for subtle elements
  teal: 0x2a6e6e,          // art deco teal accent
  burgundy: 0x8b2252,      // deep burgundy for danger/active
} as Record<string, number>;

export const DecoTextColors: Record<string, string> = {
  gold: '#c9a84c',
  goldBright: '#e8c55a',
  goldDim: '#8a7a5a',
  cream: '#f0e6cc',
  navy: '#0c1525',
  light: '#e0d5c0',
};

// ─── Corner Ornament ─────────────────────────────────────────────────────────
// Draws a geometric sunburst/fan corner ornament at a given position
// `corner` determines which corner: 'tl' | 'tr' | 'bl' | 'br'

export function drawCornerOrnament(
  gfx: Phaser.GameObjects.Graphics,
  x: number, y: number,
  size: number,
  corner: 'tl' | 'tr' | 'bl' | 'br',
  color = DecoColors.gold,
  alpha = 0.35,
): void {
  const s = size;
  // Flip factors for each corner
  const fx = (corner === 'tr' || corner === 'br') ? -1 : 1;
  const fy = (corner === 'bl' || corner === 'br') ? -1 : 1;

  gfx.lineStyle(1.5, color, alpha);

  // Right-angle bracket lines
  gfx.lineBetween(x, y, x + fx * s, y);
  gfx.lineBetween(x, y, x, y + fy * s);

  // Inner bracket (smaller, offset inward)
  const inset = 4;
  const innerS = s * 0.6;
  gfx.lineStyle(1, color, alpha * 0.7);
  gfx.lineBetween(x + fx * inset, y + fy * inset, x + fx * (inset + innerS), y + fy * inset);
  gfx.lineBetween(x + fx * inset, y + fy * inset, x + fx * inset, y + fy * (inset + innerS));

  // Small diamond at the corner point
  const dSize = 3;
  const dx = x + fx * 2;
  const dy = y + fy * 2;
  gfx.fillStyle(color, alpha * 0.9);
  gfx.fillPoints([
    new Phaser.Geom.Point(dx, dy - dSize),
    new Phaser.Geom.Point(dx + dSize, dy),
    new Phaser.Geom.Point(dx, dy + dSize),
    new Phaser.Geom.Point(dx - dSize, dy),
  ], true);

  // Fan rays (3 small diagonal lines from the corner)
  gfx.lineStyle(1, color, alpha * 0.4);
  const rayLen = s * 0.4;
  for (let i = 1; i <= 3; i++) {
    const angle = (Math.PI / 2) * (i / 4);
    const rx = Math.cos(angle) * rayLen * fx;
    const ry = Math.sin(angle) * rayLen * fy;
    gfx.lineBetween(x, y, x + rx, y + ry);
  }
}

// ─── Art Deco Frame ──────────────────────────────────────────────────────────
// Draws a full decorative frame with corner ornaments and double borders

export function drawArtDecoFrame(
  scene: Phaser.Scene,
  x: number, y: number,
  w: number, h: number,
  options: {
    color?: number;
    alpha?: number;
    cornerSize?: number;
    doubleBorder?: boolean;
    fillColor?: number;
    fillAlpha?: number;
  } = {},
): Phaser.GameObjects.Graphics {
  const {
    color = DecoColors.gold,
    alpha = 0.4,
    cornerSize = 28,
    doubleBorder = true,
    fillColor,
    fillAlpha = 0.95,
  } = options;

  const gfx = scene.add.graphics();

  // Optional fill
  if (fillColor !== undefined) {
    gfx.fillStyle(fillColor, fillAlpha);
    gfx.fillRect(x, y, w, h);
  }

  // Outer border
  gfx.lineStyle(2, color, alpha);
  gfx.strokeRect(x, y, w, h);

  // Inner border (double-line effect)
  if (doubleBorder) {
    const gap = 4;
    gfx.lineStyle(1, color, alpha * 0.5);
    gfx.strokeRect(x + gap, y + gap, w - gap * 2, h - gap * 2);
  }

  // Corner ornaments
  drawCornerOrnament(gfx, x, y, cornerSize, 'tl', color, alpha);
  drawCornerOrnament(gfx, x + w, y, cornerSize, 'tr', color, alpha);
  drawCornerOrnament(gfx, x, y + h, cornerSize, 'bl', color, alpha);
  drawCornerOrnament(gfx, x + w, y + h, cornerSize, 'br', color, alpha);

  return gfx;
}

// ─── Decorative Divider ──────────────────────────────────────────────────────
// Horizontal art deco divider with center diamond and radiating lines

export function drawDecoDivider(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, y: number,
  width: number,
  color = DecoColors.gold,
  alpha = 0.35,
): void {
  const halfW = width / 2;

  // Main horizontal line
  gfx.lineStyle(1, color, alpha);
  gfx.lineBetween(cx - halfW, y, cx - 12, y);
  gfx.lineBetween(cx + 12, y, cx + halfW, y);

  // Center diamond
  const d = 5;
  gfx.fillStyle(color, alpha * 1.2);
  gfx.fillPoints([
    new Phaser.Geom.Point(cx, y - d),
    new Phaser.Geom.Point(cx + d, y),
    new Phaser.Geom.Point(cx, y + d),
    new Phaser.Geom.Point(cx - d, y),
  ], true);

  // Small accent dots at ends
  gfx.fillStyle(color, alpha * 0.8);
  gfx.fillCircle(cx - halfW, y, 2);
  gfx.fillCircle(cx + halfW, y, 2);
}

// ─── Chevron Tab Shape ───────────────────────────────────────────────────────
// Draws an angled/chevron-shaped button background (like the reference image tabs)

export function drawChevronTab(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  w: number, h: number,
  options: {
    fillColor?: number;
    fillAlpha?: number;
    strokeColor?: number;
    strokeAlpha?: number;
    chevronDepth?: number;
  } = {},
): void {
  const {
    fillColor = DecoColors.navyMid,
    fillAlpha = 0.9,
    strokeColor = DecoColors.gold,
    strokeAlpha = 0.5,
    chevronDepth = 8,
  } = options;

  const halfW = w / 2;
  const halfH = h / 2;
  const cd = chevronDepth;

  const points = [
    new Phaser.Geom.Point(cx - halfW + cd, cy - halfH),     // top-left (indented)
    new Phaser.Geom.Point(cx + halfW - cd, cy - halfH),     // top-right (indented)
    new Phaser.Geom.Point(cx + halfW, cy),                   // right point
    new Phaser.Geom.Point(cx + halfW - cd, cy + halfH),     // bottom-right
    new Phaser.Geom.Point(cx - halfW + cd, cy + halfH),     // bottom-left
    new Phaser.Geom.Point(cx - halfW, cy),                   // left point
  ];

  gfx.fillStyle(fillColor, fillAlpha);
  gfx.fillPoints(points, true);

  gfx.lineStyle(1.5, strokeColor, strokeAlpha);
  gfx.strokePoints(points, true);
}

// ─── Art Deco Panel (full panel with header) ─────────────────────────────────
// Draws a complete panel background with art deco frame, header bar, and title

export interface DecoPanelConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  headerHeight?: number;
  bgColor?: number;
  bgAlpha?: number;
  headerColor?: number;
  accentColor?: number;
  cornerSize?: number;
}

export function createDecoPanel(
  scene: Phaser.Scene,
  config: DecoPanelConfig,
): { container: Phaser.GameObjects.Container; headerY: number; contentTop: number } {
  const {
    x, y, w, h,
    title,
    headerHeight = 48,
    bgColor = DecoColors.navyMid,
    bgAlpha = 0.97,
    headerColor = DecoColors.navy,
    accentColor = DecoColors.gold,
    cornerSize = 28,
  } = config;

  const container = scene.add.container(0, 0);

  // Main panel background
  const panelCx = x + w / 2;
  const panelCy = y + h / 2;

  const bg = scene.add.rectangle(panelCx, panelCy, w, h, bgColor, bgAlpha);
  container.add(bg);

  // Art deco frame
  const frame = drawArtDecoFrame(scene, x, y, w, h, {
    color: accentColor,
    alpha: 0.4,
    cornerSize,
    doubleBorder: true,
  });
  container.add(frame);

  // Header bar
  const headerY = y + headerHeight / 2;
  const headerBg = scene.add.rectangle(panelCx, headerY, w - 8, headerHeight, headerColor, 1);
  container.add(headerBg);

  // Header border lines
  const headerGfx = scene.add.graphics();
  headerGfx.lineStyle(1, accentColor, 0.3);
  headerGfx.lineBetween(x + 4, y + headerHeight, x + w - 4, y + headerHeight);
  container.add(headerGfx);

  // Title text
  if (title) {
    const titleText = scene.add.text(panelCx, headerY, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: DecoTextColors.gold,
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5);
    container.add(titleText);

    // Decorative divider lines flanking title
    drawDecoDivider(headerGfx, panelCx, headerY, w * 0.7, accentColor, 0.2);
  }

  const contentTop = y + headerHeight + 12;

  return { container, headerY, contentTop };
}

// ─── Sunburst Background Pattern ─────────────────────────────────────────────
// Subtle radiating lines from a center point (for behind panels/titles)

export function drawSunburst(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  radius: number,
  rays = 12,
  color = DecoColors.gold,
  alpha = 0.06,
): void {
  gfx.lineStyle(1, color, alpha);
  for (let i = 0; i < rays; i++) {
    const angle = (Math.PI * 2 * i) / rays;
    const ex = cx + Math.cos(angle) * radius;
    const ey = cy + Math.sin(angle) * radius;
    gfx.lineBetween(cx, cy, ex, ey);
  }
}

// ─── Geometric Border Pattern ────────────────────────────────────────────────
// Repeating chevron/zigzag pattern along a horizontal line

export function drawGeoBorder(
  gfx: Phaser.GameObjects.Graphics,
  x: number, y: number,
  width: number,
  color = DecoColors.gold,
  alpha = 0.2,
  segmentWidth = 12,
  amplitude = 4,
): void {
  gfx.lineStyle(1, color, alpha);
  gfx.beginPath();
  gfx.moveTo(x, y);

  let cx = x;
  let up = true;
  while (cx < x + width) {
    cx += segmentWidth / 2;
    const ny = up ? y - amplitude : y + amplitude;
    gfx.lineTo(Math.min(cx, x + width), ny);
    cx += segmentWidth / 2;
    gfx.lineTo(Math.min(cx, x + width), y);
    up = !up;
  }
  gfx.strokePath();
}
