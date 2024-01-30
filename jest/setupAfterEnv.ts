import { Node1Client, Node2Client, Node3Client } from '../src/thor-client'

jest.retryTimes(3, { logErrorsBeforeRetry: false })

afterAll(async () => {
    Node1Client.closeAllSubscriptions()
    Node2Client.closeAllSubscriptions()
    Node3Client.closeAllSubscriptions()
})
