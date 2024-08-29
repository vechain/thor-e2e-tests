import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/blocks', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const beats = []

        const ws = Client.raw.subscribeToBlocks((newBlock) => {
            beats.push(newBlock)
        })

        await Client.raw.waitForBlock()
        await Client.raw.waitForBlock()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(beats.length).toBeGreaterThanOrEqual(2)

        ws.unsubscribe()
    })
})
