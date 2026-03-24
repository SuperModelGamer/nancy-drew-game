import Phaser from 'phaser';
import { Colors } from './constants';

/**
 * Procedural room background art drawn with Phaser Graphics.
 * These provide atmospheric visuals until real image assets are added.
 * When image assets exist, the RoomScene will use those instead.
 */

export function drawRoomBackground(scene: Phaser.Scene, roomId: string): void {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const gfx = scene.add.graphics();
  gfx.setDepth(0);

  switch (roomId) {
    case 'lobby':
      drawLobby(scene, gfx, width, height);
      break;
    case 'auditorium':
      drawAuditorium(scene, gfx, width, height);
      break;
    case 'backstage':
      drawBackstage(scene, gfx, width, height);
      break;
    case 'dressing_room':
      drawDressingRoom(scene, gfx, width, height);
      break;
    case 'catwalk':
      drawCatwalk(scene, gfx, width, height);
      break;
    case 'basement':
      drawBasement(scene, gfx, width, height);
      break;
    case 'office':
      drawOffice(scene, gfx, width, height);
      break;
    default:
      drawDefaultRoom(scene, gfx, width, height);
  }
}

// ─── LOBBY ──────────────────────────────────────────────────────────────────
function drawLobby(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Floor - dark marble with subtle pattern
  gfx.fillStyle(0x1a1520);
  gfx.fillRect(0, 0, w, h);

  // Marble floor
  gfx.fillStyle(0x2a2535, 0.9);
  gfx.fillRect(0, h * 0.7, w, h * 0.3);

  // Floor tiles (checkerboard)
  for (let x = 0; x < w; x += 80) {
    for (let y = h * 0.7; y < h; y += 80) {
      const isLight = ((x / 80 + (y - h * 0.7) / 80) % 2) === 0;
      gfx.fillStyle(isLight ? 0x302838 : 0x252030, 0.6);
      gfx.fillRect(x, y, 78, 78);
    }
  }

  // Floor cracks
  gfx.lineStyle(1, 0x1a1520, 0.4);
  gfx.lineBetween(200, h * 0.75, 350, h * 0.95);
  gfx.lineBetween(800, h * 0.72, 750, h * 0.9);
  gfx.lineBetween(600, h * 0.8, 680, h);

  // Walls - deep dark with wainscoting
  gfx.fillStyle(0x1a1528);
  gfx.fillRect(0, 0, w, h * 0.7);

  // Wainscoting panel
  gfx.fillStyle(0x201828, 0.8);
  gfx.fillRect(0, h * 0.5, w, h * 0.2);

  // Wainscoting trim lines
  gfx.lineStyle(2, 0xc9a84c, 0.15);
  gfx.lineBetween(0, h * 0.5, w, h * 0.5);
  gfx.lineBetween(0, h * 0.7, w, h * 0.7);

  // Vertical panel lines
  for (let x = 0; x < w; x += 160) {
    gfx.lineStyle(1, 0xc9a84c, 0.08);
    gfx.lineBetween(x, h * 0.5, x, h * 0.7);
  }

  // Ceiling arch
  gfx.lineStyle(3, 0xc9a84c, 0.12);
  const archPath = new Phaser.Curves.Ellipse(w / 2, h * 0.15, w * 0.45, h * 0.12);
  archPath.getPoints(40).forEach((pt, i, arr) => {
    if (i > 0) gfx.lineBetween(arr[i - 1].x, arr[i - 1].y, pt.x, pt.y);
  });

  // Chandelier (center ceiling)
  drawChandelier(scene, gfx, w / 2, h * 0.12, 0.3);

  // Left wall - playbills (frames)
  for (let i = 0; i < 4; i++) {
    const px = 60 + i * 90;
    const py = h * 0.25;
    gfx.fillStyle(0x151020, 0.8);
    gfx.fillRect(px - 25, py - 35, 50, 70);
    gfx.lineStyle(1, 0xc9a84c, 0.2);
    gfx.strokeRect(px - 25, py - 35, 50, 70);
    // Faded text placeholder
    gfx.fillStyle(0x3a2a40, 0.5);
    gfx.fillRect(px - 18, py - 25, 36, 10);
    gfx.fillRect(px - 15, py - 10, 30, 30);
  }

  // Ticket booth (left side)
  gfx.fillStyle(0x2a1e30);
  gfx.fillRect(80, h * 0.55, 140, h * 0.15);
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.strokeRect(80, h * 0.55, 140, h * 0.15);
  // Booth window
  gfx.fillStyle(0x0a0810, 0.8);
  gfx.fillRect(110, h * 0.56, 80, h * 0.06);
  gfx.lineStyle(1, 0xc9a84c, 0.15);
  gfx.strokeRect(110, h * 0.56, 80, h * 0.06);

  // Concierge desk (center-left)
  gfx.fillStyle(0x3a2828);
  gfx.fillRect(280, h * 0.6, 180, h * 0.1);
  gfx.lineStyle(1, 0xc9a84c, 0.25);
  gfx.strokeRect(280, h * 0.6, 180, h * 0.1);

  // Desk lamp glow
  const lamp = scene.add.circle(370, h * 0.58, 30, 0xc9a84c, 0.08);
  lamp.setDepth(0);

  // Right side - large mirror
  gfx.fillStyle(0x182028, 0.6);
  gfx.fillRect(w * 0.65, h * 0.2, 120, 180);
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.strokeRect(w * 0.65, h * 0.2, 120, 180);
  // Mirror shine
  gfx.lineStyle(1, 0xffffff, 0.05);
  gfx.lineBetween(w * 0.65 + 10, h * 0.2 + 10, w * 0.65 + 50, h * 0.2 + 160);

  // Auditorium doors (far right)
  gfx.fillStyle(0x2a1e20);
  gfx.fillRect(w - 160, h * 0.25, 120, h * 0.45);
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.strokeRect(w - 160, h * 0.25, 120, h * 0.45);
  // Door panels
  gfx.lineStyle(1, 0xc9a84c, 0.12);
  gfx.strokeRect(w - 150, h * 0.28, 45, h * 0.18);
  gfx.strokeRect(w - 95, h * 0.28, 45, h * 0.18);
  gfx.strokeRect(w - 150, h * 0.48, 45, h * 0.18);
  gfx.strokeRect(w - 95, h * 0.48, 45, h * 0.18);

  // Ambient warm light cone from desk lamp
  addLightCone(scene, 370, h * 0.55, 200, 0xc9a84c, 0.06);

  // Coat check area (right side)
  gfx.fillStyle(0x201820);
  gfx.fillRect(w * 0.75, h * 0.55, 100, h * 0.15);
  gfx.lineStyle(1, 0xc9a84c, 0.15);
  gfx.strokeRect(w * 0.75, h * 0.55, 100, h * 0.15);
}

