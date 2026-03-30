/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f1728',
        ivory: '#f7f2e8',
        bronze: '#b67a35',
        primary: {
          50: '#eef4ff',
          100: '#dce7ff',
          200: '#c1d5ff',
          300: '#99b9ff',
          400: '#6f97f9',
          500: '#466fdd',
          600: '#3456b8',
          700: '#27408f',
          800: '#1e316d',
          900: '#16264f',
        },
        secondary: {
          50: '#f6f8fb',
          100: '#edf1f7',
          200: '#d9e1ec',
          300: '#bbc8d8',
          400: '#8ea0b8',
          500: '#62758f',
          600: '#485a72',
          700: '#334457',
          800: '#1f2c3f',
          900: '#121b2b',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Noto Serif SC', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
