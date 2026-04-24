import type { Config } from 'tailwindcss';

function cssVar(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: cssVar('bg'),
          panel: cssVar('bg-panel'),
          elevated: cssVar('bg-elevated'),
        },
        border: {
          DEFAULT: cssVar('border'),
          strong: cssVar('border-strong'),
        },
        text: {
          DEFAULT: cssVar('text'),
          muted: cssVar('text-muted'),
          dim: cssVar('text-dim'),
        },
        accent: {
          DEFAULT: cssVar('accent'),
          hover: cssVar('accent-hover'),
          fg: cssVar('accent-fg'),
        },
        material: cssVar('material'),
        warn: cssVar('warn'),
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
