import pluginJest from 'eslint-plugin-jest'
import eslintConfigPrettier from 'eslint-config-prettier'
import jestExtended from 'eslint-plugin-jest-extended'
// import js from "@eslint/js";

export default [
    // js.configs.recommended,
    jestExtended.configs['flat/all'],
    {
        plugins: { jest: pluginJest },
        languageOptions: {
            globals: pluginJest.environments.globals.globals,
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2024,
            },
        },
        files: ['**/*.spec.js', '**/*.test.js'],
        ignores: [
            '.yarn/*',
            '*config.js',
            '**/node_modules/',
            '.git/*',
            'artifacts/',
            'cache/',
            'typechain-types/',
            'jest-html-reporters-attach/',
            'coverage/',
        ],
        rules: {
            indent: ['error', 2],
            'jest/prefer-expect-assertions': 'warn',
            'jest/no-disabled-tests': 'warn',
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',
            'jest/prefer-to-have-length': 'warn',
            'jest/valid-expect': ['error', { minArgs: 1, maxArgs: 2 }],
            'jest-extended/prefer-to-be-true': 'warn',
            'jest-extended/prefer-to-be-false': 'error',
        },
    },
    eslintConfigPrettier,
]
