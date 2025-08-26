module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  env: {
    node: true,
    es6: true,
    worker: true,
  },
  // Ignore archived and legacy test pages to keep lint focused on current iteration
  ignorePatterns: [
    'archive/**',
    'public/test-*.html',
    'public/check-*.html',
    'public/test-auth.html',
    'src/router.ts.bak*',
    'src/router.ts.backup',
    'src/router.ts.error',
    'src/router-new.ts',
    'src/router.ts.*.bak*',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_' 
    }]
  }
};