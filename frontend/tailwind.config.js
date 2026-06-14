/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'sm':         '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card':       '0 2px 12px rgba(0,0,0,0.06)',
        'md':         '0 4px 16px rgba(0,0,0,0.08)',
        'lg':         '0 10px 30px rgba(0,0,0,0.10)',
        'xl':         '0 20px 50px rgba(0,0,0,0.14)',
        'blue':       '0 8px 24px rgba(59,130,246,0.30)',
        'inner-blue': 'inset 0 0 0 1px rgba(59,130,246,0.2)',
      },
      backgroundImage: {
        'gradient-blue':   'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
        'gradient-green':  'linear-gradient(135deg, #065f46 0%, #10b981 50%, #34d399 100%)',
        'gradient-purple': 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 50%, #a78bfa 100%)',
        'gradient-orange': 'linear-gradient(135deg, #92400e 0%, #f59e0b 50%, #fbbf24 100%)',
        'gradient-red':    'linear-gradient(135deg, #991b1b 0%, #ef4444 50%, #f87171 100%)',
        'gradient-rose':   'linear-gradient(135deg, #9f1239 0%, #f43f5e 50%, #fb7185 100%)',
        'gradient-teal':   'linear-gradient(135deg, #134e4a 0%, #14b8a6 50%, #2dd4bf 100%)',
        'gradient-indigo': 'linear-gradient(135deg, #3730a3 0%, #6366f1 50%, #818cf8 100%)',
      },
      animation: {
        'fade-in-up':     'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':        'fadeIn 0.3s ease both',
        'scale-in':       'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'number-pop':     'numberPop 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'float':          'float 3s ease-in-out infinite',
        'pulse-glow':     'pulseGlow 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 4s ease infinite',
        'spin-slow':      'spin 8s linear infinite',
        'shimmer':        'shimmer 1.6s infinite',
      },
      keyframes: {
        fadeInUp:      { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:        { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn:       { from: { opacity: '0', transform: 'scale(0.93)' }, to: { opacity: '1', transform: 'scale(1)' } },
        numberPop:     { '0%': { opacity: '0', transform: 'scale(0.7) translateY(8px)' }, '60%': { transform: 'scale(1.05) translateY(-2px)' }, '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
        float:         { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseGlow:     { '0%,100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(59,130,246,0)' } },
        gradientShift: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        shimmer:       { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
