import Phaser from 'phaser';
import { SaveSystem, SaveData } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import { AuthManager } from '../systems/AuthManager';
import { Colors, TextColors, FONT } from '../utils/constants';
import roomsData from '../data/rooms.json';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createAuthFormElements, submitAuthForm } from '../ui/AuthFormOverlay';
import { drawCornerOrnament, drawDecoDivider, drawSunburst, drawGeoBorder, DecoColors } from '../utils/art-deco';

export class TitleScene extends Phaser.Scene {
  private authFormDestroy: (() => void) | null = null;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    // Clean up DOM auth form elements when this scene shuts down
    this.events.once('shutdown', () => {
      if (this.authFormDestroy) {
        this.authFormDestroy();
        this.authFormDestroy = null;
      }
    });
    const { width, height } = this.cameras.main;
    const save = SaveSystem.getInstance();

    // Initialize auth manager
    AuthManager.getInstance().init();

    // Guest users should never see leftover save data from previous sessions.
    // Clear any persisted saves if auth is available but user is not signed in.
    const auth = AuthManager.getInstance();
    if (auth.isAvailable() && !auth.isSignedIn() && save.hasAnySave()) {
      save.deleteSave();
    }

    // ── Cover image background ──
    this.cameras.main.setBackgroundColor('#0a0a0f');
    if (this.textures.exists('cover')) {
      const cover = this.add.image(width / 2, height / 2, 'cover');
      cover.setDisplaySize(width, height);
      cover.setAlpha(0.6);
    }

    // ── Gradient overlay — dark on the right side for title+menu, left shows theater ──
    const gradient = this.add.graphics();

