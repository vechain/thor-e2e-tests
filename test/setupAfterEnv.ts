import { Client } from '../src/thor-client'

jest.retryTimes(3, { logErrorsBeforeRetry: false })

afterAll(async () => {
    Client.raw.closeAllSubscriptions()
    jest.clearAllTimers()
    Client.sdk.destroy()
})
