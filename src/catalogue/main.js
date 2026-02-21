import { LETTER_ITEMS, LETTER_ITEM_VOICES } from '../config.js';
import { getItemImageUrl } from '../assets/itemAssets.js';

const baseUrl = import.meta.env.BASE_URL || '/';
const root = document.getElementById('catalogue-root');

const lettersInOrder = Object.keys(LETTER_ITEMS)
    .filter((letter) => LETTER_ITEMS[letter]?.length)
    .sort((a, b) => a.localeCompare(b));

let activeAudio = null;
let activeCard = null;
const DEFAULT_PREVIEW_BACKGROUND = 'white';
const PREVIEW_BACKGROUND_OPTIONS = [
    { value: 'white', label: 'White', color: '#ffffff' },
    { value: 'cream', label: 'Cream', color: '#fff7df' },
    { value: 'light-gray', label: 'Light Gray', color: '#e8e8e8' },
    { value: 'charcoal', label: 'Charcoal', color: '#2f343a' },
    { value: 'black', label: 'Black', color: '#000000' },
    { value: 'sky', label: 'Sky Blue', color: '#cfefff' },
];

function voicePath(letter, itemName) {
    return `${baseUrl}assets/voice/${letter}/${itemName}.webm`;
}

function hasVoice(letter, itemName) {
    return Boolean(LETTER_ITEM_VOICES[letter]?.includes(itemName));
}

function formatItemLabel(name) {
    return name.replace(/_/g, ' ');
}

function stopPreviousAudio() {
    if (!activeAudio) return;
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;

    if (activeCard) {
        activeCard.classList.remove('playing');
        activeCard = null;
    }
}

function playVoice(letter, itemName, card) {
    stopPreviousAudio();

    const audio = new Audio(voicePath(letter, itemName));
    audio.volume = 1;
    activeAudio = audio;
    activeCard = card;
    card.classList.add('playing');

    const clearState = () => {
        if (activeAudio === audio) {
            activeAudio = null;
        }
        if (activeCard === card) {
            activeCard.classList.remove('playing');
            activeCard = null;
        }
    };

    audio.addEventListener('ended', clearState, { once: true });
    audio.addEventListener('error', clearState, { once: true });
    audio.play().catch(clearState);
}

function setPreviewBackground(value) {
    const selected = PREVIEW_BACKGROUND_OPTIONS.find((option) => option.value === value)
        || PREVIEW_BACKGROUND_OPTIONS[0];

    root?.style.setProperty('--preview-bg', selected.color);
}

function createBackgroundSelector() {
    const controls = document.createElement('div');
    controls.className = 'controls';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.setAttribute('for', 'preview-bg-select');
    label.textContent = 'Image background:';

    const select = document.createElement('select');
    select.className = 'control-select';
    select.id = 'preview-bg-select';
    select.setAttribute('aria-label', 'Image background color');

    PREVIEW_BACKGROUND_OPTIONS.forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        select.appendChild(optionEl);
    });

    select.value = DEFAULT_PREVIEW_BACKGROUND;
    setPreviewBackground(select.value);
    select.addEventListener('change', (event) => {
        setPreviewBackground(event.target.value);
    });

    controls.append(label, select);
    return controls;
}

function createItemCard(letter, itemName) {
    const playable = hasVoice(letter, itemName);
    const imageUrl = getItemImageUrl(letter, itemName);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `item-card${playable ? '' : ' not-playable'}`;
    card.title = playable ? `Play ${formatItemLabel(itemName)}` : `${formatItemLabel(itemName)} (no audio yet)`;
    card.setAttribute('aria-label', card.title);

    const img = document.createElement('img');
    img.className = 'item-image';
    img.src = imageUrl;
    img.alt = formatItemLabel(itemName);
    img.loading = 'lazy';
    
    const imageWrap = document.createElement('div');
    imageWrap.className = 'item-image-wrap';
    imageWrap.appendChild(img);

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = formatItemLabel(itemName);

    const status = document.createElement('span');
    status.className = 'item-status';
    status.textContent = playable ? 'Tap to hear' : 'No audio yet';

    card.append(imageWrap, label, status);

    if (playable) {
        card.addEventListener('click', () => playVoice(letter, itemName, card));
    } else {
        card.disabled = true;
    }

    return card;
}

function createLetterSection(letter) {
    const section = document.createElement('section');
    section.className = 'letter-section';

    const heading = document.createElement('h2');
    heading.className = 'letter-heading';
    heading.textContent = letter.toUpperCase();

    const grid = document.createElement('div');
    grid.className = 'item-grid';

    [...(LETTER_ITEMS[letter] || [])]
        .sort((a, b) => a.localeCompare(b))
        .forEach((itemName) => {
            grid.appendChild(createItemCard(letter, itemName));
        });

    section.append(heading, grid);
    return section;
}

function render() {
    if (!root) return;

    const top = document.createElement('header');
    top.className = 'top';

    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'Bee Letters Catalogue';

    const backLink = document.createElement('a');
    backLink.className = 'back-link';
    backLink.href = '../';
    backLink.textContent = 'Back to game';

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Tap any picture to play its sound.';
    const controls = createBackgroundSelector();

    top.append(title, backLink);
    root.append(top, controls, hint);

    lettersInOrder.forEach((letter) => {
        root.appendChild(createLetterSection(letter));
    });
}

render();
