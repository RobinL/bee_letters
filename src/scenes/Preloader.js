import Phaser from 'phaser';
import { LETTER_ITEMS } from '../config.js';

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

        // Load flower heads
        this.load.image('flower_head_1', 'assets/flower/flower_head_1.png');
        this.load.image('flower_head_2', 'assets/flower/flower_head_2.png');
        this.load.image('flower_head_3', 'assets/flower/flower_head_3.png');

        // Load item sprites dynamically from LETTER_ITEMS config
        Object.entries(LETTER_ITEMS).forEach(([letter, items]) => {
            items.forEach(itemName => {
                const key = `${letter}_${itemName}`;
                const path = `assets/items/${letter}/${itemName}.png`;
                this.load.image(key, path);
                // Load matching voice clip
                this.load.audio(`voice_${letter}_${itemName}`, `assets/voice/${letter}/${itemName}.webm`);
            });
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
