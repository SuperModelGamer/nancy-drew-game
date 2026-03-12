import Phaser from 'phaser';
import dialogueData from '../data/dialogue.json';
import { InventorySystem } from './InventorySystem';
import { SaveSystem } from './SaveSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { HAND_CURSOR } from '../utils/cursors';

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
};

export class DialogueSystem {
  private static instance: DialogueSystem;
  private active = false;
  private currentDialogue: Dialogue | null = null;
  private currentNodeIndex = 0;
  private currentLineIndex = 0;
  private scene: Phaser.Scene | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private triggeredEvents: Set<string> = new Set();

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

    this.showDialogueUI();
    this.showCurrentLine();
  }

  private showDialogueUI(): void {
    if (!this.scene) return;

    this.destroyUI();

    const { width, height } = this.scene.cameras.main;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(Depths.dialogueBox);

    // Dim overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, Colors.darkBg, 0.5);
    overlay.setInteractive(); // block clicks through
    this.container.add(overlay);

    // Dialogue box
    const boxH = 180;
    const boxY = height - boxH / 2 - 20;
    const box = this.scene.add.rectangle(width / 2, boxY, width * 0.9, boxH, Colors.panelBg, 0.95);
    box.setStrokeStyle(2, Colors.gold, 0.7);
    this.container.add(box);
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
      // Filter choices by requiredItem and requiredFlag
      this.renderChoices(node.choices);
    } else {
      // Trigger node-level events before advancing
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

  private renderLine(line: DialogueLine): void {
    if (!this.scene || !this.container) return;

    // Remove old text elements (keep overlay and box)
    while (this.container.length > 2) {
      this.container.removeAt(2, true);
    }

    const { width, height } = this.scene.cameras.main;
    const boxY = height - 110;

    // Portrait image (if available for this speaker)
    const portraitKey = this.getSpeakerPortraitKey(line.speaker);
    const portraitSize = 64;
    let textOffsetX = width * 0.1;

    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      const portraitX = width * 0.08;
      const portraitY = boxY - 20;
      textOffsetX = width * 0.16;

      const portrait = this.scene.add.image(portraitX, portraitY, portraitKey);
      portrait.setDisplaySize(portraitSize, portraitSize);
      const maskGraphics = this.scene.make.graphics({});
      maskGraphics.fillCircle(portraitX, portraitY, portraitSize / 2);
      portrait.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, maskGraphics));
      const speakerColorHex = parseInt(this.getSpeakerColor(line.speaker).replace('#', ''), 16);
      const ring = this.scene.add.ellipse(portraitX, portraitY, portraitSize + 4, portraitSize + 4)
        .setStrokeStyle(2, speakerColorHex, 0.8)
        .setFillStyle(0x000000, 0);
      this.container.add([portrait, ring]);
    }

    // Speaker name with color coding
    const speakerColor = this.getSpeakerColor(line.speaker);
    const speaker = this.scene.add.text(textOffsetX, boxY - 50, line.speaker, {
      fontFamily: FONT,
      fontSize: '18px',
      color: speakerColor,
      fontStyle: 'bold',
    });
    this.container.add(speaker);

    // Dialogue text
    const textWidth = portraitKey && this.scene.textures.exists(portraitKey) ? width * 0.72 : width * 0.8;
    const text = this.scene.add.text(textOffsetX, boxY - 20, line.text, {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.light,
      wordWrap: { width: textWidth },
      lineSpacing: 4,
    });
    this.container.add(text);

    // Tap/click to advance - large hit area
    const advanceBtn = this.scene.add.text(width * 0.85, boxY + 40, 'Continue ▸', {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.goldDim,
    }).setOrigin(1, 0.5);
    advanceBtn.setInteractive({ cursor: HAND_CURSOR });
    advanceBtn.on('pointerdown', () => this.advance());
    this.container.add(advanceBtn);

    // Skip button — fast-forward to choices or end of node
    const skipBtn = this.scene.add.text(width * 0.15, boxY + 40, '▸▸ Skip', {
      fontFamily: FONT,
      fontSize: '13px',
      color: TextColors.muted,
    }).setOrigin(0, 0.5);
    skipBtn.setInteractive({ cursor: HAND_CURSOR });
    skipBtn.on('pointerover', () => skipBtn.setColor(TextColors.goldDim));
    skipBtn.on('pointerout', () => skipBtn.setColor(TextColors.muted));
    skipBtn.on('pointerdown', () => this.skipToEnd());
    this.container.add(skipBtn);

    // Also allow tapping the box area to advance
    const hitArea = this.scene.add.rectangle(width / 2, boxY, width * 0.9, 180, Colors.darkBg, 0);
    hitArea.setInteractive({ cursor: HAND_CURSOR });
    hitArea.on('pointerdown', () => this.advance());
    this.container.add(hitArea);
  }

  private renderChoices(choices: DialogueChoice[]): void {
    if (!this.scene || !this.container) return;

    while (this.container.length > 2) {
      this.container.removeAt(2, true);
    }

    const { width, height } = this.scene.cameras.main;
    const inventory = InventorySystem.getInstance();
    const save = SaveSystem.getInstance();

    // Filter out choices whose requiredFlag is not met (hide them entirely if flag-gated)
    // But show requiredItem choices as grayed out so player knows they need something
    const visibleChoices = choices.filter(choice => {
      if (choice.requiredFlag) {
        return save.getFlag(choice.requiredFlag) || this.triggeredEvents.has(choice.requiredFlag);
      }
      return true;
    });

    // Calculate layout
    const choiceHeight = 42;
    const totalHeight = visibleChoices.length * choiceHeight;
    const boxY = height - 20 - 90; // center of dialogue box
    const startY = boxY - totalHeight / 2 + choiceHeight / 2;

    visibleChoices.forEach((choice, i) => {
      const itemAvailable = !choice.requiredItem || inventory.hasItem(choice.requiredItem);
      const y = startY + i * choiceHeight;

      const btn = this.scene!.add.rectangle(width / 2, y, width * 0.75, 38, Colors.sceneBg, 0.9);
      btn.setStrokeStyle(1, itemAvailable ? Colors.gold : 0x444444, 0.6);
      if (itemAvailable) btn.setInteractive({ cursor: HAND_CURSOR });

      let displayText = choice.text;
      if (choice.requiredItem && !itemAvailable) {
        displayText += ' (requires evidence)';
      }

      const text = this.scene!.add.text(width / 2, y, displayText, {
        fontFamily: FONT,
        fontSize: '14px',
        color: itemAvailable ? TextColors.gold : '#555555',
        wordWrap: { width: width * 0.7 },
      }).setOrigin(0.5);

      if (itemAvailable) {
        btn.on('pointerover', () => btn.setFillStyle(Colors.hoverBg));
        btn.on('pointerout', () => btn.setFillStyle(Colors.sceneBg, 0.9));
        btn.on('pointerdown', () => this.selectChoice(choice));
      }

      this.container!.add([btn, text]);
    });
  }

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
      'Receptionist': '#8a8a8a',
    };
    return colors[speaker] || TextColors.gold;
  }

  private advance(): void {
    if (!this.currentDialogue) return;

    this.currentLineIndex++;
    this.showCurrentLine();
  }

  private skipToEnd(): void {
    if (!this.currentDialogue) return;

    const node = this.currentDialogue.nodes[this.currentNodeIndex];
    if (!node) return;

    // Skip to choices (if node has them) or to the end of the node
    if (node.choices && node.choices.length > 0) {
      this.currentLineIndex = node.lines.length;
      this.showCurrentLine();
    } else {
      // Skip entire node — trigger events and advance
      this.currentLineIndex = node.lines.length;
      this.showCurrentLine();
    }
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
    // Also set as a SaveSystem flag for persistence and cross-system access
    const save = SaveSystem.getInstance();
    save.setFlag(eventId, true);
    // Write journal entry if one is defined for this event
    const journalEntry = EVENT_JOURNAL_ENTRIES[eventId];
    if (journalEntry) {
      save.addJournalEntry(journalEntry);
    }
  }

  private endDialogue(): void {
    // Check if the last node has a triggerEvent
    if (this.currentDialogue) {
      const node = this.currentDialogue.nodes[this.currentNodeIndex];
      if (node?.triggerEvent) {
        this.triggerEvent(node.triggerEvent);
      }
    }

    this.active = false;
    this.currentDialogue = null;
    this.destroyUI();
  }

  private destroyUI(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
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
