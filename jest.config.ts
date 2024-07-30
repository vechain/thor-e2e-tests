import type { Config } from 'jest'

const IS_GH_ACTIONS = process.env.GITHUB_ACTIONS === 'true'
const MAX_WORKERS = process.env.MAX_WORKERS

const config: Config = {
    verbose: true,
    // seconds to be considered slow
    slowTestThreshold: 20,
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
        [
            'jest-html-reporters',
            {
                filename: 'jest-report.html',
                openReport: false,
                pageTitle: 'Thor E2E Tests',
            },
        ],
    ],
    // ms to wait before throwing a timeout error
    testTimeout: 60_000,
    json: true,
    maxWorkers: MAX_WORKERS ? parseInt(MAX_WORKERS) : '6',
    workerThreads: false,
    setupFilesAfterEnv: [
        './test/setupAfterEnv.ts',
        'jest-extended/all',
        'jest-expect-message',
    ],
    globalSetup: './test/globalSetup.ts',
    runner: 'groups',
}

export default config
