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
        flash: 'flash 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        dots: 'dots 1.5s steps(3, end) infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-15px)' },
          '40%, 80%': { transform: 'translateX(15px)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        dots: {
          '0%, 20%': { content: "'.'" },
          '40%': { content: "'..'" },
          '60%, 100%': { content: "'...'" },
        },
      },
    },
  },
  plugins: [],
}
