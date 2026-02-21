const ITEM_IMAGE_IMPORTS = import.meta.glob('./images/items/*/*.png', {
    eager: true,
    query: { as: 'url' }
});

const toAssetUrl = (mod) => {
    if (typeof mod === 'string') return mod;
    if (mod && typeof mod === 'object' && 'default' in mod) return mod.default;
    return '';
};

export const ITEM_IMAGE_MAP = Object.entries(ITEM_IMAGE_IMPORTS).reduce((acc, [path, mod]) => {
    const match = path.match(/items\/([a-z])\/([^/]+)\.png$/i);
    if (!match) return acc;

    const [, letterRaw, name] = match;
    const letter = letterRaw.toLowerCase();
    if (!acc[letter]) acc[letter] = {};
    acc[letter][name] = toAssetUrl(mod);

    return acc;
}, {});

export function getItemImageUrl(letter, itemName) {
    if (!letter || !itemName) return '';
    return ITEM_IMAGE_MAP[letter.toLowerCase()]?.[itemName] || '';
}
