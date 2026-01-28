/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f0f0f',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#252525',
        'border': '#333333',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'accent-blue': '#3b82f6',
        'accent-green': '#22c55e',
        'accent-yellow': '#eab308',
        'accent-red': '#ef4444',
        'interviewer': '#60a5fa',
        'user': '#a78bfa',
        'suggestion-bg': '#1e3a5f',
      },
    },
  },
  plugins: [],
}
