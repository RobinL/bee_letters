import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    server: {
        port: 3001,
        open: true,
        fs: {
            // Allow imports from the main project root (for the shared manifest)
            allow: [path.resolve(__dirname, '..')]
        }
    },
    base: './',
    build: {
        outDir: 'dist'
    }
});
