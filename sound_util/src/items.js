// Item lists for the sound recording utility.
// Word items are discovered directly from image files in the main game.

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const WORD_IMAGE_URLS = import.meta.glob('../../src/assets/images/items/*/*.png', {
    eager: true,
    import: 'default'
});

// Generate flat array of word items with paths
export function getWordItemList() {
    return Object.entries(WORD_IMAGE_URLS)
        .map(([imageModulePath, imagePath]) => {
            const match = imageModulePath.match(/\/items\/([a-z])\/(.+)\.png$/i);
            if (!match) return null;

            const letter = match[1].toLowerCase();
            const name = match[2];

            return {
                letter,
                name,
                imagePath,
                voicePath: `${letter}/${name}.webm`,
                downloadPath: `${letter}/${name}.webm`,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.letter.localeCompare(b.letter) || a.name.localeCompare(b.name));
}

// Generate letter-only recording items (a.webm, b.webm, etc.)
export function getLetterSoundList() {
    return LETTERS.map(letter => ({
        letter,
        name: letter,
        imagePath: buildLetterSvgDataUrl(letter),
        voicePath: `alphabet/${letter}.webm`,
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
