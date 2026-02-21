import JSZip from 'jszip';
import { getLetterSoundList, getWordItemList } from './items.js';
const VOICE_ASSET_ROOT = '/assets/voice';

// Helpers to decorate item data for UI and recording management
function decorateItems(rawItems, datasetKey) {
    return rawItems.map(item => {
        const recordingKey = `${datasetKey}:${item.letter}:${item.name}`;
        const downloadFileName = item.downloadPath.split('/').pop();
        const isLetterList = datasetKey === 'letters';

        return {
            ...item,
            datasetKey,
            recordingKey,
            downloadFileName,
            displayName: isLetterList ? `Letter "${item.letter.toUpperCase()}"` : item.name,
            listLabel: isLetterList
                ? `${item.letter.toUpperCase()} - Letter`
                : `${item.letter.toUpperCase()} - ${item.name}`
        };
    });
}

function buildDataset(key, label, description, rawItems) {
    return {
        key,
        label,
        description,
        items: decorateItems(rawItems, key)
    };
}

const datasets = {
    words: buildDataset(
        'words',
        'Words',
        'Record the spoken words for each picture used in the game.',
        getWordItemList()
    ),
    letters: buildDataset(
        'letters',
        'Letters',
        'Record the standalone letter sounds (a.webm, b.webm, ...).',
        getLetterSoundList()
    )
};

function buildItemLookup() {
    const map = new Map();
    Object.values(datasets).forEach(dataset => {
        dataset.items.forEach(item => map.set(item.recordingKey, item));
    });
    return map;
}

// State
let activeDatasetKey = 'words';
let items = datasets[activeDatasetKey].items;
let currentIndex = 0;
let recordings = new Map(); // Map<recordingKey, Blob>
let itemLookup = buildItemLookup(); // Map<recordingKey, item>
let hideExistingRecordings = true;
let existingVoicePaths = new Set();
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isStartingRecording = false;
let currentAudio = null;

// DOM Elements
const elements = {
    progressText: document.getElementById('progressText'),
    progressFill: document.getElementById('progressFill'),
    btnModeWords: document.getElementById('btnModeWords'),
    btnModeLetters: document.getElementById('btnModeLetters'),
    toggleHideExisting: document.getElementById('toggleHideExisting'),
    filterInfo: document.getElementById('filterInfo'),
    modeDescription: document.getElementById('modeDescription'),
    itemImage: document.getElementById('itemImage'),
    itemName: document.getElementById('itemName'),
    itemLetter: document.getElementById('itemLetter'),
    status: document.getElementById('status'),
    btnRecord: document.getElementById('btnRecord'),
    btnStop: document.getElementById('btnStop'),
    btnPlay: document.getElementById('btnPlay'),
    btnDownload: document.getElementById('btnDownload'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    btnDownloadAll: document.getElementById('btnDownloadAll'),
    itemList: document.getElementById('itemList')
};

// Initialize
async function init() {
    // Setup event listeners
    elements.btnModeWords.addEventListener('click', () => switchDataset('words'));
    elements.btnModeLetters.addEventListener('click', () => switchDataset('letters'));
    elements.toggleHideExisting.addEventListener('change', handleHideExistingToggle);
    elements.btnRecord.addEventListener('click', toggleRecording);
    elements.btnStop.addEventListener('click', stopRecording);
    elements.btnPlay.addEventListener('click', playRecording);
    elements.btnDownload.addEventListener('click', downloadCurrent);
    elements.btnPrev.addEventListener('click', () => navigate(-1));
    elements.btnNext.addEventListener('click', () => navigate(1));
    elements.btnDownloadAll.addEventListener('click', downloadAll);
    document.addEventListener('keydown', handleGlobalKeydown);
    elements.toggleHideExisting.checked = hideExistingRecordings;

    await loadExistingVoicePathIndex();
    refreshVisibleItems();

    // Request microphone permission early
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Release immediately
    } catch (err) {
        console.error('Microphone access denied:', err);
        elements.status.textContent = '⚠️ Microphone access required!';
        elements.status.className = 'status recording';
        elements.btnRecord.disabled = true;
    }

    // Display first item
    updateDisplay();
}

