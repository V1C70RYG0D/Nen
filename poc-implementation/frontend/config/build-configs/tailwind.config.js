/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages*.{js,ts,jsx,tsx,mdx}',
    './components*.{js,ts,jsx,tsx,mdx}',
    './app*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base theme
        'space': {
          900: '#0A0E27',
          800: '#1A1F3A',
          700: '#2A2F4A',
          600: '#3A3F5A',
          500: '#4A4F6A',
        },
        // Nen aura colors
        'enhancement': {
          500: '#FF6B6B',
          400: '#FF8E8E',
          300: '#FFB1B1',
        },
        'emission': {
          500: '#4ECDC4',
          400: '#71D7D0',
          300: '#94E1DC',
        },
        'manipulation': {
          500: '#6C5CE7',
          400: '#8B7BEA',
          300: '#AA9AED',
        },
        // Solana brand
        'solana': {
          500: '#4527A0',
          400: '#6A4C93',
          300: '#8F71A3',
        },
        // MagicBlock theme
        'magicblock': {
          500: '#0277BD',
          400: '#0288D1',
          300: '#03A9F4',
        },
        // Neural AI
        'neural': {
          500: '#00BCD4',
          400: '#26C6DA',
          300: '#4DD0E1',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'aura-glow': 'aura-glow 2s ease-in-out infinite alternate',
        'neural-flow': 'neural-flow 4s linear infinite',
        'energy-pulse': 'energy-pulse 1.5s ease-in-out infinite',
        'holographic': 'holographic 3s ease-in-out infinite',
      },
      keyframes: {
        'aura-glow': {
          '0%': {
            boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)',
            transform: 'scale(1)',
          },
          '100%': {
            boxShadow: '0 0 40px rgba(255, 107, 107, 0.6)',
            transform: 'scale(1.02)',
          },
        },
        'neural-flow': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
        'energy-pulse': {
          '0%, 100%': {
            opacity: 1,
            transform: 'scale(1)',
          },
          '50%': {
            opacity: 0.7,
            transform: 'scale(1.05)',
          },
        },
        'holographic': {
          '0%, 100%': {
            background: 'linear-gradient(45deg, #4ECDC4, #6C5CE7)',
            opacity: 0.8,
          },
          '50%': {
            background: 'linear-gradient(45deg, #6C5CE7, #FF6B6B)',
            opacity: 1,
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'aura': '0 0 20px rgba(255, 107, 107, 0.3)',
        'emission': '0 0 20px rgba(78, 205, 196, 0.3)',
        'manipulation': '0 0 20px rgba(108, 92, 231, 0.3)',
        'neural': '0 0 20px rgba(0, 188, 212, 0.3)',
        'hologram': '0 0 30px rgba(78, 205, 196, 0.5), inset 0 0 30px rgba(108, 92, 231, 0.2)',
      },
      backgroundImage: {
        'neural-gradient': 'linear-gradient(45deg, #00BCD4, #4ECDC4, #6C5CE7)',
        'aura-gradient': 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #6C5CE7)',
        'solana-gradient': 'linear-gradient(135deg, #4527A0, #6A4C93)',
        'magicblock-gradient': 'linear-gradient(135deg, #0277BD, #03A9F4)',
      },
    },
  },
  plugins: [],
};
