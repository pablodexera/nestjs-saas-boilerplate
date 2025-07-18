/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = compat.config({
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/no-unresolved': 'error',
    'import/order': [
      'error',
      {
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
      },
    ],
    'prettier/prettier': ['error'],
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', 'prisma/', 'scripts/'],
});
