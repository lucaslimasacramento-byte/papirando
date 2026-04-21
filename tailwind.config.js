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
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
      },
      boxShadow: {
        shell: '0 1px 3px rgba(15, 23, 42, 0.05)',
        card: '0 4px 14px rgba(15, 23, 42, 0.05)',
        float: '0 8px 24px rgba(15, 23, 42, 0.07)',
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
