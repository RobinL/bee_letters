import Phaser from 'phaser';
import Preloader from './scenes/Preloader.js';
import Game from './scenes/Game.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#87CEEB', // Sky blue background
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Preloader, Game]
};

const game = new Phaser.Game(config);
