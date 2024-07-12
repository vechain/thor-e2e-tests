import { Client } from '../src/thor-client'
import 'dotenv/config'
import './jest-types.d.ts'
import { E2eTestTag, testEnv } from '../src/test-env'

it.e2eTest = (
    title: string,
    tags: E2eTestTag[] | 'all',
    testFunc: jest.ProvidesCallback,
) => {
    if (tags === 'all' || tags.includes(testEnv.type)) {
        test(title, testFunc)
    } else {
        test.skip(title, testFunc)
    }
}

jest.retryTimes(3, { logErrorsBeforeRetry: false })

afterAll(async () => {
    Client.raw.closeAllSubscriptions()
    jest.clearAllTimers()
    Client.sdk.destroy()
})
