import JSZip from 'jszip';
import { getItemList, getItemCount } from './items.js';

// State
let items = [];
let currentIndex = 0;
let recordings = new Map(); // Map<itemName, Blob>
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentAudio = null;

// DOM Elements
const elements = {
    progressText: document.getElementById('progressText'),
    progressFill: document.getElementById('progressFill'),
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
    items = getItemList();

    if (items.length === 0) {
        elements.itemName.textContent = 'No items found!';
        return;
    }

    // Setup event listeners
    elements.btnRecord.addEventListener('click', startRecording);
    elements.btnStop.addEventListener('click', stopRecording);
    elements.btnPlay.addEventListener('click', playRecording);
    elements.btnDownload.addEventListener('click', downloadCurrent);
    elements.btnPrev.addEventListener('click', () => navigate(-1));
    elements.btnNext.addEventListener('click', () => navigate(1));
    elements.btnDownloadAll.addEventListener('click', downloadAll);

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
    renderItemList();
}

function updateDisplay() {
    const item = items[currentIndex];

    // Update image and name
    elements.itemImage.src = item.imagePath;
    elements.itemImage.alt = item.name;
    elements.itemName.textContent = item.name;
    elements.itemLetter.textContent = `Letter: ${item.letter.toUpperCase()}`;

    // Update navigation buttons
    elements.btnPrev.disabled = currentIndex === 0;
    elements.btnNext.disabled = currentIndex === items.length - 1;

    // Update status based on recording state
    const hasRecording = recordings.has(item.name);
    if (isRecording) {
        elements.status.innerHTML = '<span class="recording-indicator"></span>Recording...';
        elements.status.className = 'status recording';
    } else if (hasRecording) {
        elements.status.textContent = '✓ Recorded';
        elements.status.className = 'status recorded';
    } else {
        elements.status.textContent = 'Not recorded yet';
        elements.status.className = 'status not-recorded';
    }

    // Update button states
    elements.btnPlay.disabled = !hasRecording;
    elements.btnDownload.disabled = !hasRecording;

    // Update progress
    updateProgress();

    // Update item list
    renderItemList();
}

function updateProgress() {
    const recorded = recordings.size;
    const total = items.length;
    const percent = total > 0 ? (recorded / total) * 100 : 0;

    elements.progressText.textContent = `${recorded} / ${total} recorded`;
    elements.progressFill.style.width = `${percent}%`;

    // Enable bulk download if any recordings exist
    elements.btnDownloadAll.disabled = recordings.size === 0;
}

function renderItemList() {
    elements.itemList.innerHTML = items.map((item, index) => {
        const isRecorded = recordings.has(item.name);
        const isCurrent = index === currentIndex;

        return `
            <div class="item-list-item ${isCurrent ? 'current' : ''} ${isRecorded ? 'recorded' : ''}"
                 data-index="${index}">
                <span>${item.letter.toUpperCase()} - ${item.name}</span>
                <span class="checkmark">${isRecorded ? '✓' : ''}</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    elements.itemList.querySelectorAll('.item-list-item').forEach(el => {
        el.addEventListener('click', () => {
            currentIndex = parseInt(el.dataset.index);
            updateDisplay();
        });
    });
}

function navigate(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < items.length) {
        currentIndex = newIndex;
        updateDisplay();
    }
}

async function startRecording() {
    const item = items[currentIndex];

    try {
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
            recordings.set(item.name, blob);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            isRecording = false;
            updateDisplay();
        };

        mediaRecorder.start();
        isRecording = true;

        // Update UI
        elements.btnRecord.disabled = true;
        elements.btnRecord.classList.add('recording');
        elements.btnStop.disabled = false;
        updateDisplay();

    } catch (err) {
        console.error('Failed to start recording:', err);
        elements.status.textContent = '⚠️ Recording failed!';
        elements.status.className = 'status recording';
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    elements.btnRecord.disabled = false;
    elements.btnRecord.classList.remove('recording');
    elements.btnStop.disabled = true;
}

function playRecording() {
    const item = items[currentIndex];
    const blob = recordings.get(item.name);

    if (!blob) return;

    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
    };
    currentAudio.play();
}

function downloadCurrent() {
    const item = items[currentIndex];
    const blob = recordings.get(item.name);

    if (!blob) return;

    downloadBlob(blob, `${item.name}.webm`);
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

        // Organize by letter
        recordings.forEach((blob, itemName) => {
            // Find the item to get its letter
            const item = items.find(i => i.name === itemName);
            if (item) {
                zip.file(`${item.letter}/${itemName}.webm`, blob);
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

// Start the app
init();
