import { Node1Client } from '../../../src/thor-client'
import { SubscriptionBlockResponse } from '../../../src/open-api-types-padded'

describe('WS /subscriptions/blocks', () => {
    it('should be able to subscribe', async () => {
        const beats: SubscriptionBlockResponse[] = []

        Node1Client.subscribeToBlocks((newBlock) => {
            beats.push(newBlock)
        })

        await Node1Client.waitForBlock()
        await Node1Client.waitForBlock()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(beats.length).toBeGreaterThanOrEqual(2)
    })
})
