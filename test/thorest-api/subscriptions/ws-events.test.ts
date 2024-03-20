import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { interfaces } from '../../../src/contracts/hardhat'
import { fundAccount } from '../../../src/account-faucet'
import { addAddressPadding } from '../../../src/utils/padding-utils'
import { components } from '../../../src/open-api-types'
import { generateAddress } from '../../../src/wallet'

describe('WS /subscriptions/event', () => {
    it('should be able to subscribe', async () => {
        const events: components['schemas']['SubscriptionEventResponse'][] = []
        const account = generateAddress()

        Node1Client.subscribeToEvents(
            (event) => {
                events.push(event)
            },
            {
                addr: contractAddresses.energy,
                t0: interfaces.energy.getEvent('Transfer').topicHash,
                t2: addAddressPadding(account),
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
