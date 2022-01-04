module.exports = {
  purge: [`./pages/**/*.{js,ts,jsx,tsx}`, `./components/**/*.{js,ts,jsx,tsx}`],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      keyframes: {
        hourglass: {
          [`0%, 50%`]: {
            transform: `rotate(180deg)`,
          },
          [`50%, 100%`]: {
            transform: `rotate(360deg)`,
          },
        },
      },
      animation: {
        hourglass: `hourglass 1s ease-in-out infinite`,
      },
      fontFamily: {
        [`glory`]: `Glory`,
        [`mononoki`]: `Mononoki`,
      },
    },
    fontMetrics: {
      [`Arima Madurai`]: {},
      [`Glory`]: {},
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require(`tailwindcss-leading-trim`),
  ],
};
