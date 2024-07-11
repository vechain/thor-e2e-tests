import { Client } from '../src/thor-client'
import 'dotenv/config'
import './jest-types.d.ts'
import { NetworkType, testEnv } from '../src/test-env'

const isMatching = (supportedEnvs: NetworkType[]) =>
    supportedEnvs.includes(testEnv.type)

it.e2eTest = (
    title: string,
    supportedEnvs: NetworkType[] | 'all',
    testFunc: jest.ProvidesCallback,
) => {
    if (supportedEnvs === 'all' || isMatching(supportedEnvs)) {
        test(title, testFunc)
    } else {
        console.warn(`Skipping test: ${title}`)
        test.skip(title, testFunc)
    }
}

jest.retryTimes(3, { logErrorsBeforeRetry: false })

afterAll(async () => {
    Client.raw.closeAllSubscriptions()
    jest.clearAllTimers()
    Client.sdk.destroy()
})