function updateDisplay() {
    updateModeButtons();
    updateFilterInfo();

    if (!items.length) {
        const hiddenCount = getExistingCountForActiveDataset();
        const allFilteredOut = hideExistingRecordings && hiddenCount > 0;

        elements.itemImage.removeAttribute('src');
        elements.itemImage.alt = 'No items';
        elements.itemName.textContent = allFilteredOut
            ? 'All items already have recordings'
            : 'No items found';
        elements.itemLetter.textContent = allFilteredOut
            ? 'Disable the filter to view existing recordings.'
            : '';
        elements.status.textContent = allFilteredOut
            ? 'Everything in this list already exists in public/assets/voice.'
            : 'No items available.';
        elements.status.className = 'status recorded';
        elements.btnPrev.disabled = true;
        elements.btnNext.disabled = true;
        updateRecordButtonState(false);
        updateProgress();
        renderItemList();
        return;
    }

    const item = items[currentIndex];

    // Update image and name
    elements.itemImage.src = item.imagePath;
    elements.itemImage.alt = item.displayName;
    elements.itemName.textContent = item.displayName;
    elements.itemLetter.textContent = item.datasetKey === 'letters'
        ? `Saves as: ${item.downloadFileName}`
        : `Letter: ${item.letter.toUpperCase()}`;

    // Update navigation buttons
    const navigationLocked = isRecording || isStartingRecording;
    elements.btnPrev.disabled = navigationLocked || currentIndex === 0;
    elements.btnNext.disabled = navigationLocked || items.length === 0 || currentIndex === items.length - 1;

    // Update status based on recording state
    const hasRecording = recordings.has(item.recordingKey);
    const hasExistingRecording = existingVoicePaths.has(item.voicePath);
    if (isStartingRecording) {
        elements.status.innerHTML = '<span class="recording-indicator"></span>Preparing mic...';
        elements.status.className = 'status recording';
    } else if (isRecording) {
        elements.status.innerHTML = '<span class="recording-indicator"></span>Recording...';
        elements.status.className = 'status recording';
    } else if (hasRecording) {
        elements.status.textContent = '✓ Recorded';
        elements.status.className = 'status recorded';
    } else if (hasExistingRecording) {
        elements.status.textContent = '✓ Recording already exists on disk';
        elements.status.className = 'status recorded';
    } else {
        elements.status.textContent = 'Not recorded yet';
        elements.status.className = 'status not-recorded';
    }

    // Update button states
    updateRecordButtonState(hasRecording);

    // Update progress
    updateProgress();

    // Update item list
    renderItemList();
}

function updateRecordButtonState(hasRecording) {
    const recordLabel = isRecording ? '⏹️ Stop (Space)' : '🎙️ Record (Space)';
    elements.btnRecord.textContent = isStartingRecording ? '⏳ Preparing...' : recordLabel;
    elements.btnRecord.classList.toggle('recording', isRecording || isStartingRecording);
    elements.btnRecord.disabled = isStartingRecording || items.length === 0;

    // Stop button only useful while recording
    elements.btnStop.disabled = !isRecording;

    // Allow quick playback/download toggling
    elements.btnPlay.disabled = !hasRecording;
    elements.btnDownload.disabled = !hasRecording;
}

function updateProgress() {
    const recorded = items.filter(item => recordings.has(item.recordingKey)).length;
    const total = items.length;
    const percent = total > 0 ? (recorded / total) * 100 : 0;
    const hiddenCount = getExistingCountForActiveDataset();

    const hiddenText = hideExistingRecordings && hiddenCount > 0 ? `, ${hiddenCount} hidden` : '';
    elements.progressText.textContent = `${recorded} / ${total} recorded (${datasets[activeDatasetKey].label}${hiddenText})`;
    elements.progressFill.style.width = `${percent}%`;

    // Enable bulk download if any recordings exist
    elements.btnDownloadAll.disabled = recordings.size === 0;
}