// ─── AUDITORIUM ─────────────────────────────────────────────────────────────
function drawAuditorium(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Dark background
  gfx.fillStyle(0x0a0812);
  gfx.fillRect(0, 0, w, h);

  // Stage platform
  gfx.fillStyle(0x2a1e18);
  gfx.fillRect(w * 0.15, h * 0.35, w * 0.7, h * 0.05);
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.lineBetween(w * 0.15, h * 0.35, w * 0.85, h * 0.35);

  // Stage floor
  gfx.fillStyle(0x1e1510);
  gfx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.2);

  // Stage floor boards
  for (let x = w * 0.15; x < w * 0.85; x += 40) {
    gfx.lineStyle(1, 0x0a0808, 0.3);
    gfx.lineBetween(x, h * 0.15, x, h * 0.35);
  }

  // Left curtain
  drawCurtain(gfx, w * 0.08, 0, w * 0.12, h * 0.4, 0x6b1520);

  // Right curtain
  drawCurtain(gfx, w * 0.8, 0, w * 0.12, h * 0.4, 0x6b1520);

  // Curtain valance across top
  gfx.fillStyle(0x8b1a2a, 0.8);
  gfx.fillRect(w * 0.08, 0, w * 0.84, h * 0.06);
  // Scallops
  for (let x = w * 0.08; x < w * 0.92; x += 60) {
    gfx.fillStyle(0x8b1a2a, 0.6);
    gfx.fillCircle(x + 30, h * 0.06 + 10, 20);
  }

  // Gold trim on curtains
  gfx.lineStyle(2, 0xc9a84c, 0.3);
  gfx.lineBetween(w * 0.2, 0, w * 0.2, h * 0.4);
  gfx.lineBetween(w * 0.8, 0, w * 0.8, h * 0.4);

  // Ghost light (center stage) — the iconic single bulb
  const glowRadius = 60;
  addLightCone(scene, w / 2, h * 0.28, glowRadius * 2, 0xffffcc, 0.12);
  // Light stand
  gfx.lineStyle(2, 0x555555, 0.6);
  gfx.lineBetween(w / 2, h * 0.22, w / 2, h * 0.34);
  // Light bulb
  const bulb = scene.add.circle(w / 2, h * 0.2, 8, 0xffffee, 0.7);
  bulb.setDepth(0);
  scene.tweens.add({
    targets: bulb,
    alpha: { from: 0.5, to: 0.8 },
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Audience seats (rows of dark shapes)
  for (let row = 0; row < 6; row++) {
    const rowY = h * 0.45 + row * 40;
    const seatsInRow = 12 + row * 2;
    const rowWidth = w * (0.4 + row * 0.06);
    const startX = (w - rowWidth) / 2;

    for (let s = 0; s < seatsInRow; s++) {
      const seatX = startX + (s / seatsInRow) * rowWidth;
      gfx.fillStyle(0x3a1520, 0.4 + row * 0.05);
      gfx.fillRect(seatX, rowY, rowWidth / seatsInRow - 4, 25);
    }
  }

  // Aisle down center
  gfx.fillStyle(0x151015, 0.5);
  gfx.fillRect(w / 2 - 25, h * 0.42, 50, h * 0.55);

  // Balcony (upper area)
  gfx.fillStyle(0x1a1220);
  gfx.fillRect(0, 0, w, h * 0.08);
  gfx.lineStyle(2, 0xc9a84c, 0.15);
  gfx.lineBetween(0, h * 0.08, w, h * 0.08);

  // Proscenium arch
  gfx.lineStyle(3, 0xc9a84c, 0.2);
  const archCurve = new Phaser.Curves.Ellipse(w / 2, h * 0.05, w * 0.38, h * 0.12);
  const archPts = archCurve.getPoints(30);
  for (let i = 1; i < archPts.length; i++) {
    gfx.lineBetween(archPts[i - 1].x, archPts[i - 1].y, archPts[i].x, archPts[i].y);
  }
}

// ─── BACKSTAGE ──────────────────────────────────────────────────────────────
function drawBackstage(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Dark industrial background
  gfx.fillStyle(0x121018);
  gfx.fillRect(0, 0, w, h);

  // Concrete floor
  gfx.fillStyle(0x1e1e22, 0.8);
  gfx.fillRect(0, h * 0.65, w, h * 0.35);

  // Brick wall texture (back wall)
  for (let y = 0; y < h * 0.65; y += 20) {
    const offset = (Math.floor(y / 20) % 2) * 30;
    for (let x = 0; x < w; x += 60) {
      gfx.fillStyle(0x1a1420, 0.5);
      gfx.fillRect(x + offset, y, 56, 18);
      gfx.lineStyle(1, 0x0a0810, 0.3);
      gfx.strokeRect(x + offset, y, 56, 18);
    }
  }

  // Ropes hanging from above (fly system)
  for (let i = 0; i < 8; i++) {
    const rx = 100 + i * 150;
    gfx.lineStyle(2, 0x4a3a30, 0.5);
    gfx.lineBetween(rx, 0, rx, h * 0.5 + Math.sin(i) * 40);
    // Sandbag weight
    gfx.fillStyle(0x3a3025, 0.6);
    gfx.fillRect(rx - 8, h * 0.5 + Math.sin(i) * 40 - 15, 16, 20);
  }

  // Prop shelves (left side)
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = h * 0.2 + shelf * 120;
    gfx.fillStyle(0x2a2018);
    gfx.fillRect(20, sy, 200, 8);
    gfx.lineStyle(1, 0xc9a84c, 0.1);
    gfx.strokeRect(20, sy, 200, 8);

    // Props on shelf
    for (let p = 0; p < 3; p++) {
      gfx.fillStyle(0x252020, 0.7);
      const pw = Phaser.Math.Between(20, 40);
      const ph = Phaser.Math.Between(25, 50);
      gfx.fillRect(30 + p * 65, sy - ph, pw, ph);
    }
  }

  // Call board (right wall)
  gfx.fillStyle(0x2a2520);
  gfx.fillRect(w - 200, h * 0.15, 160, 200);
  gfx.lineStyle(1, 0xc9a84c, 0.2);
  gfx.strokeRect(w - 200, h * 0.15, 160, 200);
  // Papers on call board
  for (let p = 0; p < 5; p++) {
    const px = w - 190 + (p % 3) * 50;
    const py = h * 0.17 + Math.floor(p / 3) * 90;
    gfx.fillStyle(0xf5e6c8, 0.15);
    gfx.fillRect(px, py, 40, 55);
  }

  // Work light (harsh overhead)
  addLightCone(scene, w * 0.4, 0, 300, 0xffffee, 0.04);

  // Lighting rig on floor (right)
  gfx.fillStyle(0x222228);
  gfx.fillRect(w * 0.7, h * 0.55, 80, 60);
  gfx.lineStyle(1, 0x555555, 0.3);
  gfx.strokeRect(w * 0.7, h * 0.55, 80, 60);

  // Basement door (center, ominous)
  gfx.fillStyle(0x1a1015);
  gfx.fillRect(w * 0.4, h * 0.5, 90, 130);
  gfx.lineStyle(2, 0x3a2520, 0.5);
  gfx.strokeRect(w * 0.4, h * 0.5, 90, 130);
  // Door handle
  gfx.fillStyle(0xc9a84c, 0.3);
  gfx.fillCircle(w * 0.4 + 75, h * 0.57, 5);
}

