import Phaser from 'phaser';
import { UISounds } from './sounds';

// Ambient particle effects per room for atmosphere

export function addAmbientParticles(scene: Phaser.Scene, roomId: string): void {
  if (!UISounds.getParticlesEnabled()) return;
  const { width, height } = scene.cameras.main;

  switch (roomId) {
    case 'lobby':
    case 'dressing_room':
    case 'projection_booth':
      addDustMotes(scene, width, height);
      break;
    case 'auditorium':
      addDustMotes(scene, width, height);
      break;
    case 'backstage':
      addDustMotes(scene, width, height, 15);
      break;
    case 'basement':
      addFogWisps(scene, width, height);
      break;
    case 'catwalk':
      addDustMotes(scene, width, height, 8);
      break;
    case 'managers_office':
      addDustMotes(scene, width, height, 6);
      break;
  }
}

function addDustMotes(scene: Phaser.Scene, w: number, h: number, count = 12): void {
  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.Between(50, w - 50);
    const y = Phaser.Math.Between(50, h - 100);
    const size = Phaser.Math.FloatBetween(1, 2.5);
    const alpha = Phaser.Math.FloatBetween(0.15, 0.4);

    const mote = scene.add.circle(x, y, size, 0xffeedd, alpha);
    mote.setDepth(5);

    // Slow floating drift
    const driftX = Phaser.Math.FloatBetween(-30, 30);
    const driftY = Phaser.Math.FloatBetween(-20, -50);
    const duration = Phaser.Math.Between(4000, 8000);

    scene.tweens.add({
      targets: mote,
      x: x + driftX,
      y: y + driftY,
      alpha: { from: alpha, to: 0 },
      duration,
      delay: Phaser.Math.Between(0, 3000),
      repeat: -1,
      onRepeat: () => {
        mote.setPosition(
          Phaser.Math.Between(50, w - 50),
          Phaser.Math.Between(h * 0.3, h - 100)
        );
        mote.setAlpha(alpha);
      },
    });
  }
}

function addFogWisps(scene: Phaser.Scene, w: number, h: number): void {
  for (let i = 0; i < 5; i++) {
    const fogY = h * 0.6 + Phaser.Math.Between(0, 120);
    const fogW = Phaser.Math.Between(150, 300);
    const fogH = Phaser.Math.Between(20, 40);

    const fog = scene.add.ellipse(
      -fogW,
      fogY,
      fogW,
      fogH,
      0x8888aa,
      Phaser.Math.FloatBetween(0.04, 0.1)
    );
    fog.setDepth(4);

    scene.tweens.add({
      targets: fog,
      x: w + fogW,
      duration: Phaser.Math.Between(12000, 20000),
      delay: Phaser.Math.Between(0, 5000),
      repeat: -1,
      onRepeat: () => {
        fog.setPosition(-fogW, h * 0.6 + Phaser.Math.Between(0, 120));
      },
    });
  }
}
