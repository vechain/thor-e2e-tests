import { Client } from '../../../src/thor-client'
import { components } from '../../../src/open-api-types'
import { fundingAmounts, fundAccount } from '../../../src/account-faucet'
import { generateAddress } from '../../../src/wallet'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/transfer', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const events: components['schemas']['SubscriptionTransferResponse'][] =
            []
        const account = generateAddress()

        Client.raw.subscribeToTransfers(
            {
                recipient: account,
            },
            (event) => {
                events.push(event)
            },
        )

        const { receipt } = await fundAccount(
            account,
            fundingAmounts.tinyVetNoVtho,
        )
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