// ─── DRESSING ROOM ──────────────────────────────────────────────────────────
function drawDressingRoom(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Warm dark interior
  gfx.fillStyle(0x1a1520);
  gfx.fillRect(0, 0, w, h);

  // Wallpaper pattern (subtle art deco)
  for (let y = 0; y < h * 0.7; y += 60) {
    for (let x = 0; x < w; x += 60) {
      gfx.lineStyle(1, 0xc9a84c, 0.04);
      // Diamond pattern
      gfx.lineBetween(x + 30, y, x + 60, y + 30);
      gfx.lineBetween(x + 60, y + 30, x + 30, y + 60);
      gfx.lineBetween(x + 30, y + 60, x, y + 30);
      gfx.lineBetween(x, y + 30, x + 30, y);
    }
  }

  // Floor (wooden)
  gfx.fillStyle(0x2a1e18, 0.8);
  gfx.fillRect(0, h * 0.7, w, h * 0.3);
  for (let x = 0; x < w; x += 50) {
    gfx.lineStyle(1, 0x1a1010, 0.3);
    gfx.lineBetween(x, h * 0.7, x, h);
  }

  // Vanity table (center)
  gfx.fillStyle(0x3a2828);
  gfx.fillRect(w * 0.3, h * 0.5, w * 0.4, h * 0.08);
  gfx.lineStyle(1, 0xc9a84c, 0.2);
  gfx.strokeRect(w * 0.3, h * 0.5, w * 0.4, h * 0.08);

  // Vanity mirror (large, oval-ish rectangle with rounded feel)
  gfx.fillStyle(0x182028, 0.5);
  gfx.fillRect(w * 0.35, h * 0.12, w * 0.3, h * 0.36);
  gfx.lineStyle(2, 0xc9a84c, 0.3);
  gfx.strokeRect(w * 0.35, h * 0.12, w * 0.3, h * 0.36);

  // Mirror bulbs (around the mirror)
  const bulbPositions = [
    // Top
    ...Array.from({ length: 5 }, (_, i) => ({ x: w * 0.38 + i * (w * 0.06), y: h * 0.11 })),
    // Left
    ...Array.from({ length: 4 }, (_, i) => ({ x: w * 0.34, y: h * 0.18 + i * (h * 0.08) })),
    // Right
    ...Array.from({ length: 4 }, (_, i) => ({ x: w * 0.66, y: h * 0.18 + i * (h * 0.08) })),
  ];
  bulbPositions.forEach(pos => {
    const b = scene.add.circle(pos.x, pos.y, 6, 0xffffcc, 0.3);
    b.setDepth(0);
    scene.tweens.add({
      targets: b,
      alpha: { from: 0.2, to: 0.4 },
      duration: Phaser.Math.Between(1500, 3000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 1000),
    });
  });

  // Mirror reflection hint
  gfx.lineStyle(1, 0xffffff, 0.03);
  gfx.lineBetween(w * 0.38, h * 0.15, w * 0.55, h * 0.45);

  // Costume rack (left side)
  gfx.lineStyle(2, 0x555555, 0.4);
  gfx.lineBetween(30, h * 0.2, 30, h * 0.55);
  gfx.lineBetween(30, h * 0.2, 180, h * 0.2);
  gfx.lineBetween(180, h * 0.2, 180, h * 0.55);
  // Hanging costumes
  const costumeColors = [0x6b1520, 0x2a4a6a, 0x8b6914, 0x1a4a2a];
  costumeColors.forEach((color, i) => {
    gfx.fillStyle(color, 0.4);
    gfx.fillRect(50 + i * 35, h * 0.22, 28, h * 0.25);
  });

  // Dried roses (on vanity)
  for (let i = 0; i < 3; i++) {
    gfx.fillStyle(0x5a1520, 0.5);
    gfx.fillCircle(w * 0.5 + i * 20, h * 0.49, 5);
    gfx.lineStyle(1, 0x2a3a1a, 0.4);
    gfx.lineBetween(w * 0.5 + i * 20, h * 0.49 + 5, w * 0.5 + i * 20, h * 0.49 + 20);
  }

  // Trunk (right side)
  gfx.fillStyle(0x3a2a18);
  gfx.fillRect(w * 0.78, h * 0.5, 150, 80);
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.strokeRect(w * 0.78, h * 0.5, 150, 80);
  // Trunk straps
  gfx.lineStyle(2, 0xc9a84c, 0.15);
  gfx.lineBetween(w * 0.78 + 50, h * 0.5, w * 0.78 + 50, h * 0.5 + 80);
  gfx.lineBetween(w * 0.78 + 100, h * 0.5, w * 0.78 + 100, h * 0.5 + 80);

  // Warm ambient light
  addLightCone(scene, w / 2, h * 0.15, 350, 0xffffcc, 0.04);
}

