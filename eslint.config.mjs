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
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/New[A-Z]*', '**/*New[A-Z]*'], message: 'Tránh dùng prefix mơ hồ "New" cho component. Đặt tên rõ ràng theo chức năng.' },
          { group: ['**/V[0-9]*', '**/*V[0-9]*'], message: 'Tránh đặt tên version (V2/V3...) trong path component. Dùng tên mô tả thay vì version.' },
          { group: ['**/Temp[A-Z]*', '**/*Temp[A-Z]*'], message: 'Tránh dùng "Temp" cho component. Nếu cần thử nghiệm, dùng feature flag/nhánh riêng.' },
        ],
      }],
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
