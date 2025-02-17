import { expect } from 'vitest'
import { revisions } from '../../../src/constants'
import { Client } from '../../../src/thor-client'
import { HEX_AT_LEAST_1, HEX_REGEX_64 } from '../../../src/utils/hex-utils'

/**
 * @group api
 * @group fees
 */
describe('GET /fees/history?blockCount={blockCount}?newestBlock={revision}', function () {
    it.e2eTest('when newestBlock is a blockID', 'all', async () => {
        const block = await Client.raw.getBlock('best', false)
        const blockID = block.body?.id
        const res = await Client.raw.getFeesHistory(1, blockID, false)

        expect(res.success, 'API response should be a success').toBeTruthy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        const expectedRes = {
            baseFees: expect.arrayContaining([
                expect.stringMatching(HEX_AT_LEAST_1),
            ]),
            gasUsedRatios: expect.arrayContaining([expect.any(Number)]),
            oldestBlock: expect.stringMatching(HEX_REGEX_64),
        }
        expect(res.body, 'Expected Response Body').toEqual(expectedRes)
        expect(res.body.baseFees.length).toBe(1)
        expect(res.body.gasUsedRatios.length).toBe(1)
    })

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(
            `Fees history: valid revision ${revision}`,
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(10, revision, false)
                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    baseFees: expect.arrayContaining([
                        expect.stringMatching(HEX_AT_LEAST_1),
                    ]),
                    gasUsedRatios: expect.arrayContaining([expect.any(Number)]),
                    oldestBlock: expect.stringMatching(HEX_REGEX_64),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
            },
        )
    })
})
