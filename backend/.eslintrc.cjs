module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['node_modules/**'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}
