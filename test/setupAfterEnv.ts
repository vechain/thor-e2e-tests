import { Node1Client, SDKClient } from '../src/thor-client'

jest.retryTimes(3, { logErrorsBeforeRetry: false })

afterAll(async () => {
    Node1Client.closeAllSubscriptions()
    SDKClient.destroy()
})
