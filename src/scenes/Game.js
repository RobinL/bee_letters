import Phaser from 'phaser';

// Layout constants
const SIDEBAR_RATIO = 0.25; // Flower zone takes 25% of screen width

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        const { width, height } = this.cameras.main;
        const sidebarWidth = width * SIDEBAR_RATIO;

        // Step 3: Draw debug zone visualization
        this.drawLayoutZones(sidebarWidth, width, height);

        // Step 4: Render the flower column
        this.createFlowerColumn(sidebarWidth, height);

        // Step 5: Spawn random items on the right
        this.spawnItems(sidebarWidth, width, height);
    }

    drawLayoutZones(sidebarWidth, width, height) {
        // Draw semi-transparent overlay on flower zone for debugging
        const debugZone = this.add.rectangle(
            sidebarWidth / 2,
            height / 2,
            sidebarWidth,
            height,
            0x90EE90, // Light green
            0.2 // 20% opacity
        );

        // Draw separator line
        const graphics = this.add.graphics();
        graphics.lineStyle(3, 0x228B22, 1); // Forest green line
        graphics.beginPath();
        graphics.moveTo(sidebarWidth, 0);
        graphics.lineTo(sidebarWidth, height);
        graphics.strokePath();
    }

    createFlowerColumn(sidebarWidth, height) {
        const centerX = sidebarWidth / 2;
        const letters = ['A', 'B', 'C'];
        const flowerKeys = ['flower_head_1', 'flower_head_2', 'flower_head_3'];

        // Store flower references for later collision detection
        this.flowers = [];

        for (let i = 0; i < 3; i++) {
            // Position at 25%, 50%, 75% of height
            const yPos = height * (0.25 + i * 0.25);

            // Pick a random flower head
            const flowerKey = Phaser.Utils.Array.GetRandom(flowerKeys);

            // Create flower sprite
            const flower = this.add.sprite(centerX, yPos, flowerKey);

            // Scale flower to fit nicely in the sidebar
            const targetSize = sidebarWidth * 0.7;
            const scale = targetSize / Math.max(flower.width, flower.height);
            flower.setScale(scale);

            // Add letter text in center of flower
            const letterText = this.add.text(centerX, yPos, letters[i], {
                fontSize: '48px',
                fontFamily: 'Arial Black, Arial, sans-serif',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            });
            letterText.setOrigin(0.5, 0.5);

            // Store flower data
            this.flowers.push({
                sprite: flower,
                letter: letters[i],
                x: centerX,
                y: yPos
            });
        }
    }

    spawnItems(sidebarWidth, width, height) {
        const itemKeys = ['a_item_1', 'a_item_2', 'a_item_3', 'a_item_6', 'a_item_7'];
        const padding = 60;

        // Define play zone boundaries
        const minX = sidebarWidth + padding;
        const maxX = width - padding;
        const minY = padding;
        const maxY = height - padding;

        // Store item references
        this.items = [];

        itemKeys.forEach((key) => {
            // Generate random position in play zone
            const x = Phaser.Math.Between(minX, maxX);
            const y = Phaser.Math.Between(minY, maxY);

            // Create item sprite
            const item = this.add.sprite(x, y, key);

            // Scale items to a reasonable size
            const targetSize = 80;
            const scale = targetSize / Math.max(item.width, item.height);
            item.setScale(scale);

            // Add slight random rotation for visual interest
            item.setAngle(Phaser.Math.Between(-15, 15));

            this.items.push({
                sprite: item,
                key: key,
                letter: 'a' // All current items are for letter 'a'
            });
        });
    }
}
