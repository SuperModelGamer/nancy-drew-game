import Phaser from 'phaser';
import { TextColors, FONT } from '../utils/constants';
import { POINTER_CURSOR, initSceneCursor } from '../utils/cursors';

interface EndingData {
  ending: string;
}

interface EndingContent {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

const ENDINGS: Record<string, EndingContent> = {
  justice: {
    title: 'Justice',
    subtitle: 'The law took its course.',
    paragraphs: [
      'Edwin Hale was arrested for the poisoning of Roland Ashworth and for staging the hauntings. When they put the handcuffs on, he looked at me and nodded. He\'d been carrying this alone for too long.',
      'I submitted the letters proving Cecilia Drake murdered Margaux Fontaine to the Historical Society. The 1928 case was officially reopened and closed — justice delivered nearly a century late. Margaux\'s name was finally cleared.',
      'The Monarch Theatre was demolished on schedule. Three weeks later, I drove past the empty lot. A small bronze plaque had been placed where the stage door used to be: "Here stood the Monarch Theatre, 1923–2026. Home of Margaux Fontaine, who deserved better."',
      'Vivian Delacroix moved to a small apartment downtown. She kept one thing from the theater: the playbill from opening night, 1923. She framed it above her mantel.',
      'Before I left River Heights, Vivian took my hand. "You kept your promise," she said. "You found the truth. That the building is gone... I\'ve made my peace with that. Margaux lives in what we remember, not in bricks and velvet. Thank you, Nancy."',
    ],
  },
  exposure: {
    title: 'Exposure',
    subtitle: 'The truth, all of it, came to light.',
    paragraphs: [
      'Edwin and I went public together. The story of Margaux Fontaine\'s murder — and Edwin\'s desperate, criminal attempt to save her legacy — made the front page of every paper in the state. The truth about 1928 was finally told.',
      'Edwin faced charges for the poisoning but received a reduced sentence after cooperating fully. At sentencing, the judge called it "a crime born of devotion, not malice." I wasn\'t sure I agreed, but I understood.',
      'The Monarch Theatre was granted emergency landmark status. A restoration campaign raised $2.1 million in its first month. When it reopened six months later with a memorial performance of The Crimson Veil, I was there.',
      'Vivian Delacroix sat in the front row, in the same seat where her godmother had once watched Margaux perform. When the lights came up on the restored stage, I saw tears on her cheeks. But she was smiling.',
      'After the curtain fell, Vivian found me in the lobby. Her eyes were red but her voice was steady. "She would have loved this," she whispered. "All those years I kept this theater alive, I thought I was doing it for her. But she was keeping me alive, too. Thank you for giving us both a curtain call."',
    ],
  },
  mercy: {
    title: 'Mercy',
    subtitle: 'Some truths are told in whispers.',
    paragraphs: [
      'Edwin Hale disappeared that night. No one saw him leave. When police checked his apartment, it was empty — his research donated anonymously to the university, his life packed into a single suitcase. I sometimes wonder where he went.',
      'I submitted Cecilia Drake\'s confession letter to the Historical Society without naming Edwin. The 1928 murder was finally exposed, but the ghost of the Monarch remained an unsolved mystery. Some cases, I\'ve learned, are better left that way.',
      'Ashworth recovered fully. Shaken by his brush with death, he sold the Monarch to a preservation trust for a fraction of its value. When reporters asked why, he said he\'d had "a change of perspective." I think he was afraid.',
      'The Monarch Theatre survived. Vivian Delacroix became its honorary director. She never asked me what happened to Edwin in the basement that night. She didn\'t need to. Some things you understand without words.',
      'On my last night in River Heights, Vivian walked me to the door. "I know you made a choice down there," she said quietly. "I won\'t ask what it was. But the theater is still standing, and Margaux\'s name is in the light again. Whatever you decided... I think it was the right thing." She pressed the locket into my hand. "Keep it. You earned it, little star."',
    ],
  },
};

export class EndingScene extends Phaser.Scene {
  private endingType: string = 'justice';

  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data: EndingData): void {
    this.endingType = data.ending || 'justice';
  }

