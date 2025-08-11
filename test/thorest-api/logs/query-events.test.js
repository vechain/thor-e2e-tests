/// <reference types="jest-extended" />
import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import {
    readRandomTransfer,
    readTransferDetails,
} from '../../../src/populated-data'
import {
    HEX_REGEX,
    HEX_REGEX_40,
    HEX_REGEX_64,
} from '../../../src/utils/hex-utils'
import { EventsContract__factory } from '../../../typechain-types'
import { addAddressPadding } from '../../../src/utils/padding-utils'
import { ThorWallet } from '../../../src/wallet'
import { fundingAmounts } from '../../../src/account-faucet'

const buildRequestFromTransfer = async (transfer) => {
    return {
        range: {
            to: await transfer.meta.blockNumber,
            from: await transfer.meta.blockNumber,
            unit: 'block',
        },
        options: {
            offset: 0,
            limit: 1_000,
        },
        criteriaSet: [
            {
                address: contractAddresses.energy,
            },
        ],
    }
}

/**
 * @group api
 * @group logs
 */
describe('POST /logs/event', () => {
    const transferDetails = readTransferDetails()

    it.e2eTest(
        'should find a log with all parameters set',
        ['solo', 'default-private'],
        async () => {
            const transfer = await readRandomTransfer()

            const request = await buildRequestFromTransfer(transfer)

            const eventLogs = await Client.raw.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)

            const relevantLog = eventLogs.body?.find((log) => {
                return log?.meta?.txID === transfer.meta.txID
            })

            expect(relevantLog, 'Expected event log response format').toEqual({
                address: contractAddresses.energy,
                topics: transfer.vtho.topics,
                data: expect.stringMatching(HEX_REGEX_64),
                meta: {
                    blockID: expect.stringMatching(HEX_REGEX_64),
                    blockNumber: expect.any(Number),
                    blockTimestamp: expect.any(Number),
                    txID: expect.stringMatching(HEX_REGEX_64),
                    txOrigin: transfer.meta.txOrigin,
                    clauseIndex: expect.any(Number),
                },
            })
        },
    )

    it.e2eTest(
        'should be able to omit all the parameters',
        ['solo', 'default-private'],
        async () => {
            const transfer = await readRandomTransfer()
            const response = await Client.raw.queryEventLogs({})

            expect(
                response.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.txID === transfer.meta.txID,
                ),
                'The response should contain the relevant event log',
            ).toBeTruthy()
        },
    )

    const runEventLogsTest = async (modifyRequest) => {
        const transfer = await readRandomTransfer()
        const request = modifyRequest(
            await buildRequestFromTransfer(transfer),
            transfer,
        )

        const response = await Client.raw.queryEventLogs(request)

        const relevantLog = response.body?.find((log) => {
            return log?.meta?.txID === transfer.meta.txID
        })

        expect(
            response.success,
            'API response should be a success',
        ).toBeTruthy()
        expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
        expect(
            relevantLog,
            'The response should contain the relevant event log',
        ).toBeDefined()
        expect(relevantLog).toEqual({
            address: contractAddresses.energy,
            topics: transfer.vtho.topics,
            data: expect.stringMatching(HEX_REGEX_64),
            meta: {
                blockID: expect.stringMatching(HEX_REGEX_64),
                blockNumber: expect.any(Number),
                blockTimestamp: expect.any(Number),
                txID: expect.stringMatching(HEX_REGEX_64),
                txOrigin: transfer.meta.txOrigin,
                clauseIndex: expect.any(Number),
            },
        })
    }

    describe('query by "range"', () => {
        it.e2eTest(
            'should be able to omit the "from" field',
            ['solo', 'default-private'],
            async () => {
                await runEventLogsTest((request) => {
                    return {
                        ...request,
                        range: {
                            ...request.range,
                            from: undefined,
                        },
                    }
                })
            },
        )

        it.e2eTest('should be able to omit the "to" field', 'all', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    range: {
                        ...request.range,
                        to: undefined,
                    },
                }
            })
        })

        it.e2eTest('should be omit the "unit" field', 'all', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    range: {
                        ...request.range,
                        unit: undefined,
                    },
                }
            })
        })

        it.e2eTest('should be able query by time', 'all', async () => {
            await runEventLogsTest((request, transfer) => {
                return {
                    ...request,
                    range: {
                        to: transfer.meta.blockTimestamp + 1000,
                        from: transfer.meta.blockTimestamp - 1000,
                        unit: 'time',
                    },
                }
            })
        })

        it.e2eTest('should be able query by block', 'all', async () => {
            await runEventLogsTest(async (request, transfer) => {
                return {
                    ...request,
                    range: {
                        to: await transfer.meta.blockNumber,
                        from: await transfer.meta.blockNumber,
                        unit: 'block',
                    },
                }
            })
        })

        it.e2eTest(
            'should be able to set the range to null',
            ['solo', 'default-private'],
            async () => {
                await runEventLogsTest((request) => {
                    return {
                        ...request,
                        range: null,
                    }
                })
            },
        )
    })

    describe('query by "order"', () => {
        const runQueryEventLogsTest = async (order) => {
            const { firstBlock, lastBlock } = readTransferDetails()
            const response = await Client.raw.queryEventLogs({
                range: {
                    from: firstBlock,
                    to: lastBlock,
                    unit: 'block',
                },
                options: {
                    offset: 0,
                    limit: 1_000,
                },
                criteriaSet: [
                    {
                        address: contractAddresses.energy,
                    },
                ],
                order: order,
            })

            expect(
                response.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === firstBlock,
                ),
                'The response should contain the first block',
            ).toBeTruthy()
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === lastBlock,
                ),
                'The response should contain the last block',
            ).toBeTruthy()

            const blockNumbers = response.body?.map(
                (log) => log?.meta?.blockNumber,
            )

            expect(
                Array.isArray(blockNumbers),
                'Should be an array of block numbers',
            ).toBeTruthy()
            expect(
                blockNumbers,
                'Should be sorted in the correct order',
            ).toEqual(
                order === 'asc' || order === undefined
                    ? blockNumbers.sort((a, b) => a - b)
                    : blockNumbers.sort((a, b) => b - a),
            )
        }

        it.e2eTest('events should be ordered by DESC', 'all', async () => {
            await runQueryEventLogsTest('desc')
        })

        it.e2eTest('events should be ordered by ASC', 'all', async () => {
            await runQueryEventLogsTest('asc')
        })

        it.e2eTest('default should be asc', 'all', async () => {
            await runQueryEventLogsTest(undefined)
        })

        it.e2eTest(
            'should be able to set the order to null',
            'all',
            async () => {
                await runQueryEventLogsTest(null)
            },
        )
    })

    describe('query by "options"', () => {
        it.e2eTest('should be able omit all the options', 'all', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    options: null,
                }
            })
        })

        it.e2eTest(
            'should be able to omit the "offset" field',
            'all',
            async () => {
                await runEventLogsTest((request) => {
                    return {
                        ...request,
                        options: {
                            limit: 1_000,
                            offset: undefined,
                        },
                    }
                })
            },
        )

        it.e2eTest(
            'should be able to omit the "limit" field',
            'all',
            async () => {
                const request = {
                    options: {
                        offset: 0,
                    },
                }

                const eventLogs = await Client.raw.queryEventLogs(request)

                expect(
                    eventLogs.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(eventLogs.body?.length).toEqual(0)
            },
        )

        it.e2eTest(
            'should have default maximum of 1000',
            ['solo', 'default-private'],
            async () => {
                const request = {
                    options: {
                        offset: 0,
                        limit: 1001,
                    },
                }

                const eventLogs = await Client.raw.queryEventLogs(request)

                expect(
                    eventLogs.success,
                    'API response should fail',
                ).toBeFalsy()
                expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(403)
            },
        )

        it.e2eTest('should have no minimum "limit"', 'all', async () => {
            const request = {
                options: {
                    offset: 0,
                    limit: 0,
                },
            }

            const eventLogs = await Client.raw.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(eventLogs.body?.length).toEqual(0)
        })

        it.e2eTest('should be able paginate requests', 'all', async () => {
            const { firstBlock, lastBlock } = transferDetails

            const pages = 5
            const amountPerPage = 10
            const totalElements = pages * amountPerPage

            const query = async (offset, limit) =>
                Client.raw.queryEventLogs({
                    range: {
                        from: firstBlock,
                        to: lastBlock,
                        unit: 'block',
                    },
                    options: {
                        offset,
                        limit,
                    },
                    criteriaSet: [
                        {
                            address: contractAddresses.energy,
                        },
                    ],
                })

            const allElements = await query(0, totalElements)

            expect(
                allElements.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(allElements.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                allElements.body?.length,
                'Should be able to query for all elements',
            ).toEqual(totalElements)

            const paginatedElements = []

            for (let i = 0; i < pages; i++) {
                const paginatedResponse = await query(
                    paginatedElements.length,
                    amountPerPage,
                )

                expect(
                    paginatedResponse.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(
                    paginatedResponse.httpCode,
                    'Expected HTTP Code',
                ).toEqual(200)
                expect(
                    paginatedResponse.body?.length,
                    'Should be able to query for a paginated amount',
                ).toEqual(amountPerPage)

                const elements = paginatedResponse.body?.filter(
                    (it) => it !== undefined,
                )

                paginatedElements.push(...elements)
            }

            expect(
                allElements.body,
                'Paginated items should equal all elements',
            ).toEqual(paginatedElements)
        })

        it.e2eTest(
            'should be empty when pagination exceeds the total amount',
            'all',
            async () => {
                // First, we need to make sure there are events
                const res1 = await Client.raw.queryEventLogs({
                    options: {
                        offset: 0,
                        limit: 1_000,
                    },
                })

                expect(
                    res1.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(
                    res1.body?.length,
                    'Expected Response Body',
                ).toBeGreaterThan(0)

                // Then, we can set a large offset and check that there are no results
                const block = await Client.raw.getBlock('best')
                const res2 = await Client.raw.queryEventLogs({
                    range: {
                        unit: 'block',
                        from: block.body?.number,
                    },
                    options: {
                        offset: 1_000_000,
                        limit: 1_000,
                    },
                })

                expect(
                    res2.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res2.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(res2.body, 'Expected Response Body').toEqual([])
            },
        )

        it.e2eTest(
            'should throw error when offset is exceeded',
            'all',
            async () => {
                const res = await Client.raw.queryEventLogs({
                    options: {
                        offset: 18446744073709552000,
                        limit: 10,
                    },
                })

                expect(res.httpCode).toEqual(400)
                expect(res.httpMessage).contain(
                    'body: json: cannot unmarshal number 18446744073709552000 into Go struct field Options.options.offset of type uint64\n',
                )
            },
        )

        it.e2eTest(
            'should throw error when from is greater than to',
            'all',
            async () => {
                const request = {
                    range: {
                        from: 100,
                        to: 99,
                        unit: 'block',
                    },
                }

                const eventLogs = await Client.raw.queryEventLogs(request)

                expect(eventLogs.httpCode).toEqual(400)
                expect(eventLogs.httpMessage).contain(
                    'filter.Range.To must be greater than or equal to filter.Range.From',
                )
            },
        )
    })

    describe('query by "criteriaSet"', () => {
        const eventHash =
            EventsContract__factory.createInterface().getEvent(
                'MyEvent',
            ).topicHash

        let contract
        let receipt
        let topics
        let range

        beforeAll(async () => {
            const wallet = await ThorWallet.newFunded(
                fundingAmounts.noVetBigVtho,
            )
            await wallet.waitForFunding()
            contract = await wallet.deployContract(
                EventsContract__factory.bytecode,
                EventsContract__factory.abi,
            )
            receipt = contract.deployTransactionReceipt

            if (!receipt || receipt.reverted) {
                throw new Error('Contract deployment failed')
            }

            const eventAddresses = await contract.read.getAddresses()
            topics = eventAddresses[0].map(addAddressPadding)

            range = {
                to: receipt.meta.blockNumber + 1000,
                from: receipt.meta.blockNumber,
                unit: 'block',
            }
        })

        const expectOriginalEvent = async (response) => {
            const relevantLog = response.body?.find((log) => {
                return log?.topics?.[0] === eventHash
            })

            expect(
                response.success,
                'API response should be a success',
            ).toBeTruthy()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)

            expect(relevantLog, 'Should match the expected event log').toEqual({
                address: contract.address.toLowerCase(),
                topics: [eventHash, ...topics],
                data: expect.stringMatching(HEX_REGEX),
                meta: {
                    blockID: expect.stringMatching(HEX_REGEX_64),
                    blockNumber: expect.any(Number),
                    blockTimestamp: expect.any(Number),
                    txID: expect.stringMatching(HEX_REGEX_64),
                    txOrigin: expect.stringMatching(HEX_REGEX_40),
                    clauseIndex: expect.any(Number),
                },
            })
        }

        it.e2eTest(
            'should be able query by contract address',
            'all',
            async () => {
                const res = await Client.raw.queryEventLogs({
                    criteriaSet: [
                        {
                            address: contract.address,
                        },
                    ],
                    range,
                })

                await expectOriginalEvent(res)
            },
        )

        it.e2eTest(
            'should be able query by topic0 address',
            'all',
            async () => {
                const res = await Client.raw.queryEventLogs({
                    criteriaSet: [
                        {
                            topic0: eventHash,
                        },
                    ],
                    range,
                })

                await expectOriginalEvent(res)
            },
        )

        Array.from([1, 2, 3]).forEach((topicIndex) => {
            it.e2eTest(
                `should be able query by topic${topicIndex}`,
                'all',
                async () => {
                    const res = await Client.raw.queryEventLogs({
                        criteriaSet: [
                            {
                                [`topic${topicIndex}`]: topics[topicIndex - 1],
                            },
                        ],
                        range,
                    })

                    await expectOriginalEvent(res)
                },
            )
        })

        it.e2eTest('should be able query by all topics', 'all', async () => {
            const res = await Client.raw.queryEventLogs({
                criteriaSet: [
                    {
                        topic0: eventHash,
                        topic1: topics[0],
                        topic2: topics[1],
                        topic3: topics[2],
                    },
                ],
                range,
            })

            await expectOriginalEvent(res)
        })

        it.e2eTest(
            'should be able query by all topics and address',
            'all',
            async () => {
                const res = await Client.raw.queryEventLogs({
                    criteriaSet: [
                        {
                            address: contract.address,
                            topic0: eventHash,
                            topic1: topics[0],
                            topic2: topics[1],
                            topic3: topics[2],
                        },
                    ],
                    range,
                })

                await expectOriginalEvent(res)
            },
        )

        it.e2eTest(
            'should be empty for matching topics and non-matching address',
            'all',
            async () => {
                const res = await Client.raw.queryEventLogs({
                    criteriaSet: [
                        {
                            address: contractAddresses.energy,
                            topic0: eventHash,
                            topic1: topics[0],
                            topic2: topics[1],
                            topic3: topics[2],
                        },
                    ],
                    range,
                })

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(res.body, 'Expected Response Body').toEqual([])
            },
        )

        it.e2eTest(
            'should be empty for non-matching topics and matching address',
            'all',
            async () => {
                const res = await Client.raw.queryEventLogs({
                    criteriaSet: [
                        {
                            address: contract.address,
                            topic0: eventHash,
                            topic1: topics[0],
                            topic2: topics[1],
                            topic3: topics[1],
                        },
                    ],
                    range,
                })

                expect(
                    res.success,
                    'API response should be a success',
                ).toBeTruthy()
                expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
                expect(res.body, 'Expected Response Body').toEqual([])
            },
        )
    })
})
