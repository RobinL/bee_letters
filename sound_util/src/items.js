// Item lists for the sound recording utility.
// Derived from the generated manifest (kept in sync with the main game assets).
import letterManifest from '../../src/generated/letterManifest.json';

const WORD_ITEMS = (letterManifest && letterManifest.items) ? letterManifest.items : {};

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Generate flat array of word items with paths
export function getWordItemList() {
    const items = [];

    Object.entries(WORD_ITEMS).forEach(([letter, itemNames]) => {
        itemNames.forEach(name => {
            items.push({
                letter,
                name,
                // Path relative to the main project's src folder
                imagePath: `../src/assets/images/items/${letter}/${name}.png`,
                downloadPath: `${letter}/${name}.webm`,
            });
        });
    });

    return items;
}

// Generate letter-only recording items (a.webm, b.webm, etc.)
export function getLetterSoundList() {
    return LETTERS.map(letter => ({
        letter,
        name: letter,
        imagePath: buildLetterSvgDataUrl(letter),
        downloadPath: `${letter}.webm`,
    }));
}

function buildLetterSvgDataUrl(letter) {
    const upper = letter.toUpperCase();
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#667eea"/>
      <stop offset="100%" stop-color="#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="32" ry="32" fill="url(#grad)"/>
  <text x="50%" y="58%" font-size="140" font-family="Arial, sans-serif" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${upper}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
