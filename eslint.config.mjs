import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  // Base Next.js + React + React Hooks rules
  ...nextVitals,
  // TypeScript-specific rules
  ...nextTs,
  // Tuỳ chỉnh thêm một số rule cho phù hợp dự án
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'prefer-spread': 'off',
      'prefer-const': 'off',
    },
  },
  // Ignores (có thể tuỳ chỉnh thêm nếu cần)
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);
