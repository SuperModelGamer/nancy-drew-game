import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';

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
  private tabElements: { bg: Phaser.GameObjects.Rectangle; indicator: Phaser.GameObjects.Rectangle }[] = [];

  constructor() {
    super({ key: 'SuspectScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Overlay
    createOverlay(this, 0.85, Depths.suspectOverlay);

    this.container = this.add.container(0, 0);
    this.container.setDepth(Depths.suspectContent);

    // ─── Main dossier panel (case-file look) ───
    const panelW = Math.min(width * 0.92, 900);
    const panelH = Math.min(height * 0.88, 650);
    const panelX = width / 2;
    const panelY = height / 2;

    // Outer panel — dark with gold border
    const outerBg = this.add.rectangle(panelX, panelY, panelW, panelH, Colors.panelBg, 0.97);
    outerBg.setStrokeStyle(2, Colors.gold, 0.5);
    this.container.add(outerBg);

    // Header strip
    const headerH = 50;
    const headerY = panelY - panelH / 2 + headerH / 2;
    const headerBg = this.add.rectangle(panelX, headerY, panelW - 4, headerH, 0x15152a, 1);
    this.container.add(headerBg);

    // Title with decorative elements
    const titleText = this.add.text(panelX, headerY, 'CASE FILE — SUSPECT DOSSIERS', {
      fontFamily: FONT,
      fontSize: '16px',
      color: TextColors.gold,
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.container.add(titleText);

    // Decorative lines flanking title
    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1, Colors.gold, 0.3);
    const titleW = 220;
    lineGfx.lineBetween(panelX - panelW / 2 + 20, headerY, panelX - titleW, headerY);
    lineGfx.lineBetween(panelX + titleW, headerY, panelX + panelW / 2 - 20, headerY);
    this.container.add(lineGfx);

    // Close button
    const closeBtn = createCloseButton(this, panelX + panelW / 2 - 25, headerY, () => this.scene.stop(), '22px');
    closeBtn.setDepth(Depths.suspectContent);

    // ─── Suspect tabs (left sidebar style) ───
    const tabW = 160;
    const tabStartX = panelX - panelW / 2 + tabW / 2 + 12;
    const tabStartY = panelY - panelH / 2 + headerH + 15;
    const tabH = 90;
    const tabSpacing = tabH + 8;

    this.tabElements = [];

    SUSPECTS.forEach((suspect, i) => {
      const ty = tabStartY + i * tabSpacing + tabH / 2;
      const isSelected = i === this.selectedIndex;

      // Tab background
      const tabBg = this.add.rectangle(tabStartX, ty, tabW, tabH,
        isSelected ? 0x1a1a3a : Colors.sceneBg, isSelected ? 1 : 0.7);
      tabBg.setStrokeStyle(isSelected ? 2 : 1, suspect.color, isSelected ? 0.8 : 0.25);
      tabBg.setInteractive({ useHandCursor: true });

      // Active indicator — colored bar on left edge
      const indicator = this.add.rectangle(
        tabStartX - tabW / 2 + 2, ty, 4, tabH - 4,
        suspect.color, isSelected ? 1 : 0
      );

      // Portrait (small, in the tab)
      const portraitKey = `portrait_${suspect.id}`;
      const portraitX = tabStartX - tabW / 2 + 30;
      if (this.textures.exists(portraitKey)) {
        const portrait = this.add.image(portraitX, ty, portraitKey);
        portrait.setDisplaySize(40, 40);
        const maskGfx = this.make.graphics({});
        maskGfx.fillCircle(portraitX, ty, 20);
        portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));
        const ring = this.add.ellipse(portraitX, ty, 42, 42)
          .setStrokeStyle(isSelected ? 2 : 1.5, suspect.color, isSelected ? 0.9 : 0.5)
          .setFillStyle(0x000000, 0);
        this.container.add([portrait, ring]);
      } else {
        const iconCircle = this.add.ellipse(portraitX, ty, 40, 40, suspect.color, 0.2);
        const iconText = this.add.text(portraitX, ty, suspect.icon, {
          fontFamily: FONT, fontSize: '20px', color: TextColors.white, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add([iconCircle, iconText]);
      }

      // Name (first name only in tab)
      const firstName = suspect.name.split(' ')[0];
      const tabName = this.add.text(tabStartX + 10, ty - 12, firstName, {
        fontFamily: FONT,
        fontSize: isSelected ? '14px' : '13px',
        color: isSelected ? TextColors.light : TextColors.goldDim,
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);

      // Role beneath name
      const tabRole = this.add.text(tabStartX + 10, ty + 8, suspect.role, {
        fontFamily: FONT,
        fontSize: '10px',
        color: isSelected ? `#${suspect.color.toString(16).padStart(6, '0')}` : TextColors.muted,
        fontStyle: 'italic',
      }).setOrigin(0, 0.5);

      // Discovery badge
      const save = SaveSystem.getInstance();
      const dialogue = DialogueSystem.getInstance();
      const discovered = suspect.facts.filter(f =>
        !f.requiresFlag || save.getFlag(f.requiresFlag) || dialogue.hasTriggeredEvent(f.requiresFlag)
      ).length;
      const badgeText = this.add.text(tabStartX + tabW / 2 - 14, ty + tabH / 2 - 10,
        `${discovered}/${suspect.facts.length}`, {
          fontFamily: FONT, fontSize: '9px', color: TextColors.muted,
        }).setOrigin(1, 1);

      this.container.add([tabBg, indicator, tabName, tabRole, badgeText]);
      this.tabElements.push({ bg: tabBg, indicator });

      // Tab click handler
      tabBg.on('pointerdown', () => {
        this.selectedIndex = i;
        this.refreshSelection();
        this.showSuspectDetail(suspect);
      });
      tabBg.on('pointerover', () => {
        if (i !== this.selectedIndex) tabBg.setFillStyle(Colors.hoverBg, 0.8);
      });
      tabBg.on('pointerout', () => {
        if (i !== this.selectedIndex) tabBg.setFillStyle(Colors.sceneBg, 0.7);
      });
    });

    // ─── Detail panel area (right side) ───
    const detailX = panelX - panelW / 2 + tabW + 30 + (panelW - tabW - 40) / 2;
    const detailY = panelY + headerH / 2;
    this.detailPanel = this.add.container(detailX, detailY);
    this.detailPanel.setDepth(Depths.suspectContent);
    this.showSuspectDetail(SUSPECTS[this.selectedIndex]);

    // Fade in
    this.container.setAlpha(0);
    this.tweens.add({ targets: this.container, alpha: 1, duration: 250 });
    this.detailPanel.setAlpha(0);
    this.tweens.add({ targets: this.detailPanel, alpha: 1, duration: 250, delay: 50 });
  }

  private refreshSelection(): void {
    SUSPECTS.forEach((suspect, i) => {
      const isSelected = i === this.selectedIndex;
      const tab = this.tabElements[i];
      tab.bg.setFillStyle(isSelected ? 0x1a1a3a : Colors.sceneBg, isSelected ? 1 : 0.7);
      tab.bg.setStrokeStyle(isSelected ? 2 : 1, suspect.color, isSelected ? 0.8 : 0.25);
      tab.indicator.setAlpha(isSelected ? 1 : 0);
    });
  }

  private showSuspectDetail(suspect: SuspectProfile): void {
    this.detailPanel.removeAll(true);

    const { width, height } = this.cameras.main;
    const panelW = Math.min(width * 0.92, 900);
    const tabW = 160;
    const detailW = panelW - tabW - 50;
    const detailH = Math.min(height * 0.88, 650) - 80;

    // Detail background
    const detailBg = this.add.rectangle(0, 0, detailW, detailH, 0x0e0e1e, 0.6);
    detailBg.setStrokeStyle(1, suspect.color, 0.2);
    this.detailPanel.add(detailBg);

    // ─── Header section ───
    const headerY = -detailH / 2 + 20;
    const hasPortrait = this.textures.exists(`portrait_${suspect.id}`);

    // Large portrait
    const portraitSize = 90;
    const portraitX = -detailW / 2 + 25 + portraitSize / 2;
    if (hasPortrait) {
      const portrait = this.add.image(portraitX, headerY + portraitSize / 2, `portrait_${suspect.id}`);
      portrait.setDisplaySize(portraitSize, portraitSize);
      const maskGfx = this.make.graphics({});
      maskGfx.fillRoundedRect(
        portraitX - portraitSize / 2, headerY, portraitSize, portraitSize, 8
      );
      portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));

      // Border frame
      const frame = this.add.graphics();
      frame.lineStyle(2, suspect.color, 0.7);
      frame.strokeRoundedRect(
        portraitX - portraitSize / 2, headerY, portraitSize, portraitSize, 8
      );
      this.detailPanel.add([portrait, frame]);
    }

    // Name & metadata (right of portrait)
    const textX = hasPortrait ? portraitX + portraitSize / 2 + 20 : -detailW / 2 + 25;
    const colorHex = `#${suspect.color.toString(16).padStart(6, '0')}`;

    this.detailPanel.add(this.add.text(textX, headerY + 8, suspect.name, {
      fontFamily: FONT,
      fontSize: '22px',
      color: colorHex,
      fontStyle: 'bold',
    }));

    this.detailPanel.add(this.add.text(textX, headerY + 36, suspect.role, {
      fontFamily: FONT,
      fontSize: '14px',
      color: TextColors.light,
      fontStyle: 'italic',
    }));

    // Info chips
    const chipY = headerY + 60;
    const chips = [
      { label: `Age: ${suspect.age}`, icon: '◈' },
      { label: suspect.location, icon: '◉' },
    ];
    let chipX = textX;
    chips.forEach(chip => {
      const chipBg = this.add.rectangle(chipX + 45, chipY, 100, 22, suspect.color, 0.1);
      chipBg.setStrokeStyle(1, suspect.color, 0.3);
      chipBg.setOrigin(0, 0.5);
      const chipLabel = this.add.text(chipX + 50, chipY, `${chip.icon} ${chip.label}`, {
        fontFamily: FONT, fontSize: '10px', color: TextColors.goldDim,
      }).setOrigin(0, 0.5);
      this.detailPanel.add([chipBg, chipLabel]);
      chipX += 115;
    });

    // ─── Divider ───
    const dividerY = headerY + portraitSize + 15;
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, suspect.color, 0.3);
    divGfx.lineBetween(-detailW / 2 + 20, dividerY, detailW / 2 - 20, dividerY);
    // Small diamond accent at center
    divGfx.fillStyle(suspect.color, 0.5);
    divGfx.fillRect(-3, dividerY - 3, 6, 6);
    this.detailPanel.add(divGfx);

    // ─── Known Facts section ───
    const factsStartY = dividerY + 20;
    this.detailPanel.add(this.add.text(-detailW / 2 + 25, factsStartY, 'KNOWN FACTS', {
      fontFamily: FONT,
      fontSize: '12px',
      color: TextColors.gold,
      fontStyle: 'bold',
      letterSpacing: 2,
    }));

    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();
    let y = factsStartY + 28;

    let discoveredCount = 0;
    suspect.facts.forEach((fact, idx) => {
      const unlocked = !fact.requiresFlag ||
        save.getFlag(fact.requiresFlag) ||
        dialogue.hasTriggeredEvent(fact.requiresFlag);

      if (unlocked) discoveredCount++;

      // Fact row with subtle alternating background
      if (idx % 2 === 0) {
        const rowBg = this.add.rectangle(0, y + 8, detailW - 40, 28, suspect.color, 0.03);
        this.detailPanel.add(rowBg);
      }

      // Bullet icon
      const bulletColor = unlocked ? colorHex : TextColors.hidden;
      const bullet = unlocked ? '◆' : '◇';
      this.detailPanel.add(this.add.text(-detailW / 2 + 30, y, bullet, {
        fontFamily: FONT, fontSize: '12px', color: bulletColor,
      }));

      // Fact text
      const factColor = unlocked ? TextColors.light : TextColors.hidden;
      const displayText = unlocked ? fact.text : '— Undiscovered —';
      const factText = this.add.text(-detailW / 2 + 50, y, displayText, {
        fontFamily: FONT,
        fontSize: '13px',
        color: factColor,
        fontStyle: unlocked ? 'normal' : 'italic',
        wordWrap: { width: detailW - 80 },
        lineSpacing: 2,
      });
      this.detailPanel.add(factText);
      y += Math.max(factText.height + 10, 28);
    });

    // ─── Progress bar at bottom ───
    const progressY = detailH / 2 - 25;
    const progressW = detailW - 50;
    const progressH = 6;
    const totalFacts = suspect.facts.length;
    const pct = discoveredCount / totalFacts;

    // Track background
    const trackBg = this.add.rectangle(0, progressY, progressW, progressH, 0x1a1a2e, 1);
    trackBg.setStrokeStyle(1, suspect.color, 0.2);
    this.detailPanel.add(trackBg);

    // Fill bar
    const fillW = progressW * pct;
    if (fillW > 0) {
      const fill = this.add.rectangle(
        -progressW / 2 + fillW / 2, progressY,
        fillW, progressH, suspect.color, 0.6
      );
      this.detailPanel.add(fill);
    }

    // Label
    this.detailPanel.add(this.add.text(
      detailW / 2 - 25, progressY - 12,
      `${discoveredCount}/${totalFacts} facts discovered`, {
        fontFamily: FONT, fontSize: '10px', color: TextColors.muted, fontStyle: 'italic',
      }).setOrigin(1, 0.5));
  }
}
