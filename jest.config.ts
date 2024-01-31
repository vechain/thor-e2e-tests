import type { Config } from 'jest'

const IS_GH_ACTIONS = process.env.GITHUB_ACTIONS === 'true'

const config: Config = {
    verbose: true,
    // seconds to be considered slow
    slowTestThreshold: 25,
    reporters: [
        IS_GH_ACTIONS ? ['github-actions', { silent: false }] : 'default',
        [
            'jest-junit',
            {
                suiteName: 'E2E Tests',
                output: './junit.xml',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestorSeparator: ' =>> ',
                suiteNameTemplate: '{filepath}',
            },
        ],
        'summary',
    ],
    // ms to wait before throwing a timeout error
    testTimeout: 60_000,
    setupFilesAfterEnv: ['./jest/setupAfterEnv.ts', 'jest-extended/all'],
    globalSetup: './jest/globalSetup.ts',
    globalTeardown: './jest/globalTeardown.ts',
}

export default config
