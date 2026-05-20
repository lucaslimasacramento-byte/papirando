/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      colors: {
        // Papirando palette — fonte da verdade: Brandbook.html.
        // brand.600/700 = accent royal #1d4ed8 oficial; 800 = accent-2 (hover).
        // Os tons 50-500 e 900 mantêm os HEX Tailwind blue por compatibilidade
        // com bg-brand-50 já usados; novo código deve preferir `accent.*`.
        brand: {
          50: '#eaf0fd',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93b4ff',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1d4ed8',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // ink.* warm — escala de "tinta" do brandbook (era Tailwind slate frio).
        // Inclui 50 e 950 para mapeamento 1:1 com slate-* e gray-* durante o sweep.
        ink: {
          50:  '#f9f7f0',  // --bg-surface-2
          100: '#f3efe5',  // --bg-paper
          200: '#ebe6d8',  // --bg-paper-soft
          300: '#d8d0bf',  // --ink-5
          400: '#b6ad9c',  // --ink-4
          500: '#847b6c',  // --ink-3
          600: '#847b6c',  // alias --ink-3
          700: '#3a342c',  // alias --ink-2
          800: '#3a342c',  // --ink-2
          900: '#14110d',  // --ink
          950: '#14110d',  // alias --ink
        },
        // Papéis semânticos novos (use estes preferencialmente em código novo).
        paper: {
          DEFAULT: '#f3efe5',
          soft:    '#ebe6d8',
        },
        surface: {
          DEFAULT: '#ffffff',
          2:       '#f9f7f0',
        },
        accent: {
          DEFAULT: '#1d4ed8',
          2:       '#1e40af',
          soft:    '#eaf0fd',
          dark:    '#93b4ff',
        },
        highlight: {
          DEFAULT: '#f4d04e',
          soft:    '#fdf3ce',
        },
        // success/warn/danger semânticos — Tailwind defaults conflitavam (emerald, amber, red).
        success: {
          DEFAULT: '#4d7c3f',
          soft:    '#e8efdc',
        },
        warn: {
          DEFAULT: '#b45309',
          soft:    '#fbeacd',
        },
        danger: {
          DEFAULT: '#b91c1c',
          soft:    '#fde4e4',
        },
      },
      boxShadow: {
        // Sombras com viés warm (era rgba slate).
        shell: '0 1px 3px rgba(20, 17, 13, 0.05)',
        card: '0 4px 14px rgba(20, 17, 13, 0.05)',
        float: '0 8px 24px rgba(20, 17, 13, 0.07)',
        // Escala oficial do brandbook (pl-sh-low/mid/high).
        'pl-low':  '0 1px 2px rgba(20,17,13,0.05), 0 2px 6px rgba(20,17,13,0.04)',
        'pl-mid':  '0 4px 8px rgba(20,17,13,0.06), 0 12px 24px rgba(20,17,13,0.08)',
        'pl-high': '0 10px 20px rgba(20,17,13,0.08), 0 24px 48px rgba(20,17,13,0.14)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      maxWidth: {
        content: '1320px',
      },
      keyframes: {
        rankingCtaShimmer: {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)' },
        },
        rankingCtaGlow: {
          '0%, 100%': { boxShadow: '0 10px 28px rgba(30, 64, 175, 0.35), 0 0 0 1px rgba(255,255,255,0.12) inset' },
          '50%': { boxShadow: '0 14px 36px rgba(79, 70, 229, 0.38), 0 0 0 1px rgba(255,255,255,0.2) inset' },
        },
      },
      animation: {
        rankingCtaShimmer: 'rankingCtaShimmer 2.8s ease-in-out infinite',
        rankingCtaGlow: 'rankingCtaGlow 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
