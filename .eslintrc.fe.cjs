module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  globals: {
    d3: 'readonly',
    DOMPurify: 'readonly',
    document: 'readonly',
    window: 'readonly',
    URL: 'readonly',
    fetch: 'readonly',
    console: 'readonly'
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};