// ─── CATWALK ────────────────────────────────────────────────────────────────
function drawCatwalk(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Very dark — looking down from height
  gfx.fillStyle(0x08060e);
  gfx.fillRect(0, 0, w, h);

  // Stage far below (small, in the center-bottom)
  gfx.fillStyle(0x1e1510, 0.4);
  gfx.fillRect(w * 0.25, h * 0.75, w * 0.5, h * 0.2);
  // Ghost light far below
  const distantLight = scene.add.circle(w / 2, h * 0.82, 4, 0xffffcc, 0.3);
  distantLight.setDepth(0);

  // Metal catwalk (the walkway we're standing on)
  gfx.fillStyle(0x2a2a30, 0.8);
  gfx.fillRect(0, h * 0.4, w, h * 0.08);

  // Catwalk grating pattern
  for (let x = 0; x < w; x += 20) {
    gfx.lineStyle(1, 0x3a3a42, 0.4);
    gfx.lineBetween(x, h * 0.4, x + 10, h * 0.48);
    gfx.lineBetween(x + 10, h * 0.4, x, h * 0.48);
  }

  // Railing
  gfx.lineStyle(3, 0x4a4a55, 0.6);
  gfx.lineBetween(0, h * 0.38, w, h * 0.38);
  gfx.lineStyle(2, 0x4a4a55, 0.4);
  gfx.lineBetween(0, h * 0.32, w, h * 0.32);
  // Railing posts
  for (let x = 0; x < w; x += 100) {
    gfx.lineStyle(2, 0x4a4a55, 0.5);
    gfx.lineBetween(x, h * 0.32, x, h * 0.4);
  }

  // Lighting instruments hanging
  const lightPositions = [w * 0.15, w * 0.31, w * 0.5, w * 0.69, w * 0.85];
  lightPositions.forEach((lx) => {
    // Pipe
    gfx.lineStyle(2, 0x555560, 0.5);
    gfx.lineBetween(lx, h * 0.48, lx, h * 0.55);
    // Light body
    gfx.fillStyle(0x2a2a35, 0.7);
    gfx.fillRect(lx - 15, h * 0.55, 30, 20);
    // Lens
    gfx.fillStyle(0x222230, 0.5);
    gfx.fillCircle(lx, h * 0.58 + 15, 10);
  });

  // Lighting control panel
  gfx.fillStyle(0x2a2a30, 0.7);
  gfx.fillRect(w * 0.7, h * 0.2, 120, 80);
  gfx.lineStyle(1, 0xc9a84c, 0.2);
  gfx.strokeRect(w * 0.7, h * 0.2, 120, 80);
  // Switches/buttons
  const switchColors = [0xcc2222, 0x2244cc, 0xeeeeee, 0xcc2222];
  switchColors.forEach((color, i) => {
    gfx.fillStyle(color, 0.4);
    gfx.fillRect(w * 0.71 + i * 28, h * 0.23, 20, 15);
  });

  // Cables running along catwalk
  gfx.lineStyle(2, 0x222228, 0.5);
  for (let c = 0; c < 3; c++) {
    const cy = h * 0.42 + c * 4;
    gfx.lineBetween(0, cy, w, cy);
  }

  // Depth perception - support beams going down
  [w * 0.1, w * 0.5, w * 0.9].forEach(bx => {
    gfx.lineStyle(2, 0x2a2a35, 0.3);
    gfx.lineBetween(bx, h * 0.48, bx - 20, h);
    gfx.lineBetween(bx, h * 0.48, bx + 20, h);
  });
}

