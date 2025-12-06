import letterManifest from './generated/letterManifest.json';

const manifest = letterManifest || { items: {}, itemVoices: {} };

// ----- Curriculum order (single letters only) -----
export const CURRICULUM_LETTER_ORDER = [
    's', 'a', 't', 'p', 'm', 'i', 'd', 'n', 'g', 'o',
    'c', 'k', 'e', 'r', 'u', 'l', 'h', 'f', 'b',
    'j', 'v', 'w', 'x', 'y', 'z'
];

// ===========================================
// GAME CONFIGURATION
// ===========================================

// ----- Layout -----
export const SIDEBAR_RATIO = 0.25;  // Flower zone takes 25% of screen width
export const DROP_DISTANCE = 80;    // How close item needs to be to flower center to register

// ----- Bee & Trail Settings -----
export const BEE_FLIGHT_DURATION = 30000;   // How long the bee flies (ms)
export const TRAIL_PERSISTENCE = 30000;      // How long trail takes to fade (ms)

// ----- Spirograph Pattern -----
// Petal-like patterns work best when (R-r)/r produces nice integer ratios
// Common petal counts: 3, 4, 5, 6, 7, 8 petals
export const PETAL_PRESETS = [
    { petals: 3, R: 80, r: 60, d: 55 },   // 3-petal flower
    { petals: 4, R: 100, r: 75, d: 65 },  // 4-petal flower
    { petals: 5, R: 100, r: 80, d: 70 },  // 5-petal flower
    { petals: 6, R: 90, r: 75, d: 60 },   // 6-petal flower
    { petals: 7, R: 105, r: 90, d: 75 },  // 7-petal flower
    { petals: 8, R: 100, r: 87.5, d: 70 }, // 8-petal flower
];

// Variation range (multiplier applied to preset values)
export const SPIRO_VARIATION = 0.55;  // +/- 15% variation

export const SPIRO_SPEED = 0.04; // Animation speed (radians per frame)

// ----- Music Settings -----
export const MUSIC_DEFAULT_VOLUME = 0.15;  // Default volume (0-1), 30% is a nice low level
// Speech should sit clearly above background music
export const VOICE_DEFAULT_VOLUME = 1.0;   // Default volume for voiceovers

// ----- Letter Items -----
// Generated at dev/build time from public/assets/items and public/assets/voice
export const LETTER_ITEMS = manifest.items || {};
export const LETTER_ITEM_VOICES = manifest.itemVoices || {};
