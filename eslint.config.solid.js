import solid from 'eslint-plugin-solid'

export default [
  {
    files: ['**/*.{tsx,ts}'],
    plugins: {
      solid,
    },
    rules: {
      ...solid.configs.recommended.rules,
      'solid/components-return-once': 'error',
      'solid/no-innerhtml': 'warn',
      'solid/no-destructure': 'warn',
      'solid/reactivity': 'warn',
    },
  },
]
