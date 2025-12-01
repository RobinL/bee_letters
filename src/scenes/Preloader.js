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
            });
        });

        // Load bee sprites
        this.load.image('bee_1', 'assets/bees/bee_1.png');
        this.load.image('bee_2', 'assets/bees/bee_2.png');
    }

    create() {
        // Transition to the Game scene
        this.scene.start('Game');
    }
}
