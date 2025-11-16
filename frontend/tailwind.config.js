/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(59 130 246 / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(239 68 68 / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(243 244 246 / <alpha-value>)',
          foreground: 'rgb(107 114 128 / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(255 255 255 / <alpha-value>)',
          foreground: 'rgb(0 0 0 / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(255 255 255 / <alpha-value>)',
          foreground: 'rgb(0 0 0 / <alpha-value>)',
        },
        background: 'rgb(var(--bg-light, 249 250 251) / <alpha-value>)',
        foreground: 'rgb(0 0 0 / <alpha-value>)',
        border: 'rgb(229 231 235 / <alpha-value>)',
        input: 'rgb(229 231 235 / <alpha-value>)',
        ring: 'rgb(59 130 246 / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'background-light': 'rgb(var(--bg-light, 249 250 251) / <alpha-value>)',
        'background-dark': 'rgb(var(--bg-dark, 17 24 39) / <alpha-value>)',
        'card-light': 'rgb(var(--card-bg-light, 255 255 255) / <alpha-value>)',
        'card-dark': 'rgb(var(--card-bg-dark, 31 41 55) / <alpha-value>)',
        'header-light': 'rgb(var(--header-bg-light, 255 255 255) / <alpha-value>)',
        'header-dark': 'rgb(var(--header-bg-dark, 31 41 55) / <alpha-value>)',
        'footer-light': 'rgb(var(--footer-bg-light, 255 255 255) / <alpha-value>)',
        'footer-dark': 'rgb(var(--footer-bg-dark, 31 41 55) / <alpha-value>)',
        'accordion-light': 'rgb(var(--accordion-bg-light, 255 255 255) / <alpha-value>)',
        'accordion-dark': 'rgb(var(--accordion-bg-dark, 31 41 55) / <alpha-value>)',
        'accordion-border-light': 'rgb(var(--accordion-border-light, 229 231 235) / <alpha-value>)',
        'accordion-border-dark': 'rgb(var(--accordion-border-dark, 55 65 81) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-family)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: 'var(--font-size-base)',
      },
      spacing: {
        base: 'var(--spacing-base)',
      },
      transitionProperty: {
        'height': 'height',
        'max-height': 'max-height',
      },
      keyframes: {
        'slide-down': {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '1000px', opacity: '1' },
        },
        'slide-up': {
          '0%': { maxHeight: '1000px', opacity: '1' },
          '100%': { maxHeight: '0', opacity: '0' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.2s ease-in-out',
        'slide-up': 'slide-up 0.2s ease-in-out',
      },
    },
  },
  plugins: [],
}
