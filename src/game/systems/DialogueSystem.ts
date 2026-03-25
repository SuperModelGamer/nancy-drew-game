import Phaser from 'phaser';
import dialogueData from '../data/dialogue.json';
import { InventorySystem } from './InventorySystem';
import { SaveSystem } from './SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { HAND_CURSOR, POINTER_CURSOR } from '../utils/cursors';
import { UISounds } from '../utils/sounds';

interface DialogueLine {
  speaker: string;
  text: string;
  /** Optional voiceover audio key (loaded in BootScene, e.g. "vo_vivian_intro_01") */
  vo?: string;
}

interface DialogueChoice {
  text: string;
  nextNode: string;
  requiredItem?: string;
  requiredFlag?: string;
  triggerEvent?: string;
  vo?: string;
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
  passage_mapped: 'Mapped the hidden passage network — a route from the basement to the dressing room, completely concealed behind the walls. Edwin could move through the building unseen, staging ghost appearances from any angle.',
};

// Forward-looking "Nancy's thinking" hints — added AFTER the event entry to guide the player
const EVENT_THINKING_HINTS: Record<string, string> = {
  vivian_intro: 'Thinking: Vivian mentioned Edwin in the auditorium and Stella backstage. I should talk to both of them — and check the concierge desk for that master key.',
  learned_about_margaux: 'Thinking: Margaux died from poison in a prop goblet during The Crimson Veil. I should ask Edwin about the play — he\'s the theater historian.',
  learned_about_ashworth: 'Thinking: Everyone has a motive to stop the demolition. I should talk to the others before confronting Ashworth.',
  learned_about_crimson_veil: 'Thinking: The Crimson Veil\'s final act mirrors Margaux\'s death. Stella would know how the stage effects work — she manages everything backstage.',
  learned_about_cecilia: 'Thinking: Cecilia Drake was the understudy who took over after Margaux died. I should ask Edwin about her — he\'s researched the 1928 case for years.',
  learned_about_hale_family: 'Thinking: Edwin\'s grandfather was Margaux\'s lover. That\'s why he\'s so obsessed with this theater. I should confront Edwin about the Hale connection.',
  effects_manual_location: 'Thinking: There\'s an effects manual backstage that explains the theater\'s hidden mechanisms. I should find it — it could explain how the ghost is being staged.',
  annotated_script_found: 'Thinking: The circled letters in the script margins might spell something. I should study them carefully — or ask Diego, he noticed them first.',
  heard_basement_noises: 'Thinking: Mechanical sounds from under the stage at night. Someone is operating the old theater systems. I need to find a way into that basement.',
  learned_about_missing_props: 'Thinking: Props going missing — is it theft, or is someone trying to cover their tracks? I should look for evidence of where they went.',
  stella_confession: 'Thinking: Stella says Edwin has been in the basement. The key is behind the backstage lighting panel. I need to find it.',
  basement_key_location: 'Thinking: The basement key is behind the lighting panel backstage. Once I have it, I can finally see what Edwin\'s been doing down there.',
  called_dad: 'Thinking: Dad said proving a historical crime triggers emergency heritage review. If I can prove Margaux was murdered, I might be able to save the theater. I should call the Historical Society.',
  ashworth_motive_revealed: 'Thinking: $2.3 million in demolition insurance. Ashworth has the biggest financial motive of anyone. But would he poison himself as a cover?',
  catwalk_access: 'Thinking: Stella unlocked the catwalk ladder. Edwin spends time up there — I should check it for clues about the ghost staging.',
  cipher_discussed: 'Thinking: G-O-B-L-E-T. The goblet was the murder weapon in 1928. Someone coded a confession into the script margins almost a century ago.',
  edwin_personal_revealed: 'Thinking: Edwin\'s been carrying his grandfather\'s promise for decades. He has the knowledge and the motive to stage a ghost. I need proof — the basement is the key.',
  passage_mapped: 'Thinking: The hidden passage connects the basement to the dressing room. Edwin could move through the building unseen — that\'s how he staged everything. Now I need to confront him with the evidence.',
};

