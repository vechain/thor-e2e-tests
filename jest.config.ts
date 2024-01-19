import type { Config } from 'jest'

const config: Config = {
    verbose: true,
    // seconds to be considered slow
    slowTestThreshold: 25,
    reporters: [
        'default',
        [
            'jest-junit',
            {
                suiteName: 'E2E Tests',
                output: './junit.xml',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestorSeparator: ' :: ',
                suiteNameTemplate: '{filename}',
            },
        ],
        ['github-actions', { silent: false }],
        'summary',
    ],
    // ms to wait before throwing a timeout error
    testTimeout: 35_000,
    json: true,
    maxWorkers: 3,
}

export default config
