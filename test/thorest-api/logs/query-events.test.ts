/// <reference types="jest-extended" />
import { Node1Client, Response, Schema } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import {
    getTransferDetails,
    readPopulatedData,
    readRandomTransfer,
    Transfer,
} from '../../../src/populated-data'
import { HEX_REGEX, HEX_REGEX_64 } from '../../../src/utils/hex-utils'
import { components } from '../../../src/open-api-types'
import { EventsContract__factory } from '../../../typechain-types'
import { addAddressPadding } from '../../../src/utils/padding-utils'
import { generateAddresses, ThorWallet } from '../../../src/wallet'

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

    let wallet: ThorWallet

    beforeAll(async () => {
        wallet = await ThorWallet.new(true).then((r) => r.wallet)
    })

    it('event log should be included in query', async () => {
        const transfer = readRandomTransfer()

        const request = buildRequestFromTransfer(transfer)

        const eventLogs = await Node1Client.queryEventLogs(request)

        expect(eventLogs.success).toEqual(true)
        expect(eventLogs.httpCode).toEqual(200)

        const relevantLog = eventLogs.body?.find((log) => {
            return log?.meta?.txID === transfer.meta.txID
        })

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
    })

    describe('query by "range"', () => {
        it('should be able to omit the "from" field', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                range: {
                    ...baseRequest.range,
                    from: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })

        it('should be able to omit the "to" field', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                range: {
                    ...baseRequest.range,
                    to: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })

        /**
         * This also checks that the default unit is "block"
         */
        it('should be omit the "unit" field', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                range: {
                    ...baseRequest.range,
                    unit: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })

        it('should be able query by time', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)

            const eventLogs = await Node1Client.queryEventLogs({
                ...baseRequest,
                range: {
                    to: transfer.meta.blockTimestamp + 1000,
                    from: transfer.meta.blockTimestamp - 1000,
                    unit: 'time',
                },
            })

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })

        it('should be able query by block', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)

            const eventLogs = await Node1Client.queryEventLogs({
                ...baseRequest,
                range: {
                    to: transfer.meta.blockNumber,
                    from: transfer.meta.blockNumber,
                    unit: 'block',
                },
            })

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })
    })

    describe('query by "order"', () => {
        const runQueryEventLogsTest = async (order?: 'asc' | 'desc') => {
            const { firstBlock, lastBlock } = getTransferDetails()

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

            expect(response.success).toEqual(true)
            expect(response.httpCode).toEqual(200)
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === firstBlock,
                ),
            ).toBeTruthy()
            expect(
                response.body?.some(
                    (log) => log?.meta?.blockNumber === lastBlock,
                ),
            ).toBeTruthy()

            const blockNumbers = response.body?.map(
                (log) => log?.meta?.blockNumber,
            )

            expect(blockNumbers).toBeArray()
            expect(blockNumbers).toEqual(
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
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                options: null,
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })

        it('should be able to omit the "offset" field', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)
            const request = {
                ...baseRequest,
                options: {
                    limit: 10_000,
                    offset: undefined,
                },
            }

            const eventLogs = await Node1Client.queryEventLogs(request)

            expect(eventLogs.success).toEqual(true)
            expect(eventLogs.httpCode).toEqual(200)
            expect(eventLogs.body?.some((log) => log?.meta?.txID)).toBeTruthy()
        })

        it('should be able paginate requests', async () => {
            const { firstBlock, lastBlock, transferCount } = transferDetails

            const requiredTxIds = new Set<string>(
                readPopulatedData().transfers.map((t) => t.meta.txID as string),
            )

            const queriedTxIds = new Set<string>()

            let offset = 0

            while (queriedTxIds.size < transferCount) {
                const eventLogs = await Node1Client.queryEventLogs({
                    range: {
                        from: firstBlock,
                        to: lastBlock,
                        unit: 'block',
                    },
                    options: {
                        offset: offset++,
                        limit: 10,
                    },
                    criteriaSet: [
                        {
                            address: contractAddresses.energy,
                        },
                    ],
                })

                expect(eventLogs.success).toEqual(true)
                expect(eventLogs.httpCode).toEqual(200)

                if (eventLogs.body?.length === 0) {
                    break
                }

                const txId = eventLogs.body?.[0]?.meta?.txID

                expect(txId).toBeTruthy()

                if (requiredTxIds.has(txId as string)) {
                    queriedTxIds.add(txId as string)
                }
            }

            expect(queriedTxIds.size).toEqual(transferCount)
            expect(queriedTxIds).toEqual(requiredTxIds)
        })
    })

    describe('query by "criteriaSet"', () => {
        let contractAddress: string
        let txReceipt: components['schemas']['GetTxReceiptResponse']
        const eventsInterface = EventsContract__factory.createInterface()
        const addresses = generateAddresses(3)
        const topicAddresses = addresses.map(addAddressPadding)
        const eventHash = eventsInterface.getEvent('MyEvent').topicHash

        beforeAll(async () => {
            contractAddress = await wallet.deployContract(
                EventsContract__factory.bytecode,
            )

            txReceipt = await wallet.sendClauses(
                [
                    {
                        to: contractAddress,
                        value: 0,
                        data: eventsInterface.encodeFunctionData(
                            'emitQuadEvent',
                            [addresses[0], addresses[1], addresses[2]],
                        ),
                    },
                ],
                true,
            )
        })

        const expectOriginalEvent = (
            response: Response<Schema['EventLogsResponse']>,
        ) => {
            expect(response.success).toEqual(true)
            expect(response.httpCode).toEqual(200)

            expect(response.body?.[0]).toEqual({
                address: contractAddress,
                topics: [eventHash, ...topicAddresses.map(addAddressPadding)],
                data: expect.stringMatching(HEX_REGEX),
                meta: {
                    blockID: expect.stringMatching(HEX_REGEX_64),
                    blockNumber: expect.any(Number),
                    blockTimestamp: expect.any(Number),
                    txID: txReceipt.meta?.txID,
                    txOrigin: txReceipt.meta?.txOrigin,
                    clauseIndex: expect.any(Number),
                },
            })
        }

        it('should be able query by contract address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        address: contractAddress,
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be able query by topic0 address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        topic0: eventHash,
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be able query by topic1', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        topic1: topicAddresses[0],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be able query by topic2', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        topic2: topicAddresses[1],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be able query by topic3', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        topic3: topicAddresses[2],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be able query by all topics', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        topic0: eventHash,
                        topic1: topicAddresses[0],
                        topic2: topicAddresses[1],
                        topic3: topicAddresses[2],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be able query by all topics and address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        address: contractAddress,
                        topic0: eventHash,
                        topic1: topicAddresses[0],
                        topic2: topicAddresses[1],
                        topic3: topicAddresses[2],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalEvent(res)
        })

        it('should be empty for matching topics and non-matching address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        address: contractAddresses.energy,
                        topic0: eventHash,
                        topic1: topicAddresses[0],
                        topic2: topicAddresses[1],
                        topic3: topicAddresses[2],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expect(res.success).toEqual(true)
            expect(res.httpCode).toEqual(200)
            expect(res.body).toEqual([])
        })

        it('should be empty for non-matching topics and matching address', async () => {
            const res = await Node1Client.queryEventLogs({
                criteriaSet: [
                    {
                        address: contractAddress,
                        topic0: eventHash,
                        topic1: topicAddresses[0],
                        topic2: topicAddresses[1],
                        topic3: topicAddresses[1],
                    },
                ],
                range: {
                    from: txReceipt.meta?.blockNumber,
                    to: txReceipt.meta?.blockNumber,
                    unit: 'block',
                },
            })

            expect(res.success).toEqual(true)
            expect(res.httpCode).toEqual(200)
            expect(res.body).toEqual([])
        })
    })
})
