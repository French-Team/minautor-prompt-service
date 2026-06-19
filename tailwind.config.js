/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./composables/**/*.{js,ts}",
    "./app.vue",
    "./error.vue"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      colors: {
        /* IBM Blue (Carbon Blue 60) */
        ibm: {
          10: '#edf5ff',
          20: '#d0e2ff',
          30: '#a6c8ff',
          40: '#78a9ff',
          50: '#4589ff',
          60: '#0f62fe',
          70: '#0043ce',
          80: '#002d9c',
          90: '#001d6c',
          100: '#001141'
        },
        /* IBM Carbon Gray scale */
        gray: {
          10: '#f4f4f4',
          20: '#e0e0e0',
          30: '#c6c6c6',
          40: '#a8a8a8',
          50: '#8d8d8d',
          60: '#6f6f6f',
          70: '#525252',
          80: '#393939',
          90: '#262626',
          100: '#161616'
        }
      }
    }
  },
  plugins: []
}
