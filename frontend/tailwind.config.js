/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef1f8',
          100: '#d5dcee',
          500: '#3a5199',
          700: '#243572',
          900: '#1A2B5F',
        },
        gold: {
          400: '#d4b66a',
          500: '#C9A84C',
          600: '#b8942e',
        },
      },
    },
  },
  plugins: [],
};
