import { Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { testLegacyBloomForAddress } from '../../../src/utils/legacy-bloom'
import { ThorWallet } from '../../../src/wallet'

/**
 * @group api
 * @group websockets
 * @group beats
 */
describe('WS /subscriptions/beat', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const beats = []

        Client.raw.subscribeToBeats((newBlock) => {
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

        const result = testLegacyBloomForAddress(
            relevantBeat.bloom,
            relevantBeat.k,
            wallet.address,
        )

        expect(result).toEqual(true)
    })

    it.e2eTest(
        'should be able to retrieve blocks after the current best block when providing no position parameter',
        'all',
        async () => {
            const beats = []

            const bestBlock = await Client.raw.getBlock('best')
            const ws = Client.raw.subscribeToBeats((newBlock) => {
                beats.push(newBlock)
            })

            let attempts = 0
            // wait for another block to be packed
            while (beats.length === 0 && attempts < 6) {
                await new Promise((resolve) => setTimeout(resolve, 2000))
                attempts++
            }

            assert(beats.length > 0, 'Best block not found')

            const nextBestBlock = beats.find(
                (beat) => beat.number === (bestBlock.body?.number ?? 0) + 1,
            )
            assert(nextBestBlock, 'Block not found')
            ws.unsubscribe()
        },
    )

    it.e2eTest(
        'should be able to retrieve 5 blocks in order',
        'all',
        async () => {
            const beats = []

            const bestBlock = await Client.raw.getBlock('best', false)
            const previousBlock = await Client.raw.getBlock(
                `${bestBlock.body.number - 3}`,
            )
            const ws = Client.raw.subscribeToBeats((newBlock) => {
                beats.push(newBlock)
            }, previousBlock.body?.id)

            while (beats.length < 5)
                await new Promise((resolve) => setTimeout(resolve, 100))

            expect(beats.length).toBeGreaterThanOrEqual(5)

            for (
                let index = 0, expectedNumber = 1;
                index < 5;
                index++, expectedNumber++
            ) {
                expect(beats[index].number).toEqual(
                    expectedNumber + previousBlock.body.number,
                )
            }
            ws.unsubscribe()
        },
    )

    it.e2eTest(
        'should be able to get block A via api call and compare it with subscription result to check they are the same',
        'all',
        async () => {
            const beats = []

            const bestBlock = await Client.raw.getBlock('best', false)
            const previousBlock = await Client.raw.getBlock(
                `${bestBlock.body.number - 1}`,
                false,
            )

            const ws = Client.raw.subscribeToBeats((newBlock) => {
                beats.push(newBlock)
            }, previousBlock.body?.id)

            //sleep for 100 millis to ensure the beat is received
            await new Promise((resolve) => setTimeout(resolve, 100))

            const firstBeat = beats.find(
                (beat) => beat.number === bestBlock.body?.number,
            )

            assert(firstBeat, 'Block not found')
            expect(firstBeat?.id).toEqual(bestBlock.body?.id)
            expect(firstBeat?.number).toEqual(bestBlock.body?.number)
            expect(firstBeat?.timestamp).toEqual(bestBlock.body?.timestamp)
            expect(firstBeat?.txsFeatures).toEqual(bestBlock.body?.txsFeatures)
            expect(firstBeat?.parentID).toEqual(bestBlock.body?.parentID)
            ws.unsubscribe()
        },
    )
})
