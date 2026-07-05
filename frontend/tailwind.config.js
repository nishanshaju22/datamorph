/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':      '#0e0e11',
        'bg-surface':   '#1a1a20',
        'bg-elevated':  '#242430',
        'accent':       '#7c6dfa',
        'accent-dim':   '#2d2860',
        'success':      '#22c55e',
        'danger':       '#ef4444',
        'warning':      '#f59e0b',
        'text-primary': '#f0f0f5',
        'text-muted':   '#8b8b9e',
        'border':       '#2e2e3a',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}