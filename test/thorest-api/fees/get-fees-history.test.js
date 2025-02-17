import { beforeEach, expect } from 'vitest'
import { revisions } from '../../../src/constants'
import { Client } from '../../../src/thor-client'
import { HEX_AT_LEAST_1, HEX_REGEX_64 } from '../../../src/utils/hex-utils'

/**
 * @group api
 * @group fees
 */
describe('GET /fees/history?blockCount={blockCount}?newestBlock={revision}', function () {
    let blockID, blockNumber

    beforeEach(async () => {
        const block = await Client.raw.getBlock('best', false)
        blockID = block.body?.id
        blockNumber = block.body?.number
    })

    it.e2eTest('when newestBlock is a block ID', 'all', async () => {
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

    it.e2eTest('when newestBlock is a block number', 'all', async () => {
        const res = await Client.raw.getFeesHistory(1, blockNumber, false)

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

    it.e2eTest('when blockCount is negative', 'all', async () => {
        const blockCount = -2
        const res = await Client.raw.getFeesHistory(
            blockCount,
            blockNumber,
            false,
        )

        expect(res.success, 'API response should be an error').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            `invalid blockCount, it should represent an integer: strconv.ParseUint: parsing "${blockCount}": invalid syntax\n`,
        )
    })

    it.e2eTest('when blockCount is 0', 'all', async () => {
        const blockCount = 0
        const res = await Client.raw.getFeesHistory(
            blockCount,
            blockNumber,
            false,
        )

        expect(res.success, 'API response should be an error').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            `invalid blockCount, it should not be ${blockCount}\n`,
        )
    })

    it.e2eTest('when newestBlock is negative', 'all', async () => {
        const newestBlock = -3
        const res = await Client.raw.getFeesHistory(1, newestBlock, false)

        expect(res.success, 'API response should be an error').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            `newestBlock: strconv.ParseUint: parsing "${newestBlock}": invalid syntax\n`,
        )
    })

    it.e2eTest('when newestBlock is higher than best', 'all', async () => {
        const res = await Client.raw.getFeesHistory(1, blockNumber + 10, false)

        expect(res.success, 'API response should be an error').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            'newestBlock: not found\n',
        )
    })

    it.e2eTest(
        'when blockCount is higher than the number of blocks',
        'all',
        async () => {
            const res = await Client.raw.getFeesHistory(
                blockNumber + 10,
                blockNumber,
                false,
            )

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
            expect(res.body.baseFees.length).toBe(blockNumber + 1)
            expect(res.body.gasUsedRatios.length).toBe(blockNumber + 1)
        },
    )

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
