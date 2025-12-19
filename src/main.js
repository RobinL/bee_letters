import Phaser from 'phaser';
import Preloader from './scenes/Preloader.js';
import Game from './scenes/Game.js';
import Menu from './scenes/Menu.js';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1792,  // Calculated so items area (75%) = 1344px matches garden.png width
    height: 768,  // Matches garden.png height
    backgroundColor: '#87CEEB', // Sky blue background
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        // Capture touch events so the browser doesn't swallow drags on mobile
        touch: { capture: true },
        mouse: { preventDefaultDown: true },
        activePointers: 3
    },
    scene: [Menu, Preloader, Game]
};

const game = new Phaser.Game(config);
