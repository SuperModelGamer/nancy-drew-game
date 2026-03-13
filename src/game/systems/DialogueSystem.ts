import Phaser from 'phaser';
import dialogueData from '../data/dialogue.json';
import { InventorySystem } from './InventorySystem';
import { SaveSystem } from './SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { HAND_CURSOR, POINTER_CURSOR } from '../utils/cursors';

interface DialogueLine {
  speaker: string;
  text: string;
}

interface DialogueChoice {
  text: string;
  nextNode: string;
  requiredItem?: string;
  requiredFlag?: string;
  triggerEvent?: string;
}

interface DialogueNode {
  id: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  nextNode?: string;
  triggerEvent?: string;
}

interface Dialogue {
  id: string;
  nodes: DialogueNode[];
}

// Journal entries triggered by dialogue events
const EVENT_JOURNAL_ENTRIES: Record<string, string> = {
  learned_about_margaux: 'Vivian told me about Margaux Fontaine — a legendary actress who died on stage in 1928 from poison in a prop goblet. Vivian was her goddaughter.',
  learned_about_ashworth: 'Roland Ashworth collapsed last night — poisoned. He owns the Monarch and plans to demolish it for the insurance payout.',
  learned_about_cecilia: 'Cecilia Drake was Margaux\'s understudy in 1928. She had the most to gain from Margaux\'s death and took the lead role after.',
  learned_about_hale_family: 'The Hale family has deep roots in the Monarch. Edwin Hale is the theater historian — he knows more about 1928 than anyone alive.',
  vivian_full_trust: 'Vivian trusts me fully now. She gave me access to the private archives and Margaux\'s personal effects.',
  learned_about_crimson_veil: 'Edwin told me about "The Crimson Veil" — Margaux\'s final play. The Act III poisoning scene mirrors how she actually died. The script may contain hidden clues.',
  showed_edwin_diary: 'I showed Edwin Margaux\'s diary. He was visibly shaken — he knows more about her death than he\'s letting on.',
  edwin_personal_revealed: 'Edwin confessed he\'s been investigating Margaux\'s murder for fifteen years. He built the "Ghost Project" to scare Ashworth away from demolishing the theater.',
  learned_about_missing_props: 'Stella admitted that original props from 1928 have been going missing. She\'s been selling them to pay her mother\'s medical bills.',
  stella_confession: 'Stella broke down and confessed — she\'s been selling the theater\'s props. She\'s desperate, not malicious. She gave me the basement key location.',
  basement_key_location: 'Stella told me the basement key is hidden behind the backstage lighting panel.',
  effects_manual_location: 'I learned the Special Effects Manual is somewhere backstage — it explains the theater\'s hidden mechanisms.',
  catwalk_access: 'Diego gave me access to the catwalk. He said Edwin spends a lot of time up there alone.',
  annotated_script_found: 'Found the original annotated script of "The Crimson Veil." Red-circled letters in the margins may spell a hidden message.',
  cipher_discussed: 'Diego helped me understand the script cipher — the circled letters follow the stage directions in Act III, not the dialogue.',
  heard_basement_noises: 'Diego mentioned hearing strange noises from the basement at night — mechanical sounds, like machinery running on its own.',
  saw_figure_before_collapse: 'Ashworth saw a ghostly figure moments before he collapsed. The "ghost" may have been a distraction during the poisoning.',
  ashworth_motive_revealed: 'Ashworth admitted the demolition insurance is worth $2.3 million. He rejected an $800K offer from the Historical Society. He chose greed.',
  learned_about_basement_intruder: 'Someone has been accessing the basement at night. There are fresh footprints and the fog machines have been recently serviced.',
  called_friends: 'Called Bess and George — Bess is researching antimony poisoning, George is looking into the Hale family history.',
  called_dad: 'Called Dad. He said antimony poisoning cases from the 1920s were often ruled accidental. The police may not have investigated Margaux\'s death properly.',
  called_historical_society: 'The Historical Society confirmed the Monarch is eligible for landmark status — which would block Ashworth\'s demolition. Someone doesn\'t want that to happen.',
  called_ned: 'Called Ned. He told me to be careful — old buildings fall apart at the worst moments. He\'s right, but I can\'t stop now.',
};

