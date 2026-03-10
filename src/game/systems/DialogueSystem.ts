import Phaser from 'phaser';
import dialogueData from '../data/dialogue.json';
import { InventorySystem } from './InventorySystem';
import { SaveSystem } from './SaveSystem';

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
    this.container.setDepth(500);

    // Dim overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    overlay.setInteractive(); // block clicks through
    this.container.add(overlay);

    // Dialogue box
    const boxH = 180;
    const boxY = height - boxH / 2 - 20;
    const box = this.scene.add.rectangle(width / 2, boxY, width * 0.9, boxH, 0x0a0a1a, 0.95);
    box.setStrokeStyle(2, 0xc9a84c, 0.7);
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

    // Speaker name with color coding
    const speakerColor = this.getSpeakerColor(line.speaker);
    const speaker = this.scene.add.text(width * 0.1, boxY - 50, line.speaker, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: speakerColor,
      fontStyle: 'bold',
    });
    this.container.add(speaker);

    // Dialogue text
    const text = this.scene.add.text(width * 0.1, boxY - 20, line.text, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e0d5c0',
      wordWrap: { width: width * 0.8 },
      lineSpacing: 4,
    });
    this.container.add(text);

    // Tap/click to advance - large hit area
    const advanceBtn = this.scene.add.text(width * 0.85, boxY + 40, 'Continue ▸', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#8a7a5a',
    }).setOrigin(1, 0.5);
    advanceBtn.setInteractive({ useHandCursor: true });
    advanceBtn.on('pointerdown', () => this.advance());
    this.container.add(advanceBtn);

    // Skip button — fast-forward to choices or end of node
    const skipBtn = this.scene.add.text(width * 0.15, boxY + 40, '▸▸ Skip', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#5a5a5a',
    }).setOrigin(0, 0.5);
    skipBtn.setInteractive({ useHandCursor: true });
    skipBtn.on('pointerover', () => skipBtn.setColor('#8a7a5a'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#5a5a5a'));
    skipBtn.on('pointerdown', () => this.skipToEnd());
    this.container.add(skipBtn);

    // Also allow tapping the box area to advance
    const hitArea = this.scene.add.rectangle(width / 2, boxY, width * 0.9, 180, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
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

      const btn = this.scene!.add.rectangle(width / 2, y, width * 0.75, 38, 0x1a1a2e, 0.9);
      btn.setStrokeStyle(1, itemAvailable ? 0xc9a84c : 0x444444, 0.6);
      if (itemAvailable) btn.setInteractive({ useHandCursor: true });

      let displayText = choice.text;
      if (choice.requiredItem && !itemAvailable) {
        displayText += ' (requires evidence)';
      }

      const text = this.scene!.add.text(width / 2, y, displayText, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: itemAvailable ? '#c9a84c' : '#555555',
        wordWrap: { width: width * 0.7 },
      }).setOrigin(0.5);

      if (itemAvailable) {
        btn.on('pointerover', () => btn.setFillStyle(0x2a2a4e));
        btn.on('pointerout', () => btn.setFillStyle(0x1a1a2e, 0.9));
        btn.on('pointerdown', () => this.selectChoice(choice));
      }

      this.container!.add([btn, text]);
    });
  }

  private getSpeakerColor(speaker: string): string {
    const colors: Record<string, string> = {
      'Nancy': '#e0d5c0',
      'Vivian': '#b4a0d4',
      'Edwin': '#7ba3c9',
      'Stella': '#c9947b',
      'Diego': '#7bc98a',
      'Ashworth': '#c97b7b',
      'Bess': '#d4a0b4',
      'George': '#a0c9a0',
      'Carson Drew': '#c9b87b',
      'Receptionist': '#8a8a8a',
    };
    return colors[speaker] || '#c9a84c';
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
    SaveSystem.getInstance().setFlag(eventId, true);
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
