/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // New design system colors
        black: '#0A0A0A',
        charcoal: '#1A1A1A',
        graphite: '#2D2D2D',
        steel: '#6B6B6B',
        silver: '#9A9A9A',
        pearl: '#E8E8E8',
        cloud: '#F5F5F5',
        white: '#FFFFFF',
        mint: '#00D4AA',
        'mint-light': '#E6FBF6',
        coral: '#FF6B5B',
        'coral-light': '#FFF0EE',
        // Legacy colors for compatibility
        cream: '#F5F5F5',
        sand: '#E8E8E8',
        forest: '#0A0A0A',
        pine: '#1A1A1A',
        sage: '#00D4AA',
        stone: '#6B6B6B',
        terracotta: '#FF6B5B',
        rust: '#FF6B5B',
      },
      fontFamily: {
        display: ['Jost', 'sans-serif'],
        body: ['Jost', 'sans-serif'],
        sans: ['Jost', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.06)',
        'elevated': '0 10px 40px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        'nav': '20px',
      },
    },
  },
  plugins: [],
};
