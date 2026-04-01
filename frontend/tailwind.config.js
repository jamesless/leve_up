/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Lora', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        dreamy: {
          purple: {
            light: '#E9D5FF',
            DEFAULT: '#A855F7',
            dark: '#7C3AED',
          },
          pink: {
            light: '#FDE2E4',
            DEFAULT: '#F472B6',
            dark: '#EC4899',
          },
          gold: {
            light: '#FEF3C7',
            DEFAULT: '#FBBF24',
            dark: '#F59E0B',
          },
          gradient: {
            purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            gold: 'linear-gradient(135deg, #FFD89B 0%, #F9A825 100%)',
            fantasy: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          },
        },
        felt: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#7C3AED',
        },
        suit: {
          red: '#F472B6',
          black: '#1E293B',
        },
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'card-deal': {
          from: { opacity: '0', transform: 'translateY(-40px) rotateX(20deg)' },
          to: { opacity: '1', transform: 'translateY(0) rotateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(244, 114, 182, 0.2)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(244, 114, 182, 0.3)',
            transform: 'scale(1.02)',
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        'rainbow': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'card-deal': 'card-deal 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'rainbow': 'rainbow 6s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
