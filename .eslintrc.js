/* eslint-env node */
module.exports = {
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2024,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    root: true,
    env: {
        es2024: true,
        node: true,
        jest: true,
    },
    ignorePatterns: [
        '*config.js',
        'node_modules/',
        'artifacts/',
        'cache/',
        'typechain-types/',
        'jest-html-reporters-attach',
        'coverage',
    ],
}
