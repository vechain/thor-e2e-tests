/* eslint-env node */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
    },
    ignorePatterns: [
        '*config.js',
        'node_modules/',
        'artifacts/',
        'cache/',
        'typechain-types/',
    ],
}
