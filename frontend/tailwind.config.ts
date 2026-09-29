import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/screens/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],    // Default body font
        display: ['var(--font-geist)', 'sans-serif'], // Headings & badges
        geist: ['var(--font-geist)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        carebridge: {
          navy: '#1E3A8A',          // Primary Royal Navy
          navyDark: '#152A64',      // Deep matrix navy
          blue: '#2563EB',          // Electric Accent Blue
          blueLight: '#EFF6FF',     // Lightest blue tint
          canvas: '#F8FAFC',        // Clinical Light Portal Canvas
          surface: '#FFFFFF',       // Crisp White Card Surface
          teal: '#0D7A68',          // History Matrix Teal Card
          tealDark: '#0A5D50',      // Deep matrix teal
          emerald: '#10B981',       // Taken status emerald
          emeraldLight: '#ECFDF5',  // Emerald chip bg
          amber: '#F59E0B',         // Warning/pro gold
          amberLight: '#FFFBEB',    // Amber card bg
          oled: '#050811',          // Senior Nightstand OLED black
          oledCard: '#0B1528',      // Senior Nightstand card navy
        },
        smart: {
          bg: '#F8FAFC',
          deep: '#152A64',
          card: '#FFFFFF',
          hover: '#F1F5F9',
          muted: '#64748B',
          border: 'rgba(0, 0, 0, 0.06)',
        },
        coral: {
          DEFAULT: '#1E3A8A',
          light: '#2563EB',
          glow: 'rgba(30, 58, 138, 0.25)',
        },
        softBlue: {
          DEFAULT: '#2563EB',
          light: '#38BDF8',
          glow: 'rgba(37, 99, 235, 0.25)',
        },
        ambient: {
          root: '#F8FAFC',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          hover: '#F1F5F9',
          border: 'rgba(0, 0, 0, 0.06)',
        },
        alexa: {
          cyan: '#00CAFF',
          cyanGlow: 'rgba(0, 202, 255, 0.35)',
          blue: '#2563EB',
          deep: '#152A64',
        },
        neon: {
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.45)',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'clinical-card': '0 4px 20px rgba(0, 0, 0, 0.04)',
        'clinical-card-hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'hero-blue': '0 10px 25px rgba(30, 58, 138, 0.22)',
        'hero-teal': '0 10px 25px rgba(13, 122, 104, 0.22)',
        'glow-royal': '0 0 20px rgba(30, 58, 138, 0.3)',
        'glow-cyan': '0 0 20px rgba(0, 202, 255, 0.35)',
        'glow-cyan-lg': '0 0 35px rgba(0, 202, 255, 0.55)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.45)',
        'oled-glow': '0 0 30px rgba(16, 185, 129, 0.35)',
      },
      animation: {
        'orb-breath': 'orbBreath 3s infinite ease-in-out',
        'ring-pulse': 'ringPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        orbBreath: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 25px rgba(0, 202, 255, 0.5)' },
          '50%': { transform: 'scale(1.06)', boxShadow: '0 0 45px rgba(0, 202, 255, 0.85)' },
        },
        ringPulse: {
          '0%': { opacity: '0.8', transform: 'scale(0.95)' },
          '50%': { opacity: '0.2', transform: 'scale(1.3)' },
          '100%': { opacity: '0.8', transform: 'scale(0.95)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;