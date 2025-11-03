module.exports = {
  env: {
    es2022: true,
    node: true,
    worker: true
  },
  globals: {
    WebSocketPair: 'readonly'
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};