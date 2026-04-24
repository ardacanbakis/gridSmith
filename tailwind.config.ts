import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0F1115',
          panel: '#161A21',
          elevated: '#1E232C',
        },
        border: {
          DEFAULT: '#2A2F3A',
          strong: '#3A4150',
        },
        text: {
          DEFAULT: '#E5E7EB',
          muted: '#9CA3AF',
          dim: '#6B7280',
        },
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#FBBF24',
        },
        teal: {
          DEFAULT: '#14B8A6',
          hover: '#2DD4BF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