// ─── Layout Constants ───────────────────────────────────────────────────────
// Sized for classic Nancy Drew proportions: large portrait, substantial
// dialogue box, readable text. Portrait occupies ~40% of screen height.
const MIN_BOX_H = 280;   // minimum box height — keeps dialogue box substantial
const MAX_BOX_H = 380;   // maximum box height (long paragraphs)
const BOX_BOTTOM_MARGIN = 140;  // keeps box + portrait above the viewfinder frame border
const TEXT_SIZE = '28px';
const SPEAKER_SIZE = '32px';
const CHOICE_H = 110;
const CHOICE_FONT = '26px';
const TYPEWRITER_SPEED_DEFAULT = 28; // ms per character (fallback)
const ANIM_DURATION = 400; // ms for box entrance/exit
const PORTRAIT_GAP = 20;   // gap between portrait frame and dialogue box
const PORTRAIT_H = 440;    // fixed portrait frame height — large and prominent like classic ND
const FRAME_BORDER = 18;   // portrait frame gold border thickness (matches ~18px asset border)

// Gold border insets — fractions of the DISPLAYED asset size.
// Both dialogue-box.png and nameplate.png have thin symmetric gold border
// lines with four-pointed star ornaments at each corner.
const DLG_BOX_INSET_X = 0.12;   // dialogue-box.png: corner star tips
const DLG_BOX_INSET_Y = 0.14;   // dialogue-box.png: gold border + parallel accent lines
const NP_INSET_X = 0.11;        // nameplate.png: corner ornaments
const NP_INSET_Y = 0.18;        // nameplate.png: gold borders (bottom is thicker)
const NP_TEXT_OFFSET_Y = -3;     // nudge nameplate text up — bottom border is heavier than top
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

  // VO playback state
  private currentVO: Phaser.Sound.BaseSound | null = null;

  // Track current speaker for entrance animations
  private lastSpeaker = '';
  // Last NPC portrait key — shown dimmed when Nancy speaks
  private lastPortraitKey: string | null = null;
  // Whether current dialogue has ANY speaker with a portrait (for stable layout)
  private dialogueHasPortraits = false;
  // Whether the portrait has already been shown (slide-in only on first appearance)
  private portraitShownThisDialogue = false;
  // Nodes visited during current dialogue — choices leading here are hidden
  private visitedNodes: Set<string> = new Set();

  static getInstance(): DialogueSystem {
    if (!DialogueSystem.instance) {
      DialogueSystem.instance = new DialogueSystem();
    }
    return DialogueSystem.instance;
  }

  startDialogue(dialogueId: string, scene: Phaser.Scene): void {
    const dialogues = dialogueData.dialogues as Dialogue[];

    // Three-tier dialogue routing: base → revisit → done
    // 1. If character arc is complete, use _done variant (brief dismissal)
    // 2. If base dialogue was completed, use _revisit variant (with gated choices)
    // 3. Otherwise, use base dialogue (first conversation)
    let effectiveId = dialogueId;
    if (this.triggeredEvents.has(dialogueId) || SaveSystem.getInstance().getFlag(dialogueId)) {
      const doneId = `${dialogueId}_done`;
      const revisitId = `${dialogueId}_revisit`;
      const doneDialogue = dialogues.find(d => d.id === doneId);

      // Check if the _done variant exists and its gate condition is met
      if (doneDialogue && this.isDoneConditionMet(doneId)) {
        effectiveId = doneId;
      } else if (dialogues.find(d => d.id === revisitId)) {
        effectiveId = revisitId;
      }
    }

    const dialogue = dialogues.find(d => d.id === effectiveId);
    if (!dialogue) return;

    this.currentDialogue = dialogue;
    this.currentNodeIndex = 0;
    this.currentLineIndex = 0;
    this.active = true;
    this.scene = scene;
    this.lastSpeaker = '';

    // Pre-scan: does ANY speaker in this dialogue have a portrait?
    // Used to keep layout stable (always reserve portrait space if so)
    this.dialogueHasPortraits = dialogue.nodes.some(node =>
      node.lines.some(l => this.getSpeakerPortraitKey(l.speaker) !== null)
    );

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

    // Check if we've already seen this node before marking it visited
    const alreadySeenNode = this.visitedNodes.has(node.id);

    // Track this node as visited so choices leading here are hidden on return
    this.visitedNodes.add(node.id);
    // Also persist across sessions so choices don't reappear on revisit
    // Skip hub nodes (like "start") that the player loops back to for more choices
    if (this.currentDialogue && node.id !== 'start') {
      const persistKey = `visited_${this.currentDialogue.id}_${node.id}`;
      if (!this.triggeredEvents.has(persistKey)) {
        this.triggeredEvents.add(persistKey);
      }
    }

    // If returning to a hub node we've already seen, skip its intro lines and go straight to choices
    if (alreadySeenNode && this.currentLineIndex === 0 && node.choices && node.choices.length > 0) {
      if (node.triggerEvent) {
        this.triggerEvent(node.triggerEvent);
      }
      this.renderChoices(node.choices);
    } else if (this.currentLineIndex < node.lines.length) {
      const line = node.lines[this.currentLineIndex];
      this.renderLine(line);
    } else if (node.choices && node.choices.length > 0) {
      // Fire triggerEvent after all lines are shown, even if choices follow
      if (node.triggerEvent) {
        this.triggerEvent(node.triggerEvent);
      }
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

    const { width, height } = this.scene.cameras.main.worldView;
    const isNewSpeaker = line.speaker !== this.lastSpeaker;
    const isFirstLine = this.lastSpeaker === '';

    // ── Dark overlay ──
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, Colors.darkBg, 0.45);
    overlay.setInteractive();
    this.container.add(overlay);

    // ── Portrait detection ──
    const portraitKey = this.getSpeakerPortraitKey(line.speaker);
    const hasPortrait = portraitKey !== null && this.scene.textures.exists(portraitKey);
    // Reserve portrait space if ANY speaker in this dialogue has a portrait,
    // even on lines from speakers without one (keeps layout stable)
    const reservePortraitSpace = this.dialogueHasPortraits;

    // ── Determine portrait frame dimensions (sits BESIDE the dialogue box) ──
    let pfRatio = 0.72; // fallback aspect ratio
    if (this.scene.textures.exists('dlg_portrait_frame')) {
      const pfTex = this.scene.textures.get('dlg_portrait_frame').getSourceImage();
      pfRatio = pfTex.width / pfTex.height;
    }

    // ── Horizontal layout: [portrait frame] [gap] [dialogue box] ──
    const totalW = Math.min(1680, width * 0.88);
    const totalLeft = (width - totalW) / 2;
    // Portrait is a fixed size — doesn't scale with dynamic box height
    const pfDisplayW = reservePortraitSpace ? Math.round(PORTRAIT_H * pfRatio) : 0;
    const dlgBoxW = reservePortraitSpace ? totalW - pfDisplayW - PORTRAIT_GAP : totalW;
    const dlgBoxLeft = reservePortraitSpace ? totalLeft + pfDisplayW + PORTRAIT_GAP : totalLeft;

    // ── Measure text to determine content-aware box height ──
    const textPadX = 22;
    const textPadY = 16;
    const borderXPx = Math.round(dlgBoxW * DLG_BOX_INSET_X);
    const measuredTextW = dlgBoxW - borderXPx * 2 - textPadX * 2;
    const measureText = this.scene.add.text(0, 0, line.text, {
      fontFamily: FONT, fontSize: TEXT_SIZE, wordWrap: { width: measuredTextW }, lineSpacing: 8,
    });
    const measuredTextH = measureText.height;
    measureText.destroy();

    // Content-aware box height: text + padding + border insets
    const borderYFrac = DLG_BOX_INSET_Y;
    const neededInner = measuredTextH + textPadY * 2;
    const neededBox = Math.round(neededInner / (1 - borderYFrac * 2));
    const boxH = Phaser.Math.Clamp(neededBox, MIN_BOX_H, MAX_BOX_H);

    // ── Vertical positioning (anchored to bottom margin) ──
    const boxTop = height - boxH - BOX_BOTTOM_MARGIN;
    const boxCenterY = boxTop + boxH / 2;
    const borderY = Math.round(boxH * DLG_BOX_INSET_Y);
    const innerLeft = dlgBoxLeft + borderXPx;
    const innerRight = dlgBoxLeft + dlgBoxW - borderXPx;
    const innerTop = boxTop + borderY;
    const innerBottom = boxTop + boxH - borderY;

    // Portrait frame is a fixed size, bottom-aligned with dialogue box
    const pfDisplayH = reservePortraitSpace ? PORTRAIT_H : 0;

    // ── 1. Dialogue box frame ──
    if (this.scene.textures.exists('dlg_box')) {
      const dlgBox = this.scene.add.image(
        dlgBoxLeft + dlgBoxW / 2, boxTop + boxH / 2, 'dlg_box'
      );
      dlgBox.setDisplaySize(dlgBoxW, boxH);
      this.container.add(dlgBox);
    } else {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0x0e0c14, 0.95);
      gfx.fillRoundedRect(dlgBoxLeft, boxTop, dlgBoxW, boxH, 8);
      gfx.lineStyle(3, Colors.gold, 0.6);
      gfx.strokeRoundedRect(dlgBoxLeft, boxTop, dlgBoxW, boxH, 8);
      this.container.add(gfx);
    }

    // ── 2. Click-to-advance ──
    const hitArea = this.scene.add.rectangle(
      dlgBoxLeft + dlgBoxW / 2, boxCenterY, dlgBoxW, boxH, 0x000000, 0
    );
    hitArea.setInteractive({ cursor: POINTER_CURSOR });
    hitArea.on('pointerdown', () => this.advance());
    this.container.add(hitArea);
    overlay.on('pointerdown', () => this.advance());

    // ── 3. Skip button (in top-right border area) ──
    const skipX = innerRight;
    const skipY = boxTop + borderY / 2;
    const skipBtn = this.scene.add.text(skipX, skipY, 'SKIP ▸▸', {
      fontFamily: FONT, fontSize: '13px', color: '#1a1a1a', letterSpacing: 2,
      shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 4, fill: true },
    }).setOrigin(1, 0.5);
    skipBtn.setInteractive({ cursor: POINTER_CURSOR });
    skipBtn.on('pointerover', () => skipBtn.setColor('#333333'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#1a1a1a'));
    skipBtn.on('pointerdown', () => this.skipToEnd());
    this.container.add(skipBtn);

    // ── 4. Dialogue text (top-left aligned, full inner area) ──
    const textLeft = innerLeft + textPadX;
    const textRight = innerRight - textPadX;
    const textW = textRight - textLeft;
    const textTop = innerTop + textPadY;
    const textH = innerBottom - innerTop - textPadY * 2;

    this.dialogueTextObj = this.scene.add.text(textLeft, textTop, '', {
      fontFamily: FONT,
      fontSize: TEXT_SIZE,
      color: TextColors.light,
      wordWrap: { width: textW },
      lineSpacing: 8,
    }).setOrigin(0, 0);
    // Destroy previous mask if re-rendering
    if (this.textMaskGfx) { this.textMaskGfx.destroy(); this.textMaskGfx = null; }
    this.textMaskGfx = this.scene.make.graphics({});
    this.textMaskGfx.fillRect(textLeft - 2, textTop - 2, textW + 4, textH + 4);
    this.dialogueTextObj.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.textMaskGfx));
    this.container.add(this.dialogueTextObj);

    this.fullLineText = line.text;
    this.startTypewriter();

    // ── 4b. Voiceover playback ──
    // If this line has a vo key, stop any current VO and start the new one.
    // If no vo key, let the previous VO keep playing (supports one audio file
    // spanning multiple displayed text lines).
    if (line.vo) {
      this.stopVO();
      if (this.scene.cache.audio.exists(line.vo)) {
        try {
          this.currentVO = this.scene.sound.add(line.vo, { volume: UISounds.getVolume() * 0.9 });
          this.currentVO.play();
        } catch { /* VO optional — silently skip */ }
      }
    }

    // ── 5. Continue arrow (inside bottom border area) ──
    const continueY = innerBottom + Math.round((boxTop + boxH - innerBottom) / 2);
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

    // ── 6–7. Portrait frame BESIDE the dialogue box ──
    // Show the NPC portrait when they speak (full brightness).
    // When Nancy speaks, dim the last NPC portrait to keep the frame filled.
    const showPortraitKey = hasPortrait ? portraitKey : this.lastPortraitKey;
    const isDimmed = !hasPortrait && showPortraitKey !== null; // Nancy speaking → dim NPC

    if (reservePortraitSpace && showPortraitKey && this.scene.textures.exists(showPortraitKey)) {
      const pfCenterX = totalLeft + pfDisplayW / 2;
      const pfCenterY = boxTop + boxH - pfDisplayH / 2; // bottom-aligned with dialogue box

      const portraitGroup = this.scene.add.container(0, 0);

      // Portrait image sits inside the frame opening. Add it first so the
      // decorative frame can render on top and actually frame the portrait.
      const innerFW = pfDisplayW - FRAME_BORDER * 2;
      const innerFH = pfDisplayH - FRAME_BORDER * 2;
      const portrait = this.scene.add.image(pfCenterX, pfCenterY, showPortraitKey);
      const texW = portrait.width;
      const texH = portrait.height;
      const scaleToFill = Math.max(innerFW / texW, innerFH / texH);
      portrait.setScale(scaleToFill);
      const cropW = Math.round(innerFW / scaleToFill);
      const cropH = Math.round(innerFH / scaleToFill);
      const cropX = Math.round((texW - cropW) / 2);
      const cropY = Math.round((texH - cropH) / 2);
      portrait.setCrop(cropX, cropY, cropW, cropH);

      // Dim portrait when Nancy is speaking
      if (isDimmed) {
        portrait.setTint(0x888888);
        portraitGroup.setAlpha(0.5);
      }

      portraitGroup.add(portrait);

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

      this.container.add(portraitGroup);

      if (!this.portraitShownThisDialogue && !isDimmed) {
        // First appearance — slide in from the left
        this.portraitShownThisDialogue = true;
        portraitGroup.setAlpha(0);
        portraitGroup.x = -60;
        this.scene.tweens.add({
          targets: portraitGroup, x: 0, alpha: 1, duration: 350, ease: 'Power2',
        });
      } else if (isNewSpeaker && !isDimmed) {
        // Returning NPC speaker — just fade back to full brightness
        portraitGroup.setAlpha(0.5);
        this.scene.tweens.add({
          targets: portraitGroup, alpha: 1, duration: 250, ease: 'Sine.easeOut',
        });
      } else if (isNewSpeaker && isDimmed) {
        // Nancy speaking — fade to dimmed state
        portraitGroup.setAlpha(0.8);
        this.scene.tweens.add({
          targets: portraitGroup, alpha: 0.5, duration: 300, ease: 'Sine.easeOut',
        });
      }
    }

    // Track the last NPC portrait for dimming when Nancy speaks
    if (hasPortrait && portraitKey) {
      this.lastPortraitKey = portraitKey;
    }
    this.lastSpeaker = line.speaker;

    // ── 8–9. Speaker nameplate (overlaid on portrait bottom, or centered above dialogue) ──
    const speakerColor = this.getSpeakerColor(line.speaker);
    const boxBottom = boxTop + boxH;
    const npH = 56;
    const nameplateCenterX = hasPortrait
      ? totalLeft + pfDisplayW / 2           // centered under portrait
      : dlgBoxLeft + dlgBoxW / 2;            // centered above dialogue box
    const nameplateY = hasPortrait
      ? boxBottom - npH / 2 - 10             // overlaid on portrait's bottom edge
      : boxTop - 4;                          // above dialogue box (no portrait)

    // Size nameplate so text fits inside its gold borders
    const npInnerPad = 24;

    const speakerText = this.scene.add.text(nameplateCenterX, nameplateY + NP_TEXT_OFFSET_Y, line.speaker, {
      fontFamily: FONT,
      fontSize: SPEAKER_SIZE,
      color: speakerColor,
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5, 0.5);

    // Scale nameplate height to fit text inside the gold border insets
    const npTextH = speakerText.height;
    const npInnerH = npTextH + 12; // text + small vertical padding
    const npHFinal = Math.max(npH, Math.round(npInnerH / (1 - NP_INSET_Y * 2)));
    const npTextW = speakerText.width + npInnerPad * 2;
    const npW = Math.max(220, Math.round(npTextW / (1 - NP_INSET_X * 2)));

    if (this.scene.textures.exists('dlg_nameplate')) {
      const nameplate = this.scene.add.image(nameplateCenterX, nameplateY, 'dlg_nameplate');
      nameplate.setDisplaySize(npW, npHFinal);
      nameplate.setOrigin(0.5);
      this.container.add(nameplate);
    } else {
      const npGfx = this.scene.add.graphics();
      npGfx.fillStyle(0x0e0c14, 0.9);
      npGfx.fillRoundedRect(nameplateCenterX - npW / 2, nameplateY - npHFinal / 2, npW, npHFinal, 4);
      const speakerHex = parseInt(speakerColor.replace('#', ''), 16);
      npGfx.lineStyle(2, speakerHex, 0.6);
      npGfx.strokeRoundedRect(nameplateCenterX - npW / 2, nameplateY - npHFinal / 2, npW, npHFinal, 4);
      this.container.add(npGfx);
    }

    if (isNewSpeaker) {
      speakerText.setAlpha(0);
      this.scene.tweens.add({
        targets: speakerText, alpha: 1,
        y: { from: nameplateY + NP_TEXT_OFFSET_Y + 8, to: nameplateY + NP_TEXT_OFFSET_Y },
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

    const speed = UISounds.getTextSpeedMs();

    // Instant mode — show full text immediately
    if (speed <= 0) {
      this.dialogueTextObj.setText(this.fullLineText);
      this.isTyping = false;
      return;
    }

    this.isTyping = true;
    let charIndex = 0;

    this.typewriterTimer = this.scene.time.addEvent({
      delay: speed,
      repeat: this.fullLineText.length - 1,
      callback: () => {
        charIndex++;
        if (this.dialogueTextObj) {
          this.dialogueTextObj.setText(this.fullLineText.substring(0, charIndex));
          // Play soft tick on non-space characters for typewriter feel
          if (this.fullLineText[charIndex - 1] !== ' ' && charIndex % 3 === 0) {
            UISounds.dialogueTick();
          }
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

  /** Stop any currently playing voiceover audio. */
  private stopVO(): void {
    if (this.currentVO) {
      try { this.currentVO.destroy(); } catch { /* ok */ }
      this.currentVO = null;
    }
  }

  // ─── Choice Rendering (Visual Novel Style) ───────────────────────────────

  private renderChoices(choices: DialogueChoice[]): void {
    if (!this.scene || !this.container) return;

    this.stopTypewriter();
    this.container.removeAll(true);

    const { width, height } = this.scene.cameras.main.worldView;
    const inventory = InventorySystem.getInstance();
    const save = SaveSystem.getInstance();

    // ── Dark overlay ──
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, Colors.darkBg, 0.55);
    overlay.setInteractive();
    this.container.add(overlay);

    // Categorize choices: consumed (hide), gated (show locked), available (show normally)
    // Exit choices (farewell nodes) are never consumed — always available as escape
    const isExitChoice = (choice: DialogueChoice): boolean => {
      return choice.nextNode === 'farewell';
    };

    const isConsumed = (choice: DialogueChoice): boolean => {
      // Exit choices are never consumed
      if (isExitChoice(choice)) return false;
      // Already visited this session
      if (choice.nextNode && this.visitedNodes.has(choice.nextNode)) return true;
      // Persisted from previous sessions
      if (choice.nextNode && this.currentDialogue) {
        const persistKey = `visited_${this.currentDialogue.id}_${choice.nextNode}`;
        if (this.triggeredEvents.has(persistKey)) return true;
        const destNode = this.currentDialogue.nodes.find(n => n.id === choice.nextNode);
        if (destNode?.triggerEvent) {
          if (this.triggeredEvents.has(destNode.triggerEvent) || save.getFlag(destNode.triggerEvent)) return true;
        }
      }
      if (choice.triggerEvent) {
        if (this.triggeredEvents.has(choice.triggerEvent) || save.getFlag(choice.triggerEvent)) return true;
      }
      return false;
    };

    const isGatedByFlag = (choice: DialogueChoice): boolean => {
      if (!choice.requiredFlag) return false;
      return !save.getFlag(choice.requiredFlag) && !this.triggeredEvents.has(choice.requiredFlag);
    };

    const isGatedByItem = (choice: DialogueChoice): boolean => {
      if (!choice.requiredItem) return false;
      return !inventory.hasItem(choice.requiredItem);
    };

    const isLocked = (choice: DialogueChoice): boolean => {
      return isGatedByFlag(choice) || isGatedByItem(choice);
    };

    // Filter out consumed choices AND locked/gated choices (hidden until unlocked)
    const displayChoices = choices.filter(choice => !isConsumed(choice) && !isLocked(choice));

    // If no choices remain, end dialogue
    if (displayChoices.length === 0) {
      this.endDialogue();
      return;
    }

    // Layout — centered on screen
    const choiceW = Math.min(1200, width * 0.65);

    const totalH = displayChoices.length * (CHOICE_H + 15) - 15;
    const startY = height * 0.5 - totalH / 2;

    // Header text
    const headerY = startY - 70;
    const header = this.scene.add.text(width / 2, headerY, 'What would you like to say?', {
      fontFamily: FONT,
      fontSize: '36px',
      color: TextColors.goldDim,
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.container.add(header);

    displayChoices.forEach((choice, i) => {
      const y = startY + i * (CHOICE_H + 15) + CHOICE_H / 2;

      // Choice button — all displayed choices are fully available
      let btn: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

      if (this.scene!.textures.exists('dlg_choice_btn')) {
        btn = this.scene!.add.image(width / 2, y, 'dlg_choice_btn');
        (btn as Phaser.GameObjects.Image).setDisplaySize(choiceW, CHOICE_H);
      } else {
        btn = this.scene!.add.rectangle(width / 2, y, choiceW, CHOICE_H, 0x0e0c14, 0.92);
        (btn as Phaser.GameObjects.Rectangle).setStrokeStyle(1.5, Colors.gold, 0.5);
      }

      const displayText = choice.text;

      // Bright, clearly readable text for all available choices
      const textColor = '#e8d5a3';

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

      {
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
          text.setColor('#e8d5a3');
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

      // Staggered entrance animation — all choices fully visible
      btn.setAlpha(0);
      text.setAlpha(0);
      this.scene!.tweens.add({
        targets: btn,
        alpha: 1,
        y: { from: y + 22, to: y },
        duration: 300,
        delay: i * 80,
        ease: 'Power2',
      });
      this.scene!.tweens.add({
        targets: text,
        alpha: 1,
        y: { from: y + 22, to: y },
        duration: 300,
        delay: i * 80,
        ease: 'Power2',
      });
    });
  }

  /** Returns the last NPC speaker name (for defaulting suspect dossier tab). */
  getLastSpeaker(): string {
    return this.lastSpeaker;
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

    const advance = () => {
      if (!this.currentDialogue) return;
      const nextIndex = this.currentDialogue.nodes.findIndex(n => n.id === choice.nextNode);
      if (nextIndex >= 0) {
        this.currentNodeIndex = nextIndex;
        this.currentLineIndex = 0;
        this.showCurrentLine();
      } else {
        this.endDialogue();
      }
    };

    // Play choice VO if available, then advance after it finishes
    if (choice.vo && this.scene && this.scene.cache.audio.exists(choice.vo)) {
      this.stopVO();
      try {
        this.currentVO = this.scene.sound.add(choice.vo, { volume: UISounds.getVolume() * 0.9 });
        this.currentVO.play();
        this.currentVO.once('complete', advance);
      } catch {
        advance();
      }
    } else {
      advance();
    }
  }

  private triggerEvent(eventId: string): void {
    if (this.triggeredEvents.has(eventId)) return; // already fired this session
    this.triggeredEvents.add(eventId);
    const save = SaveSystem.getInstance();
    save.setFlag(eventId, true);
    const journalEntry = EVENT_JOURNAL_ENTRIES[eventId];
    if (journalEntry) {
      save.addJournalEntry(journalEntry);
    }
    const thinkingHint = EVENT_THINKING_HINTS[eventId];
    if (thinkingHint) {
      save.addJournalEntry(thinkingHint);
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
    this.stopVO();
    this.active = false;
    this.currentDialogue = null;
    this.lastSpeaker = '';
    this.lastPortraitKey = null;
    this.dialogueHasPortraits = false;
    this.portraitShownThisDialogue = false;
    this.visitedNodes.clear();

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

  // Maps _done dialogue IDs to the flag that indicates the character's arc is complete.
  // When this flag is set, the brief dismissal dialogue plays instead of the full revisit.
  private static DONE_CONDITIONS: Record<string, string> = {
    'vivian_intro_done': 'vivian_full_trust',       // Done after earning Vivian's full trust through key evidence
    'edwin_auditorium_done': 'edwin_personal_revealed', // Done after grandfather revelation
    'stella_backstage_done': 'basement_key_location',   // Done after revealing basement key
    'diego_booth_done': 'cipher_discussed',              // Done after cipher solved
    'ashworth_office_done': 'ashworth_motive_revealed',  // Done after insurance confrontation
    'phone_calls_done': 'called_ned',                    // Done after last gated call made
  };

  private isDoneConditionMet(doneId: string): boolean {
    const flag = DialogueSystem.DONE_CONDITIONS[doneId];
    if (!flag) return false;
    return this.triggeredEvents.has(flag) || !!SaveSystem.getInstance().getFlag(flag);
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
