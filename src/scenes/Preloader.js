import Phaser from 'phaser';
import { LETTER_ITEMS, LETTER_ITEM_VOICES } from '../config.js';

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Display loading text
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
            fontSize: '32px',
            fill: '#ffffff'
        });
        loadingText.setOrigin(0.5, 0.5);

        const allLetters = Object.keys(LETTER_ITEMS);
        const shuffledLetters = Phaser.Utils.Array.Shuffle([...allLetters]);
        const letterCount = Math.min(3, shuffledLetters.length);
        this.activeLetters = shuffledLetters.slice(0, letterCount);

        if (this.activeLetters.length === 0) {
            loadingText.setText('No letter items found');
            return;
        }

        // Persist chosen letters so the Game scene can reuse them
        this.registry.set('activeLetters', this.activeLetters);

        // Load flower heads
        this.load.image('flower_head_1', 'assets/flower/flower_head_1.png');
        this.load.image('flower_head_2', 'assets/flower/flower_head_2.png');
        this.load.image('flower_head_3', 'assets/flower/flower_head_3.png');

        // Load item sprites dynamically from LETTER_ITEMS config
        this.activeLetters.forEach(letter => {
            const items = LETTER_ITEMS[letter] || [];
            items.forEach(itemName => {
                const key = `${letter}_${itemName}`;
                const path = `assets/items/${letter}/${itemName}.png`;
                this.load.image(key, path);
            });

            const voicedItems = LETTER_ITEM_VOICES[letter] || [];
            voicedItems.forEach(itemName => {
                this.load.audio(`voice_${letter}_${itemName}`, `assets/voice/${letter}/${itemName}.webm`);
            });
        });

        // Load standalone alphabet letter voices (a, b, c, ...)
        this.activeLetters.forEach(letter => {
            this.load.audio(`voice_letter_${letter}`, `assets/voice/alphabet/${letter}.webm`);
        });

        // Load bee sprites
        this.load.image('bee_1', 'assets/bees/bee_1.png');
        this.load.image('bee_2', 'assets/bees/bee_2.png');

        // Load garden background
        this.load.image('garden_bg', 'assets/background/garden.png');
        // Load flower column background
        this.load.image('flower_bg', 'assets/background/flower_background.png');

        // Load Google WebFont loader to ensure Andika is available before we render text
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');

        // Load background music
        this.load.audio('music', 'assets/music/music.mp3');
    }

    create() {
        // Ensure the Andika font is fully loaded before starting the game scene
        if (window.WebFont) {
            window.WebFont.load({
                google: { families: ['Andika'] },
                active: () => this.scene.start('Game'),
                inactive: () => this.scene.start('Game')
            });
        } else {
            // Fallback: proceed immediately if WebFont failed to load
            this.scene.start('Game');
        }
    }
}
