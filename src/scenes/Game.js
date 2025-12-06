import Phaser from 'phaser';
import {
    SIDEBAR_RATIO,
    DROP_DISTANCE,
    BEE_FLIGHT_DURATION,
    TRAIL_PERSISTENCE,
    PETAL_PRESETS,
    SPIRO_VARIATION,
    SPIRO_SPEED,
    LETTER_ITEMS,
    MUSIC_DEFAULT_VOLUME,
    VOICE_DEFAULT_VOLUME
} from '../config.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.activeOrbiters = []; // Track item spirograph animations
        this.backHoldTimer = null;
        this.backHoldTriggered = false;
    }

    create() {
        const { width, height } = this.cameras.main;
        const savedLetters = this.registry.get('activeLetters');
        const availableLetters = Object.keys(LETTER_ITEMS);

        if (Array.isArray(savedLetters) && savedLetters.length) {
            this.activeLetters = [...savedLetters];
        } else {
            this.activeLetters = Phaser.Utils.Array.Shuffle([...availableLetters]).slice(0, 3);
        }

        if (!this.activeLetters.length) {
            this.activeLetters = availableLetters.slice(0, 3);
        }

        this.sidebarWidth = width * SIDEBAR_RATIO;

        // Add garden background to the right side (items area)
        this.createGardenBackground(this.sidebarWidth, width, height);

        // Add flower background on the left side (flower area)
        this.createFlowerBackground(this.sidebarWidth, height);

        // Separator line between areas
        this.drawLayoutZones(this.sidebarWidth, width, height);

        // Step 4: Render the flower column
        this.createFlowerColumn(this.sidebarWidth, height);

        // Create graphics object for bee trails (after flowers so it renders on top)
        this.trailGraphics = this.add.graphics();
        this.trailGraphics.setDepth(100); // Ensure trails are on top of flowers

        // Step 5: Spawn random items on the right
        this.spawnItems(this.sidebarWidth, width, height);

        // Setup drag and drop input
        this.setupDragAndDrop();

        // Store trail points for fading effect
        this.trailPoints = [];

        // Start background music
        this.startMusic();

        // Create volume slider UI
        this.createVolumeSlider(width, height);

        // Navigation back to the menu (hold to activate)
        this.createBackButton(width);

        // Show quick instructions in the top-right corner
        this.createInstructionText(width);

        // Clean up when leaving the scene
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene());
    }

    update(time, delta) {
        // Update all active spirograph animations
        this.activeOrbiters.forEach(orbitData => {
            this.updateOrbitingItem(orbitData, delta);
        });

        // Draw and fade trails
        this.drawTrails(delta);
    }

    updateOrbitingItem(orbitData, delta) {
        // Increment angle
        orbitData.angle += SPIRO_SPEED;

        const { x, y } = this.calculateSpirographPoint(
            orbitData.centerX,
            orbitData.centerY,
            orbitData.spiroR,
            orbitData.spiroR_inner,
            orbitData.spiroD,
            orbitData.angle
        );

        // Store previous position for trail (use lastX/lastY from previous frame)
        if (orbitData.lastX !== undefined && orbitData.lastY !== undefined) {
            this.trailPoints.push({
                x1: orbitData.lastX,
                y1: orbitData.lastY,
                x2: x,
                y2: y,
                alpha: 1,
                color: orbitData.trailColor
            });
        }

        // Update sprite position
        orbitData.sprite.x = x;
        orbitData.sprite.y = y;

        // Store current position for next frame's trail
        orbitData.lastX = x;
        orbitData.lastY = y;
    }

    calculateSpirographPoint(centerX, centerY, R, r, d, t) {
        // Spirograph formula
        // x = (R - r) * cos(t) + d * cos((R - r) / r * t)
        // y = (R - r) * sin(t) + d * sin((R - r) / r * t)
        return {
            x: centerX + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t),
            y: centerY + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)
        };
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

    startItemSpirograph(sprite, flower) {
        // Random trail color (bright, cheerful colors)
        const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
        const trailColor = Phaser.Utils.Array.GetRandom(colors);

        // Pick a random petal preset and apply slight variation
        const preset = Phaser.Utils.Array.GetRandom(PETAL_PRESETS);
        const vary = (value) => {
            const variation = 1 + (Math.random() * 2 - 1) * SPIRO_VARIATION;
            return value * variation;
        };

        // Create data object with unique spirograph parameters
        const orbitData = {
            sprite,
            centerX: flower.x,
            centerY: flower.y,
            angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
            trailColor: trailColor,
            lastX: undefined,
            lastY: undefined,
            // Unique spirograph parameters for this item
            spiroR: vary(preset.R),
            spiroR_inner: vary(preset.r),
            spiroD: vary(preset.d)
        };

        // Place sprite at its starting point and render above other items
        const startPoint = this.calculateSpirographPoint(
            orbitData.centerX,
            orbitData.centerY,
            orbitData.spiroR,
            orbitData.spiroR_inner,
            orbitData.spiroD,
            orbitData.angle
        );
        sprite.setDepth(50);
        // Shrink the orbiting item to roughly one third of its displayed size
        sprite.setScale(sprite.scaleX * 0.5, sprite.scaleY * 0.5);
        sprite.x = startPoint.x;
        sprite.y = startPoint.y;

        // Hide the glow effect when orbiting
        if (sprite.glowEffect) {
            sprite.glowEffect.destroy();
            sprite.glowEffect = null;
        }

        this.activeOrbiters.push(orbitData);

        // Remove item after duration
        this.time.delayedCall(BEE_FLIGHT_DURATION, () => {
            // Fade out item
            this.tweens.add({
                targets: sprite,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    // Clean up glow effect if it exists
                    if (sprite.glowEffect) {
                        sprite.glowEffect.destroy();
                    }
                    sprite.destroy();
                    const index = this.activeOrbiters.indexOf(orbitData);
                    if (index > -1) {
                        this.activeOrbiters.splice(index, 1);
                    }
                }
            });
        });
    }

    setupDragAndDrop() {
        // Enable drag events
        this.input.on('dragstart', (pointer, gameObject) => {
            if (gameObject === this.sliderKnob) return;
            // Bring to top when dragging
            this.children.bringToTop(gameObject);
            gameObject.setTint(0xcccccc);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject === this.sliderKnob) return;
            gameObject.x = dragX;
            gameObject.y = dragY;

            // Move glow effect with item
            if (gameObject.glowEffect) {
                gameObject.glowEffect.setPosition(dragX, dragY);
            }
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (gameObject === this.sliderKnob) return;
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
                    this.onWrongMatch(gameObject, closestFlower, itemData);
                }
            }
        });
    }

    onCorrectMatch(sprite, flower, itemData) {
        // Remove from items list and prevent further dragging
        const index = this.items.indexOf(itemData);
        if (index > -1) {
            this.items.splice(index, 1);
        }
        sprite.disableInteractive();
        sprite.clearTint();
        sprite.setAngle(0);

        // Flash the flower green
        flower.sprite.setTint(0x00ff00);
        this.time.delayedCall(300, () => {
            flower.sprite.clearTint();
        });
        this.playLetterPulse(flower.letterText);

        // Make the matched item fly a spirograph path around the flower
        this.startItemSpirograph(sprite, flower);

        // Add a new item if any remain in the pool
        this.spawnItemFromPool();

        // Check if the game is complete
        this.checkForCompletion();

        console.log('Correct! 🎉');
    }

    onWrongMatch(sprite, flower, itemData) {
        // Shake and return to original position
        this.tweens.add({
            targets: sprite,
            x: itemData.originalX,
            y: itemData.originalY,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Flash the flower red and shrink the letter before restoring it
        if (flower && flower.sprite) {
            flower.sprite.setTint(0xff0000);
            this.time.delayedCall(300, () => {
                flower.sprite.clearTint();
            });
        }

        if (flower && flower.letterText) {
            this.playLetterShrink(flower.letterText);
        }

        console.log('Try again!');
    }

    createGardenBackground(sidebarWidth, width, height) {
        // Calculate the play area dimensions (right side)
        const playAreaWidth = width - sidebarWidth;
        const playAreaCenterX = sidebarWidth + playAreaWidth / 2;

        // Add garden background image - dimensions match exactly now
        const gardenBg = this.add.image(playAreaCenterX, height / 2, 'garden_bg');

        // Scale to fit the play area exactly
        const scaleX = playAreaWidth / gardenBg.width;
        const scaleY = height / gardenBg.height;
        gardenBg.setScale(scaleX, scaleY);

        // Set depth to ensure it's behind other elements
        gardenBg.setDepth(-1);
    }

    createFlowerBackground(sidebarWidth, height) {
        // Centered in the left column
        const centerX = sidebarWidth / 2;
        const centerY = height / 2;

        const flowerBg = this.add.image(centerX, centerY, 'flower_bg');

        // Stretch to fit the sidebar exactly (allow aspect ratio change)
        flowerBg.setDisplaySize(sidebarWidth, height);
        flowerBg.setDepth(-1);
    }

    drawLayoutZones(sidebarWidth, width, height) {
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
        const flowerKeys = ['flower_head_1', 'flower_head_2', 'flower_head_3'];
        const letters = (this.activeLetters && this.activeLetters.length)
            ? this.activeLetters.slice(0, flowerKeys.length)
            : [];

        // Store flower references for later collision detection
        this.flowers = [];

        const flowerCount = Math.min(letters.length, flowerKeys.length);
        const verticalStart = flowerCount === 1 ? 0.5 : 0.2;
        const verticalStep = flowerCount <= 1 ? 0 : 0.6 / (flowerCount - 1);

        for (let i = 0; i < flowerCount; i++) {

            const yPos = height * (verticalStart + i * verticalStep);

            // Use flower heads in fixed order (1, 2, 3 from top to bottom)
            const flowerKey = flowerKeys[i];

            // Create flower sprite
            const flower = this.add.sprite(centerX, yPos, flowerKey);

            // Scale flower to fit nicely in the sidebar (25% smaller than before)
            const targetSize = sidebarWidth * 0.375;
            const scale = targetSize / Math.max(flower.width, flower.height);
            flower.setScale(scale);

            // Add letter text in center of flower
            const letterText = this.add.text(centerX, yPos, letters[i], {
                fontSize: '64px',
                fontFamily: 'Andika, Arial, sans-serif',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            });
            letterText.setOrigin(0.5, 0.5);
            // Keep letters above all sprites and graphics
            letterText.setDepth(1000);
            letterText.setInteractive({ useHandCursor: true });
            letterText.on('pointerover', () => this.playLetterPulse(letterText));
            letterText.on('pointerout', () => this.resetLetterScale(letterText));

            // Store flower data
            this.flowers.push({
                sprite: flower,
                letter: letters[i],
                x: centerX,
                y: yPos,
                radius: (targetSize * scale) / 2,
                letterText
            });
        }
    }

    playLetterPulse(letterText) {
        if (!letterText) return;
        this.tweens.killTweensOf(letterText);
        letterText.setScale(1);

        letterText.pulseTween = this.tweens.add({
            targets: letterText,
            scale: 2,
            duration: 280,
            ease: 'Sine.easeInOut',
            yoyo: true,
            onComplete: () => {
                letterText.setScale(1);
                letterText.pulseTween = null;
            }
        });
    }

    playLetterShrink(letterText) {
        if (!letterText) return;
        this.tweens.killTweensOf(letterText);

        this.tweens.add({
            targets: letterText,
            scale: 0,
            duration: 220,
            ease: 'Back.easeIn',
            yoyo: true,
            onComplete: () => {
                letterText.setScale(1);
            }
        });
    }

    resetLetterScale(letterText) {
        if (!letterText) return;
        this.tweens.killTweensOf(letterText);
        letterText.setScale(1);
    }

    spawnItems(sidebarWidth, width, height) {
        // Build shuffled pool of items from current letters
        const pool = [];
        const lettersToUse = (this.activeLetters && this.activeLetters.length)
            ? this.activeLetters
            : Object.keys(LETTER_ITEMS);

        lettersToUse.forEach(letter => {
            const items = LETTER_ITEMS[letter] || [];
            items.forEach(itemName => {
                pool.push({ key: `${letter}_${itemName}`, letter, name: itemName });
            });
        });
        this.remainingItemPool = Phaser.Utils.Array.Shuffle(pool);

        // Calculate items area dimensions
        const itemsAreaWidth = width - sidebarWidth;
        const itemsAreaHeight = height;

        // Place items in middle 75% horizontally and middle 50% vertically
        const horizontalMargin = itemsAreaWidth * 0.15; // 12.5% on each side = 75% in middle
        const verticalMargin = itemsAreaHeight * 0.35;   // 25% on each side = 50% in middle

        // Store spawn boundaries for later use when adding new items
        this.spawnBounds = {
            minX: sidebarWidth + horizontalMargin,
            maxX: width - horizontalMargin,
            minY: verticalMargin,
            maxY: height - verticalMargin
        };

        // Store item references
        this.items = [];

        // Spawn initial batch (max 5 or pool size)
        const initialCount = Math.min(5, this.remainingItemPool.length);
        for (let i = 0; i < initialCount; i++) {
            this.spawnItemFromPool();
        }
    }

    playItemVoice(letter, name) {
        if (!this.sound) return;

        const letterKey = `voice_letter_${letter}`;
        const wordKey = `voice_${letter}_${name}`;

        const letterLoaded = this.cache.audio.exists(letterKey);
        const wordLoaded = this.cache.audio.exists(wordKey);

        if (!letterLoaded && !wordLoaded) return;

        const playWord = () => {
            if (!wordLoaded) return;
            const wordSound = this.sound.add(wordKey, { volume: VOICE_DEFAULT_VOLUME });
            wordSound.once('complete', () => {
                wordSound.destroy();
            });
            wordSound.play();
        };

        if (letterLoaded) {
            const letterSound = this.sound.add(letterKey, { volume: VOICE_DEFAULT_VOLUME });
            letterSound.once('complete', () => {
                letterSound.destroy();
                playWord();
            });
            letterSound.play();
        } else {
            playWord();
        }
    }

    spawnItemFromPool() {
        if (!this.remainingItemPool || this.remainingItemPool.length === 0) return;
        if (!this.spawnBounds) return;

        const nextItem = this.remainingItemPool.pop();

        // Generate a non-overlapping random position in play zone
        const targetSize = 130; // 50% bigger than before
        const { x, y } = this.findSpawnPosition(targetSize);

        // Create item sprite
        const item = this.add.sprite(x, y, nextItem.key);

        // Scale items to a reasonable size
        const scale = targetSize / Math.max(item.width, item.height);
        item.setScale(scale);

        // Add slight random rotation for visual interest
        item.setAngle(Phaser.Math.Between(-15, 15));

        // Add glowing highlight effect to make items pop
        this.addItemGlow(item);

        // Make item interactive and draggable
        item.setInteractive({ draggable: true });
        item.on('pointerdown', () => this.playItemVoice(nextItem.letter, nextItem.name));

        this.items.push({
            sprite: item,
            key: nextItem.key,
            letter: nextItem.letter,
            name: nextItem.name,
            originalX: x,
            originalY: y
        });
    }

    findSpawnPosition(targetSize) {
        const { minX, maxX, minY, maxY } = this.spawnBounds;

        const candidateRadius = targetSize / 2;
        const buffer = 12; // Extra breathing room between items
        let fallback = {
            x: Phaser.Math.Between(minX, maxX),
            y: Phaser.Math.Between(minY, maxY)
        };

        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(minX, maxX);
            const y = Phaser.Math.Between(minY, maxY);
            fallback = { x, y };

            const tooClose = this.items.some(({ sprite }) => {
                const otherRadius = Math.max(sprite.displayWidth, sprite.displayHeight) / 2;
                const minDistance = candidateRadius + otherRadius + buffer;
                return Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y) < minDistance;
            });

            if (!tooClose) {
                return { x, y };
            }
        }

        // If we couldn't find a perfect spot, fall back to the last candidate
        return fallback;
    }

    checkForCompletion() {
        if (this.gameComplete) return;

        const noActiveItems = this.items.length === 0;
        const noRemainingPool = !this.remainingItemPool || this.remainingItemPool.length === 0;

        if (noActiveItems && noRemainingPool) {
            this.gameComplete = true;
            this.showCompletionMessage();
        }
    }

    addItemGlow(item) {
        // Create a soft white glow circle behind the item
        const glowSize = Math.max(item.displayWidth, item.displayHeight) * 1.3;
        const glow = this.add.graphics();

        // Draw a radial gradient-like glow using concentric circles
        const centerX = 0;
        const centerY = 0;
        const layers = 8;

        for (let i = layers; i >= 0; i--) {
            const ratio = i / layers;
            const radius = (glowSize / 2) * (0.5 + ratio * 0.5);
            const alpha = (1 - ratio) * 0.4; // Fade out towards edges

            glow.fillStyle(0xffffff, alpha);
            glow.fillCircle(centerX, centerY, radius);
        }

        // Position glow behind item
        glow.setPosition(item.x, item.y);
        glow.setDepth(item.depth - 1);

        // Store reference on item for cleanup and position sync
        item.glowEffect = glow;

        // Pulse from 0 up to a little larger than the sprite (capped at ~2x the sprite size)
        const maxGlowScale = Math.min(
            2,
            (Math.max(item.displayWidth, item.displayHeight) * 2) / glowSize
        );
        glow.setScale(0);
        this.tweens.add({
            targets: glow,
            scaleX: { from: 0.3, to: maxGlowScale },
            scaleY: { from: 0.3, to: maxGlowScale },
            alpha: 0.7,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    showCompletionMessage() {
        const { width, height } = this.cameras.main;
        const message = this.add.text(width / 2, height / 2, 'All items placed! Great job!', {
            fontSize: '48px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        });
        message.setOrigin(0.5);
        message.setDepth(500);
    }

    startMusic() {
        // Start background music at low volume, looping
        this.music = this.sound.add('music', {
            volume: MUSIC_DEFAULT_VOLUME,
            loop: true
        });
        this.music.play();
    }

    createVolumeSlider(width, height) {
        const sliderX = width - 100;
        const sliderY = 30;
        const sliderWidth = 80;
        const sliderHeight = 8;
        const bgWidth = sliderWidth + 120;
        const bgHeight = 44;
        this.sliderPosition = { x: sliderX, y: sliderY, width: sliderWidth };

        // Subtle white card behind controls for readability
        this.volumeBg = this.add.rectangle(
            sliderX + sliderWidth / 2 - 10,
            sliderY,
            bgWidth,
            bgHeight,
            0xffffff,
            0.9
        );
        this.volumeBg.setDepth(180);
        this.volumeBg.setStrokeStyle(1, 0xdedede, 0.8);

        // Volume icon (speaker emoji as text)
        this.volumeIcon = this.add.text(sliderX - 30, sliderY, '🔊', {
            fontSize: '20px'
        });
        this.volumeIcon.setOrigin(0.5, 0.5);
        this.volumeIcon.setDepth(200);
        this.volumeIcon.setInteractive({ useHandCursor: true });

        // Click icon to mute/unmute
        this.volumeIcon.on('pointerdown', () => {
            if (this.music.volume > 0) {
                this.lastVolume = this.music.volume;
                this.music.setVolume(0);
                this.volumeIcon.setText('🔇');
                this.updateSliderKnob(0);
            } else {
                const vol = this.lastVolume || MUSIC_DEFAULT_VOLUME;
                this.music.setVolume(vol);
                this.volumeIcon.setText('🔊');
                this.updateSliderKnob(vol);
            }
        });

        // Slider background (track)
        this.sliderTrack = this.add.rectangle(
            sliderX + sliderWidth / 2,
            sliderY,
            sliderWidth,
            sliderHeight,
            0x444444,
            0.8
        );
        this.sliderTrack.setDepth(200);

        // Slider fill (shows current volume)
        this.sliderFill = this.add.rectangle(
            sliderX,
            sliderY,
            sliderWidth * MUSIC_DEFAULT_VOLUME,
            sliderHeight,
            0x4ecdc4,
            1
        );
        this.sliderFill.setOrigin(0, 0.5);
        this.sliderFill.setDepth(201);

        // Slider knob
        this.sliderKnob = this.add.circle(
            sliderX + sliderWidth * MUSIC_DEFAULT_VOLUME,
            sliderY,
            10,
            0xffffff,
            1
        );
        this.sliderKnob.setDepth(202);
        this.sliderKnob.setInteractive({ useHandCursor: true, draggable: true });

        // Store slider bounds for drag calculation
        this.sliderBounds = {
            x: sliderX,
            width: sliderWidth
        };

        // Handle knob drag
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject === this.sliderKnob) {
                // Clamp to slider bounds
                const minX = this.sliderBounds.x;
                const maxX = this.sliderBounds.x + this.sliderBounds.width;
                const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

                // Update knob position
                this.sliderKnob.x = clampedX;

                // Calculate volume (0-1)
                const volume = (clampedX - minX) / this.sliderBounds.width;

                // Update fill width
                this.sliderFill.width = this.sliderBounds.width * volume;

                // Set music volume
                this.music.setVolume(volume);

                // Update icon
                this.volumeIcon.setText(volume > 0 ? '🔊' : '🔇');
            }
        });

        // Click on track to set volume
        this.sliderTrack.setInteractive({ useHandCursor: true });
        this.sliderTrack.on('pointerdown', (pointer) => {
            const volume = (pointer.x - this.sliderBounds.x) / this.sliderBounds.width;
            const clampedVolume = Phaser.Math.Clamp(volume, 0, 1);

            this.music.setVolume(clampedVolume);
            this.updateSliderKnob(clampedVolume);
            this.volumeIcon.setText(clampedVolume > 0 ? '🔊' : '🔇');
        });
    }

    createBackButton(width) {
        const sliderX = this.sliderPosition ? this.sliderPosition.x : width - 100;
        const sliderY = this.sliderPosition ? this.sliderPosition.y : 30;
        const buttonWidth = 82;
        const buttonHeight = 32;
        const containerX = sliderX - buttonWidth - 26;

        const container = this.add.container(containerX, sliderY);
        const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xfff7e6, 0.95);
        bg.setStrokeStyle(2, 0xd9b26f, 1);
        const label = this.add.text(0, 0, 'Back (hold)', {
            fontSize: '14px',
            fontFamily: 'Andika, Arial, sans-serif',
            color: '#8b4513'
        });
        label.setOrigin(0.5);

        container.add([bg, label]);
        container.setSize(buttonWidth, buttonHeight);
        container.setDepth(205);
        container.setInteractive(
            new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight),
            Phaser.Geom.Rectangle.Contains
        );
        container.input.cursor = 'pointer';

        container.on('pointerdown', () => this.startBackHold(bg));
        container.on('pointerup', () => this.releaseBackHold(bg));
        container.on('pointerout', () => this.clearBackHold(bg));

        this.backButtonBg = bg;
    }

    startBackHold(bg) {
        this.clearBackHold(bg, false);
        this.backHoldTriggered = false;
        if (bg) {
            bg.setFillStyle(0xffe6b8, 0.98);
        }
        this.backHoldTimer = this.time.delayedCall(600, () => {
            this.backHoldTriggered = true;
            this.returnToMenu();
        });
    }

    releaseBackHold(bg) {
        const alreadyTriggered = this.backHoldTriggered;
        this.clearBackHold(bg);
        if (!alreadyTriggered) {
            this.returnToMenu();
        }
    }

    clearBackHold(bg, resetColor = true) {
        if (this.backHoldTimer) {
            this.backHoldTimer.remove(false);
            this.backHoldTimer = null;
        }
        this.backHoldTriggered = false;
        if (bg && resetColor) {
            bg.setFillStyle(0xfff7e6, 0.95);
            bg.setAlpha(1);
        }
    }

    returnToMenu() {
        this.clearBackHold(this.backButtonBg);
        if (this.music) {
            this.music.stop();
        }
        this.scene.start('Menu');
    }

    cleanupScene() {
        this.clearBackHold(this.backButtonBg);
        if (this.music) {
            this.music.stop();
        }
    }

    updateSliderKnob(volume) {
        this.sliderKnob.x = this.sliderBounds.x + this.sliderBounds.width * volume;
        this.sliderFill.width = this.sliderBounds.width * volume;
    }

    createInstructionText(width) {
        const padding = 16;
        const instruction = this.add.text(
            padding,
            8,
            'Instructions:\nDrag the glowing items to the letters',
            {
                fontSize: '18px',
                fontFamily: 'Andika, Arial, sans-serif',
                fill: '#4b2e1f',
                align: 'left'
            }
        );
        instruction.setOrigin(0, 0);
        instruction.setDepth(250);
    }
}
