import Phaser from 'phaser';
import {
    SIDEBAR_RATIO,
    DROP_DISTANCE,
    BEE_FLIGHT_DURATION,
    TRAIL_PERSISTENCE,
    SPIRO_R,
    SPIRO_r,
    SPIRO_d,
    SPIRO_SPEED
} from '../config.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.activeBees = []; // Track active bee animations
    }

    create() {
        const { width, height } = this.cameras.main;
        this.sidebarWidth = width * SIDEBAR_RATIO;

        // Create graphics object for bee trails
        this.trailGraphics = this.add.graphics();

        // Step 3: Draw debug zone visualization
        this.drawLayoutZones(this.sidebarWidth, width, height);

        // Step 4: Render the flower column
        this.createFlowerColumn(this.sidebarWidth, height);

        // Step 5: Spawn random items on the right
        this.spawnItems(this.sidebarWidth, width, height);

        // Setup drag and drop input
        this.setupDragAndDrop();

        // Store trail points for fading effect
        this.trailPoints = [];
    }

    update(time, delta) {
        // Update all active bee animations
        this.activeBees.forEach(beeData => {
            this.updateBeeSpirograph(beeData, delta);
        });

        // Draw and fade trails
        this.drawTrails(delta);
    }

    updateBeeSpirograph(beeData, delta) {
        // Increment angle
        beeData.angle += SPIRO_SPEED;

        // Spirograph formula
        // x = (R - r) * cos(t) + d * cos((R - r) / r * t)
        // y = (R - r) * sin(t) + d * sin((R - r) / r * t)
        const t = beeData.angle;
        const R = SPIRO_R;
        const r = SPIRO_r;
        const d = SPIRO_d;

        const x = beeData.centerX + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
        const y = beeData.centerY + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);

        // Store previous position for trail (use lastX/lastY from previous frame)
        if (beeData.lastX !== undefined && beeData.lastY !== undefined) {
            this.trailPoints.push({
                x1: beeData.lastX,
                y1: beeData.lastY,
                x2: x,
                y2: y,
                alpha: 1,
                color: beeData.trailColor
            });
        }

        // Update bee position
        beeData.bee.x = x;
        beeData.bee.y = y;

        // Store current position for next frame's trail
        beeData.lastX = x;
        beeData.lastY = y;

        // No rotation - keep bee upright
    }

    drawTrails(delta) {
        this.trailGraphics.clear();

        // Update and draw each trail point
        this.trailPoints = this.trailPoints.filter(point => {
            // Fade out
            point.alpha -= delta / TRAIL_PERSISTENCE;

            if (point.alpha <= 0) {
                return false; // Remove this point
            }

            // Draw line segment with current alpha
            this.trailGraphics.lineStyle(3, point.color, point.alpha);
            this.trailGraphics.beginPath();
            this.trailGraphics.moveTo(point.x1, point.y1);
            this.trailGraphics.lineTo(point.x2, point.y2);
            this.trailGraphics.strokePath();

            return true; // Keep this point
        });
    }

    spawnBeeSpirograph(flower) {
        // Pick a random bee
        const beeKey = Phaser.Utils.Array.GetRandom(['bee_1', 'bee_2']);
        const bee = this.add.sprite(flower.x, flower.y, beeKey);

        // Scale bee to a nice size
        const targetSize = 40;
        const scale = targetSize / Math.max(bee.width, bee.height);
        bee.setScale(scale);

        // Random trail color (bright, cheerful colors)
        const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
        const trailColor = Phaser.Utils.Array.GetRandom(colors);

        // Create bee data object
        const beeData = {
            bee: bee,
            centerX: flower.x,
            centerY: flower.y,
            angle: 0,
            trailColor: trailColor,
            lastX: undefined,
            lastY: undefined
        };

        this.activeBees.push(beeData);

        // Remove bee after duration
        this.time.delayedCall(BEE_FLIGHT_DURATION, () => {
            // Fade out bee
            this.tweens.add({
                targets: bee,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    bee.destroy();
                    const index = this.activeBees.indexOf(beeData);
                    if (index > -1) {
                        this.activeBees.splice(index, 1);
                    }
                }
            });
        });
    }

    setupDragAndDrop() {
        // Enable drag events
        this.input.on('dragstart', (pointer, gameObject) => {
            // Bring to top when dragging
            this.children.bringToTop(gameObject);
            gameObject.setTint(0xcccccc);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragend', (pointer, gameObject) => {
            gameObject.clearTint();

            // Check if dropped on a flower
            const itemData = this.items.find(item => item.sprite === gameObject);
            if (!itemData) return;

            // Find the closest flower
            let closestFlower = null;
            let closestDistance = Infinity;

            this.flowers.forEach(flower => {
                const distance = Phaser.Math.Distance.Between(
                    gameObject.x, gameObject.y,
                    flower.x, flower.y
                );
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestFlower = flower;
                }
            });

            // Check if close enough to a flower
            if (closestFlower && closestDistance < DROP_DISTANCE) {
                // Check if letter matches
                if (itemData.letter === closestFlower.letter) {
                    // Correct match!
                    this.onCorrectMatch(gameObject, closestFlower, itemData);
                } else {
                    // Wrong match - return to original position
                    this.onWrongMatch(gameObject, itemData);
                }
            }
        });
    }

    onCorrectMatch(sprite, flower, itemData) {
        // Visual feedback for correct match
        this.tweens.add({
            targets: sprite,
            x: flower.x,
            y: flower.y,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                sprite.destroy();
                // Remove from items array
                const index = this.items.indexOf(itemData);
                if (index > -1) {
                    this.items.splice(index, 1);
                }
            }
        });

        // Flash the flower green
        flower.sprite.setTint(0x00ff00);
        this.time.delayedCall(300, () => {
            flower.sprite.clearTint();
        });

        // Spawn bee with spirograph animation!
        this.spawnBeeSpirograph(flower);

        console.log('Correct! 🎉');
    }

    onWrongMatch(sprite, itemData) {
        // Shake and return to original position
        this.tweens.add({
            targets: sprite,
            x: itemData.originalX,
            y: itemData.originalY,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Flash red
        sprite.setTint(0xff0000);
        this.time.delayedCall(200, () => {
            sprite.clearTint();
        });

        console.log('Try again!');
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
        const letters = ['a', 'b', 'c']; // lowercase letters
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

            // Scale flower to fit nicely in the sidebar (smaller size)
            const targetSize = sidebarWidth * 0.5;
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
                y: yPos,
                radius: (targetSize * scale) / 2
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

            // Make item interactive and draggable
            item.setInteractive({ draggable: true });

            this.items.push({
                sprite: item,
                key: key,
                letter: 'a', // All current items are for letter 'a'
                originalX: x,
                originalY: y
            });
        });
    }
}
