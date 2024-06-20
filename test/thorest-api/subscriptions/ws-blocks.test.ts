import { Client } from '../../../src/thor-client'
import { components } from '../../../src/open-api-types'
import { testCase } from '../../../src/test-case'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/blocks', () => {
    testCase(['solo', 'default-private'])(
        'should be able to subscribe',
        async () => {
            const beats: components['schemas']['SubscriptionBlockResponse'][] =
                []

            const ws = Client.raw.subscribeToBlocks((newBlock) => {
                beats.push(newBlock)
            })

            await Client.raw.waitForBlock()
            await Client.raw.waitForBlock()

            //sleep for 1 sec to ensure the beat is received
            await new Promise((resolve) => setTimeout(resolve, 1000))

            expect(beats.length).toBeGreaterThanOrEqual(2)

            ws.unsubscribe()
        },
    )
})
