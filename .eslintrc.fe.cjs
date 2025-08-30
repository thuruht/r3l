module.exports = {
  root: false,
  parser: 'espree',
  env: { browser: true, es6: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  ignorePatterns: ['vendor/**'],
};
