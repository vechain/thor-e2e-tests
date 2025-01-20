import eslintConfigPrettier from 'eslint-config-prettier'
import vitest from '@vitest/eslint-plugin'
import js from '@eslint/js'

export default [
    // js.configs.recommended,
    eslintConfigPrettier,
    {
        plugins: { vitest },
        languageOptions: {
            globals: {
                ...vitest.environments.env.globals,
                node: true,
            },
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2024,
            },
        },
        files: ['src/**/*.js', 'test/**/*.js'],
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
            ...vitest.configs.recommended.rules, // you can also use vitest.configs.all.rules to enable all rules
            'vitest/max-nested-describe': ['error', { max: 3 }], // you can also modify rules' behavior using option like this
        },
    },
]
