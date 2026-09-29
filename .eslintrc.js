module.exports = {
  extends: ['expo'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
  },
};
