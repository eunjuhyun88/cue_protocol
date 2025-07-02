// ============================================================================
// 📁 tailwind.config.js
// 🎨 CUE Protocol 색상 팔레트 설정
// ============================================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CUE Protocol 색상 팔레트
        cue: {
          primary: '#3B74BF',
          'primary-dark': '#2E5A9A',
          accent: '#EDF25E',
          'accent-light': '#E0F252',
          'accent-pale': '#F0F2AC',
          warning: '#F2B84B',
          'warning-dark': '#E8A432',
          secondary: '#BF8034',
          'secondary-dark': '#A66D28',
          dark: '#403F3D',
          black: '#0D0D0D',
          gray: {
            100: '#F2F2F2',
            200: '#D9D9D9',
            400: '#BFBFBF',
            600: '#8C8C8C',
          }
        }
      },
      backgroundImage: {
        'gradient-cue': 'linear-gradient(135deg, #3B74BF 0%, #EDF25E 100%)',
        'gradient-accent': 'linear-gradient(135deg, #EDF25E 0%, #F0F2AC 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #BF8034 0%, #F2B84B 100%)',
        'gradient-dark': 'linear-gradient(135deg, #403F3D 0%, #0D0D0D 100%)',
      },
      boxShadow: {
        'cue': '0 4px 14px 0 rgba(59, 116, 191, 0.15)',
        'cue-lg': '0 10px 25px 0 rgba(59, 116, 191, 0.2)',
        'accent': '0 4px 14px 0 rgba(237, 242, 94, 0.3)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
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
      }
    },
  },
  plugins: [],
  // Tailwind JIT 모드에서 동적 클래스 보호
  safelist: [
    'bg-cue-primary',
    'bg-cue-accent',
    'bg-cue-secondary',
    'bg-cue-warning',
    'text-cue-primary',
    'text-cue-accent',
    'text-cue-dark',
    'border-cue-primary',
    'border-cue-accent',
    'hover:bg-cue-primary-dark',
    'focus:ring-cue-primary',
    'bg-gradient-cue',
    'bg-gradient-accent',
    'shadow-cue',
    // 추가 동적 클래스들...
  ]
}