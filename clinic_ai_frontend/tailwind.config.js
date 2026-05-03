/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f8f9ff',
        'surface-dim': '#cbdbf5',
        'surface-bright': '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d3e4fe',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#3d4947',
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        outline: '#6d7a77',
        'outline-variant': '#bcc9c6',
        primary: '#00685f',
        'on-primary': '#ffffff',
        'primary-container': '#008378',
        'on-primary-container': '#f4fffc',
        background: '#f8f9ff',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        card: '0px 4px 20px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
}

