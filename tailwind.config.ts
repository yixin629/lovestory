import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '.dark-mode'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
export default config
