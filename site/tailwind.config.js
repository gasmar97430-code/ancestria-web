/** @type {import('tailwindcss').Config} */
// Les couleurs de l'atelier renvoient aux variables de src/ui/theme.css :
// changer de palette (ivoire, parchemin, sombre) ne touche a aucune classe.
const v = (nom) => `var(--${nom})`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './src-web/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        papier: v('papier'),
        carte: v('carte'),
        blanc: v('blanc'),
        'trait-leger': v('trait-leger'),
        trait: v('trait'),
        'trait-carte': v('trait-carte'),
        encre: v('encre'),
        'encre-2': v('encre-2'),
        'encre-3': v('encre-3'),
        sepia: v('sepia'),
        'sepia-deep': v('sepia-deep'),
        'sepia-tint': v('sepia-tint'),
        'c-prouve': v('c-prouve'),
        'c-probable': v('c-probable'),
        'c-hypothese': v('c-hypothese'),
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        carte: v('ombre-carte'),
        'carte-choisie': v('ombre-carte-choisie'),
        champ: v('ombre-champ'),
        onglet: v('ombre-onglet'),
      },
      transitionTimingFunction: {
        plume: 'cubic-bezier(.22,.8,.26,1)',
      },
    },
  },
  plugins: [],
};
