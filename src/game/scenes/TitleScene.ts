import Phaser from 'phaser';
import { SaveSystem, SlotSummary } from '../systems/SaveSystem';
import { ChapterSystem } from '../systems/ChapterSystem';
import { AuthManager } from '../systems/AuthManager';
import { Colors, TextColors, FONT } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createAuthFormElements, submitAuthForm } from '../ui/AuthFormOverlay';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.getInstance();

    // Initialize auth manager
    AuthManager.getInstance().init();

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

    if (hasAnySave) {
      menuItems.push({
        label: 'Continue',
        textureKey: 'btn_continue',
        primary: true,
        action: () => this.showSlotPicker(width, height, 'load'),
      });
    }

    menuItems.push({
      label: hasAnySave ? 'New Investigation' : 'Begin Investigation',
      textureKey: 'btn_new_case',
      primary: !hasAnySave,
      action: () => this.showSlotPicker(width, height, 'new'),
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

    // Calculate menu position — start below the decorative line with comfortable gap
    const menuTopY = decoY + 30;
    const menuStartY = menuTopY + btnDisplayH / 2;

    // Render menu buttons with staggered fade-in
    menuItems.forEach((item, i) => {
      const y = menuStartY + i * (btnDisplayH + btnGap);
      this.createMenuButton(menuX, y, btnDisplayW, btnDisplayH, item.label, item.textureKey, item.action, item.primary, item.subtitle, i);
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
    const auth = AuthManager.getInstance();
    if (auth.isAvailable() && !auth.isSignedIn()) {
      this.time.delayedCall(1200, () => {
        this.showAuthDialog(width, height);
      });
    }
  }

  // ── Auth Dialog — themed welcome gate ──

  private showAuthDialog(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);
    container.setAlpha(0);

    // Full-screen dimmer
    const dimmer = this.add.rectangle(0, 0, width, height, 0x04030a, 0.88);
    dimmer.setInteractive();
    container.add(dimmer);

    // ── Outer frame — double-border "theater program" style ──
    const panelW = 560;
    const panelH = 580;

    // Outer decorative border
    const outerFrame = this.add.graphics();
    outerFrame.lineStyle(1, Colors.gold, 0.25);
    outerFrame.strokeRect(-panelW / 2 - 8, -panelH / 2 - 8, panelW + 16, panelH + 16);
    container.add(outerFrame);

    // Main panel
    const box = this.add.rectangle(0, 0, panelW, panelH, 0x08071a, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.6);
    container.add(box);

    // ── Corner flourishes ──
    const cornerGfx = this.add.graphics();
    cornerGfx.lineStyle(1, Colors.gold, 0.35);
    const cSize = 20;
    const cInset = 12;
    // Top-left
    cornerGfx.lineBetween(-panelW / 2 + cInset, -panelH / 2 + cInset + cSize, -panelW / 2 + cInset, -panelH / 2 + cInset);
    cornerGfx.lineBetween(-panelW / 2 + cInset, -panelH / 2 + cInset, -panelW / 2 + cInset + cSize, -panelH / 2 + cInset);
    // Top-right
    cornerGfx.lineBetween(panelW / 2 - cInset - cSize, -panelH / 2 + cInset, panelW / 2 - cInset, -panelH / 2 + cInset);
    cornerGfx.lineBetween(panelW / 2 - cInset, -panelH / 2 + cInset, panelW / 2 - cInset, -panelH / 2 + cInset + cSize);
    // Bottom-left
    cornerGfx.lineBetween(-panelW / 2 + cInset, panelH / 2 - cInset, -panelW / 2 + cInset, panelH / 2 - cInset - cSize);
    cornerGfx.lineBetween(-panelW / 2 + cInset, panelH / 2 - cInset, -panelW / 2 + cInset + cSize, panelH / 2 - cInset);
    // Bottom-right
    cornerGfx.lineBetween(panelW / 2 - cInset, panelH / 2 - cInset - cSize, panelW / 2 - cInset, panelH / 2 - cInset);
    cornerGfx.lineBetween(panelW / 2 - cInset - cSize, panelH / 2 - cInset, panelW / 2 - cInset, panelH / 2 - cInset);
    container.add(cornerGfx);

    // ── Header — "Case File" style ──
    const headerLabel = this.add.text(0, -250, '— WELCOME, DETECTIVE —', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, letterSpacing: 4,
    }).setOrigin(0.5);
    container.add(headerLabel);

    const titleText = this.add.text(0, -215, 'Sign In to Begin', {
      fontFamily: FONT, fontSize: '34px', color: '#e8c55a', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // Subtitle explaining why
    const subtitleText = this.add.text(0, -178, 'Your investigation progress will be saved to the cloud', {
      fontFamily: FONT, fontSize: '15px', color: TextColors.goldDim, fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(subtitleText);

    // ── Decorative divider ──
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, Colors.gold, 0.3);
    divGfx.lineBetween(-200, -155, 200, -155);
    this.drawDiamond(divGfx, 0, -155, 4, Colors.gold, 0.4);
    container.add(divGfx);

    // ── Tab toggle: Sign In | Register ──
    let mode: 'signin' | 'signup' = 'signup';

    const signInTab = this.add.text(-90, -125, 'SIGN IN', {
      fontFamily: FONT, fontSize: '17px', color: TextColors.muted, letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(signInTab);

    const registerTab = this.add.text(90, -125, 'REGISTER', {
      fontFamily: FONT, fontSize: '17px', color: TextColors.gold, letterSpacing: 3,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(registerTab);

    const tabUnderline = this.add.graphics();
    container.add(tabUnderline);

    const updateTabs = () => {
      signInTab.setColor(mode === 'signin' ? TextColors.gold : TextColors.muted);
      registerTab.setColor(mode === 'signup' ? TextColors.gold : TextColors.muted);
      tabUnderline.clear();
      tabUnderline.lineStyle(2, Colors.gold, 0.7);
      if (mode === 'signin') {
        tabUnderline.lineBetween(-130, -110, -50, -110);
        titleText.setText('Welcome Back');
      } else {
        tabUnderline.lineBetween(45, -110, 135, -110);
        titleText.setText('Join the Investigation');
      }
      updateSubmitLabel();
    };

    signInTab.on('pointerdown', () => { mode = 'signin'; updateTabs(); });
    registerTab.on('pointerdown', () => { mode = 'signup'; updateTabs(); });

    // ── DOM form inputs ──
    const formX = width / 2;
    const formY = height / 2 - 60;
    const formW = 380;
    const form = createAuthFormElements(this, formX, formY, formW);

    // ── Submit button — prominent, gold-bordered ──
    const submitBg = this.add.rectangle(0, 65, 380, 58, 0x14132e, 0.95);
    submitBg.setStrokeStyle(2, Colors.gold, 0.8);
    submitBg.setInteractive({ cursor: POINTER_CURSOR });
    const submitText = this.add.text(0, 65, 'Create Account', {
      fontFamily: FONT, fontSize: '22px', color: '#e8c55a', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([submitBg, submitText]);

    const updateSubmitLabel = () => {
      submitText.setText(mode === 'signin' ? 'Sign In' : 'Create Account');
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
        // Success — sync cloud saves and restart
        form.destroy();
        container.destroy();
        await SaveSystem.getInstance().syncFromCloud();
        this.scene.restart();
      }
    });

    // ── Bottom divider ──
    const bottomDiv = this.add.graphics();
    bottomDiv.lineStyle(1, Colors.gold, 0.15);
    bottomDiv.lineBetween(-200, 120, 200, 120);
    container.add(bottomDiv);

    // ── Continue as Guest — de-emphasized ──
    const guestText = this.add.text(0, 150, 'Continue as Guest', {
      fontFamily: FONT, fontSize: '16px', color: TextColors.muted,
    }).setOrigin(0.5).setInteractive({ cursor: POINTER_CURSOR });
    container.add(guestText);

    const guestNote = this.add.text(0, 175, 'You can create an account later from Settings', {
      fontFamily: FONT, fontSize: '13px', color: TextColors.muted, fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0.6);
    container.add(guestNote);

    guestText.on('pointerover', () => guestText.setColor(TextColors.goldDim));
    guestText.on('pointerout', () => guestText.setColor(TextColors.muted));
    guestText.on('pointerdown', () => {
      form.destroy();
      container.destroy();
    });

    // Initialize tabs
    updateTabs();

    // ── Entrance animation ──
    this.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Power2',
    });
  }

  // ── Save Slot Picker ──

  private async showSlotPicker(width: number, height: number, intent: 'load' | 'new'): Promise<void> {
    const save = SaveSystem.getInstance();
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.8);
    dimmer.setInteractive();
    container.add(dimmer);

    const panelW = 700;
    const panelH = 500;
    const box = this.add.rectangle(0, 0, panelW, panelH, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const title = intent === 'load' ? 'Select Save Slot' : 'Choose a Slot';
    const titleText = this.add.text(0, -210, title, {
      fontFamily: FONT, fontSize: '30px', color: '#e8c55a', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // Divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, Colors.gold, 0.3);
    divGfx.lineBetween(-250, -180, 250, -180);
    container.add(divGfx);

    // Loading text
    const loadingText = this.add.text(0, 0, 'Loading saves...', {
      fontFamily: FONT, fontSize: '18px', color: TextColors.goldDim,
    }).setOrigin(0.5);
    container.add(loadingText);

    // Fetch slot summaries
    let slots: SlotSummary[];
    try {
      slots = await save.getSlotSummaries();
    } catch {
      slots = [
        { slot: 0, timestamp: 0, chapter: 0, currentRoom: '', empty: true },
        { slot: 1, timestamp: 0, chapter: 0, currentRoom: '', empty: true },
        { slot: 2, timestamp: 0, chapter: 0, currentRoom: '', empty: true },
      ];
    }
    loadingText.destroy();

    // Render slot cards
    const cardW = 580;
    const cardH = 100;
    const cardGap = 16;
    const startY = -140;

    slots.forEach((slot, i) => {
      const cardY = startY + i * (cardH + cardGap);
      this.createSlotCard(container, 0, cardY, cardW, cardH, slot, intent, () => {
        container.destroy();
      });
    });

    // Close button
    const closeBg = this.add.rectangle(0, 200, 180, 54, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: POINTER_CURSOR });
    const closeText = this.add.text(0, 200, 'Cancel', {
      fontFamily: FONT, fontSize: '20px', color: TextColors.gold,
    }).setOrigin(0.5);
    closeBg.on('pointerover', () => closeBg.setFillStyle(Colors.hoverBg));
    closeBg.on('pointerout', () => closeBg.setFillStyle(Colors.sceneBg, 0.9));
    closeBg.on('pointerdown', () => container.destroy());
    container.add([closeBg, closeText]);
  }

  private createSlotCard(
    parent: Phaser.GameObjects.Container,
    x: number, y: number, w: number, h: number,
    slot: SlotSummary,
    intent: 'load' | 'new',
    onClose: () => void,
  ): void {
    const save = SaveSystem.getInstance();
    const { width, height } = this.cameras.main;

    const cardBg = this.add.rectangle(x, y, w, h, 0x0e0d16, 0.85);
    cardBg.setStrokeStyle(1, slot.empty ? 0x3a3a4a : Colors.gold, slot.empty ? 0.3 : 0.5);
    parent.add(cardBg);

    // Slot number label
    const slotLabel = this.add.text(x - w / 2 + 24, y - 14, `Slot ${slot.slot + 1}`, {
      fontFamily: FONT, fontSize: '20px', color: TextColors.gold,
    }).setOrigin(0, 0.5);
    parent.add(slotLabel);

    if (slot.empty) {
      const emptyText = this.add.text(x - w / 2 + 24, y + 14, 'Empty', {
        fontFamily: FONT, fontSize: '16px', color: TextColors.muted, fontStyle: 'italic',
      }).setOrigin(0, 0.5);
      parent.add(emptyText);

      if (intent === 'new') {
        // "New Game" button for empty slots
        const newBg = this.add.rectangle(x + w / 2 - 90, y, 140, 44, Colors.sceneBg, 0.9);
        newBg.setStrokeStyle(1, Colors.gold, 0.5);
        newBg.setInteractive({ cursor: POINTER_CURSOR });
        const newText = this.add.text(x + w / 2 - 90, y, 'New Game', {
          fontFamily: FONT, fontSize: '17px', color: TextColors.gold,
        }).setOrigin(0.5);
        newBg.on('pointerover', () => newBg.setFillStyle(Colors.hoverBg));
        newBg.on('pointerout', () => newBg.setFillStyle(Colors.sceneBg, 0.9));
        newBg.on('pointerdown', () => {
          save.setActiveSlot(slot.slot);
          save.deleteSave();
          onClose();
          this.startNewGame();
        });
        parent.add([newBg, newText]);
      }
    } else {
      // Show save details
      const chapter = ChapterSystem.getInstance().getChapterTitle(slot.chapter);
      const chapterText = this.add.text(x - w / 2 + 24, y + 6, chapter, {
        fontFamily: FONT, fontSize: '15px', color: TextColors.light, fontStyle: 'italic',
      }).setOrigin(0, 0.5);
      parent.add(chapterText);

      // Timestamp
      const timeStr = this.formatTimestamp(slot.timestamp);
      const timeText = this.add.text(x - w / 2 + 24, y + 28, timeStr, {
        fontFamily: FONT, fontSize: '13px', color: TextColors.muted,
      }).setOrigin(0, 0.5);
      parent.add(timeText);

      // Room name
      const roomText = this.add.text(x + 60, y - 14, slot.currentRoom.replace(/_/g, ' '), {
        fontFamily: FONT, fontSize: '14px', color: TextColors.goldDim,
      }).setOrigin(0, 0.5);
      parent.add(roomText);

      if (intent === 'load') {
        // Load button
        const loadBg = this.add.rectangle(x + w / 2 - 90, y - 12, 140, 38, Colors.sceneBg, 0.9);
        loadBg.setStrokeStyle(1, Colors.gold, 0.6);
        loadBg.setInteractive({ cursor: POINTER_CURSOR });
        const loadText = this.add.text(x + w / 2 - 90, y - 12, 'Load', {
          fontFamily: FONT, fontSize: '17px', color: TextColors.gold,
        }).setOrigin(0.5);
        loadBg.on('pointerover', () => loadBg.setFillStyle(Colors.hoverBg));
        loadBg.on('pointerout', () => loadBg.setFillStyle(Colors.sceneBg, 0.9));
        loadBg.on('pointerdown', () => {
          save.setActiveSlot(slot.slot);
          save.load();
          onClose();
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            const roomId = save.getCurrentRoom() || 'lobby';
            this.scene.start('RoomScene', { roomId });
            this.scene.launch('UIScene');
          });
        });
        parent.add([loadBg, loadText]);

        // Delete button
        const delBg = this.add.rectangle(x + w / 2 - 90, y + 22, 140, 32, 0x1a0a0a, 0.6);
        delBg.setStrokeStyle(1, Colors.error, 0.3);
        delBg.setInteractive({ cursor: POINTER_CURSOR });
        const delText = this.add.text(x + w / 2 - 90, y + 22, 'Delete', {
          fontFamily: FONT, fontSize: '14px', color: TextColors.error,
        }).setOrigin(0.5);
        delBg.on('pointerover', () => delBg.setFillStyle(0x2a0a0a, 0.8));
        delBg.on('pointerout', () => delBg.setFillStyle(0x1a0a0a, 0.6));
        delBg.on('pointerdown', () => {
          this.showConfirmDialog(width, height, () => {
            save.setActiveSlot(slot.slot);
            save.deleteSave();
            this.scene.restart();
          });
        });
        parent.add([delBg, delText]);
      } else {
        // "Overwrite" button for new game on occupied slot
        const overBg = this.add.rectangle(x + w / 2 - 90, y, 140, 44, 0x1a0a0a, 0.7);
        overBg.setStrokeStyle(1, Colors.error, 0.4);
        overBg.setInteractive({ cursor: POINTER_CURSOR });
        const overText = this.add.text(x + w / 2 - 90, y, 'Overwrite', {
          fontFamily: FONT, fontSize: '16px', color: TextColors.error,
        }).setOrigin(0.5);
        overBg.on('pointerover', () => overBg.setFillStyle(0x2a0a0a, 0.8));
        overBg.on('pointerout', () => overBg.setFillStyle(0x1a0a0a, 0.7));
        overBg.on('pointerdown', () => {
          this.showConfirmDialog(width, height, () => {
            save.setActiveSlot(slot.slot);
            save.deleteSave();
            onClose();
            this.startNewGame();
          });
        });
        parent.add([overBg, overText]);
      }
    }
  }

  private formatTimestamp(ts: number): string {
    if (!ts) return '';
    const date = new Date(ts);
    const now = Date.now();
    const diff = now - ts;

    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

  private startNewGame(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('IntroScene');
    });
  }

  private showHowToPlay(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    const dimmer = this.add.rectangle(0, 0, width, height, Colors.darkBg, 0.8);
    dimmer.setInteractive();
    container.add(dimmer);

    const box = this.add.rectangle(0, 0, 780, 510, Colors.panelBg, 0.97);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    container.add(box);

    const titleText = this.add.text(0, -140, 'How to Play', {
      fontFamily: FONT,
      fontSize: '33px',
      color: '#e8c55a',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    const helpLines = [
      'Click or tap highlighted areas to investigate.',
      'Pick up items and select them from your inventory.',
      'Use items on locked objects to progress.',
      'Talk to suspects to gather clues.',
      'Solve puzzles to unlock new areas.',
      'Check your journal (J) for clues and progress.',
      'Open the map (M) to travel between locations.',
    ];

    const helpText = this.add.text(0, -10, helpLines.join('\n\n'), {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.light,
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: 440 },
    }).setOrigin(0.5);
    container.add(helpText);

    // Close button
    const closeBg = this.add.rectangle(0, 210, 180, 66, Colors.sceneBg, 0.9);
    closeBg.setStrokeStyle(1, Colors.gold, 0.5);
    closeBg.setInteractive({ cursor: POINTER_CURSOR });
    const closeText = this.add.text(0, 210, 'Close', {
      fontFamily: FONT,
      fontSize: '24px',
      color: TextColors.gold,
    }).setOrigin(0.5);
    closeBg.on('pointerover', () => closeBg.setFillStyle(Colors.hoverBg));
    closeBg.on('pointerout', () => closeBg.setFillStyle(Colors.sceneBg, 0.9));
    closeBg.on('pointerdown', () => container.destroy());
    container.add([closeBg, closeText]);
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