// ─── BASEMENT ───────────────────────────────────────────────────────────────
function drawBasement(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Very dark, oppressive
  gfx.fillStyle(0x080610);
  gfx.fillRect(0, 0, w, h);

  // Stone walls
  for (let y = 0; y < h * 0.7; y += 30) {
    const offset = (Math.floor(y / 30) % 2) * 25;
    for (let x = 0; x < w; x += 50) {
      gfx.fillStyle(0x151218, 0.6);
      gfx.fillRect(x + offset, y, 46, 26);
      gfx.lineStyle(1, 0x0a0810, 0.4);
      gfx.strokeRect(x + offset, y, 46, 26);
    }
  }

  // Concrete floor
  gfx.fillStyle(0x121218, 0.8);
  gfx.fillRect(0, h * 0.7, w, h * 0.3);

  // Water stain on floor
  gfx.fillStyle(0x0a0a15, 0.4);
  gfx.fillCircle(w * 0.3, h * 0.8, 60);

  // Pipes along ceiling
  for (let p = 0; p < 4; p++) {
    const py = 20 + p * 25;
    gfx.lineStyle(4, 0x3a3840, 0.5);
    gfx.lineBetween(0, py, w, py);
    // Pipe joints
    for (let jx = 200; jx < w; jx += 300) {
      gfx.fillStyle(0x4a4845, 0.4);
      gfx.fillRect(jx - 8, py - 6, 16, 12);
    }
  }

  // Fog machines (center)
  gfx.fillStyle(0x2a2a30, 0.6);
  gfx.fillRect(w * 0.35, h * 0.55, 100, 60);
  gfx.lineStyle(1, 0x555555, 0.3);
  gfx.strokeRect(w * 0.35, h * 0.55, 100, 60);
  // Nozzle
  gfx.fillStyle(0x3a3a40, 0.5);
  gfx.fillRect(w * 0.35 + 40, h * 0.52, 20, 10);

  // Chemical shelves (right wall)
  for (let s = 0; s < 3; s++) {
    const sy = h * 0.2 + s * 100;
    gfx.fillStyle(0x1a1818);
    gfx.fillRect(w * 0.75, sy, 200, 6);
    // Bottles
    for (let b = 0; b < 4; b++) {
      const bx = w * 0.76 + b * 45;
      gfx.fillStyle(0x1a2a1a, 0.5);
      gfx.fillRect(bx, sy - 30, 15, 30);
      gfx.fillStyle(0x2a3a2a, 0.3);
      gfx.fillRect(bx + 2, sy - 28, 11, 5);
    }
  }

  // Hidden passage entrance (barely visible)
  gfx.fillStyle(0x0a0810, 0.9);
  gfx.fillRect(w * 0.1, h * 0.3, 80, 150);
  gfx.lineStyle(1, 0x151218, 0.3);
  gfx.strokeRect(w * 0.1, h * 0.3, 80, 150);

  // Trap door in ceiling
  gfx.fillStyle(0x1e1510, 0.4);
  gfx.fillRect(w * 0.45, 0, 100, 20);
  gfx.lineStyle(1, 0xc9a84c, 0.1);
  gfx.strokeRect(w * 0.45, 0, 100, 20);

  // Single bare bulb (dim)
  const bulb = scene.add.circle(w * 0.4, h * 0.12, 5, 0xffffcc, 0.25);
  bulb.setDepth(0);
  scene.tweens.add({
    targets: bulb,
    alpha: { from: 0.15, to: 0.3 },
    duration: 3000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  // Bulb cord
  gfx.lineStyle(1, 0x555555, 0.3);
  gfx.lineBetween(w * 0.4, 0, w * 0.4, h * 0.1);
  addLightCone(scene, w * 0.4, h * 0.12, 180, 0xffffcc, 0.03);

  // Eerie fog along floor
  for (let i = 0; i < 6; i++) {
    const fogX = Phaser.Math.Between(100, w - 100);
    const fog = scene.add.circle(fogX, h * 0.85, Phaser.Math.Between(30, 60), 0x8888aa, 0.04);
    fog.setDepth(0);
    scene.tweens.add({
      targets: fog,
      x: fogX + Phaser.Math.Between(-40, 40),
      alpha: { from: 0.02, to: 0.06 },
      duration: Phaser.Math.Between(4000, 8000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

// ─── OFFICE ─────────────────────────────────────────────────────────────────
function drawOffice(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Modern-ish office inside old building
  gfx.fillStyle(0x151520);
  gfx.fillRect(0, 0, w, h);

  // Carpet floor
  gfx.fillStyle(0x1a1a25, 0.8);
  gfx.fillRect(0, h * 0.65, w, h * 0.35);

  // Window (back wall, center) with city light
  gfx.fillStyle(0x0a1020, 0.8);
  gfx.fillRect(w * 0.35, h * 0.05, w * 0.3, h * 0.35);
  gfx.lineStyle(2, 0x3a3a45, 0.5);
  gfx.strokeRect(w * 0.35, h * 0.05, w * 0.3, h * 0.35);
  // Window cross
  gfx.lineBetween(w / 2, h * 0.05, w / 2, h * 0.4);
  gfx.lineBetween(w * 0.35, h * 0.22, w * 0.65, h * 0.22);
  // City lights outside
  for (let i = 0; i < 8; i++) {
    const lx = w * 0.37 + Phaser.Math.Between(0, w * 0.26);
    const ly = h * 0.08 + Phaser.Math.Between(0, h * 0.28);
    gfx.fillStyle(0xffffcc, Phaser.Math.FloatBetween(0.05, 0.15));
    gfx.fillRect(lx, ly, 3, 3);
  }

  // Desk (large, center)
  gfx.fillStyle(0x2a2220);
  gfx.fillRect(w * 0.25, h * 0.5, w * 0.5, h * 0.08);
  gfx.lineStyle(1, 0xc9a84c, 0.15);
  gfx.strokeRect(w * 0.25, h * 0.5, w * 0.5, h * 0.08);
  // Desk legs
  gfx.fillStyle(0x2a2220, 0.8);
  gfx.fillRect(w * 0.27, h * 0.58, 8, h * 0.1);
  gfx.fillRect(w * 0.73, h * 0.58, 8, h * 0.1);

  // Desk lamp
  gfx.lineStyle(2, 0xc9a84c, 0.3);
  gfx.lineBetween(w * 0.6, h * 0.48, w * 0.6, h * 0.42);
  gfx.lineBetween(w * 0.58, h * 0.42, w * 0.63, h * 0.42);
  addLightCone(scene, w * 0.6, h * 0.45, 120, 0xc9a84c, 0.05);

  // Papers on desk
  gfx.fillStyle(0xf5e6c8, 0.08);
  gfx.fillRect(w * 0.35, h * 0.5, 40, 55);
  gfx.fillRect(w * 0.42, h * 0.49, 35, 50);

  // Filing cabinet (left)
  gfx.fillStyle(0x2a2a30);
  gfx.fillRect(40, h * 0.25, 80, 200);
  gfx.lineStyle(1, 0x555555, 0.3);
  gfx.strokeRect(40, h * 0.25, 80, 200);
  // Drawers
  for (let d = 0; d < 4; d++) {
    gfx.lineStyle(1, 0x555555, 0.2);
    gfx.lineBetween(45, h * 0.25 + 50 * d + 48, 115, h * 0.25 + 50 * d + 48);
    gfx.fillStyle(0xc9a84c, 0.15);
    gfx.fillRect(73, h * 0.25 + 50 * d + 35, 14, 6);
  }

  // Wall safe (right wall, partially hidden behind painting)
  gfx.fillStyle(0x2a2a30, 0.7);
  gfx.fillRect(w - 130, h * 0.2, 80, 80);
  gfx.lineStyle(2, 0x555555, 0.4);
  gfx.strokeRect(w - 130, h * 0.2, 80, 80);
  // Keypad
  gfx.fillStyle(0x111115, 0.6);
  gfx.fillRect(w - 115, h * 0.24, 50, 35);

  // Painting covering safe (slightly askew)
  gfx.fillStyle(0x1a2a3a, 0.5);
  gfx.fillRect(w - 150, h * 0.12, 120, 100);
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.strokeRect(w - 150, h * 0.12, 120, 100);

  // Bookshelf (right)
  gfx.fillStyle(0x2a1e18);
  gfx.fillRect(w - 250, h * 0.1, 100, h * 0.45);
  for (let s = 0; s < 4; s++) {
    const sy = h * 0.12 + s * (h * 0.1);
    gfx.fillStyle(0x2a1e18);
    gfx.fillRect(w - 248, sy + h * 0.08, 96, 4);
    // Books
    for (let b = 0; b < 5; b++) {
      const bColor = [0x3a1520, 0x1a3a2a, 0x2a2a4a, 0x4a3a1a, 0x2a1a2a][b];
      gfx.fillStyle(bColor, 0.4);
      gfx.fillRect(w - 245 + b * 18, sy, 14, h * 0.08);
    }
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function drawDefaultRoom(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
  gfx.fillStyle(0x1a1a2e);
  gfx.fillRect(0, 0, w, h);
  // Basic walls and floor
  gfx.fillStyle(0x222235, 0.5);
  gfx.fillRect(0, h * 0.7, w, h * 0.3);
  gfx.lineStyle(1, 0xc9a84c, 0.1);
  gfx.lineBetween(0, h * 0.7, w, h * 0.7);
}

function drawChandelier(scene: Phaser.Scene, gfx: Phaser.GameObjects.Graphics, x: number, y: number, glowAlpha: number): void {
  // Chain from ceiling
  gfx.lineStyle(2, 0xc9a84c, 0.2);
  gfx.lineBetween(x, 0, x, y);

  // Main body (ornate shape)
  gfx.lineStyle(1, 0xc9a84c, 0.25);
  // Arms
  const arms = 6;
  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI + Math.PI * 0.1;
    const armLen = 45;
    const ax = x + Math.cos(angle) * armLen;
    const ay = y + Math.sin(angle) * 15;
    gfx.lineBetween(x, y, ax, ay);
    // Crystal drops
    gfx.fillStyle(0xc9a84c, 0.15);
    gfx.fillCircle(ax, ay + 8, 3);
  }

  // Center ornament
  gfx.fillStyle(0xc9a84c, 0.2);
  gfx.fillCircle(x, y, 8);

  // Dim glow
  const glow = scene.add.circle(x, y, 80, 0xc9a84c, glowAlpha);
  glow.setDepth(0);
}

function drawCurtain(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number): void {
  // Main curtain body
  gfx.fillStyle(color, 0.7);
  gfx.fillRect(x, y, w, h);

  // Folds (vertical lines with varying opacity)
  for (let i = 0; i < 4; i++) {
    const fx = x + (w / 5) * (i + 1);
    gfx.lineStyle(2, 0x000000, 0.15);
    gfx.lineBetween(fx, y, fx, h);
    gfx.lineStyle(1, color + 0x111111, 0.2);
    gfx.lineBetween(fx + 3, y, fx + 3, h);
  }
}

function addLightCone(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, alpha: number): void {
  const light = scene.add.circle(x, y, radius, color, alpha);
  light.setDepth(0);
  light.setBlendMode(Phaser.BlendModes.ADD);
}
