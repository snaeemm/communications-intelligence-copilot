/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#2DA24A', accent: '#F8B818', charcoal: '#141618', body: '#2D2B2C',
        offwhite: '#F7F7F7', gray: { DEFAULT: '#6B6B6B' }, line: '#EAEAEA',
        palegreen: '#E3F1E7', paleorange: '#FDF1D6',
        neg: '#B4432F', paleneg: '#F8E4DF'
      },
      fontFamily: { sans: ['"Red Hat Display"', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '2px', sm: '1px', md: '2px', lg: '2px', xl: '2px' }
    }
  },
  plugins: []
}
