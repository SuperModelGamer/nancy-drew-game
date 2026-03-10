import Phaser from 'phaser';
import dialogueData from '../data/dialogue.json';
import { InventorySystem } from './InventorySystem';

interface DialogueLine {
  speaker: string;
  text: string;
}

interface DialogueChoice {
  text: string;
  nextNode: string;
  requiredItem?: string;
  triggerEvent?: string;
}

interface DialogueNode {
  id: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  nextNode?: string;
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
      this.renderChoices(node.choices);
    } else if (node.nextNode) {
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

  private renderLine(line: DialogueLine): void {
    if (!this.scene || !this.container) return;

    // Remove old text elements (keep overlay and box)
    while (this.container.length > 2) {
      this.container.removeAt(2, true);
    }

    const { width, height } = this.scene.cameras.main;
    const boxY = height - 110;

    // Speaker name
    const speaker = this.scene.add.text(width * 0.1, boxY - 50, line.speaker, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c9a84c',
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
    const boxY = height - 110;
    const inventory = InventorySystem.getInstance();

    choices.forEach((choice, i) => {
      const available = !choice.requiredItem || inventory.hasItem(choice.requiredItem);
      const y = boxY - 40 + i * 45;

      const btn = this.scene!.add.rectangle(width / 2, y, width * 0.75, 38, 0x1a1a2e, 0.9);
      btn.setStrokeStyle(1, available ? 0xc9a84c : 0x444444, 0.6);
      if (available) btn.setInteractive({ useHandCursor: true });

      const text = this.scene!.add.text(width / 2, y, choice.text, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: available ? '#c9a84c' : '#555555',
      }).setOrigin(0.5);

      if (available) {
        btn.on('pointerover', () => btn.setFillStyle(0x2a2a4e));
        btn.on('pointerout', () => btn.setFillStyle(0x1a1a2e, 0.9));
        btn.on('pointerdown', () => this.selectChoice(choice));
      }

      this.container!.add([btn, text]);
    });
  }

  private advance(): void {
    if (!this.currentDialogue) return;

    this.currentLineIndex++;
    this.showCurrentLine();
  }

  private selectChoice(choice: DialogueChoice): void {
    if (!this.currentDialogue) return;

    if (choice.triggerEvent) {
      this.triggeredEvents.add(choice.triggerEvent);
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

  private endDialogue(): void {
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