// ─── Layout Constants ───────────────────────────────────────────────────────
const BOX_H = 340;
const BOX_BOTTOM_MARGIN = 110;  // raised higher to make room for nameplate below portrait
const TEXT_SIZE = '32px';
const SPEAKER_SIZE = '36px';
const CHOICE_H = 110;
const CHOICE_FONT = '26px';
const TYPEWRITER_SPEED = 28; // ms per character
const ANIM_DURATION = 400; // ms for box entrance/exit
const PORTRAIT_GAP = 16;   // gap between portrait frame and dialogue box
const FRAME_BORDER = 44;   // portrait frame gold border thickness (px at display size)
const NAMEPLATE_GAP = 8;   // gap between portrait bottom and nameplate

// Gold border insets — fractions of the DISPLAYED asset size.
// Measured from the innermost gold ornament edges, not the PNG bounds.
// The dialogue-box corner star ornaments extend well inward from each side.
const DLG_BOX_INSET_X = 0.155; // dialogue-box.png: corner ornaments
const DLG_BOX_INSET_Y = 0.22;  // dialogue-box.png: top/bottom gold lines (generous)
const NP_INSET_X = 0.11;       // nameplate.png: corner ornaments
const CHOICE_INSET_X = 0.04;   // choice-btn.png: side ornaments
const CHOICE_INSET_TOP = 0.20; // choice-btn.png: crown ornament at top
const CHOICE_INSET_BOT = 0.11; // choice-btn.png: bottom border

export class DialogueSystem {
  private static instance: DialogueSystem;
  private active = false;
  private currentDialogue: Dialogue | null = null;
  private currentNodeIndex = 0;
  private currentLineIndex = 0;
  private scene: Phaser.Scene | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private triggeredEvents: Set<string> = new Set();

  // Typewriter state
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private isTyping = false;
  private fullLineText = '';
  private dialogueTextObj: Phaser.GameObjects.Text | null = null;
  private textMaskGfx: Phaser.GameObjects.Graphics | null = null;

  // Track current speaker for entrance animations
  private lastSpeaker = '';

  static getInstance(): DialogueSystem {
    if (!DialogueSystem.instance) {
      DialogueSystem.instance = new DialogueSystem();
    }
    return DialogueSystem.instance;
  }

  startDialogue(dialogueId: string, scene: Phaser.Scene): void {
    const dialogues = dialogueData.dialogues as Dialogue[];
    const dialogue = dialogues.find(d => d.id === dialogueId);
    if (!dialogue) return;

    this.currentDialogue = dialogue;
    this.currentNodeIndex = 0;
    this.currentLineIndex = 0;
    this.active = true;
    this.scene = scene;
    this.lastSpeaker = '';

    this.showDialogueUI();
    this.showCurrentLine();
  }

  private showDialogueUI(): void {
    if (!this.scene) return;

    this.destroyUI();

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(Depths.dialogueBox);
  }

  private showCurrentLine(): void {
    if (!this.currentDialogue || !this.scene || !this.container) return;

    const node = this.currentDialogue.nodes[this.currentNodeIndex];
    if (!node) {
      this.endDialogue();
      return;
    }

    if (this.currentLineIndex < node.lines.length) {
      const line = node.lines[this.currentLineIndex];
      this.renderLine(line);
    } else if (node.choices && node.choices.length > 0) {
      this.renderChoices(node.choices);
    } else {
      if (node.triggerEvent) {
        this.triggerEvent(node.triggerEvent);
      }

      if (node.nextNode) {
        const nextIndex = this.currentDialogue.nodes.findIndex(n => n.id === node.nextNode);
        if (nextIndex >= 0) {
          this.currentNodeIndex = nextIndex;
          this.currentLineIndex = 0;
          this.showCurrentLine();
        } else {
          this.endDialogue();
        }
      } else {
        this.endDialogue();
      }
    }
  }

  // ─── Visual Novel Layout: Bottom-anchored Dialogue ─────────────────────────

