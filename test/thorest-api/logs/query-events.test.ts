/// <reference types="jest-extended" />
import {
    Client,
    Response,
    Schema,
    SDKClient,
} from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import {
    getTransferDetails,
    readRandomTransfer,
    Transfer,
} from '../../../src/populated-data'
import {
    HEX_REGEX,
    HEX_REGEX_40,
    HEX_REGEX_64,
} from '../../../src/utils/hex-utils'
import { components } from '../../../src/open-api-types'
import { EventsContract__factory as EventsContract } from '../../../typechain-types'
import { Contract, TransactionReceipt } from '@vechain/sdk-network'
import { randomFunder } from '../../../src/account-faucet'
import { addAddressPadding } from '../../../src/utils/padding-utils'
import { testCase, testCaseEach } from '../../../src/test-case'

const buildRequestFromTransfer = (
    transfer: Transfer,
): components['schemas']['EventLogFilterRequest'] => {
    return {
        range: {
            to: transfer.meta.blockNumber,
            from: transfer.meta.blockNumber,
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

type EventLogFilterRequest = components['schemas']['EventLogFilterRequest']

/**
 * @group api
 * @group events
 */
describe('POST /logs/event', () => {
    const transferDetails = getTransferDetails()

    testCase(['solo', 'default-private', 'testnet'])(
        'should find a log with all parameters set',
        async () => {
            const transfer = await readRandomTransfer()

            const request = buildRequestFromTransfer(transfer)

            const eventLogs = await Client.raw.queryEventLogs(request)



            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
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

    testCase(['solo', 'default-private'])(
        'should be able to omit all the parameters',
        async () => {
            const transfer = await readRandomTransfer()
            const response = await Client.raw.queryEventLogs({})

            expect(
                response.success,
                'API response should be a success',
            ).toBeTrue()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.txID === transfer.meta.txID,
                ),
                'The response should contain the relevant event log',
            ).toBeTrue()
        },
    )

    const runEventLogsTest = async (
        modifyRequest: (
            request: EventLogFilterRequest,
            transfer: Transfer,
        ) => EventLogFilterRequest,
    ) => {
        const transfer = await readRandomTransfer()
        const request = modifyRequest(
            buildRequestFromTransfer(transfer),
            transfer,
        )

        const response = await Client.raw.queryEventLogs(request)

        const relevantLog = response.body?.find((log) => {
            return log?.meta?.txID === transfer.meta.txID
        })

        expect(response.success, 'API response should be a success').toBeTrue()
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
        testCase(['solo', 'default-private'])('should be able to omit the "from" field', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    range: {
                        ...request.range,
                        from: undefined,
                    },
                }
            })
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "to" field', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be omit the "unit" field', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by time', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by block', async () => {
            await runEventLogsTest((request, transfer) => {
                return {
                    ...request,
                    range: {
                        to: transfer.meta.blockNumber,
                        from: transfer.meta.blockNumber,
                        unit: 'block',
                    },
                }
            })
        })

        testCase(['solo', 'default-private'])('should be able to set the range to null', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    range: null,
                }
            })
        })
    })

    describe('query by "order"', () => {
        const runQueryEventLogsTest = async (order?: 'asc' | 'desc' | null) => {
            const { firstBlock, lastBlock } = await getTransferDetails()

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
            ).toBeTrue()
            expect(response.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === firstBlock,
                ),
                'The response should contain the first block',
            ).toBeTrue()
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === lastBlock,
                ),
                'The response should contain the last block',
            ).toBeTrue()

            const blockNumbers = response.body?.map(
                (log) => log?.meta?.blockNumber,
            )

            expect(
                blockNumbers,
                'Should be an array of block numbers',
            ).toBeArray()
            expect(
                blockNumbers,
                'Should be sorted in the correct order',
            ).toEqual(
                order === 'asc' || order === undefined
                    ? (blockNumbers as number[]).sort((a, b) => a - b)
                    : (blockNumbers as number[]).sort((a, b) => b - a),
            )
        }

        testCase(['solo', 'default-private', 'testnet'])('events should be ordered by DESC', async () => {
            await runQueryEventLogsTest('desc')
        })

        testCase(['solo', 'default-private', 'testnet'])('events should be ordered by ASC', async () => {
            await runQueryEventLogsTest('asc')
        })

        testCase(['solo', 'default-private', 'testnet'])('default should be asc', async () => {
            await runQueryEventLogsTest(undefined)
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to set the order to null', async () => {
            await runQueryEventLogsTest(null)
        })
    })

    describe('query by "options"', () => {
        testCase(['solo', 'default-private', 'testnet'])('should be able omit all the options', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    options: null,
                }
            })
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "offset" field', async () => {
            await runEventLogsTest((request) => {
                return {
                    ...request,
                    options: {
                        limit: 1_000,
                        offset: undefined,
                    },
                }
            })
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able to omit the "limit" field', async () => {
            const request = {
                options: {
                    offset: 0,
                },
            }

            const eventLogs = await Client.raw.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(eventLogs.body?.length).toEqual(0)
        })

        testCase(['solo', 'default-private'])('should have default maximum of 1000', async () => {
            const request = {
                options: {
                    offset: 0,
                    limit: 1001,
                },
            }


            const eventLogs = await Client.raw.queryEventLogs(request)

            expect(eventLogs.success, 'API response should fail').toBeFalse()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(403)
        })

        testCase(['solo', 'default-private', 'testnet'])('should have no minimum "limit"', async () => {
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
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(eventLogs.body?.length).toEqual(0)
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able paginate requests', async () => {
            const { firstBlock, lastBlock } = await transferDetails

            const pages = 5
            const amountPerPage = 10
            const totalElements = pages * amountPerPage

            const query = async (offset: number, limit: number) =>
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
            ).toBeTrue()
            expect(allElements.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                allElements.body?.length,
                'Should be able to query for all elements',
            ).toEqual(totalElements)

            const paginatedElements: components['schemas']['EventLogsResponse'][] =
                []

            for (let i = 0; i < pages; i++) {
                const paginatedResponse = await query(
                    paginatedElements.length,
                    amountPerPage,
                )

                expect(
                    paginatedResponse.success,
                    'API response should be a success',
                ).toBeTrue()
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
                ) as components['schemas']['EventLogsResponse'][]

                paginatedElements.push(...elements)
            }

            expect(
                allElements.body,
                'Paginated items should equal all elements',
            ).toEqual(paginatedElements)
        })

        testCase(['solo', 'default-private', 'testnet'])('should be empty when pagination exceeds the total amount', async () => {
            // First, we need to make sure there are events
            const res1 = await Client.raw.queryEventLogs({
                options: {
                    offset: 0,
                    limit: 1_000,
                },
            })

            expect(res1.success, 'API response should be a success').toBeTrue()
            expect(res1.body?.length, 'Expected Response Body').toBeGreaterThan(
                0,
            )

            // Then, we can set a large offset and check that there are no results
            const block = await Client.raw.getBlock('best')
            const res2 = await Client.raw.queryEventLogs({
                range: {
                    unit: 'block',
                    from: block.body?.number!
                },
                options: {
                    offset: 1_000_000,
                    limit: 1_000,
                },
            })

            expect(res2.success, 'API response should be a success').toBeTrue()
            expect(res2.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res2.body, 'Expected Response Body').toEqual([])
        })
    })

    describe('query by "criteriaSet"', () => {
        const eventHash =
            EventsContract.createInterface().getEvent('MyEvent').topicHash

        let contract: Contract
        let receipt: TransactionReceipt
        let topics: string[]
        let range: any

        beforeAll(async () => {
            const contractFactory = Client.sdk.contracts.createContractFactory(
                EventsContract.abi,
                EventsContract.bytecode,
                randomFunder(),
            )
            await contractFactory.startDeployment()
            contract = await contractFactory.waitForDeployment()
            receipt = contract.deployTransactionReceipt as TransactionReceipt

            if (!receipt || receipt.reverted) {
                throw new Error('Contract deployment failed')
            }

            const eventAddresses = (
                (await contract.read.getAddresses()) as string[][]
            )[0]
            topics = eventAddresses.map(addAddressPadding)

            range = {
                to: receipt.meta.blockNumber + 1000,
                from: receipt.meta.blockNumber,
                unit: 'block',
            }
        })

        const expectOriginalEvent = async (
            response: Response<Schema['EventLogsResponse']>,
        ) => {
            const relevantLog = response.body?.find((log) => {
                return log?.topics?.[0] === eventHash
            })

            expect(
                response.success,
                'API response should be a success',
            ).toBeTrue()
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by contract address', async () => {
            const res = await Client.raw.queryEventLogs({
                criteriaSet: [
                    {
                        address: contract.address,
                    },
                ],
                range,
            })

            await expectOriginalEvent(res)
        })

        testCase(['solo', 'default-private', 'testnet'])('should be able query by topic0 address', async () => {
            const res = await Client.raw.queryEventLogs({
                criteriaSet: [
                    {
                        topic0: eventHash,
                    },
                ],
                range,
            })

            await expectOriginalEvent(res)
        })


        testCaseEach(['solo', 'default-private', 'testnet'])(
            `should be able query by topic%d`,
            [1, 2, 3],
            async (topicIndex) => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by all topics', async () => {
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

        testCase(['solo', 'default-private', 'testnet'])('should be able query by all topics and address', async () => {
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
        })

        testCase(['solo', 'default-private', 'testnet'])('should be empty for matching topics and non-matching address', async () => {
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

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual([])
        })

        testCase(['solo', 'default-private', 'testnet'])('should be empty for non-matching topics and matching address', async () => {
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

            expect(res.success, 'API response should be a success').toBeTrue()
            expect(res.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(res.body, 'Expected Response Body').toEqual([])
        })
    })
})
