import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { drawArtDecoFrame, drawDecoDivider, DecoColors, DecoTextColors } from '../utils/art-deco';

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

// Canvas is 1920×1080. Toolbar is 96px at bottom.
const TOOLBAR_H = 96;

export class SuspectScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private selectedIndex = 0;

  constructor() {
    super({ key: 'SuspectScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Full-screen dark overlay
    createOverlay(this, 0.88, Depths.suspectOverlay);
    initSceneCursor(this);

    this.container = this.add.container(0, 0);
    this.container.setDepth(Depths.suspectContent);

    // ─── Main panel ───
    const panelW = Math.min(1650, width - 48);
    const panelH = height - TOOLBAR_H - 36;
    const panelX = width / 2;
    const panelY = panelH / 2 + 12;

    // Background — art deco framed dossier
    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;
    const decoFrame = drawArtDecoFrame(this, panelLeft, panelTop, panelW, panelH, {
      color: DecoColors.gold,
      alpha: 0.4,
      cornerSize: 32,
      doubleBorder: true,
      fillColor: DecoColors.navyMid,
      fillAlpha: 0.97,
    });
    this.container.add(decoFrame);

    // ─── Header bar ───
    const headerH = 72;
    const headerY = panelY - panelH / 2 + headerH / 2;

    const headerBg = this.add.rectangle(panelX, headerY, panelW - 8, headerH, DecoColors.navy, 1);
    this.container.add(headerBg);

    // Header bottom border
    const headerLine = this.add.graphics();
    headerLine.lineStyle(1, DecoColors.gold, 0.3);
    headerLine.lineBetween(panelLeft + 4, panelTop + headerH, panelLeft + panelW - 4, panelTop + headerH);
    this.container.add(headerLine);

    const title = this.add.text(panelX, headerY, 'CASE FILE — SUSPECT DOSSIERS', {
      fontFamily: FONT,
      fontSize: '24px',
      color: DecoTextColors.goldBright,
      fontStyle: 'bold',
      letterSpacing: 5,
    }).setOrigin(0.5);
    this.container.add(title);

    // Decorative divider flanking title
    const divGfxHeader = this.add.graphics();
    drawDecoDivider(divGfxHeader, panelX, headerY, panelW * 0.6, DecoColors.gold, 0.25);
    this.container.add(divGfxHeader);

    // Close button
    const closeBtn = createCloseButton(this, panelX + panelW / 2 - 33, headerY, () => this.scene.stop(), 66);
    closeBtn.setDepth(Depths.suspectContent);

    // ─── Suspect tabs (horizontal strip below header) ───
    const tabStripY = headerY + headerH / 2 + 60;
    const tabW = 285;
    const tabGap = 18;
    const totalTabsW = SUSPECTS.length * tabW + (SUSPECTS.length - 1) * tabGap;
    const tabStartX = panelX - totalTabsW / 2 + tabW / 2;

    SUSPECTS.forEach((suspect, i) => {
      const tx = tabStartX + i * (tabW + tabGap);
      const isSelected = i === this.selectedIndex;
      const colorHex = `#${suspect.color.toString(16).padStart(6, '0')}`;

      // Tab card
      const tabBg = this.add.rectangle(tx, tabStripY, tabW, 81,
        isSelected ? 0x1e1d2e : 0x15141e, isSelected ? 1 : 0.85);
      tabBg.setStrokeStyle(isSelected ? 2 : 1, suspect.color, isSelected ? 0.7 : 0.2);
      tabBg.setInteractive({ cursor: POINTER_CURSOR });

      // Bottom accent bar when selected
      if (isSelected) {
        const accent = this.add.rectangle(tx, tabStripY + 40 - 3, tabW, 4, suspect.color, 0.8);
        this.container.add(accent);
      }

      // Small portrait
      const portraitX = tx - tabW / 2 + 36;
      const portraitKey = `portrait_${suspect.id}`;
      if (this.textures.exists(portraitKey)) {
        const portrait = this.add.image(portraitX, tabStripY, portraitKey);
        portrait.setDisplaySize(54, 54);
        const maskGfx = this.make.graphics({});
        maskGfx.fillCircle(portraitX, tabStripY, 27);
        portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));
        this.container.add(portrait);
      } else {
        const circle = this.add.ellipse(portraitX, tabStripY, 54, 54, suspect.color, 0.15);
        const letter = this.add.text(portraitX, tabStripY, suspect.icon, {
          fontFamily: FONT, fontSize: '27px', color: colorHex, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add([circle, letter]);
      }

      // Name
      const firstName = suspect.name.split(' ')[0];
      const nameText = this.add.text(tx + 2, tabStripY - 10, firstName, {
        fontFamily: FONT,
        fontSize: isSelected ? '15px' : '14px',
        color: isSelected ? TextColors.light : TextColors.goldDim,
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5, 0.5);

      // Role
      const roleText = this.add.text(tx + 2, tabStripY + 10, suspect.role, {
        fontFamily: FONT,
        fontSize: '15px',
        color: isSelected ? colorHex : TextColors.muted,
        fontStyle: 'italic',
      }).setOrigin(0.5, 0.5);

      this.container.add([tabBg, nameText, roleText]);

      tabBg.on('pointerdown', () => {
        this.selectedIndex = i;
        this.scene.restart();
      });
      tabBg.on('pointerover', () => {
        if (i !== this.selectedIndex) tabBg.setFillStyle(0x1e1d2e, 0.9);
      });
      tabBg.on('pointerout', () => {
        if (i !== this.selectedIndex) tabBg.setFillStyle(0x15141e, 0.85);
      });
    });

    // ─── Detail area (below tabs) ───
    const detailTop = tabStripY + 63;
    const detailBottom = panelY + panelH / 2 - 21;
    const detailH = detailBottom - detailTop;
    const detailW = panelW - 90;
    const detailCenterX = panelX;
    const detailCenterY = detailTop + detailH / 2;

    this.showSuspectDetail(SUSPECTS[this.selectedIndex], detailCenterX, detailCenterY, detailW, detailH);

    // Fade in
    this.container.setAlpha(0);
    this.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
  }

  private showSuspectDetail(
    suspect: SuspectProfile,
    cx: number, cy: number, dw: number, dh: number,
  ): void {
    const colorHex = `#${suspect.color.toString(16).padStart(6, '0')}`;
    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();

    // ── Left column: portrait + info card ──
    const leftW = 420;
    const leftX = cx - dw / 2;

    // Portrait card background
    const cardH = Math.min(dh - 15, 720);
    const cardY = cy;
    const cardBg = this.add.rectangle(leftX + leftW / 2, cardY, leftW, cardH, 0x0e0d16, 0.7);
    cardBg.setStrokeStyle(1, suspect.color, 0.2);
    this.container.add(cardBg);

    // Large portrait
    const portraitSize = 240;
    const portraitY = cardY - cardH / 2 + 30 + portraitSize / 2;
    const portraitX = leftX + leftW / 2;
    const portraitKey = `portrait_${suspect.id}`;

    if (this.textures.exists(portraitKey)) {
      const portrait = this.add.image(portraitX, portraitY, portraitKey);
      portrait.setDisplaySize(portraitSize, portraitSize);
      const maskGfx = this.make.graphics({});
      maskGfx.fillRoundedRect(
        portraitX - portraitSize / 2, portraitY - portraitSize / 2,
        portraitSize, portraitSize, 15
      );
      portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));
      this.container.add(portrait);

      // Portrait frame
      const frame = this.add.graphics();
      frame.lineStyle(2, suspect.color, 0.5);
      frame.strokeRoundedRect(
        portraitX - portraitSize / 2, portraitY - portraitSize / 2,
        portraitSize, portraitSize, 15
      );
      this.container.add(frame);
    } else {
      // Fallback icon
      const iconBg = this.add.rectangle(portraitX, portraitY, portraitSize, portraitSize, suspect.color, 0.1);
      iconBg.setStrokeStyle(2, suspect.color, 0.3);
      const iconText = this.add.text(portraitX, portraitY, suspect.icon, {
        fontFamily: FONT, fontSize: '90px', color: colorHex, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add([iconBg, iconText]);
    }

    // Name (below portrait)
    const nameY = portraitY + portraitSize / 2 + 30;
    this.container.add(this.add.text(portraitX, nameY, suspect.name, {
      fontFamily: FONT,
      fontSize: '30px',
      color: colorHex,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5));

    // Role
    this.container.add(this.add.text(portraitX, nameY + 39, suspect.role, {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.light,
      fontStyle: 'italic',
    }).setOrigin(0.5));

    // Info chips
    const chipStartY = nameY + 84;
    const chips = [
      { label: `Age: ${suspect.age}`, icon: '◈' },
      { label: suspect.location, icon: '◉' },
    ];
    chips.forEach((chip, i) => {
      const chipY = chipStartY + i * 45;
      const chipBg = this.add.rectangle(portraitX, chipY, 300, 36, suspect.color, 0.08);
      chipBg.setStrokeStyle(1, suspect.color, 0.2);
      this.container.add(chipBg);
      const chipLabel = this.add.text(portraitX, chipY, `${chip.icon}  ${chip.label}`, {
        fontFamily: FONT, fontSize: '21px', color: TextColors.goldDim,
      }).setOrigin(0.5);
      this.container.add(chipLabel);
    });

    // Discovery count
    const discovered = suspect.facts.filter(f =>
      !f.requiresFlag || save.getFlag(f.requiresFlag) || dialogue.hasTriggeredEvent(f.requiresFlag)
    ).length;
    const total = suspect.facts.length;

    const progressY = chipStartY + 120;
    const progressW = 300;
    const progressH = 7;

    const trackBg = this.add.rectangle(portraitX, progressY, progressW, progressH, 0x1a1a2e, 1);
    this.container.add(trackBg);

    const pct = discovered / total;
    if (pct > 0) {
      const fill = this.add.rectangle(
        portraitX - progressW / 2 + (progressW * pct) / 2, progressY,
        progressW * pct, progressH, suspect.color, 0.7
      );
      this.container.add(fill);
    }

    this.container.add(this.add.text(portraitX, progressY + 21, `${discovered} / ${total} facts discovered`, {
      fontFamily: FONT, fontSize: '20px', color: TextColors.muted, fontStyle: 'italic',
    }).setOrigin(0.5));

    // ── Right column: Known Facts ──
    const rightX = leftX + leftW + 36;
    const rightW = dw - leftW - 36;
    const rightCx = rightX + rightW / 2;

    // Facts panel background
    const factsPanelH = cardH;
    const factsBg = this.add.rectangle(rightCx, cy, rightW, factsPanelH, 0x0e0d16, 0.5);
    factsBg.setStrokeStyle(1, suspect.color, 0.12);
    this.container.add(factsBg);

    // Section header
    const factsHeaderY = cy - factsPanelH / 2 + 36;
    this.container.add(this.add.text(rightX + 30, factsHeaderY, 'KNOWN FACTS', {
      fontFamily: FONT,
      fontSize: '21px',
      color: TextColors.gold,
      fontStyle: 'bold',
      letterSpacing: 3,
    }));

    // Divider under header (art deco)
    const divGfx = this.add.graphics();
    drawDecoDivider(divGfx, rightCx, factsHeaderY + 33, rightW - 60, DecoColors.gold, 0.25);
    this.container.add(divGfx);

    // Facts list
    let y = factsHeaderY + 60;
    const factMaxW = rightW - 90;

    suspect.facts.forEach((fact, idx) => {
      const unlocked = !fact.requiresFlag ||
        save.getFlag(fact.requiresFlag) ||
        dialogue.hasTriggeredEvent(fact.requiresFlag);

      // Alternating subtle row tint
      if (idx % 2 === 0) {
        const rowBg = this.add.rectangle(rightCx, y + 15, rightW - 30, 54, suspect.color, 0.03);
        this.container.add(rowBg);
      }

      // Bullet
      const bullet = unlocked ? '◆' : '◇';
      const bulletColor = unlocked ? colorHex : TextColors.hidden;
      this.container.add(this.add.text(rightX + 36, y, bullet, {
        fontFamily: FONT, fontSize: '21px', color: bulletColor,
      }));

      // Fact text
      const displayText = unlocked ? fact.text : '— Undiscovered —';
      const factText = this.add.text(rightX + 69, y, displayText, {
        fontFamily: FONT,
        fontSize: '21px',
        color: unlocked ? TextColors.light : TextColors.hidden,
        fontStyle: unlocked ? 'normal' : 'italic',
        wordWrap: { width: factMaxW },
        lineSpacing: 3,
      });
      this.container.add(factText);

      y += Math.max(factText.height + 21, 54);
    });
  }
}
