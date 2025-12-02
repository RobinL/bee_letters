// Item list for sound recording utility
// Mirrors LETTER_ITEMS from the main game's config.js

export const LETTER_ITEMS = {
    a: ['accordian', 'acorn', 'ant', 'arrow', 'astronaut'],
    b: ['ball', 'banana', 'bear', 'bee', 'bird', 'boat', 'book', 'bus', 'butterfly'],
    c: ['cake', 'car', 'castle', 'cat', 'clock', 'coat', 'cow', 'crayon', 'cup'],
};

// Generate flat array of items with paths
export function getItemList() {
    const items = [];

    Object.entries(LETTER_ITEMS).forEach(([letter, itemNames]) => {
        itemNames.forEach(name => {
            items.push({
                letter,
                name,
                // Path relative to the main project's public folder
                imagePath: `../public/assets/items/${letter}/${name}.png`,
                audioFilename: `${name}.webm`
            });
        });
    });

    return items;
}

// Get total count of items
export function getItemCount() {
    return Object.values(LETTER_ITEMS).reduce((sum, items) => sum + items.length, 0);
}
