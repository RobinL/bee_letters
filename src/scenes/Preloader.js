import Phaser from 'phaser';
import { CURRICULUM_LETTER_ORDER, LETTER_ITEMS, LETTER_ITEM_VOICES } from '../config.js';
import { ITEM_IMAGE_MAP } from '../assets/itemAssets.js';
import flowerHead1 from '../assets/images/flower/flower_head_1.png';
import flowerHead2 from '../assets/images/flower/flower_head_2.png';
import flowerHead3 from '../assets/images/flower/flower_head_3.png';
import bee1 from '../assets/images/bees/bee_1.png';
import bee2 from '../assets/images/bees/bee_2.png';
import gardenBg from '../assets/images/background/garden.png';
import flowerBg from '../assets/images/background/flower_background.png';

const toAssetUrl = (mod) => {
    if (typeof mod === 'string') return mod;
    if (mod && typeof mod === 'object' && 'default' in mod) return mod.default;
    return '';
};

const STATIC_IMAGE_URLS = {
    flower_head_1: toAssetUrl(flowerHead1),
    flower_head_2: toAssetUrl(flowerHead2),
    flower_head_3: toAssetUrl(flowerHead3),
    bee_1: toAssetUrl(bee1),
    bee_2: toAssetUrl(bee2),
    garden_bg: toAssetUrl(gardenBg),
    flower_bg: toAssetUrl(flowerBg)
};

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

        const availableLetters = CURRICULUM_LETTER_ORDER.filter(letter => LETTER_ITEMS[letter]);
        const fallbackPool = availableLetters.length ? availableLetters : Object.keys(LETTER_ITEMS);
        const savedLetters = this.registry.get('activeLetters');
        const providedLetters = Array.isArray(savedLetters) ? savedLetters : [];

        this.activeLetters = providedLetters
            .filter(letter => fallbackPool.includes(letter))
            .slice(0, 3);

        if (!this.activeLetters.length) {
            this.activeLetters = fallbackPool.slice(0, Math.min(3, fallbackPool.length));
        }

        if (this.activeLetters.length === 0) {
            loadingText.setText('No letter items found');
            return;
        }

        // Persist chosen letters so the Game scene can reuse them
        this.registry.set('activeLetters', this.activeLetters);

        // Load flower heads
        this.load.image('flower_head_1', STATIC_IMAGE_URLS.flower_head_1);
        this.load.image('flower_head_2', STATIC_IMAGE_URLS.flower_head_2);
        this.load.image('flower_head_3', STATIC_IMAGE_URLS.flower_head_3);

        // Load item sprites dynamically from LETTER_ITEMS config
        this.activeLetters.forEach(letter => {
            const items = LETTER_ITEMS[letter] || [];
            items.forEach(itemName => {
                const key = `${letter}_${itemName}`;
                const itemUrl = ITEM_IMAGE_MAP[letter]?.[itemName];
                if (itemUrl) {
                    this.load.image(key, itemUrl);
                }
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
        this.load.image('bee_1', STATIC_IMAGE_URLS.bee_1);
        this.load.image('bee_2', STATIC_IMAGE_URLS.bee_2);

        // Load garden background
        this.load.image('garden_bg', STATIC_IMAGE_URLS.garden_bg);
        // Load flower column background
        this.load.image('flower_bg', STATIC_IMAGE_URLS.flower_bg);

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
