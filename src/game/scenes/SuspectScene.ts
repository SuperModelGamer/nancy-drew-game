import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';

interface SuspectProfile {
  id: string;
  name: string;
  role: string;
  age: string;
  location: string;
  icon: string;
  color: number;
  facts: SuspectFact[];
}

interface SuspectFact {
  text: string;
  requiresFlag?: string;
}

const SUSPECTS: SuspectProfile[] = [
  {
    id: 'vivian',
    name: 'Vivian Delacroix',
    role: 'Retired Actress',
    age: '70s',
    location: 'Grand Lobby',
    icon: 'V',
    color: 0xb4a0d4,
    facts: [
      { text: 'Margaux Fontaine\'s goddaughter. Has lived in the Monarch her whole life.' },
      { text: 'Wants to save the theater from demolition.' },
      { text: 'She recognized Cecilia Drake\'s initials — "C.D."', requiresFlag: 'learned_about_cecilia' },
      { text: 'The locket in the trunk contained her childhood photo.', requiresFlag: 'vivian_full_trust' },
      { text: 'Vivian\'s connection to Margaux is deeper than she initially let on.', requiresFlag: 'learned_about_hale_family' },
    ],
  },
  {
    id: 'edwin',
    name: 'Edwin Hale',
    role: 'Theater Historian',
    age: '50s',
    location: 'Auditorium',
    icon: 'E',
    color: 0x7ba3c9,
    facts: [
      { text: 'Has been studying the Monarch for 15 years. Sits in seat G-12 regularly.' },
      { text: 'Knows the Crimson Veil in detail — lighting cues, blocking, everything.', requiresFlag: 'learned_about_crimson_veil' },
      { text: 'His grandfather James Hale was Margaux\'s lover.', requiresFlag: 'learned_about_hale_family' },
      { text: 'Stella identified him as the person using the basement.', requiresFlag: 'stella_confession' },
      { text: 'HE IS THE GHOST. Confessed to staging hauntings and poisoning Ashworth.', requiresFlag: 'edwin_personal_revealed' },
    ],
  },
  {
    id: 'ashworth',
    name: 'Roland Ashworth',
    role: 'Developer',
    age: '40s',
    location: 'Manager\'s Office',
    icon: 'R',
    color: 0xc97b7b,
    facts: [
      { text: 'Owns the Monarch. Plans to demolish it in 72 hours for condominiums.' },
      { text: 'Was poisoned and collapsed. Recovering in his office.', requiresFlag: 'learned_about_ashworth' },
      { text: 'Saw someone watching him as he collapsed.', requiresFlag: 'saw_figure_before_collapse' },
      { text: 'Found someone living in the basement two weeks ago.', requiresFlag: 'learned_about_basement_intruder' },
      { text: 'Rejected $800K sale; demolition insurance pays $2.3M.', requiresFlag: 'ashworth_motive_revealed' },
    ],
  },
  {
    id: 'stella',
    name: 'Stella Morrow',
    role: 'Stage Manager',
    age: '30s',
    location: 'Backstage',
    icon: 'S',
    color: 0xc9947b,
    facts: [
      { text: 'Stage manager for 8 years. Knows every inch of the building.' },
      { text: 'Has been selling theater props — $4,200 worth.', requiresFlag: 'learned_about_missing_props' },
      { text: 'Selling props to pay her mother\'s medical bills ($3,800/month).', requiresFlag: 'stella_confession' },
      { text: 'Left a threatening note to the basement intruder.', requiresFlag: 'basement_key_location' },
      { text: 'Knows where the basement key is hidden. Told Nancy.', requiresFlag: 'basement_key_location' },
    ],
  },
  {
    id: 'diego',
    name: 'Diego Reyes',
    role: 'Playwright',
    age: '20s',
    location: 'Projection Booth',
    icon: 'D',
    color: 0x7bc98a,
    facts: [
      { text: 'Renting the projection booth as a writing studio.' },
      { text: 'Found the annotated script with coded margin notes.', requiresFlag: 'annotated_script_found' },
      { text: 'Has heard a woman\'s voice reciting lines at night from the stage.', requiresFlag: 'heard_basement_noises' },
      { text: 'Recognized the cipher spells "goblet" — the murder weapon.', requiresFlag: 'cipher_discussed' },
    ],
  },
];

