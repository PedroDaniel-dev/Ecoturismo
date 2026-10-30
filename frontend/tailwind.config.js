/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        base: v('base'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        ink: v('ink'),
        'ink-muted': v('ink-muted'),
        brand: v('brand'),
        'brand-ink': v('brand-ink'),
        gold: v('gold'),
        border: v('border'),
        'trail-easy': v('trail-easy'),
        'trail-moderate': v('trail-moderate'),
        'trail-hard': v('trail-hard'),
        'hero-shade': v('hero-shade'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        // títulos sofisticados (RIO do hero, títulos de seção)
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // textos editoriais (kickers, chamadas, citações)
        editorial: ['Cinzel', '"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
};
