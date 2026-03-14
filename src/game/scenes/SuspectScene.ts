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
  metFlag: string; // dialogue event that indicates the player has met this suspect
  facts: SuspectFact[];
  thoughts: NancyThought[]; // Nancy's inner monologue about this person
}

interface SuspectFact {
  text: string;
  requiresFlag?: string;
}

interface NancyThought {
  text: string;
  requiresFlag?: string; // only show after a certain event/flag
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
    metFlag: 'vivian_intro',
    facts: [
      { text: 'Margaux Fontaine\'s goddaughter. Has lived in the Monarch her whole life.' },
      { text: 'Wants to save the theater from demolition.' },
      { text: 'She recognized Cecilia Drake\'s initials — "C.D."', requiresFlag: 'learned_about_cecilia' },
      { text: 'The locket in the trunk contained her childhood photo.', requiresFlag: 'vivian_full_trust' },
      { text: 'Vivian\'s connection to Margaux is deeper than she initially let on.', requiresFlag: 'learned_about_hale_family' },
    ],
    thoughts: [
      { text: '"She reminds me of someone who\'s been holding their breath for a very long time. Everything she says has a careful weight to it — like she\'s choosing which truths to share."' },
      { text: '"Vivian knows more about this theater than anyone alive. The question is how much of that knowledge she\'s deliberately keeping from me."', requiresFlag: 'learned_about_cecilia' },
      { text: '"I don\'t think she\'s the villain here. But she\'s definitely protecting someone — or something. That locket wasn\'t just sentimental. It was her reason for staying."', requiresFlag: 'vivian_full_trust' },
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
    metFlag: 'edwin_auditorium',
    facts: [
      { text: 'Has been studying the Monarch for 15 years. Sits in seat G-12 regularly.' },
      { text: 'Knows the Crimson Veil in detail — lighting cues, blocking, everything.', requiresFlag: 'learned_about_crimson_veil' },
      { text: 'His grandfather James Hale was Margaux\'s lover.', requiresFlag: 'learned_about_hale_family' },
      { text: 'Stella identified him as the person using the basement.', requiresFlag: 'stella_confession' },
      { text: 'HE IS THE GHOST. Confessed to staging hauntings and poisoning Ashworth.', requiresFlag: 'edwin_personal_revealed' },
    ],
    thoughts: [
      { text: '"There\'s something about the way he talks about Margaux — like she\'s still alive to him. Fifteen years of research on a ninety-year-old case? That\'s not academic interest. That\'s obsession."' },
      { text: '"His family funded this theater. His grandfather loved Margaux. There\'s a personal stake here he hasn\'t told me about yet."', requiresFlag: 'learned_about_hale_family' },
      { text: '"The pieces are clicking into place. Edwin had the knowledge, the access, and the motivation. He built himself a ghost because he couldn\'t let go of a woman he never even met."', requiresFlag: 'stella_confession' },
      { text: '"He poisoned Ashworth to stop the demolition — the same poison that killed Margaux. He\'s been living in the past so long he started recreating it."', requiresFlag: 'edwin_personal_revealed' },
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
    metFlag: 'ashworth_office',
    facts: [
      { text: 'Owns the Monarch. Plans to demolish it in 72 hours for condominiums.' },
      { text: 'Was poisoned and collapsed. Recovering in his office.', requiresFlag: 'learned_about_ashworth' },
      { text: 'Saw someone watching him as he collapsed.', requiresFlag: 'saw_figure_before_collapse' },
      { text: 'Found someone living in the basement two weeks ago.', requiresFlag: 'learned_about_basement_intruder' },
      { text: 'Rejected $800K sale; demolition insurance pays $2.3M.', requiresFlag: 'ashworth_motive_revealed' },
    ],
    thoughts: [
      { text: '"He looks at this theater and sees dollar signs. I look at it and see a hundred years of stories. We\'re not going to be friends."' },
      { text: '"Getting poisoned doesn\'t automatically make you innocent. Ashworth has a $2.3 million reason to want this building demolished — and being a victim might just be convenient cover."', requiresFlag: 'learned_about_ashworth' },
      { text: '"He rejected the Historical Society\'s offer. He chose destruction over preservation for an extra million and a half. I\'ve met a lot of villains — some of them wear suits and carry spreadsheets."', requiresFlag: 'ashworth_motive_revealed' },
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
    metFlag: 'stella_backstage',
    facts: [
      { text: 'Stage manager for 8 years. Knows every inch of the building.' },
      { text: 'Has been selling theater props — $4,200 worth.', requiresFlag: 'learned_about_missing_props' },
      { text: 'Selling props to pay her mother\'s medical bills ($3,800/month).', requiresFlag: 'stella_confession' },
      { text: 'Left a threatening note to the basement intruder.', requiresFlag: 'basement_key_location' },
      { text: 'Knows where the basement key is hidden. Told Nancy.', requiresFlag: 'basement_key_location' },
    ],
    thoughts: [
      { text: '"She carries herself like someone used to being invisible — working behind the scenes while everyone else takes the spotlight. I know that feeling."' },
      { text: '"Stella\'s been selling props to survive, not to profit. There\'s a difference. But desperation makes people do things they wouldn\'t normally consider."', requiresFlag: 'learned_about_missing_props' },
      { text: '"$3,800 a month for her mother\'s care. I can\'t judge her for that. But she knows things about this theater she hasn\'t shared with everyone — and secrets have a way of making people look guilty."', requiresFlag: 'stella_confession' },
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
    metFlag: 'diego_booth',
    facts: [
      { text: 'Renting the projection booth as a writing studio.' },
      { text: 'Found the annotated script with coded margin notes.', requiresFlag: 'annotated_script_found' },
      { text: 'Has heard a woman\'s voice reciting lines at night from the stage.', requiresFlag: 'heard_basement_noises' },
      { text: 'Recognized the cipher spells "goblet" — the murder weapon.', requiresFlag: 'cipher_discussed' },
    ],
    thoughts: [
      { text: '"He\'s young and earnest — the kind of person who came here to write the next great American play and accidentally stumbled into a real mystery. I don\'t think he\'s involved, but he\'s observant."' },
      { text: '"Diego hears things late at night from his booth. A woman\'s voice, reciting lines from a play that ended in murder. He\'s scared, but he\'s also fascinated. Writers are like detectives that way — we can\'t resist a good story."', requiresFlag: 'heard_basement_noises' },
      { text: '"He cracked the cipher faster than I did. \'Goblet.\' The murder weapon hidden in plain sight inside the script. Diego has good instincts. I should keep him close."', requiresFlag: 'cipher_discussed' },
    ],
  },
];

// Paper dossier color palette
const PaperColors = {
  parchment: 0xF0E6CC,       // warm cream paper background
  parchmentDark: 0xE8DCC0,   // slightly darker for cards
  parchmentMid: 0xEBE0C8,    // mid-tone for alternating rows
  headerNavy: 0x0c1525,      // dark header bar
  ink: '#2a1a0a',             // dark ink for body text
  inkLight: '#3a2a1a',       // slightly lighter ink
  thoughtBlue: '#3a4a5a',    // dark blue-gray for Nancy's thoughts
  undiscovered: '#8a7a6a',   // medium gray for undiscovered placeholders
  sectionHeader: '#7a6a3a',  // darkened gold for section headers on paper
  progressTrack: 0xD8CCB0,   // subtle track on paper
};

// Toolbar height matching UIScene
const TOOLBAR_H = 112;
const BOTTOM_MARGIN = 12;

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
    const panelW = Math.min(1650, width - 60);
    const panelH = height - TOOLBAR_H - BOTTOM_MARGIN - 24;
    const panelX = width / 2;
    const panelY = panelH / 2 + 12;

    // Background — art deco framed dossier with paper fill
    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;
    const decoFrame = drawArtDecoFrame(this, panelLeft, panelTop, panelW, panelH, {
      color: DecoColors.gold,
      alpha: 0.5,
      cornerSize: 32,
      doubleBorder: true,
      fillColor: PaperColors.parchment,
      fillAlpha: 0.97,
    });
    this.container.add(decoFrame);

    // Subtle paper texture — scattered small alpha rects for grain effect
    const texGfx = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const tx = panelLeft + 10 + Math.random() * (panelW - 20);
      const ty = panelTop + 10 + Math.random() * (panelH - 20);
      const tw = 2 + Math.random() * 6;
      const th = 2 + Math.random() * 4;
      texGfx.fillStyle(0x8B7355, 0.03 + Math.random() * 0.04);
      texGfx.fillRect(tx, ty, tw, th);
    }
    this.container.add(texGfx);

    // ─── Header bar ───
    const headerH = 64;
    const headerY = panelY - panelH / 2 + headerH / 2;

    const headerBg = this.add.rectangle(panelX, headerY, panelW - 12, headerH, PaperColors.headerNavy, 1);
    this.container.add(headerBg);

    // Header bottom border
    const headerLine = this.add.graphics();
    headerLine.lineStyle(2, DecoColors.gold, 0.5);
    headerLine.lineBetween(panelLeft + 4, panelTop + headerH, panelLeft + panelW - 4, panelTop + headerH);
    this.container.add(headerLine);

    const title = this.add.text(panelX, headerY, 'CASE FILE — SUSPECT DOSSIERS', {
      fontFamily: FONT,
      fontSize: '24px',
      color: DecoTextColors.goldBright,
      fontStyle: 'bold',
      letterSpacing: 7,
    }).setOrigin(0.5);
    this.container.add(title);

    // Decorative divider flanking title
    const divGfxHeader = this.add.graphics();
    drawDecoDivider(divGfxHeader, panelX, headerY, panelW * 0.6, DecoColors.gold, 0.3);
    this.container.add(divGfxHeader);

    // Close button
    const closeBtn = createCloseButton(this, panelX + panelW / 2 - 33, headerY, () => this.scene.stop(), 120);
    closeBtn.setDepth(Depths.suspectContent);

    // ─── Suspect tabs (horizontal strip below header) ───
    const tabStripY = headerY + headerH / 2 + 68;
    const tabW = 285;
    const tabH = 100;
    const tabGap = 18;
    const totalTabsW = SUSPECTS.length * tabW + (SUSPECTS.length - 1) * tabGap;
    const tabStartX = panelX - totalTabsW / 2 + tabW / 2;

    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();

    // If selected suspect hasn't been met, fall back to the first met suspect
    const isMet = (s: SuspectProfile) =>
      save.getFlag(s.metFlag) || dialogue.hasTriggeredEvent(s.metFlag);
    if (!isMet(SUSPECTS[this.selectedIndex])) {
      const firstMet = SUSPECTS.findIndex(s => isMet(s));
      this.selectedIndex = firstMet >= 0 ? firstMet : 0;
    }

    SUSPECTS.forEach((suspect, i) => {
      const tx = tabStartX + i * (tabW + tabGap);
      const isSelected = i === this.selectedIndex;
      const met = isMet(suspect);
      const colorHex = `#${suspect.color.toString(16).padStart(6, '0')}`;

      // Tab card — parchment-colored on paper
      const tabBg = this.add.rectangle(tx, tabStripY, tabW, tabH,
        isSelected ? PaperColors.parchmentDark : PaperColors.parchmentMid,
        isSelected ? 1 : 0.9);
      tabBg.setStrokeStyle(isSelected ? 3 : 1,
        met ? suspect.color : 0x8a7a6a,
        isSelected ? 0.8 : 0.3);

      // Bottom accent bar when selected
      if (isSelected) {
        const accent = this.add.rectangle(tx, tabStripY + tabH / 2 - 3, tabW, 5, suspect.color, 0.9);
        this.container.add(accent);
      }

      // Portrait icon
      const portraitX = tx - tabW / 2 + 40;
      const portraitSize = 64;
      if (met) {
        const portraitKey = `portrait_${suspect.id}`;
        if (this.textures.exists(portraitKey)) {
          const portrait = this.add.image(portraitX, tabStripY, portraitKey);
          portrait.setDisplaySize(portraitSize, portraitSize);
          const maskGfx = this.make.graphics({});
          maskGfx.fillCircle(portraitX, tabStripY, portraitSize / 2);
          portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));
          this.container.add(portrait);
        } else {
          const circle = this.add.ellipse(portraitX, tabStripY, portraitSize, portraitSize, suspect.color, 0.15);
          const letter = this.add.text(portraitX, tabStripY, suspect.icon, {
            fontFamily: FONT, fontSize: '30px', color: colorHex, fontStyle: 'bold',
          }).setOrigin(0.5);
          this.container.add([circle, letter]);
        }
        tabBg.setInteractive({ cursor: POINTER_CURSOR });
      } else {
        // Locked silhouette
        const circle = this.add.ellipse(portraitX, tabStripY, portraitSize, portraitSize, 0x8a7a6a, 0.15);
        const lock = this.add.text(portraitX, tabStripY, '🔒', {
          fontSize: '28px',
        }).setOrigin(0.5);
        this.container.add([circle, lock]);
      }

      // Name / ???
      const firstName = met ? suspect.name.split(' ')[0] : '???';
      const nameText = this.add.text(tx + 4, tabStripY - 12, firstName, {
        fontFamily: FONT,
        fontSize: '24px',
        color: met ? (isSelected ? PaperColors.ink : '#4a3a2a') : PaperColors.undiscovered,
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5, 0.5);

      // Role / Unknown
      const roleText = this.add.text(tx + 4, tabStripY + 18, met ? suspect.role : 'Unknown', {
        fontFamily: FONT,
        fontSize: '17px',
        color: met ? (isSelected ? '#5a4a3a' : '#7a6a5a') : PaperColors.undiscovered,
        fontStyle: 'italic',
      }).setOrigin(0.5, 0.5);

      this.container.add([tabBg, nameText, roleText]);

      if (met) {
        tabBg.on('pointerdown', () => {
          this.selectedIndex = i;
          this.scene.restart();
        });
        tabBg.on('pointerover', () => {
          if (i !== this.selectedIndex) tabBg.setFillStyle(PaperColors.parchmentDark, 0.95);
        });
        tabBg.on('pointerout', () => {
          if (i !== this.selectedIndex) tabBg.setFillStyle(PaperColors.parchmentMid, 0.9);
        });
      }
    });

