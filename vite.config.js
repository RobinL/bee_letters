import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function buildLetterManifest() {
    const itemsDir = path.resolve(__dirname, 'src/assets/images/items');
    const voicesDir = path.resolve(__dirname, 'public/assets/voice');
    const outputPath = path.resolve(__dirname, 'src/generated/letterManifest.json');

    const letters = {};
    const itemVoices = {};

    if (fs.existsSync(itemsDir)) {
        fs.readdirSync(itemsDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .forEach(letterDir => {
                const letter = letterDir.name.toLowerCase();
                const letterPath = path.join(itemsDir, letter);

                const items = fs.readdirSync(letterPath, { withFileTypes: true })
                    .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.png'))
                    .map(file => path.basename(file.name, path.extname(file.name)))
                    .sort();

                if (!items.length) return;

                letters[letter] = items;

                const voicePath = path.join(voicesDir, letter);
                if (fs.existsSync(voicePath)) {
                    const voiceItems = new Set(
                        fs.readdirSync(voicePath, { withFileTypes: true })
                            .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.webm'))
                            .map(file => path.basename(file.name, path.extname(file.name)))
                    );

                    const itemsWithVoices = items.filter(name => voiceItems.has(name)).sort();
                    if (itemsWithVoices.length) {
                        itemVoices[letter] = itemsWithVoices;
                    }
                }
            });
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ items: letters, itemVoices }, null, 2));
}

function letterManifestPlugin() {
    return {
        name: 'letter-manifest-generator',
        buildStart() {
            buildLetterManifest();
        },
        configureServer() {
            buildLetterManifest();
        }
    };
}

export default defineConfig({
    base: '/bee_letters/',
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist'
    },
    plugins: [
        letterManifestPlugin(),
        imagetools({
            defaultDirectives: (url) => {
                if (url.pathname.match(/background|hero-bg|footer-bg/)) {
                    return new URLSearchParams({
                        format: 'webp',
                        quality: '90',
                        width: '1920',
                        as: 'url'
                    });
                }

                return new URLSearchParams({
                    format: 'webp',
                    quality: '60',
                    width: '800',
                    as: 'url'
                });
            },
        })
    ]
});
