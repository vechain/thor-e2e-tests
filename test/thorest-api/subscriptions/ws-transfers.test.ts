import { Node1Client } from '../../../src/thor-client'
import { generateEmptyWallet } from '../../../src/wallet'
import { fundAccount } from '../../../src/account-faucet'
import { components } from '../../../src/open-api-types'

describe('WS /subscriptions/transfer', () => {
    it('should be able to subscribe', async () => {
        const events: components['schemas']['SubscriptionTransferResponse'][] =
            []
        const wallet = generateEmptyWallet()

        Node1Client.subscribeToTransfers(
            {
                recipient: wallet.address,
            },
            (event) => {
                events.push(event)
            },
        )

        const { receipt } = await fundAccount(wallet.address)
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
