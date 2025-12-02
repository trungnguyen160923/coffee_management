/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        fontFamily: {
          sans: [
            '"Be Vietnam Pro"',
            'system-ui',
            'Segoe UI',
            'Roboto',
            'Helvetica',
            'Arial',
            'Apple Color Emoji',
            'Segoe UI Emoji'
          ],
          heading: [
            '"Montserrat Alternates"',
            '"Be Vietnam Pro"',
            'system-ui',
            'Segoe UI',
            'Roboto',
            'Helvetica',
            'Arial',
          ]
        }
      },
    },
    plugins: [],
  };