import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { interfaces } from '../../../src/contracts/hardhat'
import { addAddressPadding } from '../../../src/utils/padding-utils'
import { components } from '../../../src/open-api-types'
import { ThorWallet } from '../../../src/wallet'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/event', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const events: components['schemas']['SubscriptionEventResponse'][] = []
        //const account = generateAddress()
        const wallet = ThorWallet.txBetweenFunding()

        Client.raw.subscribeToEvents(
            (event) => {
                events.push(event)
            },
            {
                addr: contractAddresses.energy,
                t0: interfaces.energy.getEvent('Transfer').topicHash,
                t2: addAddressPadding(wallet.address),
            },
        )

        const receipt = await wallet.waitForFunding()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const relevantEvent = events.find((event) => {
            return event.meta?.txID === receipt?.meta?.txID
        })

        expect(relevantEvent).not.toBeUndefined()
    })
})
