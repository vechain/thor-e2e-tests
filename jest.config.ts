import type { Config } from 'jest'

const IS_GH_ACTIONS = process.env.GITHUB_ACTIONS === 'true'

// Default to Paris EVM
const EVM_TARGET = process.env.EVM_TARGET || 'paris'
const evmTargets = ['paris', 'shanghai'] as const
const excludedEVMs = evmTargets
    .filter((evm) => evm !== EVM_TARGET)
    .map((evm) => `test/evm/${evm}`)

console.log(`Excluding EVMs: ${excludedEVMs}`)

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
    maxWorkers: 3,
    setupFilesAfterEnv: [
        './test/setupAfterEnv.ts',
        'jest-extended/all',
        'jest-expect-message',
    ],
    globalSetup: './test/globalSetup.ts',
    testPathIgnorePatterns: excludedEVMs,
}

export default config
