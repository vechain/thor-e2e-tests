import { Node1Client, Response, Schema } from '../../../src/thor-client'
import {
    getTransferDetails,
    readPopulatedData,
    readRandomTransfer,
    Transfer,
} from '../../../src/populated-data'
import { components } from '../../../src/open-api-types'
import { HEX_REGEX_64 } from '../../../src/utils/hex-utils'
import { ThorWallet } from '../../../src/wallet'

const buildRequestFromTransfer = (
    transfer: Transfer,
): components['schemas']['TransferLogFilterRequest'] => {
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
                sender: transfer.vet.sender,
                recipient: transfer.vet.recipient,
            },
        ],
    }
}

describe('POST /logs/transfers', () => {
    const transferDetails = getTransferDetails()
    let wallet: ThorWallet

    beforeAll(async () => {
        wallet = ThorWallet.new(true)
        await wallet.waitForFunding()
    })

    it('should find a log with all parameters set', async () => {
        const transfer = readRandomTransfer()

        const request = buildRequestFromTransfer(transfer)

        const response = await Node1Client.queryTransferLogs(request)

        const relevantLog = response.body?.find(
            (log) => log?.meta?.txID === transfer.meta.txID,
        )

        expect(relevantLog).toBeDefined()
        expect(relevantLog).toEqual({
            sender: transfer.vet.sender,
            recipient: transfer.vet.recipient,
            amount: transfer.vet.amount,
            meta: {
                blockID: expect.stringMatching(HEX_REGEX_64),
                blockNumber: expect.any(Number),
                blockTimestamp: expect.any(Number),
                txID: expect.stringMatching(HEX_REGEX_64),
                txOrigin: transfer.meta.txOrigin,
                clauseIndex: 0,
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

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
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

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
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

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
        })

        it('should be able query by time', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)

            const transferLogs = await Node1Client.queryTransferLogs({
                ...baseRequest,
                range: {
                    to: transfer.meta.blockTimestamp + 1000,
                    from: transfer.meta.blockTimestamp - 1000,
                    unit: 'time',
                },
            })

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
        })

        it('should be able query by block', async () => {
            const transfer = readRandomTransfer()

            const baseRequest = buildRequestFromTransfer(transfer)

            const transferLogs = await Node1Client.queryTransferLogs({
                ...baseRequest,
                range: {
                    to: transfer.meta.blockNumber,
                    from: transfer.meta.blockNumber,
                    unit: 'block',
                },
            })

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
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

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
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

            const transferLogs = await Node1Client.queryTransferLogs(request)

            expect(transferLogs.success).toEqual(true)
            expect(transferLogs.httpCode).toEqual(200)
            expect(
                transferLogs.body?.some((log) => log?.meta?.txID),
            ).toBeTruthy()
        })

        it('should be able paginate requests', async () => {
            const { firstBlock, lastBlock, transferCount } = transferDetails

            const requiredTxIds = new Set<string>(
                readPopulatedData().transfers.map((t) => t.meta.txID as string),
            )

            const queriedTxIds = new Set<string>()

            let offset = 0

            while (queriedTxIds.size < transferCount) {
                const transferLogs = await Node1Client.queryTransferLogs({
                    range: {
                        from: firstBlock,
                        to: lastBlock,
                        unit: 'block',
                    },
                    options: {
                        offset: offset++,
                        limit: 10,
                    },
                    criteriaSet: [],
                })

                expect(transferLogs.success).toEqual(true)
                expect(transferLogs.httpCode).toEqual(200)

                if (transferLogs.body?.length === 0) {
                    break
                }

                const txId = transferLogs.body?.[0]?.meta?.txID

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
        const expectOriginalTransfer = (
            response: Response<Schema['TransferLogsResponse']>,
            transfer: Transfer,
        ) => {
            expect(response.success).toEqual(true)
            expect(response.httpCode).toEqual(200)

            const relevantLog = response.body?.find((log) => {
                return log?.meta?.txID === transfer.meta.txID
            })

            expect(relevantLog).toEqual({
                amount: transfer.vet.amount,
                recipient: transfer.vet.recipient,
                sender: transfer.vet.sender,
                meta: {
                    blockID: expect.stringMatching(HEX_REGEX_64),
                    blockNumber: expect.any(Number),
                    blockTimestamp: expect.any(Number),
                    txID: transfer.meta.txID,
                    txOrigin: transfer.meta.txOrigin,
                    clauseIndex: expect.any(Number),
                },
            })
        }

        it.each(['sender', 'txOrigin', 'recipient'])(
            'should be able query by: %s',
            async (key) => {
                const transfer = readRandomTransfer()

                const res = await Node1Client.queryTransferLogs({
                    criteriaSet: [
                        {
                            [key]: transfer.vet[key as keyof Transfer['vet']],
                        },
                    ],
                    range: {
                        from: transfer.meta.blockNumber,
                        to: transfer.meta.blockNumber,
                        unit: 'block',
                    },
                })

                expectOriginalTransfer(
                    res as Response<Schema['TransferLogsResponse']>,
                    transfer,
                )
            },
        )

        it('should be able query by all criteria', async () => {
            const transfer = readRandomTransfer()

            const res = await Node1Client.queryTransferLogs({
                criteriaSet: [
                    {
                        sender: transfer.vet.sender,
                        recipient: transfer.vet.recipient,
                        txOrigin: transfer.meta.txOrigin,
                    },
                ],
                range: {
                    from: transfer.meta.blockNumber,
                    to: transfer.meta.blockNumber,
                    unit: 'block',
                },
            })

            expectOriginalTransfer(
                res as Response<Schema['TransferLogsResponse']>,
                transfer,
            )
        })
    })

    describe('query by "order"', () => {
        const runqueryTransferLogsTest = async (order?: 'asc' | 'desc') => {
            const { firstBlock, lastBlock } = getTransferDetails()

            const response = await Node1Client.queryTransferLogs({
                range: {
                    from: firstBlock,
                    to: lastBlock,
                    unit: 'block',
                },
                options: {
                    offset: 0,
                    limit: 10_000,
                },
                criteriaSet: [],
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
            await runqueryTransferLogsTest('desc')
        })

        it('events should be ordered by ASC', async () => {
            await runqueryTransferLogsTest('asc')
        })

        it('default should be asc', async () => {
            await runqueryTransferLogsTest(undefined)
        })
    })
})
