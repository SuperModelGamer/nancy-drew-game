import Phaser from 'phaser';

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
      'Edwin Hale was arrested for the poisoning of Roland Ashworth and for staging the hauntings. He went quietly.',
      'The letters proving Cecilia Drake murdered Margaux Fontaine were submitted to the Historical Society. The 1928 case was officially reopened and closed — justice delivered nearly a century late.',
      'The Monarch Theatre was demolished on schedule. In its place, a small plaque reads: \'Here stood the Monarch Theatre, 1923–2026. Home of Margaux Fontaine, who deserved better.\'',
      'Vivian Delacroix moved to a small apartment downtown. She kept one thing from the theater: the playbill from opening night, 1923.',
    ],
  },
  exposure: {
    title: 'Exposure',
    subtitle: 'The truth, all of it, came to light.',
    paragraphs: [
      'Nancy and Edwin went public together. The story of Margaux Fontaine\'s murder — and Edwin\'s desperate, criminal attempt to save her legacy — made national news.',
      'Edwin faced charges for the poisoning but received a reduced sentence after cooperating fully. The judge called it \'a crime born of devotion, not malice.\'',
      'The Monarch Theatre was granted emergency landmark status. A restoration campaign raised $2.1 million in its first month. The theater reopened with a memorial performance of The Crimson Veil.',
      'Vivian Delacroix watched from the front row, in the same seat her godmother had performed for. For the first time in years, the Monarch\'s lights burned bright.',
    ],
  },
  mercy: {
    title: 'Mercy',
    subtitle: 'Some truths are told in whispers.',
    paragraphs: [
      'Edwin Hale disappeared that night. No one saw him leave. His apartment was empty, his research donated anonymously to the university.',
      'Nancy submitted Cecilia Drake\'s confession letter to the Historical Society without naming Edwin. The 1928 murder was exposed, but the ghost of the Monarch remained a mystery.',
      'Ashworth recovered fully. Shaken by the experience, he sold the theater to a preservation trust for $800,000 — far less than his insurance payout would have been. Some said he felt guilty. Others said he was afraid.',
      'The Monarch Theatre survived. Vivian Delacroix became its honorary director. She never asked Nancy what happened to Edwin. She didn\'t need to.',
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
    const content = ENDINGS[this.endingType] || ENDINGS.justice;

    // Full screen black background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    let currentDelay = 0;

    // Title — fades in first
    const title = this.add.text(width / 2, 80, content.title, {
      fontFamily: 'Georgia, serif',
      fontSize: '42px',
      color: '#c9a84c',
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
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      fontStyle: 'italic',
      color: '#8a7a5a',
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
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#e0d5c0',
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
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      fontStyle: 'italic',
      color: '#c9a84c',
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
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#c9a84c',
      align: 'center',
    });
    returnButton.setOrigin(0.5);
    returnButton.setAlpha(0);
    returnButton.setInteractive({ useHandCursor: true });

    returnButton.on('pointerover', () => {
      returnButton.setStyle({ color: '#e0d5c0' });
    });
    returnButton.on('pointerout', () => {
      returnButton.setStyle({ color: '#c9a84c' });
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
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: '#5a5a5a',
      align: 'center',
    });
    creditTitle.setOrigin(0.5);
    creditTitle.setAlpha(0);

    const creditAuthor = this.add.text(width / 2, creditsY + 24, 'Created by Carley Beck', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: '#5a5a5a',
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
