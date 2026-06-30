module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          300: '#93c5fd',
          500: '#2563eb',
          700: '#1e40af',
        },
        accent: {
          50: '#ecfdf5',
          300: '#6ee7b7',
          500: '#10b981',
        },
        agent: {
          primary: '#0f172a',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular']
      },
      borderRadius: {
        xl: '12px'
      },
      boxShadow: {
        card: '0 4px 16px rgba(2,6,23,0.06)'
      }
    },
  },
  plugins: [],
}