  private renderLine(line: DialogueLine): void {
    if (!this.scene || !this.container) return;

    this.stopTypewriter();
    this.container.removeAll(true);

    const { width, height } = this.scene.cameras.main;
    const isNewSpeaker = line.speaker !== this.lastSpeaker;
    const isFirstLine = this.lastSpeaker === '';

    // ── Dark overlay ──
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, Colors.darkBg, 0.45);
    overlay.setInteractive();
    this.container.add(overlay);

    // ── Portrait detection ──
    const portraitKey = this.getSpeakerPortraitKey(line.speaker);
    const hasPortrait = portraitKey !== null && this.scene.textures.exists(portraitKey);

    // ── Portrait frame dimensions (sits BESIDE the dialogue box, not overlapping) ──
    let pfDisplayW = 0;
    let pfDisplayH = 0;
    if (hasPortrait) {
      if (this.scene.textures.exists('dlg_portrait_frame')) {
        const pfTex = this.scene.textures.get('dlg_portrait_frame').getSourceImage();
        const pfRatio = pfTex.width / pfTex.height;
        pfDisplayH = BOX_H + 80; // extends above the dialogue box
        pfDisplayW = Math.round(pfDisplayH * pfRatio);
      } else {
        pfDisplayW = 280;
        pfDisplayH = BOX_H + 80;
      }
    }

    // ── Layout: [portrait frame] [gap] [dialogue box] — all bottom-aligned ──
    const totalW = Math.min(1680, width * 0.88);
    const totalLeft = (width - totalW) / 2;
    const dlgBoxW = hasPortrait ? totalW - pfDisplayW - PORTRAIT_GAP : totalW;
    const dlgBoxLeft = hasPortrait ? totalLeft + pfDisplayW + PORTRAIT_GAP : totalLeft;
    const boxTop = height - BOX_H - BOX_BOTTOM_MARGIN;
    const boxCenterY = boxTop + BOX_H / 2;

    // ── Inner content bounds inside the dialogue box gold borders ──
    const borderX = Math.round(dlgBoxW * DLG_BOX_INSET_X);
    const borderY = Math.round(BOX_H * DLG_BOX_INSET_Y);
    const innerLeft = dlgBoxLeft + borderX;
    const innerRight = dlgBoxLeft + dlgBoxW - borderX;
    const innerTop = boxTop + borderY;
    const innerBottom = boxTop + BOX_H - borderY;

    // ══════════════════════════════════════════════════════════════════════════
    // LAYER ORDER (back → front):
    //   1. dlgBoxImage   – art deco frame for the dialogue area
    //   2. hitArea       – click-to-advance (BEFORE interactive elements)
    //   3. dialogueText  – typewriter text inside gold borders
    //   4. continueArrow – inside bottom border
    //   5. skipBtn       – inside top-right border, ABOVE hitArea
    //   6. portraitFrame – ornate frame (BEHIND portrait image)
    //   7. portraitImage – character portrait (ON TOP of frame)
    //   8. nameplate     – speaker name bg
    //   9. speakerText   – speaker name
    // ══════════════════════════════════════════════════════════════════════════

