/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors for the app
        'bullish': '#10b981',
        'bearish': '#ef4444',
        'neutral': '#6b7280',
        'alert-high': '#dc2626',
        'alert-medium': '#f59e0b',
        'alert-low': '#22c55e',
      },
    },
  },
  plugins: [],
}
