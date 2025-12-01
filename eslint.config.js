//  @ts-check

import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import solid from 'eslint-plugin-solid'

export default [
  {
    ignores: [
      'dist',
      'build',
      'node_modules',
      'coverage',
      '*.config.js',
      '*.config.ts',
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts',
      '**/*.js.map',
      '**/*.d.ts.map',
      '.storybook/**/*',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      solid,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Let TypeScript handle this
      ...solid.configs.recommended.rules,
      'solid/components-return-once': 'error',
      'solid/no-innerhtml': 'warn',
      'solid/no-destructure': 'warn',
      'solid/reactivity': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      solid,
    },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'error',
      ...solid.configs.recommended.rules,
      'solid/components-return-once': 'error',
      'solid/no-innerhtml': 'warn',
      'solid/no-destructure': 'warn',
      'solid/reactivity': 'warn',
    },
  },
]