  create(): void {
    const { width, height } = this.cameras.main;
    initSceneCursor(this);
    const content = ENDINGS[this.endingType] || ENDINGS.justice;

    // Full screen black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    let currentDelay = 0;

    // Title — fades in first
    const title = this.add.text(width / 2, 80, content.title, {
      fontFamily: FONT,
      fontSize: '63px',
      color: TextColors.gold,
      align: 'center',
    });
    title.setOrigin(0.5);
    title.setAlpha(0);
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 800,
      delay: currentDelay,
    });

    // Subtitle — fades in after 1.5s
    currentDelay = 1500;
    const subtitle = this.add.text(width / 2, 130, content.subtitle, {
      fontFamily: FONT,
      fontSize: '27px',
      fontStyle: 'italic',
      color: TextColors.goldDim,
      align: 'center',
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0);
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 800,
      delay: currentDelay,
    });

    // Paragraphs — fade in sequentially, 1s apart, starting at 3s
    const paragraphStartY = 190;
    const paragraphSpacing = 18;
    let nextY = paragraphStartY;
    currentDelay = 3000;

    const paragraphTexts: Phaser.GameObjects.Text[] = [];

    for (let i = 0; i < content.paragraphs.length; i++) {
      const para = this.add.text(width / 2, nextY, content.paragraphs[i], {
        fontFamily: FONT,
        fontSize: '33px',
        color: TextColors.light,
        align: 'center',
        wordWrap: { width: 600 },
        lineSpacing: 4,
      });
      para.setOrigin(0.5, 0);
      para.setAlpha(0);

      this.tweens.add({
        targets: para,
        alpha: 1,
        duration: 800,
        delay: currentDelay,
      });

      paragraphTexts.push(para);
      nextY += para.height + paragraphSpacing;
      currentDelay += 1000;
    }

    // "— The End —" after all paragraphs
    const theEnd = this.add.text(width / 2, nextY + 30, '\u2014 The End \u2014', {
      fontFamily: FONT,
      fontSize: '33px',
      fontStyle: 'italic',
      color: TextColors.gold,
      align: 'center',
    });
    theEnd.setOrigin(0.5);
    theEnd.setAlpha(0);
    this.tweens.add({
      targets: theEnd,
      alpha: 1,
      duration: 800,
      delay: currentDelay,
    });

    // "Return to Title" button after another 2s
    currentDelay += 2000;
    const returnButton = this.add.text(width / 2, nextY + 80, 'Return to Title', {
      fontFamily: FONT,
      fontSize: '27px',
      color: TextColors.gold,
      align: 'center',
    });
    returnButton.setOrigin(0.5);
    returnButton.setAlpha(0);
    returnButton.setInteractive({ cursor: POINTER_CURSOR });

    returnButton.on('pointerover', () => {
      returnButton.setStyle({ color: TextColors.light });
    });
    returnButton.on('pointerout', () => {
      returnButton.setStyle({ color: TextColors.gold });
    });
    returnButton.on('pointerdown', () => {
      this.scene.stop('RoomScene');
      this.scene.stop('UIScene');
      this.scene.stop();
      this.scene.start('TitleScene');
    });

    this.tweens.add({
      targets: returnButton,
      alpha: 1,
      duration: 800,
      delay: currentDelay,
    });

    // Credits section — appears 1s after the return button
    currentDelay += 1000;
    const creditsY = nextY + 130;

    const creditTitle = this.add.text(width / 2, creditsY, 'Nancy Drew: The Last Curtain Call', {
      fontFamily: FONT,
      fontSize: '20px',
      fontStyle: 'italic',
      color: TextColors.muted,
      align: 'center',
    });
    creditTitle.setOrigin(0.5);
    creditTitle.setAlpha(0);

    const creditAuthor = this.add.text(width / 2, creditsY + 24, 'Created by Carley Beck', {
      fontFamily: FONT,
      fontSize: '20px',
      fontStyle: 'italic',
      color: TextColors.muted,
      align: 'center',
    });
    creditAuthor.setOrigin(0.5);
    creditAuthor.setAlpha(0);

    this.tweens.add({
      targets: [creditTitle, creditAuthor],
      alpha: 1,
      duration: 800,
      delay: currentDelay,
    });
  }
}
