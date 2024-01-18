import { Node1Client } from '../../../src/thor-client'
import { SubscriptionBeatResponse } from '../../../src/open-api-types-padded'
import { testBloomForAddress } from '../../../src/utils/bloom'
import assert from 'node:assert'
import { generateWalletWithFunds } from '../../../src/wallet'

describe('WS /subscriptions/beat', () => {
    it('should be able to subscribe', async () => {
        const beats: SubscriptionBeatResponse[] = []

        Node1Client.subscribeToBeats((newBlock) => {
            beats.push(newBlock)
        })

        const { receipt } = await generateWalletWithFunds()
        const sender = receipt.outputs?.[0].transfers?.[0].sender

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const relevantBeat = beats.find((beat) => {
            return beat.id === receipt.meta.blockID
        })

        assert(!!relevantBeat?.bloom, 'Beat not found')
        assert(sender, 'Sender not found')

        const result = testBloomForAddress(
            relevantBeat.bloom,
            relevantBeat.k,
            sender,
        )

        expect(result).toEqual(true)
    })
})
