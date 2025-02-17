import { readRandomTransfer } from '../../../src/populated-data'
import { Client } from '../../../src/thor-client'
import { revisions } from '../../../src/constants'

/**
 * @group api
 * @group fees
 */
describe('GET /fees/history?blockCount={blockCount}?newestBlock={revision}', function () {
    let transfer

    beforeAll(async () => {
        transfer = await readRandomTransfer()
    })

    it.e2eTest(
        'gas limit is equal to 40_000_000',
        ['solo', 'default-private'],
        async () => {
            const block = await Client.raw.getBlock(1, false)

            expect(
                block.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(block.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(block.body?.gasLimit).toEqual(40_000_000)
        },
    )

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(`valid revision ${revision}`, 'all', async () => {
            const res = await Client.raw.getBlock(revision, false)
            expect(res.success, 'API response should be a success').toBeTruthy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            const expectedRes = {
                beneficiary: expect.stringMatching(HEX_REGEX_40),
                com: expect.any(Boolean),
                gasLimit: expect.any(Number),
                gasUsed: expect.any(Number),
                id: expect.stringMatching(HEX_REGEX_64),
                isFinalized: expect.any(Boolean),
                isTrunk: expect.any(Boolean),
                number: expect.any(Number),
                parentID: expect.stringMatching(HEX_REGEX_64),
                receiptsRoot: expect.stringMatching(HEX_REGEX_64),
                signer: expect.stringMatching(HEX_REGEX_40),
                size: expect.any(Number),
                stateRoot: expect.stringMatching(HEX_REGEX_64),
                timestamp: expect.any(Number),
                totalScore: expect.any(Number),
                transactions: expect.any(Array),
                txsFeatures: expect.any(Number),
                txsRoot: expect.stringMatching(HEX_REGEX_64),
            }
            if (res.body.number >= genesis.forkConfig.GALACTICA) {
                expectedRes.baseFee = expect.any(Number)
            }
            expect(res.body, 'Expected Response Body').toEqual(expectedRes)
        })
    })
})