function renderItemList() {
    if (!items.length) {
        elements.itemList.innerHTML = '<div class="item-list-empty">No items to show.</div>';
        return;
    }

    elements.itemList.innerHTML = items.map((item, index) => {
        const isRecorded = recordings.has(item.recordingKey);
        const isCurrent = index === currentIndex;
        const hasExistingRecording = existingVoicePaths.has(item.voicePath);

        return `
            <div class="item-list-item ${isCurrent ? 'current' : ''} ${isRecorded ? 'recorded' : ''} ${hasExistingRecording ? 'existing' : ''}"
                 data-index="${index}">
                <span>${item.listLabel}</span>
                <span class="item-markers">
                    <span class="existing-marker">${hasExistingRecording ? 'On disk' : ''}</span>
                    <span class="checkmark">${isRecorded ? '✓' : ''}</span>
                </span>
            </div>
        `;
    }).join('');

    // Add click handlers
    elements.itemList.querySelectorAll('.item-list-item').forEach(el => {
        el.addEventListener('click', () => {
            if (isRecording || isStartingRecording) return;
            currentIndex = parseInt(el.dataset.index);
            updateDisplay();
        });
    });

    scrollCurrentItemIntoView();
}

function updateModeButtons() {
    const dataset = datasets[activeDatasetKey];
    elements.btnModeWords.classList.toggle('active', activeDatasetKey === 'words');
    elements.btnModeLetters.classList.toggle('active', activeDatasetKey === 'letters');
    elements.modeDescription.textContent = dataset.description;
}

function switchDataset(datasetKey) {
    if (datasetKey === activeDatasetKey || !datasets[datasetKey]) return;
    if (isRecording || isStartingRecording) {
        alert('Stop recording before switching lists.');
        return;
    }

    stopPlayback();

    activeDatasetKey = datasetKey;
    currentIndex = 0;
    refreshVisibleItems();
    updateDisplay();
}

function navigate(direction) {
    if (isRecording || isStartingRecording) return;
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < items.length) {
        currentIndex = newIndex;
        stopPlayback();
        updateDisplay();
    }
}

function toggleRecording() {
    if (isStartingRecording) return;
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    if (isRecording || isStartingRecording) return;
    if (!items.length) return;
    isStartingRecording = true;
    updateDisplay();

    const item = items[currentIndex];

    try {
        stopPlayback();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Determine best supported format
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4'; // Safari fallback
            }
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: mimeType });
            recordings.set(item.recordingKey, blob);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            isRecording = false;
            isStartingRecording = false;
            updateDisplay();
            autoPlayAndAdvance(item.recordingKey);
        };

        mediaRecorder.start();
        isRecording = true;
        isStartingRecording = false;

        updateDisplay();

    } catch (err) {
        console.error('Failed to start recording:', err);
        elements.status.textContent = '⚠️ Recording failed!';
        elements.status.className = 'status recording';
    } finally {
        if (!isRecording) {
            isStartingRecording = false;
            updateDisplay();
        }
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    isRecording = false;
    isStartingRecording = false;
    updateDisplay();
}

function stopPlayback() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
}

function playRecording() {
    if (!items.length) return;
    const item = items[currentIndex];
    playRecordingForKey(item.recordingKey);
}

function playRecordingForKey(recordingKey, { onEnded } = {}) {
    const blob = recordings.get(recordingKey);

    if (!blob) return null;

    stopPlayback();

    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        if (onEnded) onEnded();
    };
    currentAudio.play().catch(err => {
        console.error('Playback failed:', err);
        URL.revokeObjectURL(url);
        if (currentAudio) {
            currentAudio = null;
        }
        if (onEnded) onEnded();
    });

    return currentAudio;
}

function autoPlayAndAdvance(recordingKey) {
    const recordedIndex = items.findIndex(item => item.recordingKey === recordingKey);
    if (recordedIndex === -1) return;

    currentIndex = recordedIndex;
    updateDisplay();

    const isLastItem = recordedIndex >= items.length - 1;

    playRecordingForKey(recordingKey, {
        onEnded: () => {
            if (!isLastItem && currentIndex === recordedIndex) {
                currentIndex = recordedIndex + 1;
                updateDisplay();
            }
        }
    });
}

