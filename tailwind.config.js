/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#1d4ed8',
        'primary-hover': '#1e40af',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        surface: '#f0f7ff',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        card: '8px',
        button: '6px',
      },
    },
  },
  plugins: [],
}
