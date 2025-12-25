/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  plugins: ['@typescript-eslint', '@next/next', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['.next/**', 'node_modules/**', 'out/**', 'build/**'],
  rules: {
    // Giảm noise để tập trung vào lỗi quan trọng
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@next/next/no-img-element': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-empty': 'off',
    'prefer-const': 'off',
    'prefer-spread': 'off',
  },
};