function downloadCurrent() {
    if (!items.length) return;
    const item = items[currentIndex];
    const blob = recordings.get(item.recordingKey);

    if (!blob) return;

    downloadBlob(blob, item.downloadFileName);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function downloadAll() {
    if (recordings.size === 0) return;

    elements.btnDownloadAll.disabled = true;
    elements.btnDownloadAll.textContent = '⏳ Creating ZIP...';

    try {
        const zip = new JSZip();

        recordings.forEach((blob, recordingKey) => {
            const item = itemLookup.get(recordingKey);
            if (item) {
                zip.file(item.downloadPath, blob);
            }
        });

        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        downloadBlob(zipBlob, 'sounds.zip');

    } catch (err) {
        console.error('Failed to create ZIP:', err);
        alert('Failed to create ZIP file');
    } finally {
        elements.btnDownloadAll.disabled = false;
        elements.btnDownloadAll.textContent = '📦 Download All as ZIP';
    }
}

function handleGlobalKeydown(event) {
    if (event.code !== 'Space' && event.key !== ' ') return;

    const targetTag = (event.target && event.target.tagName || '').toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') return;

    event.preventDefault();
    toggleRecording();
}

function scrollCurrentItemIntoView() {
    const currentEl = elements.itemList.querySelector('.item-list-item.current');
    if (!currentEl) return;
    currentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function handleHideExistingToggle() {
    if (isRecording || isStartingRecording) {
        elements.toggleHideExisting.checked = hideExistingRecordings;
        return;
    }

    const previousItem = items[currentIndex];
    hideExistingRecordings = elements.toggleHideExisting.checked;
    stopPlayback();
    refreshVisibleItems(previousItem && previousItem.recordingKey);
    updateDisplay();
}

function refreshVisibleItems(preferredRecordingKey = null) {
    const datasetItems = datasets[activeDatasetKey].items;

    items = hideExistingRecordings
        ? datasetItems.filter(item => !existingVoicePaths.has(item.voicePath))
        : datasetItems.slice();

    if (!items.length) {
        currentIndex = 0;
        return;
    }

    if (preferredRecordingKey) {
        const preferredIndex = items.findIndex(item => item.recordingKey === preferredRecordingKey);
        if (preferredIndex !== -1) {
            currentIndex = preferredIndex;
            return;
        }
    }

    if (currentIndex >= items.length) {
        currentIndex = items.length - 1;
    }
}

function getExistingCountForActiveDataset() {
    return datasets[activeDatasetKey].items.reduce(
        (count, item) => count + (existingVoicePaths.has(item.voicePath) ? 1 : 0),
        0
    );
}

function updateFilterInfo() {
    const existingCount = getExistingCountForActiveDataset();
    if (hideExistingRecordings) {
        elements.filterInfo.textContent = existingCount > 0 ? `${existingCount} hidden` : 'Nothing hidden';
        return;
    }
    elements.filterInfo.textContent = existingCount > 0 ? `${existingCount} available to hide` : 'Filter disabled';
}

async function loadExistingVoicePathIndex() {
    const allVoicePaths = [...new Set(
        Object.values(datasets)
            .flatMap(dataset => dataset.items)
            .map(item => item.voicePath)
            .filter(Boolean)
    )];

    if (allVoicePaths.length === 0) return;

    const checks = await Promise.all(allVoicePaths.map(async voicePath => {
        const exists = await doesVoiceFileExist(voicePath);
        return exists ? voicePath : null;
    }));

    existingVoicePaths = new Set(checks.filter(Boolean));
}

async function doesVoiceFileExist(voicePath) {
    const url = `${VOICE_ASSET_ROOT}/${voicePath}`;

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-store',
            headers: { Accept: 'audio/webm,video/webm,*/*;q=0.1' }
        });

        if (isAudioLikeResponse(response)) return true;
        if (isHtmlFallbackResponse(response) || isHttpMiss(response)) return false;
    } catch (err) {
        // Continue to GET probe.
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                Range: 'bytes=0-3',
                Accept: 'audio/webm,video/webm,*/*;q=0.1'
            }
        });

        if (!(response.ok || response.status === 206)) return false;
        if (isHtmlFallbackResponse(response)) return false;
        if (isAudioLikeResponse(response)) return true;

        const bytes = new Uint8Array(await response.arrayBuffer());
        return hasEbmlHeader(bytes);
    } catch (err) {
        return false;
    }
}

function isHttpMiss(response) {
    return response.status === 404 || response.status === 410;
}

function isHtmlFallbackResponse(response) {
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    return contentType.includes('text/html');
}

function isAudioLikeResponse(response) {
    if (!response.ok && response.status !== 206) return false;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    return contentType.includes('audio/')
        || contentType.includes('video/')
        || contentType.includes('application/octet-stream');
}

function hasEbmlHeader(bytes) {
    if (bytes.length < 4) return false;
    return bytes[0] === 0x1a
        && bytes[1] === 0x45
        && bytes[2] === 0xdf
        && bytes[3] === 0xa3;
}

// Start the app
init();
