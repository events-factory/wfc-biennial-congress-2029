import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WFC Biennial Congress 2029 — Kigali brand blue (teal→blue gradient)
        primary: {
          DEFAULT: '#2b7fb5',
          50: '#ecf6fb',
          100: '#d4ecf6',
          200: '#a9d8ec',
          300: '#74bfe0',
          400: '#4ba2cf',
          500: '#2b7fb5',
          600: '#226a9c',
          700: '#224c77',
          800: '#1a3a5c',
          900: '#122740',
          light: '#4cc2b6',
        },
        // Brand teal (gradient endpoint / "Sit Less, Live More" accent)
        teal: {
          DEFAULT: '#2bb3a6',
          light: '#4cc2b6',
          dark: '#1f8c82',
        },
        // Deep indigo from the wordmark / spine vertebrae
        'accent-indigo': '#3d4aa5',
        'accent-green': '#bbd758',
        'accent-red': '#ef4545',
      },
    },
  },
  plugins: [],
}
export default config
