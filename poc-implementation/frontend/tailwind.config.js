/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Solana-inspired colors
        solana: {
          purple: '#9945FF',
          green: '#14F195',
          dark: '#1A1B23',
          light: '#F0F0F2',
        },
        // Hunter x Hunter Nen colors
        nen: {
          enhancement: '#FF6B6B', // Red
          emission: '#4ECDC4', // Cyan
          manipulation: '#FFE66D', // Yellow
          transmutation: '#95E1D3', // Mint
          conjuration: '#A8E6CF', // Light Green
          specialization: '#C7CEEA', // Lavender
        },
        // Dark cyberpunk palette
        cyber: {
          dark: '#0A0A0B',
          darker: '#050506',
          accent: '#00D9FF',
          neon: '#FF00FF',
          matrix: '#00FF41',
        },
        // MagicBlock colors
        magicblock: {
          primary: '#7C3AED',
          secondary: '#F59E0B',
          accent: '#10B981',
        },
      },
      fontFamily: {
        'cyber': ['Orbitron', 'monospace'],
        'hunter': ['Bebas Neue', 'sans-serif'],
        'tech': ['Rajdhani', 'sans-serif'],
        'mono': ['Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'float-gentle': 'float-gentle 4s ease-in-out infinite',
        'matrix': 'matrix 20s linear infinite',
        'glitch': 'glitch 2s ease-in-out infinite',
        'nen-aura': 'nenAura 3s ease-in-out infinite',
        'cyber-scan': 'cyberScan 4s ease-in-out infinite',
        'hologram': 'hologram 8s ease-in-out infinite',
        'text-glow-pulse': 'text-glow-pulse 2s ease-in-out infinite',
        'border-glow': 'border-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 1s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          'from': { textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #e60073, 0 0 40px #e60073' },
          'to': { textShadow: '0 0 20px #fff, 0 0 30px #ff4da6, 0 0 40px #ff4da6, 0 0 50px #ff4da6' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-10px) scale(1.02)' },
        },
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glitch: {
          '0%': { textShadow: '0.05em 0 0 #00fffc, -0.025em -0.05em 0 #fc00ff, 0.025em 0.05em 0 #fffc00' },
          '14%': { textShadow: '0.05em 0 0 #00fffc, -0.025em -0.05em 0 #fc00ff, 0.025em 0.05em 0 #fffc00' },
          '15%': { textShadow: '-0.05em -0.025em 0 #00fffc, 0.025em 0.025em 0 #fc00ff, -0.05em -0.05em 0 #fffc00' },
          '49%': { textShadow: '-0.05em -0.025em 0 #00fffc, 0.025em 0.025em 0 #fc00ff, -0.05em -0.05em 0 #fffc00' },
          '50%': { textShadow: '0.025em 0.05em 0 #00fffc, 0.05em 0 0 #fc00ff, 0 -0.05em 0 #fffc00' },
          '99%': { textShadow: '0.025em 0.05em 0 #00fffc, 0.05em 0 0 #fc00ff, 0 -0.05em 0 #fffc00' },
          '100%': { textShadow: '-0.025em 0 0 #00fffc, -0.025em -0.025em 0 #fc00ff, -0.025em -0.05em 0 #fffc00' },
        },
        nenAura: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(153, 69, 255, 0.6), 0 0 40px rgba(153, 69, 255, 0.4), 0 0 60px rgba(153, 69, 255, 0.2)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(153, 69, 255, 0.8), 0 0 60px rgba(153, 69, 255, 0.6), 0 0 90px rgba(153, 69, 255, 0.4)',
            transform: 'scale(1.05)'
          },
        },
        cyberScan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        hologram: {
          '0%, 100%': { opacity: '0.8', filter: 'hue-rotate(0deg)' },
          '50%': { opacity: '1', filter: 'hue-rotate(180deg)' },
        },
        'text-glow-pulse': {
          '0%, 100%': { 
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
          },
          '50%': { 
            textShadow: '0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor, 0 0 50px currentColor',
          },
        },
        'border-glow': {
          '0%, 100%': { 
            borderColor: 'rgba(153, 69, 255, 0.3)',
            boxShadow: '0 0 10px rgba(153, 69, 255, 0.2)',
          },
          '50%': { 
            borderColor: 'rgba(153, 69, 255, 0.8)',
            boxShadow: '0 0 20px rgba(153, 69, 255, 0.4), 0 0 30px rgba(153, 69, 255, 0.2)',
          },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%': { 
            boxShadow: '0 0 5px rgba(153, 69, 255, 0.5)',
          },
          '100%': { 
            boxShadow: '0 0 20px rgba(153, 69, 255, 0.8), 0 0 30px rgba(153, 69, 255, 0.6)',
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'cyber-grid': "linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)",
        'nen-pattern': "url('/nen-pattern.svg')",
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} 