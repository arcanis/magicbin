module.exports = {
  extends: [
    `@yarnpkg`,
    `@yarnpkg/eslint-config/react`,
  ],
  plugins: [
    `arca`,
  ],
  ignorePatterns: [
    `tests/__snapshots__`,
  ],
  rules: {
    [`arca/jsx-no-html-attrs`]: 2,
    [`arca/jsx-no-string-styles`]: 2,
  },
};