    // Right-side vertical band: dark overlay for readability
    gradient.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0x0a0a0f, 0, 0.88, 0, 0.88);
    gradient.fillRect(width * 0.35, 0, width * 0.65, height);

    // Solid dark on far right
    gradient.fillStyle(0x0a0a0f, 0.82);
    gradient.fillRect(width * 0.55, 0, width * 0.45, height);

    // Subtle bottom strip for credits
    gradient.fillStyle(0x0a0a0f, 0.6);
    gradient.fillRect(0, height - 40, width, 40);

    // ── Title graphic — positioned right-of-center, upper area ──
    const contentX = width * 0.72; // right-of-center anchor for title + menu

    if (this.textures.exists('title_graphic')) {
      const titleImg = this.add.image(contentX, height * 0.22, 'title_graphic');
      // Scale to fit nicely — target about 420px wide
      const targetW = Math.min(630, width * 0.42);
      const scale = targetW / titleImg.width;
      titleImg.setScale(scale);

      // Subtle glow pulse
      this.tweens.add({
        targets: titleImg,
        alpha: { from: 1, to: 0.88 },
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Fallback: procedural text title if image missing
      this.add.text(contentX, height * 0.12, 'A  N A N C Y  D R E W  M Y S T E R Y', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#b8a472',
        letterSpacing: 7,
      }).setOrigin(0.5).setAlpha(0.8);

      this.add.text(contentX, height * 0.22, 'THE LAST\nCURTAIN CALL', {
        fontFamily: FONT,
        fontSize: '63px',
        color: '#e8c55a',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 9,
        shadow: { offsetX: 0, offsetY: 0, color: '#c9a84c', blur: 12, fill: true },
      }).setOrigin(0.5);
    }

    // ── Decorative line under title ──
    const decoLine = this.add.graphics();
    decoLine.lineStyle(1, Colors.gold, 0.35);
    const decoW = 420;
    const decoY = height * 0.35;
    decoLine.lineBetween(contentX - decoW / 2, decoY, contentX + decoW / 2, decoY);
    this.drawDiamond(decoLine, contentX - decoW / 2 - 4, decoY, 3, Colors.gold, 0.35);
    this.drawDiamond(decoLine, contentX + decoW / 2 + 4, decoY, 3, Colors.gold, 0.35);

    // ── Menu buttons — right-of-center, below title ──
    const menuX = contentX;
    const btnDisplayW = 510;
    const btnDisplayH = 105;
    const btnGap = 21;

    // Build menu items with texture keys
    const menuItems: { label: string; textureKey: string; action: () => void; primary?: boolean; subtitle?: string }[] = [];

    // Slot-aware: "Continue" opens slot picker, "New Investigation" opens slot picker for empty slot
    const hasAnySave = save.hasAnySave();

    // ── Save preview card + Continue button ──
    const menuTopY = decoY + 30;
    let nextY = menuTopY;
    let btnIndex = 0;

    const saveData = hasAnySave ? save.peekSave() : null;

    if (hasAnySave) {
      // Save preview card — room thumbnail, playtime, chapter
      const cardY = nextY;
      const cardH = 130;
      this.createSavePreviewCard(menuX, cardY, btnDisplayW, cardH, saveData, btnIndex);

      nextY += cardH + 12;
      btnIndex++;

      // Continue button directly below the card
      menuItems.push({
        label: 'Continue',
        textureKey: 'btn_continue',
        primary: true,
        action: () => {
          save.load();
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            const roomId = save.getCurrentRoom() || 'lobby';
            this.scene.start('RoomScene', { roomId });
            this.scene.launch('UIScene');
          });
        },
      });
    }

    menuItems.push({
      label: hasAnySave ? 'New Investigation' : 'Begin Investigation',
      textureKey: 'btn_new_case',
      primary: !hasAnySave,
      action: () => {
        if (hasAnySave) {
          this.showConfirmDialog(width, height, () => {
            save.deleteSave();
            this.startNewGame();
          });
        } else {
          this.startNewGame();
        }
      },
    });

    menuItems.push({
      label: 'How to Play',
      textureKey: 'btn_howto',
      action: () => this.showHowToPlay(width, height),
    });

    menuItems.push({
      label: 'Settings',
      textureKey: 'btn_settings',
      action: () => this.showSettings(width, height),
    });

    // Render menu buttons below the save card (or from the top if no save)
    const menuStartY = nextY + btnDisplayH / 2;

    menuItems.forEach((item, i) => {
      const y = menuStartY + i * (btnDisplayH + btnGap);
      this.createMenuButton(menuX, y, btnDisplayW, btnDisplayH, item.label, item.textureKey, item.action, item.primary, item.subtitle, btnIndex + i);
    });

    // ── Credits ──
    this.add.text(contentX, height - 20, 'Created by Carley Beck', {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#555566',
    }).setOrigin(0.5);

    // Set custom cursor
    initSceneCursor(this);

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Auto-show auth dialog if not signed in
    if (auth.isAvailable() && !auth.isSignedIn()) {
      this.time.delayedCall(1200, () => {
        this.showAuthDialog(width, height);
      });
    }
  }

  // ── Auth Dialog — art deco theater welcome gate ──

  private showAuthDialog(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);
    container.setAlpha(0);

    // Full-screen dimmer
    const dimmer = this.add.rectangle(0, 0, width, height, 0x02010a, 0.92);
    dimmer.setInteractive();
    container.add(dimmer);

    // ── Panel dimensions ──
    const panelW = 660;
    const panelH = 820;

    // ── Subtle sunburst behind the panel ──
    const sunburstGfx = this.add.graphics();
    drawSunburst(sunburstGfx, 0, -80, 520, 32, Colors.gold, 0.035);
    container.add(sunburstGfx);

    // ── Outer decorative border ──
    const outerFrame = this.add.graphics();
    outerFrame.lineStyle(1, Colors.gold, 0.18);
    outerFrame.strokeRect(-panelW / 2 - 14, -panelH / 2 - 14, panelW + 28, panelH + 28);
    container.add(outerFrame);

    // ── Main panel ──
    const box = this.add.rectangle(0, 0, panelW, panelH, 0x0a0918, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.55);
    container.add(box);

    // ── Inner border (double-line art deco effect) ──
    const innerFrame = this.add.graphics();
    innerFrame.lineStyle(1, Colors.gold, 0.18);
    innerFrame.strokeRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW - 16, panelH - 16);
    container.add(innerFrame);

    // ── Vertical side lines (subtle art deco framing) ──
    const sideLines = this.add.graphics();
    sideLines.lineStyle(1, Colors.gold, 0.08);
    sideLines.lineBetween(panelW / 2 - 3, -panelH / 2 + 50, panelW / 2 - 3, panelH / 2 - 50);
    sideLines.lineBetween(-panelW / 2 + 3, -panelH / 2 + 50, -panelW / 2 + 3, panelH / 2 - 50);
    container.add(sideLines);

    // ── Corner ornaments (larger, more prominent) ──
    const cornerGfx = this.add.graphics();
    drawCornerOrnament(cornerGfx, -panelW / 2 + 2, -panelH / 2 + 2, 38, 'tl', Colors.gold, 0.45);
    drawCornerOrnament(cornerGfx, panelW / 2 - 2, -panelH / 2 + 2, 38, 'tr', Colors.gold, 0.45);
    drawCornerOrnament(cornerGfx, -panelW / 2 + 2, panelH / 2 - 2, 38, 'bl', Colors.gold, 0.45);
    drawCornerOrnament(cornerGfx, panelW / 2 - 2, panelH / 2 - 2, 38, 'br', Colors.gold, 0.45);
    container.add(cornerGfx);

    // ── Top geometric border accent ──
    const topBorderGfx = this.add.graphics();
    drawGeoBorder(topBorderGfx, -panelW / 2 + 45, -panelH / 2 + 18, panelW - 90, Colors.gold, 0.12, 14, 4);
    container.add(topBorderGfx);

    // ── Header ──
    const headerLabel = this.add.text(0, -320, '— WELCOME, DETECTIVE —', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim, letterSpacing: 6,
    }).setOrigin(0.5);
    container.add(headerLabel);

    const titleText = this.add.text(0, -272, 'Join the Investigation', {
      fontFamily: FONT, fontSize: '42px', color: '#e8c55a', fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(titleText);

    const subtitleText = this.add.text(0, -228, 'Save your progress to the cloud across devices', {
      fontFamily: FONT, fontSize: '17px', color: TextColors.goldDim, fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(subtitleText);

    // ── Decorative divider with diamond ──
    const divGfx = this.add.graphics();
    drawDecoDivider(divGfx, 0, -196, 480, Colors.gold, 0.35);
    container.add(divGfx);

    // ── Tab toggle: SIGN IN | REGISTER ──
    let mode: 'signin' | 'signup' = 'signin';
    const tabY = -162;

    const signInTab = this.add.text(-90, tabY, 'SIGN IN', {
      fontFamily: FONT, fontSize: '20px', color: TextColors.muted, letterSpacing: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(signInTab);

    // Vertical separator bar between tabs
    const tabSeparator = this.add.graphics();
    tabSeparator.lineStyle(1.5, Colors.gold, 0.35);
    tabSeparator.lineBetween(0, tabY - 14, 0, tabY + 14);
    container.add(tabSeparator);

    const registerTab = this.add.text(90, tabY, 'REGISTER', {
      fontFamily: FONT, fontSize: '20px', color: TextColors.gold, letterSpacing: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(registerTab);

    // ── Decorative divider below tabs ──
    const tabDivGfx = this.add.graphics();
    drawDecoDivider(tabDivGfx, 0, tabY + 28, 400, Colors.gold, 0.2);
    container.add(tabDivGfx);

    const updateTabs = () => {
      signInTab.setColor(mode === 'signin' ? TextColors.gold : TextColors.muted);
      registerTab.setColor(mode === 'signup' ? TextColors.gold : TextColors.muted);
      if (mode === 'signin') {
        titleText.setText('Welcome Back');
      } else {
        titleText.setText('Join the Investigation');
      }
      updateSubmitLabel();
    };

    signInTab.on('pointerdown', () => { mode = 'signin'; updateTabs(); });
    registerTab.on('pointerdown', () => { mode = 'signup'; updateTabs(); });

    // ── DOM form inputs (positioned in the center of the panel) ──
    const formX = width / 2;
    const formY = height / 2 - 115;
    const formW = 460;
    const form = createAuthFormElements(this, formX, formY, formW);
    // Track so we can clean up DOM elements if the scene shuts down
    this.authFormDestroy = form.destroy;

    // ── Submit button — prominent, art deco styled with diamond accents ──
    const submitY = 135;
    const btnW = 460;
    const btnH = 62;

    // Outer double border effect
    const submitOuterGfx = this.add.graphics();
    submitOuterGfx.lineStyle(1, Colors.gold, 0.25);
    submitOuterGfx.strokeRect(-btnW / 2 - 4, submitY - btnH / 2 - 4, btnW + 8, btnH + 8);
    container.add(submitOuterGfx);

    const submitBg = this.add.rectangle(0, submitY, btnW, btnH, 0x14132e, 0.95);
    submitBg.setStrokeStyle(2, Colors.gold, 0.8);
    submitBg.setInteractive({ cursor: POINTER_CURSOR });
    const submitText = this.add.text(0, submitY, 'CREATE ACCOUNT', {
      fontFamily: FONT, fontSize: '22px', color: '#e8c55a', fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);
    container.add([submitBg, submitText]);

    // Diamond accents on submit button
    const submitDecoGfx = this.add.graphics();
    this.drawDiamond(submitDecoGfx, -btnW / 2 + 16, submitY, 4, Colors.gold, 0.5);
    this.drawDiamond(submitDecoGfx, btnW / 2 - 16, submitY, 4, Colors.gold, 0.5);
    // Small dots flanking the diamonds
    submitDecoGfx.fillStyle(Colors.gold, 0.3);
    submitDecoGfx.fillCircle(-btnW / 2 + 6, submitY, 1.5);
    submitDecoGfx.fillCircle(btnW / 2 - 6, submitY, 1.5);
    container.add(submitDecoGfx);

    const updateSubmitLabel = () => {
      submitText.setText(mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT');
    };

    let submitting = false;
    submitBg.on('pointerover', () => {
      submitBg.setFillStyle(0x1e1d3e, 1);
      submitBg.setStrokeStyle(2, Colors.gold, 1);
    });
    submitBg.on('pointerout', () => {
      submitBg.setFillStyle(0x14132e, 0.95);
      submitBg.setStrokeStyle(2, Colors.gold, 0.8);
    });
    submitBg.on('pointerdown', async () => {
      if (submitting) return;
      submitting = true;
      submitText.setText('...');
      form.errorDiv.textContent = '';

      const error = await submitAuthForm(
        form.emailInput.value,
        form.passwordInput.value,
        mode,
      );

      if (error) {
        form.errorDiv.textContent = error;
        updateSubmitLabel();
        submitting = false;
      } else {
        form.destroy();
        this.authFormDestroy = null;
        container.destroy();
        await SaveSystem.getInstance().syncFromCloud();
        this.scene.restart();
      }
    });

    // ── Continue as Guest — art deco button with double border ──
    const guestY = 235;

    const guestOuterGfx = this.add.graphics();
    guestOuterGfx.lineStyle(1, Colors.gold, 0.2);
    guestOuterGfx.strokeRect(-btnW / 2 - 4, guestY - btnH / 2 - 4, btnW + 8, btnH + 8);
    container.add(guestOuterGfx);

    const guestBg = this.add.rectangle(0, guestY, btnW, btnH, 0x0e0d1e, 0.9);
    guestBg.setStrokeStyle(1.5, Colors.gold, 0.5);
    guestBg.setInteractive({ cursor: POINTER_CURSOR });
    const guestText = this.add.text(0, guestY, 'CONTINUE AS GUEST', {
      fontFamily: FONT, fontSize: '22px', color: TextColors.light, letterSpacing: 4,
    }).setOrigin(0.5);
    container.add([guestBg, guestText]);

    // Diamond accents on guest button
    const guestDecoGfx = this.add.graphics();
    this.drawDiamond(guestDecoGfx, -btnW / 2 + 16, guestY, 4, Colors.gold, 0.35);
    this.drawDiamond(guestDecoGfx, btnW / 2 - 16, guestY, 4, Colors.gold, 0.35);
    guestDecoGfx.fillStyle(Colors.gold, 0.2);
    guestDecoGfx.fillCircle(-btnW / 2 + 6, guestY, 1.5);
    guestDecoGfx.fillCircle(btnW / 2 - 6, guestY, 1.5);
    container.add(guestDecoGfx);

    const guestNote = this.add.text(0, guestY + 48, 'You can create an account later from Settings.', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(guestNote);

    guestBg.on('pointerover', () => {
      guestBg.setFillStyle(0x1a1a3e, 1);
      guestBg.setStrokeStyle(1.5, Colors.gold, 0.8);
      guestText.setColor(TextColors.gold);
    });
    guestBg.on('pointerout', () => {
      guestBg.setFillStyle(0x0e0d1e, 0.9);
      guestBg.setStrokeStyle(1.5, Colors.gold, 0.5);
      guestText.setColor(TextColors.light);
    });
    guestBg.on('pointerdown', () => {
      // Guest sessions always start fresh — clear any leftover save data
      // so the menu shows "Begin Investigation" instead of "Continue"
      const save = SaveSystem.getInstance();
      if (save.hasAnySave()) {
        save.deleteSave();
      }
      form.destroy();
      this.authFormDestroy = null;
      container.destroy();
    });

    // ── Bottom geometric border accent ──
    const bottomBorderGfx = this.add.graphics();
    drawGeoBorder(bottomBorderGfx, -panelW / 2 + 45, panelH / 2 - 18, panelW - 90, Colors.gold, 0.12, 14, 4);
    container.add(bottomBorderGfx);

    // Initialize tabs
    updateTabs();

    // ── Entrance animation ──
    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      duration: 600,
      ease: 'Power2',
    });
  }

  private drawDiamond(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number, size: number,
    color: number, alpha: number,
  ): void {
    gfx.fillStyle(color, alpha);
    gfx.fillTriangle(cx, cy - size, cx + size, cy, cx, cy + size);
    gfx.fillTriangle(cx, cy - size, cx - size, cy, cx, cy + size);
  }

  private createMenuButton(
    x: number, y: number, w: number, h: number,
    label: string, textureKey: string, onClick: () => void,
    primary?: boolean, subtitle?: string, index?: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setAlpha(0); // start invisible for staggered fade-in

    const hasTexture = this.textures.exists(textureKey);

    if (hasTexture) {
      // ── Image-based button ──
      const btnImg = this.add.image(0, 0, textureKey);
      btnImg.setDisplaySize(w, h);
      container.add(btnImg);

      // Subtitle overlay (e.g., chapter name under Continue)
      if (subtitle) {
        const sub = this.add.text(0, h / 2 + 15, subtitle, {
          fontFamily: FONT,
          fontSize: '17px',
          color: TextColors.goldDim,
          fontStyle: 'italic',
        }).setOrigin(0.5);
        container.add(sub);
      }

      // Invisible hit area covering the button image
      const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0);
      hitArea.setInteractive({ cursor: POINTER_CURSOR });
      container.add(hitArea);

      // ── Hover: golden glow + scale up ──
      hitArea.on('pointerover', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 180,
          ease: 'Back.easeOut',
        });
        btnImg.setTint(0xffeecc); // warm golden tint
      });

      // ── Hover out: spring back to normal ──
      hitArea.on('pointerout', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 250,
          ease: 'Back.easeOut',
        });
        btnImg.clearTint();
      });

      // ── Press: quick scale-down "push" + brightness flash ──
      hitArea.on('pointerdown', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 80,
          ease: 'Power2',
          yoyo: true,
          onYoyo: () => {
            btnImg.setTint(0xffffff); // bright flash
          },
          onComplete: () => {
            btnImg.clearTint();
            onClick();
          },
        });
      });
    } else {
      // ── Fallback: procedural rectangle button ──
      const bg = this.add.rectangle(0, 0, w, h, 0x0e0d16, primary ? 0.9 : 0.75);
      bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : 0x6a5a3a, primary ? 0.8 : 0.4);
      bg.setInteractive({ cursor: POINTER_CURSOR });

      const text = this.add.text(0, subtitle ? -7 : 0, label, {
        fontFamily: FONT,
        fontSize: primary ? '28px' : '24px',
        color: primary ? '#e8c55a' : TextColors.light,
      }).setOrigin(0.5);
      container.add([bg, text]);

      if (subtitle) {
        const sub = this.add.text(0, 12, subtitle, {
          fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, fontStyle: 'italic',
        }).setOrigin(0.5);
        container.add(sub);
      }

      bg.on('pointerover', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 150, ease: 'Back.easeOut' });
        bg.setFillStyle(0x1a1a3e, 0.9);
        bg.setStrokeStyle(2, Colors.gold, 0.9);
        text.setColor('#e8c55a');
      });

      bg.on('pointerout', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
        bg.setFillStyle(0x0e0d16, primary ? 0.9 : 0.75);
        bg.setStrokeStyle(primary ? 2 : 1, primary ? Colors.gold : 0x6a5a3a, primary ? 0.8 : 0.4);
        text.setColor(primary ? '#e8c55a' : TextColors.light);
      });

      bg.on('pointerdown', () => {
        this.tweens.add({
          targets: container, scaleX: 0.95, scaleY: 0.95, duration: 80,
          ease: 'Power2', yoyo: true, onComplete: () => onClick(),
        });
      });
    }

    // ── Staggered entrance animation ──
    const delay = (index ?? 0) * 120;
    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      y: { from: y + 20, to: y },
      duration: 400,
      delay: delay + 300, // 300ms initial delay after scene loads
      ease: 'Power2',
    });

    return container;
  }

  private createSavePreviewCard(
    cx: number, topY: number, w: number, h: number,
    saveData: SaveData | null, index: number,
  ): void {
    const container = this.add.container(cx, topY + h / 2);
    container.setAlpha(0);

    // Card background — dark with gold border, like Hollow Knight's save slot
    const bg = this.add.rectangle(0, 0, w, h, 0x0a0918, 0.92);
    bg.setStrokeStyle(1.5, Colors.gold, 0.4);
    container.add(bg);

    if (!saveData) {
      container.add(this.add.text(0, 0, 'No save data', {
        fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim, fontStyle: 'italic',
      }).setOrigin(0.5));
    } else {
      // Room thumbnail on the left
      const thumbW = 180;
      const thumbH = h - 20;
      const thumbX = -w / 2 + 10 + thumbW / 2;
      const bgKey = `bg_${saveData.currentRoom}`;

      if (this.textures.exists(bgKey)) {
        const thumb = this.add.image(thumbX, 0, bgKey);
        // Scale to fit the thumbnail area (cover)
        const imgW = thumb.width;
        const imgH = thumb.height;
        const scale = Math.max(thumbW / imgW, thumbH / imgH);
        thumb.setScale(scale);
        thumb.setPosition(thumbX, 0);

        // Mask to clip the thumbnail to a rectangle
        const maskShape = this.add.rectangle(thumbX, 0, thumbW, thumbH, 0xffffff);
        maskShape.setVisible(false);
        // Position mask in world space (container offset)
        maskShape.setPosition(cx + thumbX, topY + h / 2);
        const mask = maskShape.createGeometryMask();
        thumb.setMask(mask);
        container.add(thumb);

        // Subtle border around thumbnail
        const thumbBorder = this.add.rectangle(thumbX, 0, thumbW, thumbH);
        thumbBorder.setStrokeStyle(1, Colors.gold, 0.3);
        thumbBorder.setFillStyle(0x000000, 0);
        container.add(thumbBorder);
      }

      // Text info to the right of the thumbnail
      const textLeft = thumbX + thumbW / 2 + 20;
      const textMaxW = w - thumbW - 50;

      // Room name
      const roomName = this.getRoomDisplayName(saveData.currentRoom);
      container.add(this.add.text(textLeft, -h / 2 + 22, roomName, {
        fontFamily: FONT, fontSize: '20px', color: '#e8c55a',
        fontStyle: 'bold', wordWrap: { width: textMaxW },
      }).setOrigin(0, 0));

      // Chapter
      const chapterTitle = ChapterSystem.getInstance().getChapterTitle(saveData.chapter);
      container.add(this.add.text(textLeft, -h / 2 + 50, chapterTitle, {
        fontFamily: FONT, fontSize: '16px', color: TextColors.light,
        fontStyle: 'italic',
      }).setOrigin(0, 0));

      // Playtime
      const playtime = this.formatPlaytime(saveData.playtimeMs || 0);
      container.add(this.add.text(textLeft, h / 2 - 22, playtime, {
        fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim,
      }).setOrigin(0, 1));

      // Clues found (count journal entries as proxy)
      const clueCount = (saveData.journal || []).length;
      if (clueCount > 0) {
        container.add(this.add.text(textLeft + textMaxW, h / 2 - 22, `${clueCount} clues`, {
          fontFamily: FONT, fontSize: '16px', color: TextColors.goldDim, fontStyle: 'italic',
        }).setOrigin(1, 1));
      }
    }

    // Staggered entrance animation
    const delay = index * 120;
    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      y: { from: topY + h / 2 + 20, to: topY + h / 2 },
      duration: 400,
      delay: delay + 300,
      ease: 'Power2',
    });
  }

  private getRoomDisplayName(roomId: string): string {
    const rooms = roomsData.rooms as { id: string; name: string }[];
    const room = rooms.find(r => r.id === roomId);
    if (!room) return roomId.replace(/_/g, ' ');
    // Shorten names like "The Monarch Theatre — Grand Lobby" to just "Grand Lobby"
    const parts = room.name.split(' — ');
    return parts.length > 1 ? parts[parts.length - 1] : room.name;
  }

  private formatPlaytime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return '< 1m';
  }

  private startNewGame(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('IntroScene');
    });
  }

  private showHowToPlay(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);
    container.setAlpha(0);

    // Full-screen dimmer
    const dimmer = this.add.rectangle(0, 0, width, height, 0x02010a, 0.88);
    dimmer.setInteractive();
    container.add(dimmer);

    // Panel
    const panelW = 720;
    const panelH = 620;

    // Outer decorative border
    const outerFrame = this.add.graphics();
    outerFrame.lineStyle(1, Colors.gold, 0.18);
    outerFrame.strokeRect(-panelW / 2 - 10, -panelH / 2 - 10, panelW + 20, panelH + 20);
    container.add(outerFrame);

    const box = this.add.rectangle(0, 0, panelW, panelH, 0x0a0918, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.55);
    container.add(box);

    // Inner border
    const innerFrame = this.add.graphics();
    innerFrame.lineStyle(1, Colors.gold, 0.15);
    innerFrame.strokeRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW - 16, panelH - 16);
    container.add(innerFrame);

    // Corner ornaments
    const cornerGfx = this.add.graphics();
    drawCornerOrnament(cornerGfx, -panelW / 2 + 2, -panelH / 2 + 2, 30, 'tl', Colors.gold, 0.4);
    drawCornerOrnament(cornerGfx, panelW / 2 - 2, -panelH / 2 + 2, 30, 'tr', Colors.gold, 0.4);
    drawCornerOrnament(cornerGfx, -panelW / 2 + 2, panelH / 2 - 2, 30, 'bl', Colors.gold, 0.4);
    drawCornerOrnament(cornerGfx, panelW / 2 - 2, panelH / 2 - 2, 30, 'br', Colors.gold, 0.4);
    container.add(cornerGfx);

    // Header
    const headerLabel = this.add.text(0, -panelH / 2 + 40, '— DETECTIVE\'S HANDBOOK —', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, letterSpacing: 5,
    }).setOrigin(0.5);
    container.add(headerLabel);

    const titleText = this.add.text(0, -panelH / 2 + 76, 'How to Play', {
      fontFamily: FONT, fontSize: '36px', color: '#e8c55a', fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(titleText);

    // Divider under title
    const divGfx = this.add.graphics();
    drawDecoDivider(divGfx, 0, -panelH / 2 + 106, 400, Colors.gold, 0.3);
    container.add(divGfx);

    // Tips with icons — left-aligned with consistent layout
    const tips = [
      { icon: '\u{1F50D}', label: 'Investigate', desc: 'Click glowing hotspots to examine objects and discover clues.' },
      { icon: '\u{1F5E3}', label: 'Interrogate', desc: 'Talk to suspects — their stories may hold contradictions.' },
      { icon: '\u{1F392}', label: 'Inventory', desc: 'Pick up items and select them to use on objects in the world.' },
      { icon: '\u{1F9E9}', label: 'Puzzles', desc: 'Solve puzzles by combining clues from different sources.' },
      { icon: '\u{1F4D3}', label: 'Journal  (J)', desc: 'Review your discoveries, clues, and case progress.' },
      { icon: '\u{1F5FA}', label: 'Map  (M)', desc: 'Travel between rooms in the theater.' },
    ];

    const startY = -panelH / 2 + 135;
    const rowH = 66;
    const iconX = -panelW / 2 + 55;
    const labelX = -panelW / 2 + 100;
    const descX = -panelW / 2 + 100;

    tips.forEach((tip, i) => {
      const y = startY + i * rowH;

      // Icon
      container.add(this.add.text(iconX, y + 6, tip.icon, {
        fontSize: '24px',
      }).setOrigin(0.5, 0));

      // Label (bold gold)
      container.add(this.add.text(labelX, y, tip.label, {
        fontFamily: FONT, fontSize: '20px', color: '#e8c55a', fontStyle: 'bold',
      }).setOrigin(0, 0));

      // Description
      container.add(this.add.text(descX, y + 26, tip.desc, {
        fontFamily: FONT, fontSize: '17px', color: TextColors.light,
        wordWrap: { width: panelW - 130 },
      }).setOrigin(0, 0));

      // Subtle separator line between rows (except after last)
      if (i < tips.length - 1) {
        const sepGfx = this.add.graphics();
        sepGfx.lineStyle(1, Colors.gold, 0.08);
        sepGfx.lineBetween(-panelW / 2 + 40, y + rowH - 4, panelW / 2 - 40, y + rowH - 4);
        container.add(sepGfx);
      }
    });

    // Close button — art deco styled
    const btnY = panelH / 2 - 55;
    const btnW = 240;
    const btnH = 56;

    const closeBtnOuterGfx = this.add.graphics();
    closeBtnOuterGfx.lineStyle(1, Colors.gold, 0.2);
    closeBtnOuterGfx.strokeRect(-btnW / 2 - 4, btnY - btnH / 2 - 4, btnW + 8, btnH + 8);
    container.add(closeBtnOuterGfx);

    const closeBg = this.add.rectangle(0, btnY, btnW, btnH, 0x0e0d1e, 0.9);
    closeBg.setStrokeStyle(1.5, Colors.gold, 0.6);
    closeBg.setInteractive({ cursor: POINTER_CURSOR });
    const closeText = this.add.text(0, btnY, 'CLOSE', {
      fontFamily: FONT, fontSize: '20px', color: TextColors.gold, letterSpacing: 3,
    }).setOrigin(0.5);

    // Diamond accents
    const closeDecoGfx = this.add.graphics();
    this.drawDiamond(closeDecoGfx, -btnW / 2 + 14, btnY, 3.5, Colors.gold, 0.4);
    this.drawDiamond(closeDecoGfx, btnW / 2 - 14, btnY, 3.5, Colors.gold, 0.4);
    container.add([closeBg, closeText, closeDecoGfx]);

    closeBg.on('pointerover', () => {
      closeBg.setFillStyle(0x1a1a3e, 1);
      closeBg.setStrokeStyle(1.5, Colors.gold, 1);
    });
    closeBg.on('pointerout', () => {
      closeBg.setFillStyle(0x0e0d1e, 0.9);
      closeBg.setStrokeStyle(1.5, Colors.gold, 0.6);
    });
    closeBg.on('pointerdown', () => {
      this.tweens.add({
        targets: container, alpha: 0, duration: 300,
        onComplete: () => container.destroy(),
      });
    });

    // Click dimmer to close
    dimmer.on('pointerdown', () => {
      this.tweens.add({
        targets: container, alpha: 0, duration: 300,
        onComplete: () => container.destroy(),
      });
    });

    // Fade in
    this.tweens.add({
      targets: container, alpha: { from: 0, to: 1 }, duration: 400, ease: 'Power2',
    });
  }

  private showSettings(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);
    const save = SaveSystem.getInstance();

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.8);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 660, 580, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -250, 'Settings', {
      fontFamily: FONT,
      fontSize: '33px',
      color: '#e8c55a',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // ── Divider under title ──
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, Colors.gold, 0.3);
    divGfx.lineBetween(-150, -215, 150, -215);
    container.add(divGfx);

    const rowY = (row: number) => -170 + row * 72;

    // ── 1. Dialogue Speed ──
    // Controls how fast dialogue text types out character by character
    {
      const label = this.add.text(-255, rowY(0), 'Dialogue Speed', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const speeds = ['slow', 'normal', 'fast'];
      const speedLabels: Record<string, string> = {
        slow: 'SLOW',
        normal: 'NORMAL',
        fast: 'FAST',
      };
      const raw = save.getFlag('setting_text_speed') || 'normal';
      let idx = speeds.indexOf(raw as string);
      if (idx === -1) idx = 1;

      const valText = this.add.text(210, rowY(0), speedLabels[speeds[idx]], {
        fontFamily: FONT, fontSize: '21px', color: TextColors.gold,
      }).setOrigin(0.5);
      container.add(valText);

      const leftArr = this.add.text(135, rowY(0), '◀', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      const rightArr = this.add.text(285, rowY(0), '▶', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });

      const update = (dir: number) => {
        idx = (idx + dir + speeds.length) % speeds.length;
        valText.setText(speedLabels[speeds[idx]]);
        save.setFlag('setting_text_speed', speeds[idx]);
      };
      leftArr.on('pointerdown', () => update(-1));
      rightArr.on('pointerdown', () => update(1));
      container.add([leftArr, rightArr]);
    }

    // ── 2. Clue Shimmer ──
    // When ON, undiscovered hotspots gently shimmer so the player knows where to look
    {
      const label = this.add.text(-255, rowY(1), 'Clue Shimmer', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const desc = this.add.text(-255, rowY(1) + 24, 'Highlights undiscovered clues', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
      }).setOrigin(0, 0.5);
      container.add(desc);

      let on = save.getFlag('setting_highlights') !== false;
      const valText = this.add.text(210, rowY(1), on ? 'ON' : 'OFF', {
        fontFamily: FONT, fontSize: '21px', color: on ? TextColors.success : TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      container.add(valText);

      valText.on('pointerdown', () => {
        on = !on;
        valText.setText(on ? 'ON' : 'OFF');
        valText.setColor(on ? TextColors.success : TextColors.goldDim);
        save.setFlag('setting_highlights', on);
      });
    }

    // ── 3. Auto-Save ──
    // When ON, the game auto-saves when entering a new room or completing a puzzle
    {
      const label = this.add.text(-255, rowY(2), 'Auto-Save', {
        fontFamily: FONT, fontSize: '21px', color: TextColors.light,
      }).setOrigin(0, 0.5);
      container.add(label);

      const desc = this.add.text(-255, rowY(2) + 24, 'Saves on room change and puzzle completion', {
        fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
      }).setOrigin(0, 0.5);
      container.add(desc);

      // Default auto-save to ON
      let on = save.getFlag('setting_autosave') !== false;
      const valText = this.add.text(210, rowY(2), on ? 'ON' : 'OFF', {
        fontFamily: FONT, fontSize: '21px', color: on ? TextColors.success : TextColors.goldDim,
      }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
      container.add(valText);

      valText.on('pointerdown', () => {
        on = !on;
        valText.setText(on ? 'ON' : 'OFF');
        valText.setColor(on ? TextColors.success : TextColors.goldDim);
        save.setFlag('setting_autosave', on);
      });
    }

    // ── 4. Account / Cloud Saves ──
    {
      const auth = AuthManager.getInstance();
      if (auth.isAvailable() && !auth.isSignedIn()) {
        const label = this.add.text(-255, rowY(3), 'Cloud Saves', {
          fontFamily: FONT, fontSize: '21px', color: TextColors.light,
        }).setOrigin(0, 0.5);
        container.add(label);

        const desc = this.add.text(-255, rowY(3) + 24, 'Sign in to save progress across devices', {
          fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
        }).setOrigin(0, 0.5);
        container.add(desc);

        const signInBg = this.add.rectangle(210, rowY(3) + 8, 160, 44, 0x14132e, 0.9);
        signInBg.setStrokeStyle(1, Colors.gold, 0.6);
        signInBg.setInteractive({ cursor: POINTER_CURSOR });
        const signInBtnText = this.add.text(210, rowY(3) + 8, 'Sign In', {
          fontFamily: FONT, fontSize: '18px', color: TextColors.gold,
        }).setOrigin(0.5);
        signInBg.on('pointerover', () => signInBg.setFillStyle(Colors.hoverBg));
        signInBg.on('pointerout', () => signInBg.setFillStyle(0x14132e, 0.9));
        signInBg.on('pointerdown', () => {
          container.destroy();
          this.showAuthDialog(width, height);
        });
        container.add([signInBg, signInBtnText]);
      } else if (auth.isAvailable() && auth.isSignedIn()) {
        const label = this.add.text(-255, rowY(3), 'Cloud Saves', {
          fontFamily: FONT, fontSize: '21px', color: TextColors.light,
        }).setOrigin(0, 0.5);
        container.add(label);

        const statusText = this.add.text(210, rowY(3), '☁ Connected', {
          fontFamily: FONT, fontSize: '18px', color: TextColors.success,
        }).setOrigin(0.5);
        container.add(statusText);

        const emailText = this.add.text(-255, rowY(3) + 24, auth.getDisplayName(), {
          fontFamily: FONT, fontSize: '14px', color: TextColors.mutedBlue,
        }).setOrigin(0, 0.5);
        container.add(emailText);
      }
    }

    // ── Divider above danger zone ──
    const divGfx2 = this.add.graphics();
    divGfx2.lineStyle(1, Colors.error, 0.2);
    divGfx2.lineBetween(-150, rowY(4) - 8, 150, rowY(4) - 8);
    container.add(divGfx2);

    // ── Delete save data ──
    {
      const deleteBg = this.add.rectangle(0, rowY(4) + 10, 300, 54, 0x1a0a0a, 0.8);
      deleteBg.setStrokeStyle(1, Colors.error, 0.4);
      deleteBg.setInteractive({ cursor: POINTER_CURSOR });
      const deleteText = this.add.text(0, rowY(4) + 10, 'Delete Save Data', {
        fontFamily: FONT, fontSize: '20px', color: TextColors.error,
      }).setOrigin(0.5);

      deleteBg.on('pointerover', () => deleteBg.setFillStyle(0x2a0a0a, 0.9));
      deleteBg.on('pointerout', () => deleteBg.setFillStyle(0x1a0a0a, 0.8));
      deleteBg.on('pointerdown', () => {
        container.destroy();
        this.showConfirmDialog(width, height, () => {
          save.deleteSave();
          this.scene.restart();
        });
      });
      container.add([deleteBg, deleteText]);
    }

    // ── Close button ──
    const closeBg = this.add.rectangle(0, 250, 180, 60, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: POINTER_CURSOR });
    const closeText = this.add.text(0, 250, 'Close', {
      fontFamily: FONT, fontSize: '22px', color: TextColors.gold,
    }).setOrigin(0.5);
    closeBg.on('pointerover', () => closeBg.setFillStyle(Colors.hoverBg));
    closeBg.on('pointerout', () => closeBg.setFillStyle(Colors.sceneBg, 0.9));
    closeBg.on('pointerdown', () => container.destroy());
    container.add([closeBg, closeText]);
  }

  private showConfirmDialog(width: number, height: number, onConfirm: () => void): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.7);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 600, 270, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const text = this.add.text(0, -60, 'Start a new investigation?\nYour current progress will be lost.', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.light,
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    container.add(text);

    // Confirm
    const yesBg = this.add.rectangle(-120, 60, 180, 66, Colors.danger, 0.8);
    yesBg.setStrokeStyle(1, Colors.gold, 0.5);
    yesBg.setInteractive({ cursor: POINTER_CURSOR });
    const yesText = this.add.text(-120, 60, 'Yes', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.light,
    }).setOrigin(0.5);
    yesBg.on('pointerover', () => yesBg.setFillStyle(0xaa0000));
    yesBg.on('pointerout', () => yesBg.setFillStyle(Colors.danger, 0.8));
    yesBg.on('pointerdown', () => {
      container.destroy();
      onConfirm();
    });
    container.add([yesBg, yesText]);

    // Cancel
    const noBg = this.add.rectangle(120, 60, 180, 66, Colors.sceneBg, 0.8);
    noBg.setStrokeStyle(1, Colors.gold, 0.5);
    noBg.setInteractive({ cursor: POINTER_CURSOR });
    const noText = this.add.text(120, 60, 'Cancel', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    noBg.on('pointerover', () => noBg.setFillStyle(Colors.hoverBg));
    noBg.on('pointerout', () => noBg.setFillStyle(Colors.sceneBg, 0.8));
    noBg.on('pointerdown', () => container.destroy());
    container.add([noBg, noText]);
  }
}
