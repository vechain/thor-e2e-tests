import { beforeEach, expect } from 'vitest'
import { revisions } from '../../../src/constants'
import { Client } from '../../../src/thor-client'
import { HEX_AT_LEAST_1, HEX_REGEX_64 } from '../../../src/utils/hex-utils'

/**
 * @group api
 * @group fees
 */
describe('GET /fees/history?blockCount={blockCount}?newestBlock={revision}?rewardPercentiles={p1,p2,p3}', function () {
    let blockID, blockNumber

    beforeEach(async () => {
        const block = await Client.raw.getBlock('best', false)
        blockID = block.body?.id
        blockNumber = block.body?.number
    })

    it.e2eTest('when newestBlock is a block ID', 'all', async () => {
        const res = await Client.raw.getFeesHistory(1, blockID)

        expect(res.success, 'API response should be a success').toBeTruthy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        const expectedRes = {
            baseFeePerGas: expect.arrayContaining([
                expect.stringMatching(HEX_AT_LEAST_1),
            ]),
            gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
            oldestBlock: expect.stringMatching(HEX_REGEX_64),
        }
        expect(res.body, 'Expected Response Body').toEqual(expectedRes)
        expect(res.body.baseFeePerGas.length).toBe(1)
        expect(res.body.gasUsedRatio.length).toBe(1)
    })

    it.e2eTest('when newestBlock is a block number', 'all', async () => {
        const res = await Client.raw.getFeesHistory(1, blockNumber)

        expect(res.success, 'API response should be a success').toBeTruthy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
        const expectedRes = {
            baseFeePerGas: expect.arrayContaining([
                expect.stringMatching(HEX_AT_LEAST_1),
            ]),
            gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
            oldestBlock: expect.stringMatching(HEX_REGEX_64),
        }
        expect(res.body, 'Expected Response Body').toEqual(expectedRes)
        expect(res.body.baseFeePerGas.length).toBe(1)
        expect(res.body.gasUsedRatio.length).toBe(1)
    })

    it.e2eTest('when blockCount is negative', 'all', async () => {
        const blockCount = -2
        const res = await Client.raw.getFeesHistory(blockCount, blockNumber)

        expect(res.success, 'API response should fail').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            `invalid blockCount, it should represent an integer: strconv.ParseUint: parsing "${blockCount}": invalid syntax\n`,
        )
    })

    it.e2eTest('when blockCount is 0', 'all', async () => {
        const blockCount = 0
        const res = await Client.raw.getFeesHistory(blockCount, blockNumber)

        expect(res.success, 'API response should fail').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            `invalid blockCount, it should not be ${blockCount}\n`,
        )
    })

    it.e2eTest('when newestBlock is negative', 'all', async () => {
        const newestBlock = -3
        const res = await Client.raw.getFeesHistory(1, newestBlock)

        expect(res.success, 'API response should fail').toBeFalsy()
        expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
        expect(res.httpMessage, 'Expected Error Message').toEqual(
            `newestBlock: strconv.ParseUint: parsing "${newestBlock}": invalid syntax\n`,
        )
    })

    it.e2eTest('when newestBlock is higher than best', 'all', async () => {
        const res = await Client.raw.getFeesHistory(1, blockNumber + 10)

        expect(res.success, 'API response should fail').toBeFalsy()
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
            )

            expect(res.success, 'API response should be a success').toBeTruthy()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            const expectedRes = {
                baseFeePerGas: expect.arrayContaining([
                    expect.stringMatching(HEX_AT_LEAST_1),
                ]),
                gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
                oldestBlock: expect.stringMatching(HEX_REGEX_64),
            }
            expect(res.body, 'Expected Response Body').toEqual(expectedRes)
            expect(res.body.baseFeePerGas.length).toBe(blockNumber + 1)
            expect(res.body.gasUsedRatio.length).toBe(blockNumber + 1)
        },
    )

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(
            `Fees history: valid revision ${revision}`,
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(10, revision)
                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    baseFeePerGas: expect.arrayContaining([
                        expect.stringMatching(HEX_AT_LEAST_1),
                    ]),
                    gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
                    oldestBlock: expect.stringMatching(HEX_REGEX_64),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
            },
        )
    })

    describe('with rewardPercentiles parameter', function () {
        it.e2eTest(
            'should return rewards when using block ID',
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(
                    1,
                    blockID,
                    [25, 50, 75],
                )

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    baseFeePerGas: expect.arrayContaining([
                        expect.stringMatching(HEX_AT_LEAST_1),
                    ]),
                    gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
                    oldestBlock: expect.stringMatching(HEX_REGEX_64),
                    reward: expect.arrayContaining([
                        expect.arrayContaining([
                            expect.stringMatching(HEX_AT_LEAST_1),
                        ]),
                    ]),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
                expect(res.body.reward.length).toBe(1)
                expect(res.body.reward[0].length).toBe(3)
            },
        )

        it.e2eTest(
            'should return rewards when using block number',
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(
                    1,
                    blockNumber,
                    [25, 50, 75],
                )

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    baseFeePerGas: expect.arrayContaining([
                        expect.stringMatching(HEX_AT_LEAST_1),
                    ]),
                    gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
                    oldestBlock: expect.stringMatching(HEX_REGEX_64),
                    reward: expect.arrayContaining([
                        expect.arrayContaining([
                            expect.stringMatching(HEX_AT_LEAST_1),
                        ]),
                    ]),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
                expect(res.body.reward.length).toBe(1)
                expect(res.body.reward[0].length).toBe(3)
            },
        )

        it.e2eTest(
            'should return rewards for multiple blocks',
            'all',
            async () => {
                const blockCount = 3
                const res = await Client.raw.getFeesHistory(
                    blockCount,
                    blockNumber,
                    [25, 50, 75],
                )

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    baseFeePerGas: expect.arrayContaining([
                        expect.stringMatching(HEX_AT_LEAST_1),
                    ]),
                    gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
                    oldestBlock: expect.stringMatching(HEX_REGEX_64),
                    reward: expect.arrayContaining([
                        expect.arrayContaining([
                            expect.stringMatching(HEX_AT_LEAST_1),
                        ]),
                    ]),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
                expect(res.body.reward.length).toBe(blockCount)
                res.body.reward.forEach((blockRewards) => {
                    expect(blockRewards.length).toBe(3)
                })
            },
        )

        it.e2eTest(
            'should handle empty rewardPercentiles array',
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(1, blockNumber, [])

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                const expectedRes = {
                    baseFeePerGas: expect.arrayContaining([
                        expect.stringMatching(HEX_AT_LEAST_1),
                    ]),
                    gasUsedRatio: expect.arrayContaining([expect.any(Number)]),
                    oldestBlock: expect.stringMatching(HEX_REGEX_64),
                }
                expect(res.body, 'Expected Response Body').toEqual(expectedRes)
            },
        )

        it.e2eTest(
            'should handle invalid rewardPercentiles values',
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(
                    1,
                    blockNumber,
                    [-1, 101],
                )

                expect(res.success, 'API response should fail').toBeFalsy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
                expect(res.httpMessage).toContain(
                    'rewardPercentiles values must be between 0 and 100',
                )
            },
        )

        it.e2eTest(
            'should handle non-ascending rewardPercentiles',
            'all',
            async () => {
                const res = await Client.raw.getFeesHistory(
                    1,
                    blockNumber,
                    [75, 25, 50],
                )

                expect(res.success, 'API response should fail').toBeFalsy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(400)
                expect(res.httpMessage).toContain(
                    'reward percentiles must be in ascending order, but 25.000000 is less than 75.000000',
                )
            },
        )
    })
})
