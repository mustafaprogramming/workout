/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '515px',
      },
      animation: {
        shake: 'shake 0.5s infinite',
        flash: 'flash 1s ease-in-out infinite',
        dots: 'dots 1.5s steps(3, end) infinite',
        clean: 'clean 3s ease-in-out infinite',
        dustLeft: 'dustLeft 3s  ease-out infinite',
        dustRight: 'dustRight 3s ease-out  infinite',
        lid:'lid 4s ease-out forwards'
      },
      keyframes: {
        dots: {
          '0%': { content: "'.'" },
          '33%': { content: "'..'" },
          '66%': { content: "'...'" },
          '100%': { content: "'.'" },
        },
        dustRight: {
          '0%,10%': {
            transform: 'translate(0, 0) scale(0)',
            opacity: '0',
          },
          '25%': {
            transform: 'translate(0, 0) scale(1)',
            opacity: '1',
          },
          '50%,100%': {
            transform: 'translate(45px, -30px) scale(0.7)',
            opacity: '0',
          },
        },
        dustLeft: {
          '0%,10%,100%': {
            transform: 'translate(0, 0) scale(0)',
            opacity: '0',
          },
          '25%': {
            transform: 'translate(0, 0) scale(1)',
            opacity: '1',
          },
          '50%': {
            transform: 'translate(-45px, -30px) scale(0.6)',
            opacity: '0',
          },
        },
        clean: {
          '0%, 100%': {
            transform: 'rotate(0deg) translateX(-10px)',
          },
          '50%': {
            transform: 'rotate(-60deg) translateX(40px)',
          },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        flash: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
        lid:{
          '0%,25%,100%':{
            transform: 'translate(0, 0)',
          },
          '50%,80%':{
            transform: 'rotate(45deg)  translate(0, -20px)',
          }
        }
      },
    },
  },
  plugins: [],
}
