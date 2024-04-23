import { Node1Client } from '../../../src/thor-client'
import { fundAccount } from '../../../src/account-faucet'
import { components } from '../../../src/open-api-types'
import { generateAddress } from '../../../src/wallet'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/transfer', () => {
    it('should be able to subscribe', async () => {
        const events: components['schemas']['SubscriptionTransferResponse'][] =
            []
        const account = generateAddress()

        Node1Client.subscribeToTransfers(
            {
                recipient: account,
            },
            (event) => {
                events.push(event)
            },
        )

        const { receipt } = await fundAccount(account)
        const sender = receipt.outputs?.[0].transfers?.[0].sender

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const relevantEvent = events.find((event) => {
            return event.meta?.txID === receipt.meta?.txID
        })

        expect(relevantEvent).not.toBeUndefined()
        expect(relevantEvent?.meta?.txOrigin).toEqual(sender)
    })
})
