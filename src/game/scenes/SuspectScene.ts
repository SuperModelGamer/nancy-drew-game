import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { Colors, TextColors, FONT, Depths } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';
import { createCloseButton, createOverlay } from '../utils/ui-helpers';
import { drawDecoDivider, DecoColors } from '../utils/art-deco';

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

// Book visual constants — matching Evidence & Journal panels
const BOOK_LEATHER = 0x3a2a1a;
const BOOK_PAPER = 0xF5E6C8;
const BOOK_INK = '#2a1a0a';
const BOOK_SPINE = 0x2a1a0a;
const BOOK_STAIN = 0x8B7355;
const JOURNAL_FONT = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";
const TAB_GOLD = 0xc9a84c;
const TAB_GOLD_STR = '#c9a84c';
const LEATHER_BORDER = 14;

// Toolbar height matching UIScene
const TOOLBAR_H = 112;
const BOTTOM_MARGIN = 12;

export class SuspectScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private selectedIndex = 0;
  private scrollY = 0;
  private maxScrollY = 0;
  private detailContainer!: Phaser.GameObjects.Container;
  private detailMask!: Phaser.Display.Masks.GeometryMask;

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

    // ─── Main panel — leather-bound book (matching Evidence & Journal) ───
    const panelW = Math.min(1650, width - 60);
    const panelH = height - TOOLBAR_H - BOTTOM_MARGIN - 45;
    const panelX = width / 2;
    const panelY = panelH / 2 + 15;

    const panelLeft = panelX - panelW / 2;
    const panelTop = panelY - panelH / 2;

    // Leather-bound book background
    const bookGfx = this.add.graphics();
    bookGfx.fillStyle(BOOK_LEATHER, 1);
    bookGfx.fillRoundedRect(panelLeft, panelTop, panelW, panelH, 8);

    const paperLeft = panelLeft + LEATHER_BORDER;
    const paperTop = panelTop + LEATHER_BORDER;
    const paperW = panelW - LEATHER_BORDER * 2;
    const paperH = panelH - LEATHER_BORDER * 2;
    bookGfx.fillStyle(BOOK_PAPER, 1);
    bookGfx.fillRoundedRect(paperLeft, paperTop, paperW, paperH, 4);

    // Spine binding
    const spineX = panelLeft + LEATHER_BORDER + 6;
    bookGfx.lineStyle(3, BOOK_SPINE, 0.5);
    bookGfx.lineBetween(spineX, paperTop + 8, spineX, paperTop + paperH - 8);
    bookGfx.lineStyle(1, BOOK_SPINE, 0.25);
    bookGfx.lineBetween(spineX + 4, paperTop + 8, spineX + 4, paperTop + paperH - 8);

    // Leather edge
    bookGfx.lineStyle(1, 0x5a4a3a, 0.4);
    bookGfx.strokeRoundedRect(panelLeft + 1, panelTop + 1, panelW - 2, panelH - 2, 8);
    bookGfx.lineStyle(1, 0x1a0e08, 0.6);
    bookGfx.strokeRoundedRect(panelLeft, panelTop, panelW, panelH, 8);
    this.container.add(bookGfx);

    // Subtle aged paper texture
    const stainGfx = this.add.graphics();
    stainGfx.fillStyle(BOOK_STAIN, 0.03);
    stainGfx.fillEllipse(panelX - panelW / 4, panelY - panelH / 5, 90, 40);
    stainGfx.fillEllipse(panelX + panelW / 3, panelY + panelH / 6, 70, 30);
    stainGfx.fillStyle(BOOK_STAIN, 0.02);
    stainGfx.fillEllipse(panelX + panelW / 5, panelY - panelH / 3, 60, 25);
    this.container.add(stainGfx);

    // ─── Header ───
    const headerH = 72;
    const headerY = panelTop + LEATHER_BORDER + headerH / 2;

    const headerBg = this.add.rectangle(panelX, headerY, paperW, headerH, 0x3a2a1a, 0.15);
    this.container.add(headerBg);

    const headerLineGfx = this.add.graphics();
    headerLineGfx.lineStyle(1.5, BOOK_LEATHER, 0.3);
    headerLineGfx.lineBetween(paperLeft + 20, paperTop + headerH, paperLeft + paperW - 20, paperTop + headerH);
    this.container.add(headerLineGfx);

    const title = this.add.text(panelX, headerY, 'SUSPECT DOSSIERS', {
      fontFamily: JOURNAL_FONT,
      fontSize: '32px',
      color: '#3a2a1a',
      fontStyle: 'bold italic',
      letterSpacing: 6,
    }).setOrigin(0.5);
    this.container.add(title);

    // Decorative flourish
    const flourishGfx = this.add.graphics();
    flourishGfx.lineStyle(1, 0x3a2a1a, 0.3);
    const flourishW = 140;
    flourishGfx.lineBetween(panelX - flourishW, headerY + 18, panelX + flourishW, headerY + 18);
    flourishGfx.fillStyle(0x3a2a1a, 0.4);
    const fd = 4;
    flourishGfx.fillPoints([
      new Phaser.Geom.Point(panelX, headerY + 18 - fd),
      new Phaser.Geom.Point(panelX + fd, headerY + 18),
      new Phaser.Geom.Point(panelX, headerY + 18 + fd),
      new Phaser.Geom.Point(panelX - fd, headerY + 18),
    ], true);
    this.container.add(flourishGfx);

    // Close button
    const closeBtn = createCloseButton(this, panelLeft + panelW - LEATHER_BORDER - 30, headerY, () => this.scene.stop(), 120);
    closeBtn.setDepth(Depths.suspectContent);

    // ─── Content area ───
    const contentTop = paperTop + headerH + 18;
    const contentBottom = panelTop + panelH - LEATHER_BORDER - 18;

    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();

    const isMet = (s: SuspectProfile) =>
      save.getFlag(s.metFlag) || dialogue.hasTriggeredEvent(s.metFlag);

    // Default to the suspect being talked to, or first met suspect
    const currentDialogueSuspect = this.registry.get('currentDialogueSuspect') as string | undefined;
    if (currentDialogueSuspect) {
      const idx = SUSPECTS.findIndex(s => s.id === currentDialogueSuspect);
      if (idx >= 0 && isMet(SUSPECTS[idx])) this.selectedIndex = idx;
      // Clear so tab switching via restart doesn't get overridden
      this.registry.remove('currentDialogueSuspect');
    }
    if (!isMet(SUSPECTS[this.selectedIndex])) {
      const firstMet = SUSPECTS.findIndex(s => isMet(s));
      this.selectedIndex = firstMet >= 0 ? firstMet : 0;
    }

    // ─── Suspect tabs — row of name tabs like book page markers ───
    const tabStripY = contentTop + 28;
    const tabW = Math.min(220, (paperW - 60) / SUSPECTS.length - 10);
    const tabH = 70;
    const tabGap = 10;
    const totalTabsW = SUSPECTS.length * tabW + (SUSPECTS.length - 1) * tabGap;
    const tabStartX = panelX - totalTabsW / 2 + tabW / 2;

    SUSPECTS.forEach((suspect, i) => {
      const tx = tabStartX + i * (tabW + tabGap);
      const isSelected = i === this.selectedIndex;
      const met = isMet(suspect);
      const colorHex = `#${suspect.color.toString(16).padStart(6, '0')}`;

      // Tab background — like a page tab
      const tabBg = this.add.rectangle(tx, tabStripY, tabW, tabH,
        isSelected ? 0x3a2a1a : BOOK_PAPER,
        isSelected ? 0.12 : 0.01);
      tabBg.setStrokeStyle(isSelected ? 2 : 1,
        met ? suspect.color : 0x8a7a6a,
        isSelected ? 0.7 : 0.25);

      // Bottom accent when selected
      if (isSelected && met) {
        const accent = this.add.rectangle(tx, tabStripY + tabH / 2 - 2, tabW, 4, suspect.color, 0.8);
        this.container.add(accent);
      }

      // Portrait icon or lock
      if (met) {
        const portraitKey = `portrait_${suspect.id}`;
        if (this.textures.exists(portraitKey)) {
          const portrait = this.add.image(tx - tabW / 2 + 28, tabStripY, portraitKey);
          portrait.setDisplaySize(44, 44);
          const maskGfx = this.make.graphics({});
          maskGfx.fillCircle(tx - tabW / 2 + 28, tabStripY, 22);
          portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));
          this.container.add(portrait);
        } else {
          const circle = this.add.ellipse(tx - tabW / 2 + 28, tabStripY, 44, 44, suspect.color, 0.15);
          const letter = this.add.text(tx - tabW / 2 + 28, tabStripY, suspect.icon, {
            fontFamily: JOURNAL_FONT, fontSize: '24px', color: colorHex, fontStyle: 'bold',
          }).setOrigin(0.5);
          this.container.add([circle, letter]);
        }
        tabBg.setInteractive({ cursor: POINTER_CURSOR });
      } else {
        const circle = this.add.ellipse(tx - tabW / 2 + 28, tabStripY, 44, 44, 0x8a7a6a, 0.1);
        const lock = this.add.text(tx - tabW / 2 + 28, tabStripY, '🔒', {
          fontSize: '22px',
        }).setOrigin(0.5);
        this.container.add([circle, lock]);
      }

      // Name
      const firstName = met ? suspect.name.split(' ')[0] : '???';
      const nameText = this.add.text(tx + 10, tabStripY - 2, firstName, {
        fontFamily: JOURNAL_FONT,
        fontSize: '22px',
        color: met ? (isSelected ? BOOK_INK : '#4a3a2a') : '#8a7a6a',
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5, 0.5);

      this.container.add([tabBg, nameText]);

      if (met) {
        tabBg.on('pointerdown', () => {
          this.selectedIndex = i;
          this.scene.restart();
        });
        tabBg.on('pointerover', () => {
          if (i !== this.selectedIndex) tabBg.setFillStyle(0x3a2a1a, 0.08);
        });
        tabBg.on('pointerout', () => {
          if (i !== this.selectedIndex) tabBg.setFillStyle(BOOK_PAPER, 0.01);
        });
      }
    });

    // ─── Detail area (below tabs) ───
    const detailTop = tabStripY + tabH / 2 + 14;
    const detailBottom = contentBottom;
    const detailH = detailBottom - detailTop;
    const detailW = paperW - 50;
    const detailCenterX = panelX;

    // Thin divider below tabs
    const tabDivGfx = this.add.graphics();
    tabDivGfx.lineStyle(1, BOOK_LEATHER, 0.2);
    tabDivGfx.lineBetween(paperLeft + 30, detailTop, paperLeft + paperW - 30, detailTop);
    this.container.add(tabDivGfx);

    if (isMet(SUSPECTS[this.selectedIndex])) {
      this.showSuspectDetail(SUSPECTS[this.selectedIndex], detailCenterX, detailTop, detailW, detailH, paperLeft, paperW);
    } else {
      const placeholder = this.add.text(detailCenterX, detailTop + detailH / 2,
        'Talk to people in the theater\nto learn about suspects.', {
        fontFamily: JOURNAL_FONT, fontSize: '28px', color: '#6a5a4a',
        fontStyle: 'italic', align: 'center', lineSpacing: 10,
      }).setOrigin(0.5);
      this.container.add(placeholder);
    }

    // Fade in
    this.container.setAlpha(0);
    this.tweens.add({ targets: this.container, alpha: 1, duration: 200 });
  }

  private showSuspectDetail(
    suspect: SuspectProfile,
    cx: number, detailTop: number, dw: number, dh: number,
    paperLeft: number, paperW: number,
  ): void {
    const colorHex = `#${suspect.color.toString(16).padStart(6, '0')}`;
    const save = SaveSystem.getInstance();
    const dialogue = DialogueSystem.getInstance();

    // ── Left column: portrait + info ──
    const leftW = 380;
    const leftX = cx - dw / 2;
    const leftCx = leftX + leftW / 2;
    const detailBottom = detailTop + dh;

    // Portrait card — subtle tinted area
    const cardTop = detailTop + 16;
    const cardH = Math.min(dh - 30, 620);
    const cardCy = cardTop + cardH / 2;

    const cardBg = this.add.rectangle(leftCx, cardCy, leftW, cardH, 0x3a2a1a, 0.05);
    cardBg.setStrokeStyle(1, BOOK_LEATHER, 0.15);
    this.container.add(cardBg);

    // Large portrait
    const portraitSize = 280;
    const portraitY = cardTop + 24 + portraitSize / 2;
    const portraitKey = `portrait_${suspect.id}`;

    if (this.textures.exists(portraitKey)) {
      const portrait = this.add.image(leftCx, portraitY, portraitKey);
      portrait.setDisplaySize(portraitSize, portraitSize);
      const maskGfx = this.make.graphics({});
      maskGfx.fillRoundedRect(
        leftCx - portraitSize / 2, portraitY - portraitSize / 2,
        portraitSize, portraitSize, 12
      );
      portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGfx));
      this.container.add(portrait);

      // Portrait frame — subtle suspect color border
      const frame = this.add.graphics();
      frame.lineStyle(2, suspect.color, 0.4);
      frame.strokeRoundedRect(
        leftCx - portraitSize / 2, portraitY - portraitSize / 2,
        portraitSize, portraitSize, 12
      );
      this.container.add(frame);
    } else {
      const iconBg = this.add.rectangle(leftCx, portraitY, portraitSize, portraitSize, suspect.color, 0.08);
      iconBg.setStrokeStyle(2, suspect.color, 0.25);
      const iconText = this.add.text(leftCx, portraitY, suspect.icon, {
        fontFamily: JOURNAL_FONT, fontSize: '100px', color: colorHex, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add([iconBg, iconText]);
    }

    // Name
    const nameY = portraitY + portraitSize / 2 + 26;
    this.container.add(this.add.text(leftCx, nameY, suspect.name, {
      fontFamily: JOURNAL_FONT,
      fontSize: '36px',
      color: BOOK_INK,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5));

    // Role
    this.container.add(this.add.text(leftCx, nameY + 44, suspect.role, {
      fontFamily: JOURNAL_FONT,
      fontSize: '26px',
      color: '#5a4a3a',
      fontStyle: 'italic',
    }).setOrigin(0.5));

    // Info line — age & location
    const infoY = nameY + 86;
    this.container.add(this.add.text(leftCx, infoY, `Age: ${suspect.age}  ·  ${suspect.location}`, {
      fontFamily: JOURNAL_FONT, fontSize: '24px', color: '#5a4a3a',
    }).setOrigin(0.5));

    // Discovery progress
    const discovered = suspect.facts.filter(f =>
      !f.requiresFlag || save.getFlag(f.requiresFlag) || dialogue.hasTriggeredEvent(f.requiresFlag)
    ).length;
    const total = suspect.facts.length;

    const progressY = infoY + 50;
    const progressW = 260;
    const progressH = 8;

    const trackBg = this.add.rectangle(leftCx, progressY, progressW, progressH, 0xD8CCB0, 1);
    trackBg.setStrokeStyle(1, BOOK_LEATHER, 0.2);
    this.container.add(trackBg);

    const pct = discovered / total;
    if (pct > 0) {
      const fill = this.add.rectangle(
        leftCx - progressW / 2 + (progressW * pct) / 2, progressY,
        progressW * pct, progressH, suspect.color, 0.7
      );
      this.container.add(fill);
    }

    this.container.add(this.add.text(leftCx, progressY + 22, `${discovered} / ${total} facts discovered`, {
      fontFamily: JOURNAL_FONT, fontSize: '22px', color: '#6a5a4a', fontStyle: 'italic',
    }).setOrigin(0.5));

    // ── Right column: Known Facts + Thoughts (scrollable) ──
    const rightX = leftX + leftW + 30;
    const rightW = dw - leftW - 30;
    const rightCx = rightX + rightW / 2;

    // Facts panel background
    const factsPanelTop = detailTop + 16;
    const factsPanelH = cardH;
    const factsCy = factsPanelTop + factsPanelH / 2;

    const factsBg = this.add.rectangle(rightCx, factsCy, rightW, factsPanelH, 0x3a2a1a, 0.04);
    factsBg.setStrokeStyle(1, BOOK_LEATHER, 0.12);
    this.container.add(factsBg);

    // Create scrollable detail container
    this.detailContainer = this.add.container(0, 0);
    this.detailContainer.setDepth(Depths.suspectContent);

    // Mask for scrolling
    const maskShape = this.make.graphics({});
    maskShape.fillRect(rightX, factsPanelTop + 4, rightW, factsPanelH - 8);
    this.detailMask = new Phaser.Display.Masks.GeometryMask(this, maskShape);
    this.detailContainer.setMask(this.detailMask);

    // Section header — KNOWN FACTS
    let y = factsPanelTop + 30;
    this.detailContainer.add(this.add.text(rightX + 28, y, 'KNOWN FACTS', {
      fontFamily: JOURNAL_FONT,
      fontSize: '26px',
      color: '#5a4a3a',
      fontStyle: 'bold',
      letterSpacing: 4,
    }));

    // Divider
    const divGfx = this.add.graphics();
    divGfx.lineStyle(1, BOOK_LEATHER, 0.3);
    divGfx.lineBetween(rightX + 28, y + 36, rightX + rightW - 28, y + 36);
    divGfx.fillStyle(BOOK_LEATHER, 0.4);
    const dmd = 3;
    const dmx = rightCx;
    divGfx.fillPoints([
      new Phaser.Geom.Point(dmx, y + 36 - dmd),
      new Phaser.Geom.Point(dmx + dmd, y + 36),
      new Phaser.Geom.Point(dmx, y + 36 + dmd),
      new Phaser.Geom.Point(dmx - dmd, y + 36),
    ], true);
    this.detailContainer.add(divGfx);

    y += 54;
    const factMaxW = rightW - 80;

    suspect.facts.forEach((fact, idx) => {
      const unlocked = !fact.requiresFlag ||
        save.getFlag(fact.requiresFlag) ||
        dialogue.hasTriggeredEvent(fact.requiresFlag);

      // Alternating subtle row tint
      if (idx % 2 === 0) {
        const rowBg = this.add.rectangle(rightCx, y + 16, rightW - 24, 52, BOOK_STAIN, 0.04);
        this.detailContainer.add(rowBg);
      }

      // Bullet
      const bullet = unlocked ? '◆' : '◇';
      const bulletColor = unlocked ? BOOK_INK : '#8a7a6a';
      this.detailContainer.add(this.add.text(rightX + 32, y, bullet, {
        fontFamily: JOURNAL_FONT, fontSize: '26px', color: bulletColor,
      }));

      // Fact text
      const displayText = unlocked ? fact.text : '— Undiscovered —';
      const factText = this.add.text(rightX + 62, y, displayText, {
        fontFamily: JOURNAL_FONT,
        fontSize: '26px',
        color: unlocked ? BOOK_INK : '#8a7a6a',
        fontStyle: unlocked ? 'normal' : 'italic',
        wordWrap: { width: factMaxW },
        lineSpacing: 5,
      });
      this.detailContainer.add(factText);

      y += Math.max(factText.height + 20, 52);
    });

    // ── Nancy's Thoughts ──
    const unlockedThoughts = suspect.thoughts.filter(t =>
      !t.requiresFlag || save.getFlag(t.requiresFlag) || dialogue.hasTriggeredEvent(t.requiresFlag)
    );

    if (unlockedThoughts.length > 0) {
      y += 16;

      // Divider
      const thoughtDivGfx = this.add.graphics();
      thoughtDivGfx.lineStyle(1, BOOK_LEATHER, 0.25);
      thoughtDivGfx.lineBetween(rightX + 40, y, rightX + rightW - 40, y);
      this.detailContainer.add(thoughtDivGfx);
      y += 24;

      // Section header
      this.detailContainer.add(this.add.text(rightX + 28, y, "NANCY'S THOUGHTS", {
        fontFamily: JOURNAL_FONT,
        fontSize: '24px',
        color: '#5a4a3a',
        fontStyle: 'bold italic',
        letterSpacing: 3,
      }));
      y += 42;

      // Most recent thought
      const latestThought = unlockedThoughts[unlockedThoughts.length - 1];
      const thoughtText = this.add.text(rightX + 32, y, latestThought.text, {
        fontFamily: JOURNAL_FONT,
        fontSize: '26px',
        color: '#3a4a5a',
        fontStyle: 'italic',
        wordWrap: { width: factMaxW },
        lineSpacing: 7,
      });
      this.detailContainer.add(thoughtText);
      y += thoughtText.height + 14;

      // Earlier thoughts — slightly lighter
      if (unlockedThoughts.length > 1) {
        for (let ti = unlockedThoughts.length - 2; ti >= 0; ti--) {
          const olderThought = unlockedThoughts[ti];
          const olderText = this.add.text(rightX + 32, y, olderThought.text, {
            fontFamily: JOURNAL_FONT,
            fontSize: '24px',
            color: '#5a6a7a',
            fontStyle: 'italic',
            wordWrap: { width: factMaxW },
            lineSpacing: 6,
          });
          this.detailContainer.add(olderText);
          y += olderText.height + 10;
        }
      }
    }

    // Calculate scroll bounds
    const contentEndY = y + 20;
    const visibleH = factsPanelH - 8;
    this.maxScrollY = Math.max(0, contentEndY - factsPanelTop - visibleH);
    this.scrollY = 0;

    // Scroll input
    if (this.maxScrollY > 0) {
      // Scroll indicator
      const scrollHint = this.add.text(rightX + rightW - 36, factsPanelTop + factsPanelH - 20, '▼', {
        fontFamily: JOURNAL_FONT, fontSize: '18px', color: '#8a7a6a',
      }).setOrigin(0.5);
      this.container.add(scrollHint);
      this.tweens.add({
        targets: scrollHint, alpha: 0.3, duration: 1000, yoyo: true, repeat: -1,
      });

      this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _go: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
        this.detailContainer.setY(-this.scrollY);
      });
    }
  }
}
