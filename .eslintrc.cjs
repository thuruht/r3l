module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: {
    node: true,
    es6: true,
    worker: true,
  },
  overrides: [
    {
      files: ['public/js/**/*.js'],
      parser: 'espree',
      env: { browser: true, es6: true },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      extends: ['eslint:recommended', 'prettier'],
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': 'off',
      },
    },
  ],
  // Ignore archived and legacy test pages to keep lint focused on current iteration
  ignorePatterns: [
    'archive/**',
    'public/test-*.html',
    'public/check-*.html',
    'public/test-auth.html',
    '**/*.d.ts',
    'src/stubs/**',
    'src/cookie-fixer.js',
    'src/router.ts.bak*',
    'src/router.ts.backup',
    'src/router.ts.error',
    'src/router-new.ts',
    'src/router.ts.*.bak*',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  rules: {
    'no-console': 'off',
    'no-useless-escape': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
};
