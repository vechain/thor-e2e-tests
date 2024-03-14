/// <reference types="jest-extended" />
import {
    Node1Client,
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
            limit: 10_000,
        },
        criteriaSet: [
            {
                address: contractAddresses.energy,
            },
        ],
    }
}

describe('POST /logs/event', () => {
    let transferDetails = getTransferDetails()

    it('event log should be included in query', async () => {
        const transfer = await readRandomTransfer()

        const request = buildRequestFromTransfer(transfer)

        const eventLogs = await Node1Client.queryEventLogs(request)

        expect(eventLogs.success, 'API response should be a success').toBeTrue()
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
    })

    describe('query by "range"', () => {
        it('should be able to omit the "from" field', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                range: {
                    ...baseRequest.range,
                    from: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        it('should be able to omit the "to" field', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                range: {
                    ...baseRequest.range,
                    to: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        /**
         * This also checks that the default unit is "block"
         */
        it('should be omit the "unit" field', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                range: {
                    ...baseRequest.range,
                    unit: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        it('should be able query by time', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)

            const eventLogs = await Node1Client.queryEventLogs({
                ...baseRequest,
                range: {
                    to: transfer.meta.blockTimestamp + 1000,
                    from: transfer.meta.blockTimestamp - 1000,
                    unit: 'time',
                },
            })

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        it('should be able query by block', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)

            const eventLogs = await Node1Client.queryEventLogs({
                ...baseRequest,
                range: {
                    to: transfer.meta.blockNumber,
                    from: transfer.meta.blockNumber,
                    unit: 'block',
                },
            })

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        it('should be able to set the range to null', async () => {
            const transfer = await readRandomTransfer()
            const baseRequest = buildRequestFromTransfer(transfer)

            const eventLogs = await Node1Client.queryEventLogs({
                ...baseRequest,
                range: null,
            })

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })
    })

    describe('query by "order"', () => {
        const runQueryEventLogsTest = async (order?: 'asc' | 'desc') => {
            const { firstBlock, lastBlock, transferCount } =
                await getTransferDetails()

            const response = await Node1Client.queryEventLogs({
                range: {
                    from: firstBlock,
                    to: lastBlock,
                    unit: 'block',
                },
                options: {
                    offset: 0,
                    limit: 10_000,
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

        it('events should be ordered by DESC', async () => {
            await runQueryEventLogsTest('desc')
        })

        it('events should be ordered by ASC', async () => {
            await runQueryEventLogsTest('asc')
        })

        it('default should be asc', async () => {
            await runQueryEventLogsTest(undefined)
        })
    })

    describe('query by "options"', () => {
        it('should be able omit all the options', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                options: null,
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        it('should be able to omit the "offset" field', async () => {
            const transfer = await readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                options: {
                    limit: 10_000,
                    offset: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(
                eventLogs.success,
                'API response should be a success',
            ).toBeTrue()
            expect(eventLogs.httpCode, 'Expected HTTP Code').toEqual(200)
            expect(
                eventLogs.body?.some((log) => log?.meta?.txID),
                'The response should contain the relevant event log',
            ).toBeTrue()
        })

        it('should be able paginate requests', async () => {
            const { firstBlock, lastBlock } = await transferDetails

            const pages = 5
            const amountPerPage = 10
            const totalElements = pages * amountPerPage

            const query = async (offset: number, limit: number) =>
                Node1Client.queryEventLogs({
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
    })

    describe('query by "criteriaSet"', () => {
        const eventHash =
            EventsContract.createInterface().getEvent('MyEvent').topicHash

        let contract: Contract
        let receipt: TransactionReceipt
        let topics: string[]
        let range: any

        beforeAll(async () => {
            const contractFactory = SDKClient.contracts.createContractFactory(
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
                to: receipt.meta.blockNumber,
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

        it('should be able query by contract address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        address: contract.address,
                    },
                ],
                range,
            })

            await expectOriginalEvent(res)
        })

        it('should be able query by topic0 address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        topic0: eventHash,
                    },
                ],
                range,
            })

            await expectOriginalEvent(res)
        })

        it.each([1, 2, 3])(
            `should be able query by topic%d`,
            async (topicIndex) => {
                const res = await Node1Client.queryEventLogs({
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

        it('should be able query by all topics', async () => {
            const res = await Node1Client.queryEventLogs({
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

        it('should be able query by all topics and address', async () => {
            const res = await Node1Client.queryEventLogs({
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

        it('should be empty for matching topics and non-matching address', async () => {
            const res = await Node1Client.queryEventLogs({
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

        it('should be empty for non-matching topics and matching address', async () => {
            const res = await Node1Client.queryEventLogs({
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
