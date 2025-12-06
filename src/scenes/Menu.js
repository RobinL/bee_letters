import Phaser from 'phaser';
import { CURRICULUM_LETTER_ORDER, LETTER_ITEMS } from '../config.js';

export default class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
        this.selectedLetters = [];
        this.letterButtons = new Map();
    }

    create() {
        const { width, height } = this.scale;

        this.availableLetters = CURRICULUM_LETTER_ORDER.filter(letter => LETTER_ITEMS[letter]);

        if (!this.availableLetters.length) {
            this.cameras.main.setBackgroundColor('#f6f1ea');
            this.add.text(width / 2, height / 2, 'No letters available', {
                fontSize: '28px',
                fontFamily: 'Andika, Arial, sans-serif',
                color: '#5f4b32'
            }).setOrigin(0.5);
            return;
        }

        // Start with no pre-selected letters
        this.selectedLetters = [];

        this.cameras.main.setBackgroundColor('#f6f1ea');
        this.drawHeader(width);
        this.createLetterGrid(width, height);
        this.createStartButton(width, height);
        this.createWarningText(width, height);
        this.updateLetterStyles();
        this.updateStartButtonState();
    }

    drawHeader(width) {
        const title = this.add.text(width / 2, 70, 'Pick your three letters', {
            fontSize: '42px',
            fontFamily: 'Andika, Arial, sans-serif',
            color: '#3c3a2d'
        });
        title.setOrigin(0.5);

        const subtitle = this.add.text(width / 2, 120, 'Introduced in school order', {
            fontSize: '22px',
            fontFamily: 'Andika, Arial, sans-serif',
            color: '#6b5a40'
        });
        subtitle.setOrigin(0.5);
    }

    createLetterGrid(width, height) {
        const columns = 6;
        const spacing = 110;
        const startX = width / 2 - ((columns - 1) * spacing) / 2;
        const startY = height * 0.28;
        const buttonSize = 82;

        this.availableLetters.forEach((letter, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const x = startX + col * spacing;
            const y = startY + row * spacing;

            const container = this.add.container(x, y);
            const circle = this.add.circle(0, 0, buttonSize / 2, 0xffffff, 0.95);
            circle.setStrokeStyle(3, 0x94c973, 1);
            const label = this.add.text(0, 0, letter, {
                fontSize: '44px',
                fontFamily: 'Andika, Arial, sans-serif',
                color: '#3c3a2d'
            });
            label.setOrigin(0.5);

            const hitZone = this.add.zone(0, 0, buttonSize, buttonSize);
            hitZone.setOrigin(0.5);
            hitZone.setInteractive({ useHandCursor: true });
            hitZone.on('pointerdown', () => this.toggleLetter(letter));

            container.add([circle, label, hitZone]);
            container.setSize(buttonSize, buttonSize);

            this.letterButtons.set(letter, { container, circle });
        });
    }

    toggleLetter(letter) {
        const isSelected = this.selectedLetters.includes(letter);
        if (isSelected) {
            this.selectedLetters = this.selectedLetters.filter(l => l !== letter);
        } else if (this.selectedLetters.length < 3) {
            this.selectedLetters.push(letter);
        } else {
            this.showSelectionWarning();
        }

        this.updateLetterStyles();
        this.updateStartButtonState();
    }

    updateLetterStyles() {
        const canAddMore = this.selectedLetters.length < 3;

        this.letterButtons.forEach((button, letter) => {
            const isSelected = this.selectedLetters.includes(letter);
            const fillColor = isSelected ? 0xfff3c4 : 0xffffff;
            const strokeColor = isSelected ? 0xf2a65a : 0x94c973;
            button.circle.setFillStyle(fillColor, 0.98);
            button.circle.setStrokeStyle(3, strokeColor, 1);
            button.container.setAlpha(isSelected || canAddMore ? 1 : 0.45);
        });
    }

    createStartButton(width, height) {
        const y = height * 0.83;
        const buttonWidth = 260;
        const buttonHeight = 70;

        this.startButton = this.add.container(width / 2, y);
        const background = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x94c973, 1);
        background.setStrokeStyle(3, 0x6a8b5c, 1);
        const label = this.add.text(0, 0, 'Start game', {
            fontSize: '28px',
            fontFamily: 'Andika, Arial, sans-serif',
            color: '#ffffff'
        });
        label.setOrigin(0.5);

        const hitZone = this.add.zone(0, 0, buttonWidth, buttonHeight);
        hitZone.setOrigin(0.5);
        hitZone.setInteractive({ useHandCursor: true });
        hitZone.on('pointerdown', () => this.handleStart());

        this.startButton.add([background, label, hitZone]);
        this.startButton.setSize(buttonWidth, buttonHeight);
        this.startButtonBg = background;
    }

    updateStartButtonState() {
        const ready = this.selectedLetters.length === 3;
        this.startButtonBg.setFillStyle(ready ? 0x94c973 : 0xd8d8d8, 1);
        this.startButton.setAlpha(ready ? 1 : 0.6);
    }

    createWarningText(width, height) {
        this.warningText = this.add.text(width / 2, height * 0.9, '', {
            fontSize: '20px',
            fontFamily: 'Andika, Arial, sans-serif',
            color: '#b14d24'
        });
        this.warningText.setOrigin(0.5);
        this.warningText.setAlpha(0);
    }

    showSelectionWarning() {
        if (!this.warningText) return;
        this.tweens.killTweensOf(this.warningText);
        this.warningText.setText('Pick 3 letters. Tap one again to unselect.');
        this.warningText.setAlpha(1);
        this.tweens.add({
            targets: this.warningText,
            alpha: 0,
            duration: 1500,
            ease: 'Sine.easeOut',
            delay: 800
        });
    }

    handleStart() {
        if (this.selectedLetters.length !== 3) return;
        this.registry.set('activeLetters', [...this.selectedLetters]);
        this.scene.start('Preloader');
    }
}