    // ─── Detail area (below tabs) ───
    const detailTop = tabStripY + tabH / 2 + 18;
    const detailBottom = panelY + panelH / 2 - 21;
    const detailH = detailBottom - detailTop;
    const detailW = panelW - 90;
    const detailCenterX = panelX;
    const detailCenterY = detailTop + detailH / 2;

    if (isMet(SUSPECTS[this.selectedIndex])) {
      this.showSuspectDetail(SUSPECTS[this.selectedIndex], detailCenterX, detailCenterY, detailW, detailH);
    } else {
      // No suspects met yet — show placeholder
      const placeholder = this.add.text(detailCenterX, detailCenterY, 'Talk to people in the theater\nto learn about suspects.', {
        fontFamily: FONT, fontSize: '26px', color: PaperColors.undiscovered,
        fontStyle: 'italic', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);
      this.container.add(placeholder);
    }

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

    // Portrait card background — darker parchment card
    const cardH = Math.min(dh - 15, 720);
    const cardY = cy;
    const cardBg = this.add.rectangle(leftX + leftW / 2, cardY, leftW, cardH, PaperColors.parchmentDark, 0.8);
    cardBg.setStrokeStyle(2, DecoColors.gold, 0.3);
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
      frame.lineStyle(3, suspect.color, 0.5);
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
      fontSize: '36px',
      color: PaperColors.ink,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5));

    // Role
    this.container.add(this.add.text(portraitX, nameY + 45, suspect.role, {
      fontFamily: FONT,
      fontSize: '24px',
      color: '#5a4a3a',
      fontStyle: 'italic',
    }).setOrigin(0.5));

    // Info chips
    const chipStartY = nameY + 96;
    const chips = [
      { label: `Age: ${suspect.age}`, icon: '◈' },
      { label: suspect.location, icon: '◉' },
    ];
    chips.forEach((chip, i) => {
      const chipY = chipStartY + i * 50;
      const chipBg = this.add.rectangle(portraitX, chipY, 300, 40, suspect.color, 0.1);
      chipBg.setStrokeStyle(1, suspect.color, 0.25);
      this.container.add(chipBg);
      const chipLabel = this.add.text(portraitX, chipY, `${chip.icon}  ${chip.label}`, {
        fontFamily: FONT, fontSize: '24px', color: PaperColors.inkLight,
      }).setOrigin(0.5);
      this.container.add(chipLabel);
    });

    // Discovery count
    const discovered = suspect.facts.filter(f =>
      !f.requiresFlag || save.getFlag(f.requiresFlag) || dialogue.hasTriggeredEvent(f.requiresFlag)
    ).length;
    const total = suspect.facts.length;

    const progressY = chipStartY + 130;
    const progressW = 300;
    const progressH = 10;

    const trackBg = this.add.rectangle(portraitX, progressY, progressW, progressH, PaperColors.progressTrack, 1);
    trackBg.setStrokeStyle(1, DecoColors.goldDim, 0.3);
    this.container.add(trackBg);

    const pct = discovered / total;
    if (pct > 0) {
      const fill = this.add.rectangle(
        portraitX - progressW / 2 + (progressW * pct) / 2, progressY,
        progressW * pct, progressH, suspect.color, 0.8
      );
      this.container.add(fill);
    }

    this.container.add(this.add.text(portraitX, progressY + 24, `${discovered} / ${total} facts discovered`, {
      fontFamily: FONT, fontSize: '22px', color: '#6a5a4a', fontStyle: 'italic',
    }).setOrigin(0.5));

    // ── Right column: Known Facts ──
    const rightX = leftX + leftW + 36;
    const rightW = dw - leftW - 36;
    const rightCx = rightX + rightW / 2;

    // Facts panel background — darker parchment card
    const factsPanelH = cardH;
    const factsBg = this.add.rectangle(rightCx, cy, rightW, factsPanelH, PaperColors.parchmentDark, 0.6);
    factsBg.setStrokeStyle(2, DecoColors.gold, 0.3);
    this.container.add(factsBg);

    // Section header
    const factsHeaderY = cy - factsPanelH / 2 + 36;
    this.container.add(this.add.text(rightX + 30, factsHeaderY, 'KNOWN FACTS', {
      fontFamily: FONT,
      fontSize: '24px',
      color: PaperColors.sectionHeader,
      fontStyle: 'bold',
      letterSpacing: 5,
    }));

    // Divider under header (art deco) — thicker, more visible gold
    const divGfx = this.add.graphics();
    drawDecoDivider(divGfx, rightCx, factsHeaderY + 36, rightW - 60, DecoColors.gold, 0.4);
    this.container.add(divGfx);

    // Facts list
    let y = factsHeaderY + 66;
    const factMaxW = rightW - 90;

    suspect.facts.forEach((fact, idx) => {
      const unlocked = !fact.requiresFlag ||
        save.getFlag(fact.requiresFlag) ||
        dialogue.hasTriggeredEvent(fact.requiresFlag);

      // Alternating subtle row tint
      if (idx % 2 === 0) {
        const rowBg = this.add.rectangle(rightCx, y + 18, rightW - 30, 60, 0x8B7355, 0.06);
        this.container.add(rowBg);
      }

      // Bullet — dark ink for readability
      const bullet = unlocked ? '◆' : '◇';
      const bulletColor = unlocked ? PaperColors.ink : PaperColors.undiscovered;
      this.container.add(this.add.text(rightX + 36, y, bullet, {
        fontFamily: FONT, fontSize: '26px', color: bulletColor,
      }));

      // Fact text
      const displayText = unlocked ? fact.text : '— Undiscovered —';
      const factText = this.add.text(rightX + 72, y, displayText, {
        fontFamily: FONT,
        fontSize: '26px',
        color: unlocked ? PaperColors.ink : PaperColors.undiscovered,
        fontStyle: unlocked ? 'normal' : 'italic',
        wordWrap: { width: factMaxW },
        lineSpacing: 4,
      });
      this.container.add(factText);

      y += Math.max(factText.height + 24, 60);
    });

    // ── Nancy's Inner Monologue ──
    const unlockedThoughts = suspect.thoughts.filter(t =>
      !t.requiresFlag || save.getFlag(t.requiresFlag) || dialogue.hasTriggeredEvent(t.requiresFlag)
    );

    if (unlockedThoughts.length > 0) {
      y += 18;

      // Divider — thicker gold
      const thoughtDivGfx = this.add.graphics();
      drawDecoDivider(thoughtDivGfx, rightCx, y, rightW - 90, DecoColors.gold, 0.35);
      this.container.add(thoughtDivGfx);
      y += 30;

      // Section header
      this.container.add(this.add.text(rightX + 30, y, 'NANCY\'S THOUGHTS', {
        fontFamily: FONT,
        fontSize: '24px',
        color: PaperColors.sectionHeader,
        fontStyle: 'bold italic',
        letterSpacing: 4,
      }));
      y += 48;

      // Show the most recent unlocked thought (last in array = most progression)
      const latestThought = unlockedThoughts[unlockedThoughts.length - 1];
      const thoughtText = this.add.text(rightX + 36, y, latestThought.text, {
        fontFamily: FONT,
        fontSize: '24px',
        color: PaperColors.thoughtBlue,
        fontStyle: 'italic',
        wordWrap: { width: factMaxW },
        lineSpacing: 6,
      });
      this.container.add(thoughtText);
      y += thoughtText.height + 16;

      // If there are earlier thoughts, show them slightly lighter
      if (unlockedThoughts.length > 1) {
        for (let ti = unlockedThoughts.length - 2; ti >= 0; ti--) {
          const olderThought = unlockedThoughts[ti];
          const olderText = this.add.text(rightX + 36, y, olderThought.text, {
            fontFamily: FONT,
            fontSize: '21px',
            color: '#5a6a7a',
            fontStyle: 'italic',
            wordWrap: { width: factMaxW },
            lineSpacing: 5,
          });
          this.container.add(olderText);
          y += olderText.height + 12;
        }
      }
    }
  }
}
