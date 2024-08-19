import { Client } from '../src/thor-client'
import 'dotenv/config'
import { testEnv } from '../src/test-env'

it.e2eTest = (title, tags, testFunc) => {
    if (typeof title !== 'string') {
        throw new Error('Title must be a string')
    }

    if (typeof tags !== 'string' && !Array.isArray(tags)) {
        throw new Error('Tags must be a string or an array')
    }

    if (typeof testFunc !== 'function') {
        throw new Error('Test function must be a function')
    }

    if (tags === 'all' || tags.includes(testEnv.type)) {
        test(title, testFunc)
    } else {
        test.skip(title, testFunc)
    }
}

jest.retryTimes(3, { logErrorsBeforeRetry: true })

afterAll(async () => {
    Client.raw.closeAllSubscriptions()
    jest.clearAllTimers()
    Client.sdk.destroy()
})
