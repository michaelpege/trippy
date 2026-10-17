import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bauhaus: {
          red: '#E63329',
          blue: '#1A3A6B',
          yellow: '#F5C800',
          black: '#111111',
          offwhite: '#F7F5F0',
          white: '#FFFFFF',
          gray: '#888888',
          dark: '#0E1013',
          darkcard: '#16191E',
        },
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};

export default config;
