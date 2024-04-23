import { Node1Client } from '../../../src/thor-client'
import { components } from '../../../src/open-api-types'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/blocks', () => {
    it('should be able to subscribe', async () => {
        const beats: components['schemas']['SubscriptionBlockResponse'][] = []

        const ws = Node1Client.subscribeToBlocks((newBlock) => {
            beats.push(newBlock)
        })

        await Node1Client.waitForBlock()
        await Node1Client.waitForBlock()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(beats.length).toBeGreaterThanOrEqual(2)

        ws.unsubscribe()
    })
})