    // ── 1. Single dialogue box frame ──
    if (this.scene.textures.exists('dlg_box')) {
      const dlgBox = this.scene.add.image(
        dlgBoxLeft + dlgBoxW / 2, boxTop + BOX_H / 2, 'dlg_box'
      );
      dlgBox.setDisplaySize(dlgBoxW, BOX_H);
      this.container.add(dlgBox);
    } else {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0x0e0c14, 0.95);
      gfx.fillRoundedRect(dlgBoxLeft, boxTop, dlgBoxW, BOX_H, 8);
      gfx.lineStyle(3, Colors.gold, 0.6);
      gfx.strokeRoundedRect(dlgBoxLeft, boxTop, dlgBoxW, BOX_H, 8);
      this.container.add(gfx);
    }

    // ── 2. Click-to-advance (BEFORE skip so skip stays clickable) ──
    const hitArea = this.scene.add.rectangle(
      dlgBoxLeft + dlgBoxW / 2, boxCenterY, dlgBoxW, BOX_H, 0x000000, 0
    );
    hitArea.setInteractive({ cursor: POINTER_CURSOR });
    hitArea.on('pointerdown', () => this.advance());
    this.container.add(hitArea);
    overlay.on('pointerdown', () => this.advance());

    // ── 3. Skip button (top-right of inner area — gets its own reserved row) ──
    const skipRowH = 22; // height reserved for the skip label
    const skipX = innerRight - 4;
    const skipY = innerTop + 2;
    const skipBtn = this.scene.add.text(skipX, skipY, 'SKIP ▸▸', {
      fontFamily: FONT, fontSize: '14px', color: TextColors.goldDim, letterSpacing: 2,
    }).setOrigin(1, 0);
    skipBtn.setInteractive({ cursor: POINTER_CURSOR });
    skipBtn.on('pointerover', () => skipBtn.setColor(TextColors.gold));
    skipBtn.on('pointerout', () => skipBtn.setColor(TextColors.goldDim));
    skipBtn.on('pointerdown', () => this.skipToEnd());
    this.container.add(skipBtn);

    // ── 4. Dialogue text (below skip row, vertically balanced within remaining space) ──
    const textPadX = 8;
    const textLeft = innerLeft + textPadX;
    const textRight = innerRight - textPadX;
    const textW = textRight - textLeft;
    const textTop = innerTop + skipRowH;
    const textH = innerBottom - textTop;

    this.dialogueTextObj = this.scene.add.text(textLeft, textTop, '', {
      fontFamily: FONT,
      fontSize: TEXT_SIZE,
      color: TextColors.light,
      wordWrap: { width: textW },
      lineSpacing: 8,
    });
    // Destroy previous mask if re-rendering
    if (this.textMaskGfx) { this.textMaskGfx.destroy(); this.textMaskGfx = null; }
    this.textMaskGfx = this.scene.make.graphics({});
    this.textMaskGfx.fillRect(textLeft - 2, textTop - 2, textW + 4, textH + 4);
    this.dialogueTextObj.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.textMaskGfx));
    this.container.add(this.dialogueTextObj);

    this.fullLineText = line.text;
    this.startTypewriter();

    // ── 5. Continue arrow (inside bottom gold border area) ──
    const continueY = innerBottom + Math.round((boxTop + BOX_H - innerBottom) / 2);
    const continueX = innerRight - 4;
    if (this.scene.textures.exists('dlg_continue_arrow')) {
      const arrow = this.scene.add.image(continueX, continueY, 'dlg_continue_arrow');
      arrow.setDisplaySize(24, 24);
      this.scene.tweens.add({
        targets: arrow, y: { from: continueY - 3, to: continueY + 3 },
        alpha: { from: 1, to: 0.4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.container.add(arrow);
    } else {
      const arrow = this.scene.add.text(continueX, continueY, '▶', {
        fontFamily: FONT, fontSize: '20px', color: TextColors.goldDim,
      }).setOrigin(0.5);
      this.scene.tweens.add({
        targets: arrow, y: { from: continueY - 3, to: continueY + 3 },
        alpha: { from: 1, to: 0.4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.container.add(arrow);
    }

    // ── 6–7. Portrait frame BESIDE the dialogue box (frame behind, portrait on top) ──
    if (hasPortrait && portraitKey) {
      const pfCenterX = totalLeft + pfDisplayW / 2;
      const pfCenterY = boxTop + BOX_H - pfDisplayH / 2; // bottom-aligned with dialogue box

      const portraitGroup = this.scene.add.container(0, 0);

      // Frame FIRST (behind) — the frame PNG has an opaque dark center
      if (this.scene.textures.exists('dlg_portrait_frame')) {
        const frame = this.scene.add.image(pfCenterX, pfCenterY, 'dlg_portrait_frame');
        frame.setDisplaySize(pfDisplayW, pfDisplayH);
        portraitGroup.add(frame);
      } else {
        const frameGfx = this.scene.add.graphics();
        frameGfx.lineStyle(4, Colors.gold, 0.7);
        frameGfx.strokeRoundedRect(
          pfCenterX - pfDisplayW / 2, pfCenterY - pfDisplayH / 2,
          pfDisplayW, pfDisplayH, 6
        );
        portraitGroup.add(frameGfx);
      }

      // Portrait image ON TOP of frame — fills the inner opening
      const innerFW = pfDisplayW - FRAME_BORDER * 2;
      const innerFH = pfDisplayH - FRAME_BORDER * 2;
      const portrait = this.scene.add.image(pfCenterX, pfCenterY, portraitKey);
      const texW = portrait.width;
      const texH = portrait.height;
      const scaleToFill = Math.max(innerFW / texW, innerFH / texH);
      portrait.setScale(scaleToFill);
      const cropW = Math.round(innerFW / scaleToFill);
      const cropH = Math.round(innerFH / scaleToFill);
      const cropX = Math.round((texW - cropW) / 2);
      const cropY = Math.round((texH - cropH) / 2);
      portrait.setCrop(cropX, cropY, cropW, cropH);
      portraitGroup.add(portrait);

      this.container.add(portraitGroup);

      if (isNewSpeaker) {
        portraitGroup.setAlpha(0);
        portraitGroup.x = -60;
        this.scene.tweens.add({
          targets: portraitGroup, x: 0, alpha: 1, duration: 350, ease: 'Power2',
        });
      }
    }

    this.lastSpeaker = line.speaker;

    // ── 8–9. Speaker nameplate (below portrait if present, else centered above dialogue) ──
    const speakerColor = this.getSpeakerColor(line.speaker);
    const boxBottom = boxTop + BOX_H;
    const npH = 64;
    const nameplateCenterX = hasPortrait
      ? totalLeft + pfDisplayW / 2           // centered under portrait
      : dlgBoxLeft + dlgBoxW / 2;            // centered above dialogue box
    const nameplateY = hasPortrait
      ? boxBottom + NAMEPLATE_GAP + npH / 2  // below portrait/dialogue bottom
      : boxTop - 4;                          // above dialogue box (no portrait)

    // Size nameplate so text fits inside its gold borders
    const npInnerPad = 24;
    // The nameplate asset has a slightly heavier top ornament; nudge text
    // down by a couple of pixels so it sits at the visual center.
    const npTextOffsetY = 2;

    const speakerText = this.scene.add.text(nameplateCenterX, nameplateY + npTextOffsetY, line.speaker, {
      fontFamily: FONT,
      fontSize: SPEAKER_SIZE,
      color: speakerColor,
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5, 0.5);

    const npTextW = speakerText.width + npInnerPad * 2;
    const npW = Math.max(220, Math.round(npTextW / (1 - NP_INSET_X * 2)));

    if (this.scene.textures.exists('dlg_nameplate')) {
      const nameplate = this.scene.add.image(nameplateCenterX, nameplateY, 'dlg_nameplate');
      nameplate.setDisplaySize(npW, npH);
      nameplate.setOrigin(0.5);
      this.container.add(nameplate);
    } else {
      const npGfx = this.scene.add.graphics();
      npGfx.fillStyle(0x0e0c14, 0.9);
      npGfx.fillRoundedRect(nameplateCenterX - npW / 2, nameplateY - npH / 2, npW, npH, 4);
      const speakerHex = parseInt(speakerColor.replace('#', ''), 16);
      npGfx.lineStyle(2, speakerHex, 0.6);
      npGfx.strokeRoundedRect(nameplateCenterX - npW / 2, nameplateY - npH / 2, npW, npH, 4);
      this.container.add(npGfx);
    }

    if (isNewSpeaker) {
      speakerText.setAlpha(0);
      this.scene.tweens.add({
        targets: speakerText, alpha: 1,
        y: { from: nameplateY + 8, to: nameplateY },
        duration: 300, delay: 50, ease: 'Power2',
      });
    }
    this.container.add(speakerText);

    // ── Box entrance animation ──
    if (isFirstLine) {
      this.container.setAlpha(0);
      this.container.y = 30;
      this.scene.tweens.add({
        targets: this.container,
        y: 0,
        alpha: 1,
        duration: ANIM_DURATION,
        ease: 'Power2',
      });
    }
  }

  // ─── Typewriter Effect ────────────────────────────────────────────────────

  private startTypewriter(): void {
    if (!this.scene || !this.dialogueTextObj) return;

    this.isTyping = true;
    let charIndex = 0;

    this.typewriterTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_SPEED,
      repeat: this.fullLineText.length - 1,
      callback: () => {
        charIndex++;
        if (this.dialogueTextObj) {
          this.dialogueTextObj.setText(this.fullLineText.substring(0, charIndex));
        }
        if (charIndex >= this.fullLineText.length) {
          this.isTyping = false;
        }
      },
    });
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove(false);
      this.typewriterTimer = null;
    }
    this.isTyping = false;
  }

  private completeTypewriter(): void {
    this.stopTypewriter();
    if (this.dialogueTextObj) {
      this.dialogueTextObj.setText(this.fullLineText);
    }
  }

  // ─── Choice Rendering (Visual Novel Style) ───────────────────────────────

  private renderChoices(choices: DialogueChoice[]): void {
    if (!this.scene || !this.container) return;

    this.stopTypewriter();
    this.container.removeAll(true);

    const { width, height } = this.scene.cameras.main;
    const inventory = InventorySystem.getInstance();
    const save = SaveSystem.getInstance();

    // ── Dark overlay ──
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, Colors.darkBg, 0.55);
    overlay.setInteractive();
    this.container.add(overlay);

    // Filter choices
    const visibleChoices = choices.filter(choice => {
      if (choice.requiredFlag) {
        return save.getFlag(choice.requiredFlag) || this.triggeredEvents.has(choice.requiredFlag);
      }
      return true;
    });

    // Layout — centered on screen
    const choiceW = Math.min(1200, width * 0.65);

    // Helper: check if a choice (or its destination node) has already been triggered
    const isChoiceAsked = (choice: DialogueChoice): boolean => {
      // Check the choice's own triggerEvent
      if (choice.triggerEvent) {
        if (this.triggeredEvents.has(choice.triggerEvent) || save.getFlag(choice.triggerEvent)) return true;
      }
      // Also check the destination node's triggerEvent (e.g. phone call nodes)
      if (choice.nextNode && this.currentDialogue) {
        const destNode = this.currentDialogue.nodes.find(n => n.id === choice.nextNode);
        if (destNode?.triggerEvent) {
          if (this.triggeredEvents.has(destNode.triggerEvent) || save.getFlag(destNode.triggerEvent)) return true;
        }
      }
      return false;
    };

    // Sort: unasked questions first, already-asked (dimmed) at the bottom
    const sortedChoices = [...visibleChoices].sort((a, b) => {
      const aAsked = isChoiceAsked(a);
      const bAsked = isChoiceAsked(b);
      if (aAsked === bAsked) return 0;
      return aAsked ? 1 : -1;
    });

    const totalH = sortedChoices.length * (CHOICE_H + 15) - 15;
    const startY = height * 0.5 - totalH / 2;

    // Header text — must be in the container so it's cleaned up on next render
    const headerY = startY - 70;
    const header = this.scene.add.text(width / 2, headerY, 'What would you like to say?', {
      fontFamily: FONT,
      fontSize: '36px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.container.add(header);

    sortedChoices.forEach((choice, i) => {
      const itemAvailable = !choice.requiredItem || inventory.hasItem(choice.requiredItem);
      const alreadyAsked = isChoiceAsked(choice);
      const y = startY + i * (CHOICE_H + 15) + CHOICE_H / 2;

      // Choice button
      let btn: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

      if (this.scene!.textures.exists('dlg_choice_btn')) {
        btn = this.scene!.add.image(width / 2, y, 'dlg_choice_btn');
        // Stretch to full choice width so text always fits
        (btn as Phaser.GameObjects.Image).setDisplaySize(choiceW, CHOICE_H);
      } else {
        // Procedural fallback
        btn = this.scene!.add.rectangle(width / 2, y, choiceW, CHOICE_H, 0x0e0c14, 0.92);
        (btn as Phaser.GameObjects.Rectangle).setStrokeStyle(
          1.5, itemAvailable ? Colors.gold : 0x444444, itemAvailable ? 0.5 : 0.3
        );
      }

      let displayText = choice.text;
      if (choice.requiredItem && !itemAvailable) {
        displayText += ' (requires evidence)';
      } else if (alreadyAsked) {
        displayText = '✓  ' + displayText;
      }

      // Dim already-asked choices
      const textColor = !itemAvailable ? '#555555' : alreadyAsked ? '#8a7a5a' : TextColors.gold;

      // Text positioned inside the gold borders of choice-btn.png
      // The crown ornament at top takes ~20%, so offset text slightly below center
      const textInnerW = choiceW * (1 - CHOICE_INSET_X * 2) - 20;
      const textOffsetY = Math.round(CHOICE_H * (CHOICE_INSET_TOP - CHOICE_INSET_BOT) / 2);
      const text = this.scene!.add.text(width / 2, y + textOffsetY, displayText, {
        fontFamily: FONT,
        fontSize: CHOICE_FONT,
        color: textColor,
        wordWrap: { width: textInnerW },
        align: 'center',
      }).setOrigin(0.5);

      // Dim the button for already-asked choices
      if (alreadyAsked) {
        btn.setAlpha(0.5);
        text.setAlpha(0.7);
      }

      if (itemAvailable) {
        btn.setInteractive({ cursor: POINTER_CURSOR });

        // Store the base scales set by setDisplaySize so hover tweens are relative
        const baseBtnSX = btn.scaleX;
        const baseBtnSY = btn.scaleY;
        const baseTextSX = text.scaleX;
        const baseTextSY = text.scaleY;

        // Hover: subtle scale up + brighten
        btn.on('pointerover', () => {
          this.scene!.tweens.killTweensOf(btn);
          this.scene!.tweens.killTweensOf(text);
          this.scene!.tweens.add({
            targets: btn,
            scaleX: baseBtnSX * 1.03,
            scaleY: baseBtnSY * 1.03,
            duration: 150,
            ease: 'Back.easeOut',
          });
          this.scene!.tweens.add({
            targets: text,
            scaleX: baseTextSX * 1.03,
            scaleY: baseTextSY * 1.03,
            duration: 150,
            ease: 'Back.easeOut',
          });
          if (btn instanceof Phaser.GameObjects.Rectangle) {
            btn.setFillStyle(0x1a1a3e, 0.95);
            btn.setStrokeStyle(2, Colors.gold, 0.8);
          } else {
            btn.setTint(0xffeecc);
          }
          text.setColor('#ffe8a0');
        });

        btn.on('pointerout', () => {
          this.scene!.tweens.killTweensOf(btn);
          this.scene!.tweens.killTweensOf(text);
          this.scene!.tweens.add({
            targets: btn,
            scaleX: baseBtnSX,
            scaleY: baseBtnSY,
            duration: 200,
            ease: 'Back.easeOut',
          });
          this.scene!.tweens.add({
            targets: text,
            scaleX: baseTextSX,
            scaleY: baseTextSY,
            duration: 200,
            ease: 'Back.easeOut',
          });
          if (btn instanceof Phaser.GameObjects.Rectangle) {
            btn.setFillStyle(0x0e0c14, 0.92);
            btn.setStrokeStyle(1.5, Colors.gold, 0.5);
          } else {
            btn.clearTint();
          }
          text.setColor(TextColors.gold);
        });

        // Press: push animation then select
        btn.on('pointerdown', () => {
          this.scene!.tweens.add({
            targets: btn,
            scaleX: baseBtnSX * 0.97,
            scaleY: baseBtnSY * 0.97,
            duration: 60,
            ease: 'Power2',
            yoyo: true,
          });
          this.scene!.tweens.add({
            targets: text,
            scaleX: baseTextSX * 0.97,
            scaleY: baseTextSY * 0.97,
            duration: 60,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => this.selectChoice(choice),
          });
        });
      }

      this.container!.add([btn, text]);

      // Staggered entrance animation
      const targetBtnAlpha = alreadyAsked ? 0.5 : 1;
      const targetTextAlpha = alreadyAsked ? 0.7 : 1;
      btn.setAlpha(0);
      text.setAlpha(0);
      this.scene!.tweens.add({
        targets: btn,
        alpha: targetBtnAlpha,
        y: { from: y + 22, to: y },
        duration: 300,
        delay: i * 80,
        ease: 'Power2',
      });
      this.scene!.tweens.add({
        targets: text,
        alpha: targetTextAlpha,
        y: { from: y + 22, to: y },
        duration: 300,
        delay: i * 80,
        ease: 'Power2',
      });
    });
  }

  // ─── Speaker Data ─────────────────────────────────────────────────────────

  private getSpeakerPortraitKey(speaker: string): string | null {
    const portraitMap: Record<string, string> = {
      'Vivian': 'portrait_vivian',
      'Edwin': 'portrait_edwin',
      'Stella': 'portrait_stella',
      'Ashworth': 'portrait_ashworth',
      'Diego': 'portrait_diego',
    };
    return portraitMap[speaker] || null;
  }

  private getSpeakerColor(speaker: string): string {
    const colors: Record<string, string> = {
      'Nancy': TextColors.light,
      'Vivian': TextColors.vivian,
      'Edwin': TextColors.edwin,
      'Stella': TextColors.stella,
      'Diego': TextColors.diego,
      'Ashworth': TextColors.ashworth,
      'Bess': '#d4a0b4',
      'George': '#a0c9a0',
      'Carson Drew': '#c9b87b',
      'Ned': '#7bb5c9',
      'Receptionist': '#8a8a8a',
    };
    return colors[speaker] || TextColors.gold;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  private advance(): void {
    if (!this.currentDialogue) return;

    // If typewriter is still running, complete it instantly on first click
    if (this.isTyping) {
      this.completeTypewriter();
      return;
    }

    this.currentLineIndex++;
    this.showCurrentLine();
  }

  private skipToEnd(): void {
    if (!this.currentDialogue) return;

    const node = this.currentDialogue.nodes[this.currentNodeIndex];
    if (!node) return;

    this.stopTypewriter();
    this.currentLineIndex = node.lines.length;
    this.showCurrentLine();
  }

  private selectChoice(choice: DialogueChoice): void {
    if (!this.currentDialogue) return;

    if (choice.triggerEvent) {
      this.triggerEvent(choice.triggerEvent);
    }

    const nextIndex = this.currentDialogue.nodes.findIndex(n => n.id === choice.nextNode);
    if (nextIndex >= 0) {
      this.currentNodeIndex = nextIndex;
      this.currentLineIndex = 0;
      this.showCurrentLine();
    } else {
      this.endDialogue();
    }
  }

  private triggerEvent(eventId: string): void {
    this.triggeredEvents.add(eventId);
    const save = SaveSystem.getInstance();
    save.setFlag(eventId, true);
    const journalEntry = EVENT_JOURNAL_ENTRIES[eventId];
    if (journalEntry) {
      save.addJournalEntry(journalEntry);
    }
  }

  private endDialogue(): void {
    if (this.currentDialogue) {
      const node = this.currentDialogue.nodes[this.currentNodeIndex];
      if (node?.triggerEvent) {
        this.triggerEvent(node.triggerEvent);
      }
    }

    this.stopTypewriter();
    this.active = false;
    this.currentDialogue = null;
    this.lastSpeaker = '';

    // Exit animation: fade out and slide down
    if (this.container && this.scene) {
      const containerRef = this.container;
      this.scene.tweens.add({
        targets: containerRef,
        y: 20,
        alpha: 0,
        duration: 250,
        ease: 'Power2',
        onComplete: () => {
          containerRef.destroy();
        },
      });
      this.container = null;
      this.dialogueTextObj = null;
    } else {
      this.destroyUI();
    }
  }

  private destroyUI(): void {
    this.stopTypewriter();
    if (this.textMaskGfx) {
      this.textMaskGfx.destroy();
      this.textMaskGfx = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.dialogueTextObj = null;
  }

  hasTriggeredEvent(eventId: string): boolean {
    return this.triggeredEvents.has(eventId);
  }

  isActive(): boolean {
    return this.active;
  }

  toJSON(): { triggeredEvents: string[] } {
    return { triggeredEvents: [...this.triggeredEvents] };
  }

  loadFromJSON(data: { triggeredEvents: string[] }): void {
    this.triggeredEvents = new Set(data.triggeredEvents || []);
  }
}
