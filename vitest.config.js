import { defineConfig } from 'vite'

const IS_GH_ACTIONS = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
    test: {
        include: ['./test/**/*.test.js'],
        setupFiles: ['./test/setupAfterEnv.js'],
        globalSetup: './test/globalSetup.js',
        globals: true,
        environment: 'node',
        retry: IS_GH_ACTIONS ? 3 : 0,
        testTimeout: 60_000,
        hookTimeout: 60_000,
        poolOptions: {
            forks: {
                minForks: 1,
                maxForks: 4,
            },
        },
        reporters: IS_GH_ACTIONS
            ? [
                  'github-actions',
                  'default',
                  ['junit', { outputFile: 'junit.xml' }],
              ]
            : ['default'],
    },
})