export class SuspectScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private detailPanel!: Phaser.GameObjects.Container;
  private selectedIndex = 0;

  constructor() {
    super({ key: 'SuspectScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setInteractive();
    overlay.setDepth(380);

    this.container = this.add.container(0, 0);
    this.container.setDepth(381);

    // Title
    this.add.text(width / 2, 40, 'Suspect Profiles', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#c9a84c',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(381);

    // Close button
    const closeBtn = this.add.text(width - 40, 30, '✕', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#8a7a5a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(381);
    closeBtn.on('pointerdown', () => this.scene.stop());
    closeBtn.on('pointerover', () => closeBtn.setColor('#c9a84c'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#8a7a5a'));

    // Suspect cards across the top
    const cardWidth = 140;
    const spacing = 160;
    const startX = width / 2 - (SUSPECTS.length - 1) * spacing / 2;

    SUSPECTS.forEach((suspect, i) => {
      const x = startX + i * spacing;
      const y = 130;

      // Card background
      const card = this.add.rectangle(x, y, cardWidth, 100, 0x1a1a2e, 0.95);
      card.setStrokeStyle(i === this.selectedIndex ? 2 : 1, suspect.color, i === this.selectedIndex ? 0.9 : 0.4);
      card.setInteractive({ useHandCursor: true });

      // Icon circle
      const iconCircle = this.add.ellipse(x, y - 20, 40, 40, suspect.color, 0.3);
      const iconText = this.add.text(x, y - 20, suspect.icon, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Name
      const name = this.add.text(x, y + 20, suspect.name.split(' ')[0], {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#e0d5c0',
      }).setOrigin(0.5);

      // Role
      const role = this.add.text(x, y + 38, suspect.role, {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#8a7a5a',
        fontStyle: 'italic',
      }).setOrigin(0.5);

      card.on('pointerdown', () => {
        this.selectedIndex = i;
        this.showSuspectDetail(suspect);
        // Refresh card borders
        this.scene.restart();
      });

      card.on('pointerover', () => card.setFillStyle(0x2a2a4e));
      card.on('pointerout', () => card.setFillStyle(0x1a1a2e, 0.95));

      this.container.add([card, iconCircle, iconText, name, role]);
    });

    // Show first suspect's detail
    this.detailPanel = this.add.container(width / 2, height / 2 + 80);
    this.detailPanel.setDepth(381);
    this.showSuspectDetail(SUSPECTS[this.selectedIndex]);
  }

  private showSuspectDetail(suspect: SuspectProfile): void {
    this.detailPanel.removeAll(true);

    const { width } = this.cameras.main;
    const panelW = Math.min(width * 0.85, 700);
    const panelH = 350;

    // Background
    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0a0a1a, 0.97);
    bg.setStrokeStyle(2, suspect.color, 0.6);
    this.detailPanel.add(bg);

    // Name & details header
    this.detailPanel.add(this.add.text(0, -panelH / 2 + 25, suspect.name, {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: `#${suspect.color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
    }).setOrigin(0.5));

    this.detailPanel.add(this.add.text(0, -panelH / 2 + 52, `${suspect.role} — ${suspect.age} — ${suspect.location}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#8a7a5a',
      fontStyle: 'italic',
    }).setOrigin(0.5));

    // Divider
    this.detailPanel.add(this.add.rectangle(0, -panelH / 2 + 72, panelW - 60, 1, suspect.color, 0.3));

    // Known facts
    this.detailPanel.add(this.add.text(-panelW / 2 + 30, -panelH / 2 + 85, 'Known Facts:', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#c9a84c',
      fontStyle: 'bold',
    }));

    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();
    let y = -panelH / 2 + 110;

    suspect.facts.forEach(fact => {
      const unlocked = !fact.requiresFlag ||
        save.getFlag(fact.requiresFlag) ||
        dialogue.hasTriggeredEvent(fact.requiresFlag);

      const bullet = unlocked ? '◆' : '◇';
      const color = unlocked ? '#e0d5c0' : '#3a3a4a';
      const displayText = unlocked ? fact.text : '[Undiscovered]';

      const text = this.add.text(-panelW / 2 + 30, y, `${bullet} ${displayText}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color,
        wordWrap: { width: panelW - 70 },
        lineSpacing: 2,
      });
      this.detailPanel.add(text);
      y += text.height + 8;
    });

    // Discovery progress
    const totalFacts = suspect.facts.length;
    const discoveredFacts = suspect.facts.filter(f =>
      !f.requiresFlag || save.getFlag(f.requiresFlag) || dialogue.hasTriggeredEvent(f.requiresFlag)
    ).length;

    this.detailPanel.add(this.add.text(panelW / 2 - 30, panelH / 2 - 25, `${discoveredFacts}/${totalFacts} discovered`, {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#5a5a5a',
      fontStyle: 'italic',
    }).setOrigin(1, 0.5));
  }
}
