// Le site = l'écran de l'Ancestria du PC (mêmes outils : Vite, React 18, Tailwind 3).
// GitHub Pages sert le site sous /<dépôt>/ : VITE_BASE=/ancestria-web/.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: process.env.VITE_BASE ?? '/',
    plugins: [react()],
});
