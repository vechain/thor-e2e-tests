import { Client } from '../../../src/thor-client'
import { testBloomForAddress } from '../../../src/utils/bloom'
import assert from 'node:assert'
import { ThorWallet } from '../../../src/wallet'
import { components } from '../../../src/open-api-types'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/beat2', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const beats: components['schemas']['SubscriptionBeat2Response'][] = []

        Client.raw.subscribeToBeats2((newBlock) => {
            beats.push(newBlock)
        })

        const wallet = ThorWallet.txBetweenFunding()

        const fundReceipt = await wallet.waitForFunding()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const relevantBeat = beats.find((beat) => {
            return beat.id === fundReceipt?.meta?.blockID
        })

        assert(relevantBeat?.bloom, 'Beat not found')
        assert(relevantBeat?.k, 'Beat not found')
        assert(wallet.address, 'Sender not found')

        const result = testBloomForAddress(
            relevantBeat.bloom,
            relevantBeat.k,
            wallet.address,
        )

        expect(result).toEqual(true)
    })
})
