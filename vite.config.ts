/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    // GitHub Pages sert le site sous /<nom-du-dépôt>/ : VITE_BASE=/ancestria-web/ (voir le guide).
    base: process.env.VITE_BASE ?? '/',
    plugins: [react(), tailwindcss()],
    build: {
        target: 'es2022',
        chunkSizeWarningLimit: 900,
    },
    test: {
        projects: [
            {
                extends: true,
                test: { name: 'unit', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
            },
            {
                test: { name: 'sql', environment: 'node', include: ['tests/sql/**/*.test.ts'], testTimeout: 120_000, hookTimeout: 120_000 },
            },
        ],
    },
});
