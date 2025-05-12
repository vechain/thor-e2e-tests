import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group websockets
 */
describe('WS /subscriptions/blocks', () => {
    it.e2eTest('should be able to subscribe', 'all', async () => {
        const beats = []

        const ws = Client.raw.subscribeToBlocks((newBlock) => {
            beats.push(newBlock)
        })

        await Client.raw.waitForBlock()
        await Client.raw.waitForBlock()

        //sleep for 1 sec to ensure the beat is received
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(beats.length).toBeGreaterThanOrEqual(2)

        const expectedRes = {
            number: expect.any(Number),
            id: expect.stringMatching(/^0x[0-9a-f]{64}$/),
            size: expect.any(Number),
            parentID: expect.stringMatching(/^0x[0-9a-f]{64}$/),
            timestamp: expect.any(Number),
            gasLimit: expect.any(Number),
            beneficiary: expect.stringMatching(/^0x[0-9a-f]{40}$/),
            gasUsed: expect.any(Number),
            baseFeePerGas: expect.stringMatching(/^0x[0-9a-f]+$/),
            totalScore: expect.any(Number),
            txsRoot: expect.stringMatching(/^0x[0-9a-f]{64}$/),
            txsFeatures: expect.any(Number),
            stateRoot: expect.stringMatching(/^0x[0-9a-f]{64}$/),
            receiptsRoot: expect.stringMatching(/^0x[0-9a-f]{64}$/),
            com: expect.any(Boolean),
            signer: expect.stringMatching(/^0x[0-9a-f]{40}$/),
            transactions: expect.any(Array),
            obsolete: expect.any(Boolean),
        }

        expect(beats[0], 'Expected Response Body').toEqual(expectedRes)

        ws.unsubscribe()
    })
})
